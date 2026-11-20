"""Private notes and the organization-scoped owner workspace."""
import re
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import Field

from . import db
from .activity import (StrictModel, VersionIn, date_range, metrics_for_user,
                       page_offset, paginate, scoped_tour, tour_view, valid_day)
from .auth import require_user, require_owner, public_user
from .errors import fail, ok

router = APIRouter()


class NoteCreate(StrictModel):
    client_request_id: UUID
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=10000)
    pinned: bool = Field(default=False, strict=True)


class NotePatch(VersionIn):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    body: str | None = Field(default=None, min_length=1, max_length=10000)
    pinned: bool | None = Field(default=None, strict=True)


class DiaryCreate(StrictModel):
    client_request_id: UUID
    entry_date: str
    tour_id: str | None = None
    answer_1: str = Field(min_length=1, max_length=2000)
    answer_2: str = Field(min_length=1, max_length=2000)
    answer_3: str = Field(min_length=1, max_length=2000)


class DiaryPatch(VersionIn):
    entry_date: str | None = None
    tour_id: str | None = None
    answer_1: str | None = Field(default=None, min_length=1, max_length=2000)
    answer_2: str | None = Field(default=None, min_length=1, max_length=2000)
    answer_3: str | None = Field(default=None, min_length=1, max_length=2000)


class SettingsPatch(VersionIn):
    app_name: str | None = Field(default=None, min_length=1, max_length=60)
    welcome_title_en: str | None = Field(default=None, min_length=1, max_length=140)
    welcome_title_es: str | None = Field(default=None, max_length=140)


class PreferencesPatch(StrictModel):
    locale: Literal["en", "es"]


def init_schema(conn):
    statements = [
        "CREATE UNIQUE INDEX IF NOT EXISTS pilot_users_org_identity ON users(id,organization_id)",
        """CREATE TABLE IF NOT EXISTS pilot_notes (
            id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
            title TEXT NOT NULL, body TEXT NOT NULL, pinned INTEGER NOT NULL DEFAULT 0,
            version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id,organization_id) REFERENCES users(id,organization_id))""",
        "CREATE INDEX IF NOT EXISTS pilot_notes_owner ON pilot_notes(organization_id,user_id,pinned,updated_at,id)",
        """CREATE TABLE IF NOT EXISTS pilot_diary_entries (
            id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
            entry_date TEXT NOT NULL, tour_id TEXT, answer_1 TEXT NOT NULL, answer_2 TEXT NOT NULL, answer_3 TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id,organization_id) REFERENCES users(id,organization_id),
            FOREIGN KEY(tour_id,organization_id,user_id) REFERENCES pilot_tours(id,organization_id,user_id))""",
        "CREATE INDEX IF NOT EXISTS pilot_diary_owner ON pilot_diary_entries(organization_id,user_id,entry_date,id)",
    ]
    for statement in statements:
        conn.execute(statement)


def progress_summary(conn, user):
    from .learning import progress_summary as learning_progress
    return learning_progress(conn, user)


def own_document(conn, table, identifier, user):
    # Table names only come from fixed route constants in this module.
    row = conn.execute(f"SELECT * FROM {table} WHERE id=? AND organization_id=? AND user_id=?",
                       (identifier, user["organization_id"], user["id"])).fetchone()
    if row is None:
        fail(404, "not_found")
    return dict(row)


def note_view(row):
    result = dict(row)
    result["pinned"] = bool(result["pinned"])
    return result


def checked_text(values, fields):
    values = dict(values)
    for name in fields:
        value = values.get(name)
        if not isinstance(value, str) or not value.strip():
            fail(422, "text_required", {name: "required"})
        values[name] = value.strip()
    return values


@router.patch("/api/pilot/me/preferences")
def patch_preferences(body: PreferencesPatch, user=Depends(require_user)):
    with db.transaction() as conn:
        conn.execute("UPDATE users SET locale=?,updated_at=? WHERE id=? AND organization_id=?",
                     (body.locale, db.now(), user["id"], user["organization_id"]))
        current = conn.execute("SELECT * FROM users WHERE id=? AND organization_id=?",
                               (user["id"], user["organization_id"])).fetchone()
        if current is None:
            fail(404, "not_found")
        db.audit(conn, user, "preferences_updated", "user", user["id"], {"locale": body.locale})
        return ok({"user": public_user(dict(current))})


@router.get("/api/pilot/notes")
def list_notes(q: str = Query("", max_length=100), cursor: str | None = None,
               limit: int = Query(25, ge=1, le=100), user=Depends(require_user)):
    offset = page_offset(cursor)
    # Search is literal. A '%' typed by a user is not a LIKE wildcard.
    needle = q.strip().lower()
    with db.read() as conn:
        rows = conn.execute("SELECT * FROM pilot_notes WHERE organization_id=? AND user_id=? AND (?='' OR instr(lower(title),?)>0 OR instr(lower(body),?)>0) ORDER BY pinned DESC,updated_at DESC,id DESC LIMIT ? OFFSET ?",
                            (user["organization_id"], user["id"], needle, needle, needle, limit + 1, offset)).fetchall()
        return ok(paginate([note_view(row) for row in rows], offset, limit))


@router.post("/api/pilot/notes", status_code=201)
def create_note(body: NoteCreate, user=Depends(require_user)):
    payload = body.model_dump(mode="json")
    key = payload.pop("client_request_id")
    values = checked_text(payload, ("title", "body"))
    with db.transaction() as conn:
        replay = db.idempotent(conn, user, "note_create", key, values)
        if replay is not None:
            return ok({"note": note_view(own_document(conn, "pilot_notes", replay["id"], user))})
        identifier, timestamp = db.new_id(), db.now()
        conn.execute("INSERT INTO pilot_notes(id,organization_id,user_id,title,body,pinned,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                     (identifier, user["organization_id"], user["id"], values["title"], values["body"], int(values["pinned"]), timestamp, timestamp))
        db.audit(conn, user, "note_created", "note", identifier)
        # Remember the identity, never another copy of private note content.
        db.remember(conn, user, "note_create", key, values, {"id": identifier})
        return ok({"note": note_view(own_document(conn, "pilot_notes", identifier, user))})


@router.get("/api/pilot/notes/{note_id}")
def get_note(note_id: str, user=Depends(require_user)):
    with db.read() as conn:
        return ok({"note": note_view(own_document(conn, "pilot_notes", note_id, user))})


@router.patch("/api/pilot/notes/{note_id}")
def patch_note(note_id: str, body: NotePatch, user=Depends(require_user)):
    changes = body.model_dump(exclude_unset=True)
    expected = changes.pop("expected_version")
    if not changes or any(value is None for value in changes.values()):
        fail(422, "changes_required")
    with db.transaction() as conn:
        current = own_document(conn, "pilot_notes", note_id, user)
        db.check_version(current, expected)
        values = checked_text({**current, **changes}, ("title", "body"))
        conn.execute("UPDATE pilot_notes SET title=?,body=?,pinned=?,version=version+1,updated_at=? WHERE id=? AND organization_id=? AND user_id=?",
                     (values["title"], values["body"], int(values["pinned"]), db.now(), note_id, user["organization_id"], user["id"]))
        db.audit(conn, user, "note_updated", "note", note_id, {"previous_version": expected})
        return ok({"note": note_view(own_document(conn, "pilot_notes", note_id, user))})


def delete_document(table, kind, identifier, expected, user):
    with db.transaction() as conn:
        current = own_document(conn, table, identifier, user)
        db.check_version(current, expected)
        conn.execute(f"DELETE FROM {table} WHERE id=? AND organization_id=? AND user_id=?",
                     (identifier, user["organization_id"], user["id"]))
        db.audit(conn, user, kind + "_deleted", kind, identifier, {"previous_version": expected})
        return ok({"deleted": True, "id": identifier})


@router.delete("/api/pilot/notes/{note_id}")
def delete_note(note_id: str, body: VersionIn, user=Depends(require_user)):
    return delete_document("pilot_notes", "note", note_id, body.expected_version, user)


@router.get("/api/pilot/diary")
def list_diary(from_date: str | None = Query(None, alias="from"), to: str | None = None,
               cursor: str | None = None, limit: int = Query(25, ge=1, le=100), user=Depends(require_user)):
    offset = page_offset(cursor)
    start, end = date_range(from_date, to)
    with db.read() as conn:
        rows = conn.execute("SELECT * FROM pilot_diary_entries WHERE organization_id=? AND user_id=? AND entry_date BETWEEN ? AND ? ORDER BY entry_date DESC,updated_at DESC,id DESC LIMIT ? OFFSET ?",
                            (user["organization_id"], user["id"], start, end, limit + 1, offset)).fetchall()
        return ok(paginate([dict(row) for row in rows], offset, limit))


def checked_diary(conn, values, user):
    values = checked_text(values, ("answer_1", "answer_2", "answer_3"))
    valid_day(values["entry_date"])
    if values.get("tour_id"):
        scoped_tour(conn, user, values["tour_id"])
    return values


@router.post("/api/pilot/diary", status_code=201)
def create_diary(body: DiaryCreate, user=Depends(require_user)):
    payload = body.model_dump(mode="json")
    key = payload.pop("client_request_id")
    with db.transaction() as conn:
        values = checked_diary(conn, payload, user)
        replay = db.idempotent(conn, user, "diary_create", key, values)
        if replay is not None:
            return ok({"entry": own_document(conn, "pilot_diary_entries", replay["id"], user)})
        identifier, timestamp = db.new_id(), db.now()
        conn.execute("INSERT INTO pilot_diary_entries(id,organization_id,user_id,entry_date,tour_id,answer_1,answer_2,answer_3,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                     (identifier, user["organization_id"], user["id"], values["entry_date"], values.get("tour_id"), values["answer_1"], values["answer_2"], values["answer_3"], timestamp, timestamp))
        db.audit(conn, user, "diary_created", "diary", identifier)
        db.remember(conn, user, "diary_create", key, values, {"id": identifier})
        return ok({"entry": own_document(conn, "pilot_diary_entries", identifier, user)})


@router.get("/api/pilot/diary/{entry_id}")
def get_diary(entry_id: str, user=Depends(require_user)):
    with db.read() as conn:
        return ok({"entry": own_document(conn, "pilot_diary_entries", entry_id, user)})


@router.patch("/api/pilot/diary/{entry_id}")
def patch_diary(entry_id: str, body: DiaryPatch, user=Depends(require_user)):
    changes = body.model_dump(exclude_unset=True)
    expected = changes.pop("expected_version")
    if not changes:
        fail(422, "changes_required")
    with db.transaction() as conn:
        current = own_document(conn, "pilot_diary_entries", entry_id, user)
        db.check_version(current, expected)
        values = checked_diary(conn, {**current, **changes}, user)
        conn.execute("UPDATE pilot_diary_entries SET entry_date=?,tour_id=?,answer_1=?,answer_2=?,answer_3=?,version=version+1,updated_at=? WHERE id=? AND organization_id=? AND user_id=?",
                     (values["entry_date"], values["tour_id"], values["answer_1"], values["answer_2"], values["answer_3"], db.now(), entry_id, user["organization_id"], user["id"]))
        db.audit(conn, user, "diary_updated", "diary", entry_id, {"previous_version": expected})
        return ok({"entry": own_document(conn, "pilot_diary_entries", entry_id, user)})


@router.delete("/api/pilot/diary/{entry_id}")
def delete_diary(entry_id: str, body: VersionIn, user=Depends(require_user)):
    return delete_document("pilot_diary_entries", "diary", entry_id, body.expected_version, user)


def public_member(row):
    return {key: row[key] for key in ("id", "display_name", "email", "status", "locale")} | {"role": row["pilot_role"]}


@router.get("/api/pilot/owner/team")
def team(period: str = "today", anchor_date: str | None = None, cursor: str | None = None,
         limit: int = Query(25, ge=1, le=100), user=Depends(require_owner)):
    offset = page_offset(cursor)
    with db.read() as conn:
        rows = conn.execute("SELECT * FROM users WHERE organization_id=? AND pilot_role='representative' ORDER BY display_name,id LIMIT ? OFFSET ?",
                            (user["organization_id"], limit + 1, offset)).fetchall()
        result = []
        for row in rows[:limit]:
            member = {**dict(row), "role": "representative"}
            result.append({"user": public_member(row), "metrics": metrics_for_user(conn, member, period, anchor_date), "progress": progress_summary(conn, member)})
        return ok({"items": result, "next_cursor": paginate(list(rows), offset, limit)["next_cursor"]})


@router.get("/api/pilot/owner/team/{user_id}")
def team_member(user_id: str, period: str = "today", anchor_date: str | None = None, user=Depends(require_owner)):
    from .learning import _request_view
    with db.read() as conn:
        row = conn.execute("SELECT * FROM users WHERE id=? AND organization_id=? AND pilot_role='representative'",
                           (user_id, user["organization_id"])).fetchone()
        if row is None:
            fail(404, "not_found")
        member = {**dict(row), "role": "representative"}
        metrics = metrics_for_user(conn, member, period, anchor_date)
        tours = conn.execute("SELECT * FROM pilot_tours WHERE organization_id=? AND user_id=? AND occurred_on BETWEEN ? AND ? ORDER BY occurred_on DESC,id DESC LIMIT 100",
                             (user["organization_id"], user_id, metrics["activity_period"]["from"], metrics["activity_period"]["to"])).fetchall()
        lessons = conn.execute("SELECT c.lesson_id,c.published_revision_id,c.completed_at,l.status,r.title_en,r.title_es FROM pilot_lesson_completions c JOIN pilot_lessons l ON l.id=c.lesson_id AND l.organization_id=c.organization_id JOIN pilot_lesson_revisions r ON r.id=c.published_revision_id AND r.organization_id=c.organization_id WHERE c.organization_id=? AND c.user_id=? ORDER BY c.completed_at DESC LIMIT 100",
                               (user["organization_id"], user_id)).fetchall()
        requests = conn.execute("SELECT * FROM pilot_access_requests WHERE organization_id=? AND user_id=? ORDER BY created_at DESC LIMIT 100",
                                (user["organization_id"], user_id)).fetchall()
        # No join to private notes, diary or legacy free-text fields.
        return ok({"user": public_member(row), "metrics": metrics, "progress": progress_summary(conn, member),
                   "tours": [tour_view(tour) for tour in tours], "lessons": [dict(item) for item in lessons],
                   "requests": [_request_view(conn, item) for item in requests]})


def settings_view(row):
    return {key: row[key] for key in ("app_name", "welcome_title_en", "welcome_title_es", "version")}


@router.get("/api/pilot/owner/settings")
def get_settings(user=Depends(require_owner)):
    with db.read() as conn:
        row = conn.execute("SELECT * FROM pilot_organizations WHERE id=?", (user["organization_id"],)).fetchone()
        return ok({"settings": settings_view(row)})


@router.patch("/api/pilot/owner/settings")
def patch_settings(body: SettingsPatch, user=Depends(require_owner)):
    changes = body.model_dump(exclude_unset=True)
    expected = changes.pop("expected_version")
    if not changes:
        fail(422, "changes_required")
    for field, value in changes.items():
        if field == "welcome_title_es" and (value is None or not value.strip()):
            changes[field] = None
            continue
        if not isinstance(value, str) or not value.strip() or re.search(r"<[^>]*>", value):
            fail(422, "invalid_brand_text", {field: "plain_text_required"})
        changes[field] = value.strip()
    with db.transaction() as conn:
        current = conn.execute("SELECT * FROM pilot_organizations WHERE id=?", (user["organization_id"],)).fetchone()
        db.check_version(current, expected)
        values = {**dict(current), **changes}
        conn.execute("UPDATE pilot_organizations SET app_name=?,welcome_title_en=?,welcome_title_es=?,version=version+1,updated_at=? WHERE id=?",
                     (values["app_name"], values["welcome_title_en"], values["welcome_title_es"], db.now(), user["organization_id"]))
        db.audit(conn, user, "organization_brand_updated", "organization", user["organization_id"], {"previous_version": expected, "fields": sorted(changes)})
        return ok({"settings": settings_view(conn.execute("SELECT * FROM pilot_organizations WHERE id=?", (user["organization_id"],)).fetchone())})
