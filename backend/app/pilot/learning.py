"""Private, organization-scoped lessons and learning access."""
from __future__ import annotations

import base64
import binascii
import re
from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.parse import parse_qs, urlencode, urlparse
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel, ConfigDict, Field
from backend.app.pilot import auth, db
from backend.app.pilot.errors import fail, ok

router = APIRouter()
SEED_TITLES = ["Meet & Greet", "Agenda", "Breakfast / F.O.R.M.", "Discovery / Survey", "Break & Remake the Pact", "Property Tour", "Model Suite", "Screen Tour & Flower", "Point of Confirmation", "Programs", "T.O. Pricing"]


def init_schema(conn):
    statements = [
        """CREATE TABLE IF NOT EXISTS pilot_lessons (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, position INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','published','archived')), current_published_revision_id TEXT, team_access TEXT NOT NULL CHECK(team_access IN ('open','closed')), version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)""",
        """CREATE TABLE IF NOT EXISTS pilot_lesson_revisions (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, lesson_id TEXT NOT NULL, revision_number INTEGER NOT NULL, state TEXT NOT NULL CHECK(state IN ('draft','published')), title_en TEXT NOT NULL, title_es TEXT, description_en TEXT NOT NULL DEFAULT '', description_es TEXT, video_provider TEXT, video_id TEXT, video_privacy_hash TEXT, pdf_asset_id TEXT, approved_by TEXT, published_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(organization_id,lesson_id,revision_number))""",
        """CREATE UNIQUE INDEX IF NOT EXISTS pilot_one_lesson_draft ON pilot_lesson_revisions(organization_id,lesson_id) WHERE state='draft'""",
        """CREATE TABLE IF NOT EXISTS pilot_lesson_access (organization_id TEXT NOT NULL, lesson_id TEXT NOT NULL, user_id TEXT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('allow','deny')), updated_by TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(organization_id,lesson_id,user_id))""",
        """CREATE TABLE IF NOT EXISTS pilot_lesson_completions (organization_id TEXT NOT NULL, lesson_id TEXT NOT NULL, user_id TEXT NOT NULL, published_revision_id TEXT NOT NULL, completed_at TEXT NOT NULL, PRIMARY KEY(organization_id,lesson_id,user_id))""",
        """CREATE TABLE IF NOT EXISTS pilot_access_requests (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, lesson_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','resolved_by_team_access')), version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, decided_by TEXT, resolved_at TEXT)""",
        """CREATE UNIQUE INDEX IF NOT EXISTS pilot_one_pending_request ON pilot_access_requests(organization_id,lesson_id,user_id) WHERE status='pending'""",
        "CREATE INDEX IF NOT EXISTS pilot_lessons_org ON pilot_lessons(organization_id,status,position,id)",
        "CREATE INDEX IF NOT EXISTS pilot_requests_org ON pilot_access_requests(organization_id,status,updated_at)",
        "CREATE INDEX IF NOT EXISTS pilot_completion_user ON pilot_lesson_completions(organization_id,user_id)",
    ]
    for statement in statements:
        conn.execute(statement)


def _insert_lesson(conn, org, title, position=None, team_access="closed", title_es=None, description_en="", description_es=None):
    identifier, revision_id, now = db.new_id(), db.new_id(), db.now()
    if position is None:
        position = conn.execute("SELECT COALESCE(MAX(position),0)+1 FROM pilot_lessons WHERE organization_id=?", (org,)).fetchone()[0]
    conn.execute("INSERT INTO pilot_lessons(id,organization_id,position,status,team_access,created_at,updated_at) VALUES (?,?,?,'draft',?,?,?)", (identifier, org, position, team_access, now, now))
    conn.execute("INSERT INTO pilot_lesson_revisions(id,organization_id,lesson_id,revision_number,state,title_en,title_es,description_en,description_es,created_at,updated_at) VALUES (?,?,?,1,'draft',?,?,?,?,?,?)", (revision_id, org, identifier, title, title_es, description_en, description_es, now, now))
    return identifier


def seed_roadmap(conn, organization_id):
    organization = conn.execute("SELECT roadmap_seed_version FROM pilot_organizations WHERE id=?", (organization_id,)).fetchone()
    if organization is None:
        fail(404, "organization_not_found")
    if organization["roadmap_seed_version"]:
        return
    for position, title in enumerate(SEED_TITLES, 1):
        _insert_lesson(conn, organization_id, title, position, "open" if position <= 3 else "closed")
    conn.execute("UPDATE pilot_organizations SET roadmap_seed_version=1,catalog_version=catalog_version+1 WHERE id=?", (organization_id,))


def normalize_video(value):
    if not isinstance(value, str) or len(value) > 2000:
        fail(422, "invalid_video_url")
    try:
        url = urlparse(value.strip())
        port = url.port
    except ValueError:
        fail(422, "invalid_video_url")
    if url.scheme != "https" or url.username or url.password or port not in (None, 443):
        fail(422, "invalid_video_url")
    host, path, query = (url.hostname or "").lower(), url.path.strip("/").split("/"), parse_qs(url.query)
    if host in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"}:
        identifier = None
        if host in {"youtu.be", "www.youtu.be"} and len(path) == 1:
            identifier = path[0]
        elif path == ["watch"] and len(query.get("v", [])) == 1:
            identifier = query["v"][0]
        elif len(path) == 2 and path[0] in {"embed", "shorts"}:
            identifier = path[1]
        if identifier and re.fullmatch(r"[A-Za-z0-9_-]{11}", identifier):
            return {"provider": "youtube", "id": identifier, "privacy_hash": None}
    elif host in {"vimeo.com", "www.vimeo.com", "player.vimeo.com"}:
        identifier, privacy_hash = None, None
        if host == "player.vimeo.com" and len(path) == 2 and path[0] == "video":
            identifier, privacy_hash = path[1], query.get("h", [None])[0]
        elif host != "player.vimeo.com" and len(path) in {1, 2}:
            identifier = path[0]
            privacy_hash = path[1] if len(path) == 2 else query.get("h", [None])[0]
        if identifier and re.fullmatch(r"[0-9]{1,15}", identifier) and (privacy_hash is None or re.fullmatch(r"[A-Za-z0-9]{6,64}", privacy_hash)):
            return {"provider": "vimeo", "id": identifier, "privacy_hash": privacy_hash}
    fail(422, "invalid_video_url")


def video_descriptor(revision):
    if not revision or not revision["video_id"]:
        return None
    identifier = revision["video_id"]
    if revision["video_provider"] == "youtube":
        return {"provider": "youtube", "id": identifier, "embed_url": f"https://www.youtube-nocookie.com/embed/{identifier}", "watch_url": f"https://www.youtube.com/watch?v={identifier}"}
    privacy = revision["video_privacy_hash"]
    return {"provider": "vimeo", "id": identifier, "embed_url": f"https://player.vimeo.com/video/{identifier}" + ("?" + urlencode({"h": privacy}) if privacy else ""), "watch_url": f"https://vimeo.com/{identifier}" + (f"/{privacy}" if privacy else "")}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class VersionIn(StrictModel):
    expected_version: int = Field(ge=1, strict=True)


class CreateIn(StrictModel):
    client_request_id: UUID
    title_en: str = Field(min_length=1, max_length=160)
    title_es: str | None = Field(default=None, max_length=160)
    description_en: str = Field(default="", max_length=1000)
    description_es: str | None = Field(default=None, max_length=1000)


class DraftIn(VersionIn):
    title_en: str | None = Field(default=None, min_length=1, max_length=160)
    title_es: str | None = Field(default=None, max_length=160)
    description_en: str | None = Field(default=None, max_length=1000)
    description_es: str | None = Field(default=None, max_length=1000)
    video_url: str | None = Field(default=None, max_length=2000)
    pdf_asset_id: str | None = Field(default=None, max_length=100)


class PublishIn(VersionIn):
    revision_id: str = Field(min_length=1, max_length=100)


class ReorderIn(StrictModel):
    lesson_ids: list[str] = Field(max_length=1000)
    expected_catalog_version: int = Field(ge=1, strict=True)


class TeamAccessIn(VersionIn):
    team_access: Literal["open", "closed"]


class IndividualAccessIn(StrictModel):
    decision: Literal["allow", "deny"]
    expected_version: int = Field(ge=0, strict=True)


class ResolveIn(VersionIn):
    decision: Literal["approved", "rejected"]


def _lesson(conn, identifier, user):
    result = conn.execute("SELECT * FROM pilot_lessons WHERE id=? AND organization_id=?", (identifier, user["organization_id"])).fetchone()
    if result is None:
        fail(404, "lesson_not_found")
    return result


def _revision(conn, lesson, draft=False):
    if draft:
        return conn.execute("SELECT * FROM pilot_lesson_revisions WHERE organization_id=? AND lesson_id=? AND state='draft'", (lesson["organization_id"], lesson["id"])).fetchone()
    return conn.execute("SELECT * FROM pilot_lesson_revisions WHERE id=? AND organization_id=? AND lesson_id=?", (lesson["current_published_revision_id"], lesson["organization_id"], lesson["id"])).fetchone()


def lesson_allowed(conn, lesson, user):
    if user["role"] == "owner":
        return lesson["organization_id"] == user["organization_id"]
    if lesson["status"] != "published":
        return False
    choice = conn.execute("SELECT decision FROM pilot_lesson_access WHERE organization_id=? AND lesson_id=? AND user_id=?", (user["organization_id"], lesson["id"], user["id"])).fetchone()
    return choice[0] == "allow" if choice else lesson["team_access"] == "open"


def _catalog_version(conn, org):
    row = conn.execute("SELECT catalog_version FROM pilot_organizations WHERE id=?", (org,)).fetchone()
    if row is None:
        fail(404, "organization_not_found")
    return row[0]


def _bump_catalog(conn, org):
    conn.execute("UPDATE pilot_organizations SET catalog_version=catalog_version+1 WHERE id=?", (org,))


def _touch(conn, lesson):
    conn.execute("UPDATE pilot_lessons SET version=version+1,updated_at=? WHERE id=? AND organization_id=?", (db.now(), lesson["id"], lesson["organization_id"]))
    _bump_catalog(conn, lesson["organization_id"])


def _revision_view(revision):
    if not revision:
        return None
    result = dict(revision)
    result.pop("organization_id", None)
    video = video_descriptor(revision)
    result["video_url"] = video["watch_url"] if video else ""
    return result


def _card(conn, lesson, user, owner=False):
    revision = (_revision(conn, lesson, True) if owner else None) or _revision(conn, lesson)
    if revision is None:
        revision = conn.execute("SELECT * FROM pilot_lesson_revisions WHERE organization_id=? AND lesson_id=? ORDER BY revision_number DESC LIMIT 1", (user["organization_id"], lesson["id"])).fetchone()
    completion = conn.execute("SELECT completed_at FROM pilot_lesson_completions WHERE organization_id=? AND lesson_id=? AND user_id=?", (user["organization_id"], lesson["id"], user["id"])).fetchone()
    request = conn.execute("SELECT status FROM pilot_access_requests WHERE organization_id=? AND lesson_id=? AND user_id=? ORDER BY created_at DESC,id DESC LIMIT 1", (user["organization_id"], lesson["id"], user["id"])).fetchone()
    spanish = user.get("locale") == "es"
    return {"id": lesson["id"], "position": lesson["position"], "status": lesson["status"], "team_access": lesson["team_access"], "version": lesson["version"], "title": (revision["title_es"] if spanish and revision["title_es"] else revision["title_en"]) if revision else "", "description": (revision["description_es"] if spanish and revision["description_es"] else revision["description_en"]) if revision else "", "title_en": revision["title_en"] if revision else "", "title_es": revision["title_es"] if revision else None, "description_en": revision["description_en"] if revision else "", "description_es": revision["description_es"] if revision else None, "content_language": "es" if spanish and revision and revision["title_es"] else "en", "allowed": lesson_allowed(conn, lesson, user), "completed": bool(completion), "completed_at": completion[0] if completion else None, "request_status": request[0] if request else None}


def _page(items, cursor, limit):
    try:
        offset = int(base64.urlsafe_b64decode(cursor.encode()).decode()) if cursor else 0
    except (ValueError, UnicodeError, binascii.Error):
        fail(400, "invalid_cursor")
    if offset < 0:
        fail(400, "invalid_cursor")
    end = offset + limit
    return {"items": items[offset:end], "next_cursor": base64.urlsafe_b64encode(str(end).encode()).decode() if end < len(items) else None}


def _draft_data(conn, lesson, user):
    exceptions = conn.execute("""SELECT a.user_id,u.display_name,a.decision,a.version FROM pilot_lesson_access a JOIN users u ON u.id=a.user_id AND u.organization_id=a.organization_id WHERE a.organization_id=? AND a.lesson_id=? ORDER BY u.display_name,u.id""", (user["organization_id"], lesson["id"])).fetchall()
    return {"lesson": _card(conn, lesson, user, True), "draft": _revision_view(_revision(conn, lesson, True)), "published_revision": _revision_view(_revision(conn, lesson)), "access_exceptions": [dict(row) for row in exceptions]}


def _copy_draft(conn, lesson):
    published = _revision(conn, lesson)
    if published is None:
        fail(409, "revision_missing")
    values = {key: published[key] for key in ("title_en", "title_es", "description_en", "description_es", "video_provider", "video_id", "video_privacy_hash", "pdf_asset_id")}
    number = conn.execute("SELECT MAX(revision_number)+1 FROM pilot_lesson_revisions WHERE organization_id=? AND lesson_id=?", (lesson["organization_id"], lesson["id"])).fetchone()[0]
    conn.execute("INSERT INTO pilot_lesson_revisions(id,organization_id,lesson_id,revision_number,state,title_en,title_es,description_en,description_es,video_provider,video_id,video_privacy_hash,pdf_asset_id,created_at,updated_at) VALUES (?,?,?,?,'draft',?,?,?,?,?,?,?,?,?,?)", (db.new_id(), lesson["organization_id"], lesson["id"], number, *values.values(), db.now(), db.now()))
    return _revision(conn, lesson, True)


@router.get("/api/pilot/lessons")
def list_lessons(include_drafts: bool = False, cursor: str | None = None, limit: int = Query(25, ge=1, le=100), user=Depends(auth.require_user)):
    if include_drafts and user["role"] != "owner":
        fail(403, "owner_required")
    with db.read() as conn:
        lessons = conn.execute("SELECT * FROM pilot_lessons WHERE organization_id=?" + ("" if include_drafts else " AND status='published'") + " ORDER BY position,id", (user["organization_id"],)).fetchall()
        return ok({**_page([_card(conn, row, user, include_drafts) for row in lessons], cursor, limit), "catalog_version": _catalog_version(conn, user["organization_id"])})


@router.get("/api/pilot/lessons/{lesson_id}")
def get_lesson(lesson_id: str, user=Depends(auth.require_user)):
    from backend.app.pilot.assets import asset_descriptor
    with db.read() as conn:
        lesson = _lesson(conn, lesson_id, user)
        if lesson["status"] != "published":
            fail(404, "lesson_not_found")
        if not lesson_allowed(conn, lesson, user):
            fail(403, "lesson_access_required")
        revision = _revision(conn, lesson)
        if revision is None:
            fail(404, "lesson_not_found")
        pdf = asset_descriptor(conn, revision["pdf_asset_id"], user["organization_id"])
        if pdf:
            pdf["download_url"] = f"/api/pilot/lessons/{lesson_id}/pdf"
        return ok({"lesson": _card(conn, lesson, user), "revision": _revision_view(revision), "video": video_descriptor(revision), "pdf": pdf})


@router.post("/api/pilot/lessons/{lesson_id}/complete")
def complete_lesson(lesson_id: str, user=Depends(auth.require_user)):
    with db.transaction() as conn:
        lesson = _lesson(conn, lesson_id, user)
        if lesson["status"] != "published":
            fail(404, "lesson_not_found")
        if not lesson_allowed(conn, lesson, user):
            fail(403, "lesson_access_required")
        conn.execute("INSERT OR IGNORE INTO pilot_lesson_completions(organization_id,lesson_id,user_id,published_revision_id,completed_at) VALUES (?,?,?,?,?)", (user["organization_id"], lesson_id, user["id"], lesson["current_published_revision_id"], db.now()))
        result = conn.execute("SELECT lesson_id,published_revision_id,completed_at FROM pilot_lesson_completions WHERE organization_id=? AND lesson_id=? AND user_id=?", (user["organization_id"], lesson_id, user["id"])).fetchone()
        db.audit(conn, user, "lesson_completed", "lesson", lesson_id)
        return ok({"completion": dict(result)})


@router.get("/api/pilot/owner/lessons")
def owner_lessons(cursor: str | None = None, limit: int = Query(25, ge=1, le=100), user=Depends(auth.require_owner)):
    return list_lessons(True, cursor, limit, user)


@router.post("/api/pilot/owner/lessons", status_code=201)
def create_lesson(payload: CreateIn, user=Depends(auth.require_owner)):
    values = payload.model_dump(mode="json")
    with db.transaction() as conn:
        saved = db.idempotent(conn, user, "lesson_create", str(payload.client_request_id), values)
        if saved is not None:
            return ok(saved)
        identifier = _insert_lesson(conn, user["organization_id"], payload.title_en, title_es=payload.title_es, description_en=payload.description_en, description_es=payload.description_es)
        _bump_catalog(conn, user["organization_id"])
        result = _draft_data(conn, _lesson(conn, identifier, user), user)
        db.remember(conn, user, "lesson_create", str(payload.client_request_id), values, result)
        db.audit(conn, user, "lesson_created", "lesson", identifier)
        return ok(result)


@router.post("/api/pilot/owner/lessons/reorder")
def reorder_lessons(payload: ReorderIn, user=Depends(auth.require_owner)):
    with db.transaction() as conn:
        version = _catalog_version(conn, user["organization_id"])
        if version != payload.expected_catalog_version:
            fail(409, "version_conflict")
        current = {row[0] for row in conn.execute("SELECT id FROM pilot_lessons WHERE organization_id=? AND status!='archived'", (user["organization_id"],))}
        if len(set(payload.lesson_ids)) != len(payload.lesson_ids) or set(payload.lesson_ids) != current:
            fail(422, "invalid_lesson_order")
        for index, identifier in enumerate(payload.lesson_ids, 1):
            conn.execute("UPDATE pilot_lessons SET position=?,version=version+1,updated_at=? WHERE organization_id=? AND id=?", (index, db.now(), user["organization_id"], identifier))
        _bump_catalog(conn, user["organization_id"])
        db.audit(conn, user, "lessons_reordered", "organization", user["organization_id"])
        return ok({"catalog_version": version + 1})


@router.get("/api/pilot/owner/lessons/{lesson_id}/draft")
def get_draft(lesson_id: str, user=Depends(auth.require_owner)):
    with db.read() as conn:
        return ok(_draft_data(conn, _lesson(conn, lesson_id, user), user))


@router.patch("/api/pilot/owner/lessons/{lesson_id}/draft")
def update_draft(lesson_id: str, payload: DraftIn, user=Depends(auth.require_owner)):
    with db.transaction() as conn:
        lesson = _lesson(conn, lesson_id, user)
        db.check_version(lesson, payload.expected_version)
        if lesson["status"] == "archived":
            fail(409, "lesson_archived")
        draft = _revision(conn, lesson, True) or _copy_draft(conn, lesson)
        values = payload.model_dump(exclude_unset=True)
        updates = {key: values[key] for key in ("title_en", "title_es", "description_en", "description_es", "pdf_asset_id") if key in values}
        if "title_en" in updates and updates["title_en"] is None:
            fail(422, "title_required")
        if "description_en" in updates and updates["description_en"] is None:
            updates["description_en"] = ""
        if "video_url" in values:
            video = normalize_video(values["video_url"]) if values["video_url"] else {"provider": None, "id": None, "privacy_hash": None}
            updates.update(video_provider=video["provider"], video_id=video["id"], video_privacy_hash=video["privacy_hash"])
        if updates.get("pdf_asset_id") and not conn.execute("SELECT id FROM pilot_assets WHERE id=? AND organization_id=? AND status='ready'", (updates["pdf_asset_id"], user["organization_id"])).fetchone():
            fail(422, "invalid_pdf_asset")
        updates["updated_at"] = db.now()
        conn.execute("UPDATE pilot_lesson_revisions SET " + ",".join(key + "=?" for key in updates) + " WHERE id=? AND organization_id=?", (*updates.values(), draft["id"], user["organization_id"]))
        _touch(conn, lesson)
        db.audit(conn, user, "lesson_draft_saved", "lesson", lesson_id)
        return ok(_draft_data(conn, _lesson(conn, lesson_id, user), user))


@router.post("/api/pilot/owner/lessons/{lesson_id}/publish")
def publish_lesson(lesson_id: str, payload: PublishIn, user=Depends(auth.require_owner)):
    with db.transaction() as conn:
        lesson = _lesson(conn, lesson_id, user)
        db.check_version(lesson, payload.expected_version)
        if lesson["status"] == "archived":
            fail(409, "lesson_archived")
        draft = _revision(conn, lesson, True)
        if not draft or draft["id"] != payload.revision_id:
            fail(409, "revision_conflict")
        asset = conn.execute("SELECT id FROM pilot_assets WHERE id=? AND organization_id=? AND status='ready'", (draft["pdf_asset_id"], user["organization_id"])).fetchone()
        if not draft["title_en"].strip() or not draft["video_id"] or not asset:
            fail(422, "lesson_media_required")
        now = db.now()
        conn.execute("UPDATE pilot_lesson_revisions SET state='published',approved_by=?,published_at=?,updated_at=? WHERE id=? AND organization_id=?", (user["id"], now, now, draft["id"], user["organization_id"]))
        conn.execute("UPDATE pilot_lessons SET status='published',current_published_revision_id=? WHERE id=? AND organization_id=?", (draft["id"], lesson_id, user["organization_id"]))
        _touch(conn, lesson)
        db.audit(conn, user, "lesson_published", "lesson", lesson_id, {"revision_id": draft["id"]})
        return ok(_draft_data(conn, _lesson(conn, lesson_id, user), user))


def _set_state(lesson_id, payload, user, status):
    with db.transaction() as conn:
        lesson = _lesson(conn, lesson_id, user)
        db.check_version(lesson, payload.expected_version)
        if status == "draft" and lesson["status"] != "archived":
            fail(409, "lesson_not_archived")
        conn.execute("UPDATE pilot_lessons SET status=? WHERE id=? AND organization_id=?", (status, lesson_id, user["organization_id"]))
        if status == "draft" and _revision(conn, lesson, True) is None:
            _copy_draft(conn, lesson)
        _touch(conn, lesson)
        db.audit(conn, user, "lesson_archived" if status == "archived" else "lesson_restored", "lesson", lesson_id)
        return ok(_draft_data(conn, _lesson(conn, lesson_id, user), user))


@router.post("/api/pilot/owner/lessons/{lesson_id}/archive")
def archive_lesson(lesson_id: str, payload: VersionIn, user=Depends(auth.require_owner)):
    return _set_state(lesson_id, payload, user, "archived")


@router.post("/api/pilot/owner/lessons/{lesson_id}/restore")
def restore_lesson(lesson_id: str, payload: VersionIn, user=Depends(auth.require_owner)):
    return _set_state(lesson_id, payload, user, "draft")


@router.patch("/api/pilot/owner/lessons/{lesson_id}/access")
def change_team_access(lesson_id: str, payload: TeamAccessIn, user=Depends(auth.require_owner)):
    with db.transaction() as conn:
        lesson = _lesson(conn, lesson_id, user)
        db.check_version(lesson, payload.expected_version)
        conn.execute("UPDATE pilot_lessons SET team_access=? WHERE organization_id=? AND id=?", (payload.team_access, user["organization_id"], lesson_id))
        _touch(conn, lesson)
        if payload.team_access == "open":
            conn.execute("""UPDATE pilot_access_requests SET status='resolved_by_team_access',version=version+1,updated_at=?,resolved_at=?,decided_by=? WHERE organization_id=? AND lesson_id=? AND status='pending' AND NOT EXISTS (SELECT 1 FROM pilot_lesson_access a WHERE a.organization_id=pilot_access_requests.organization_id AND a.lesson_id=pilot_access_requests.lesson_id AND a.user_id=pilot_access_requests.user_id AND a.decision='deny')""", (db.now(), db.now(), user["id"], user["organization_id"], lesson_id))
        db.audit(conn, user, "lesson_team_access_changed", "lesson", lesson_id)
        return ok({"lesson": _card(conn, _lesson(conn, lesson_id, user), user, True)})


def _representative(conn, identifier, user):
    if not conn.execute("SELECT id FROM users WHERE id=? AND organization_id=? AND pilot_role='representative'", (identifier, user["organization_id"])).fetchone():
        fail(404, "user_not_found")


@router.put("/api/pilot/owner/lessons/{lesson_id}/access/{user_id}")
def change_individual_access(lesson_id: str, user_id: str, payload: IndividualAccessIn, user=Depends(auth.require_owner)):
    with db.transaction() as conn:
        lesson = _lesson(conn, lesson_id, user)
        _representative(conn, user_id, user)
        existing = conn.execute("SELECT * FROM pilot_lesson_access WHERE organization_id=? AND lesson_id=? AND user_id=?", (user["organization_id"], lesson_id, user_id)).fetchone()
        if (existing["version"] if existing else 0) != payload.expected_version:
            fail(409, "version_conflict")
        conn.execute("""INSERT INTO pilot_lesson_access(organization_id,lesson_id,user_id,decision,updated_by,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(organization_id,lesson_id,user_id) DO UPDATE SET decision=excluded.decision,updated_by=excluded.updated_by,updated_at=excluded.updated_at,version=pilot_lesson_access.version+1""", (user["organization_id"], lesson_id, user_id, payload.decision, user["id"], db.now()))
        if payload.decision == "allow":
            conn.execute("UPDATE pilot_access_requests SET status='approved',version=version+1,updated_at=?,resolved_at=?,decided_by=? WHERE organization_id=? AND lesson_id=? AND user_id=? AND status='pending'", (db.now(), db.now(), user["id"], user["organization_id"], lesson_id, user_id))
        db.audit(conn, user, "lesson_individual_access_changed", "lesson", lesson_id, {"user_id": user_id, "decision": payload.decision})
        return ok({"access": dict(conn.execute("SELECT user_id,decision,version FROM pilot_lesson_access WHERE organization_id=? AND lesson_id=? AND user_id=?", (user["organization_id"], lesson_id, user_id)).fetchone())})


@router.delete("/api/pilot/owner/lessons/{lesson_id}/access/{user_id}")
def delete_individual_access(lesson_id: str, user_id: str, if_match: str | None = Header(default=None), user=Depends(auth.require_owner)):
    try:
        expected = int((if_match or "").strip('"'))
    except ValueError:
        fail(422, "expected_version_required")
    with db.transaction() as conn:
        lesson = _lesson(conn, lesson_id, user)
        _representative(conn, user_id, user)
        existing = conn.execute("SELECT * FROM pilot_lesson_access WHERE organization_id=? AND lesson_id=? AND user_id=?", (user["organization_id"], lesson_id, user_id)).fetchone()
        if not existing:
            fail(404, "access_not_found")
        db.check_version(existing, expected)
        conn.execute("DELETE FROM pilot_lesson_access WHERE organization_id=? AND lesson_id=? AND user_id=?", (user["organization_id"], lesson_id, user_id))
        if lesson["team_access"] == "open" and lesson["status"] == "published":
            conn.execute("UPDATE pilot_access_requests SET status='resolved_by_team_access',version=version+1,updated_at=?,resolved_at=?,decided_by=? WHERE organization_id=? AND lesson_id=? AND user_id=? AND status='pending'", (db.now(), db.now(), user["id"], user["organization_id"], lesson_id, user_id))
        db.audit(conn, user, "lesson_individual_access_removed", "lesson", lesson_id, {"user_id": user_id})
        return ok({"removed": True})


def _request_view(conn, row):
    result = {key: row[key] for key in ("id", "lesson_id", "user_id", "status", "version", "created_at", "updated_at")}
    person = conn.execute("SELECT display_name FROM users WHERE id=? AND organization_id=?", (row["user_id"], row["organization_id"])).fetchone()
    lesson = conn.execute("SELECT * FROM pilot_lessons WHERE id=? AND organization_id=?", (row["lesson_id"], row["organization_id"])).fetchone()
    revision = _revision(conn, lesson) if lesson else None
    result.update(display_name=person[0] if person else "", lesson_title=revision["title_en"] if revision else "")
    return result


@router.post("/api/pilot/lessons/{lesson_id}/access-requests")
def request_access(lesson_id: str, user=Depends(auth.require_user)):
    with db.transaction() as conn:
        lesson = _lesson(conn, lesson_id, user)
        if lesson["status"] != "published":
            fail(404, "lesson_not_found")
        if lesson_allowed(conn, lesson, user):
            fail(409, "lesson_already_accessible")
        previous = conn.execute("SELECT * FROM pilot_access_requests WHERE organization_id=? AND lesson_id=? AND user_id=? ORDER BY created_at DESC,id DESC LIMIT 1", (user["organization_id"], lesson_id, user["id"])).fetchone()
        if previous and previous["status"] == "pending":
            return ok({"request": _request_view(conn, previous)})
        if previous and previous["status"] == "rejected":
            last = datetime.fromisoformat(previous["updated_at"].replace("Z", "+00:00"))
            now = datetime.fromisoformat(db.now().replace("Z", "+00:00"))
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            if now.tzinfo is None:
                now = now.replace(tzinfo=timezone.utc)
            if now - last < timedelta(hours=24):
                fail(429, "access_request_cooldown")
        identifier, now = db.new_id(), db.now()
        conn.execute("INSERT INTO pilot_access_requests(id,organization_id,lesson_id,user_id,status,created_at,updated_at) VALUES (?,?,?,?,'pending',?,?)", (identifier, user["organization_id"], lesson_id, user["id"], now, now))
        db.audit(conn, user, "lesson_access_requested", "lesson", lesson_id)
        return ok({"request": _request_view(conn, conn.execute("SELECT * FROM pilot_access_requests WHERE id=? AND organization_id=?", (identifier, user["organization_id"])).fetchone())})


@router.get("/api/pilot/access-requests/mine")
def own_requests(cursor: str | None = None, limit: int = Query(25, ge=1, le=100), user=Depends(auth.require_user)):
    with db.read() as conn:
        rows = conn.execute("SELECT * FROM pilot_access_requests WHERE organization_id=? AND user_id=? ORDER BY created_at DESC,id", (user["organization_id"], user["id"])).fetchall()
        return ok(_page([_request_view(conn, row) for row in rows], cursor, limit))


@router.get("/api/pilot/owner/access-requests")
def owner_requests(status: Literal["pending", "approved", "rejected", "resolved_by_team_access"] | None = "pending", cursor: str | None = None, limit: int = Query(25, ge=1, le=100), user=Depends(auth.require_owner)):
    with db.read() as conn:
        sql, params = "SELECT * FROM pilot_access_requests WHERE organization_id=?", [user["organization_id"]]
        if status:
            sql += " AND status=?"
            params.append(status)
        rows = conn.execute(sql + " ORDER BY created_at DESC,id", params).fetchall()
        counts = conn.execute("SELECT lesson_id,COUNT(*) AS count FROM pilot_access_requests WHERE organization_id=? AND status='pending' GROUP BY lesson_id ORDER BY lesson_id", (user["organization_id"],)).fetchall()
        return ok({**_page([_request_view(conn, row) for row in rows], cursor, limit), "total_pending": sum(row["count"] for row in counts), "pending_by_lesson": [dict(row) for row in counts]})


@router.post("/api/pilot/owner/access-requests/{request_id}/resolve")
def resolve_request(request_id: str, payload: ResolveIn, user=Depends(auth.require_owner)):
    with db.transaction() as conn:
        request = conn.execute("SELECT * FROM pilot_access_requests WHERE id=? AND organization_id=?", (request_id, user["organization_id"])).fetchone()
        if not request:
            fail(404, "request_not_found")
        db.check_version(request, payload.expected_version)
        if request["status"] != "pending":
            fail(409, "request_already_resolved")
        lesson = _lesson(conn, request["lesson_id"], user)
        if lesson["status"] != "published":
            fail(409, "lesson_not_published")
        _representative(conn, request["user_id"], user)
        if payload.decision == "approved":
            conn.execute("""INSERT INTO pilot_lesson_access(organization_id,lesson_id,user_id,decision,updated_by,updated_at) VALUES (?,?,?,'allow',?,?) ON CONFLICT(organization_id,lesson_id,user_id) DO UPDATE SET decision='allow',updated_by=excluded.updated_by,updated_at=excluded.updated_at,version=pilot_lesson_access.version+1""", (user["organization_id"], request["lesson_id"], request["user_id"], user["id"], db.now()))
        conn.execute("UPDATE pilot_access_requests SET status=?,version=version+1,updated_at=?,resolved_at=?,decided_by=? WHERE id=? AND organization_id=?", (payload.decision, db.now(), db.now(), user["id"], request_id, user["organization_id"]))
        db.audit(conn, user, "lesson_access_request_resolved", "access_request", request_id, {"decision": payload.decision})
        return ok({"request": _request_view(conn, conn.execute("SELECT * FROM pilot_access_requests WHERE id=? AND organization_id=?", (request_id, user["organization_id"])).fetchone())})


def progress_summary(conn, user):
    lessons = conn.execute("SELECT * FROM pilot_lessons WHERE organization_id=? AND status='published'", (user["organization_id"],)).fetchall()
    allowed_ids = {row["id"] for row in lessons if lesson_allowed(conn, row, user)}
    completed_ids = {row[0] for row in conn.execute("SELECT lesson_id FROM pilot_lesson_completions WHERE organization_id=? AND user_id=?", (user["organization_id"], user["id"]))}
    completed = len(allowed_ids & completed_ids)
    pending = conn.execute("SELECT COUNT(*) FROM pilot_access_requests WHERE organization_id=? AND user_id=? AND status='pending'", (user["organization_id"], user["id"])).fetchone()[0]
    requested = conn.execute("SELECT COUNT(DISTINCT lesson_id) FROM pilot_access_requests WHERE organization_id=? AND user_id=?", (user["organization_id"], user["id"])).fetchone()[0]
    return {"completed_lessons": completed, "accessible_lessons": len(allowed_ids), "published_lessons": len(lessons), "progress_percent": round(completed / len(allowed_ids) * 100, 2) if allowed_ids else None, "pending_requests": pending, "requested_lessons": requested}
