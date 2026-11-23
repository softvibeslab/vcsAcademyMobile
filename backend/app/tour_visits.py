"""Private V1 visit records. The model never writes this repository directly."""
from __future__ import annotations

import base64
import hashlib
import json
from datetime import date, datetime, timedelta, timezone
from typing import Literal
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from backend.app import persistence

CANCUN = ZoneInfo("America/Cancun")
LEASE_SECONDS = 60
SUMMARY_FIELDS = ("id", "title", "status", "event_date", "scheduled_at", "started_at", "completed_at", "cancelled_at", "revision")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def stamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="microseconds")


def problem(status: int, code: str, message: str):
    raise HTTPException(status_code=status, detail={"code": code, "message": message})


def invalid(message="Los campos no corresponden a esta acción."):
    problem(422, "invalid_visit", message)


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def valid_unicode(cls, values):
        def inspect(value):
            if isinstance(value, str):
                try:
                    value.encode("utf-8")
                except UnicodeEncodeError:
                    # Do not include an unencodable input in Pydantic's error
                    # response: even serializing that response would fail.
                    invalid("El texto debe contener caracteres Unicode válidos.")
            elif isinstance(value, dict):
                for key, item in value.items():
                    inspect(key)
                    inspect(item)
            elif isinstance(value, list):
                for item in value:
                    inspect(item)
        inspect(values)
        return values


class Feedback(StrictInput):
    happened: str = Field(min_length=1, max_length=4000, strict=True)
    worked: str = Field(default="", max_length=2000, strict=True)
    improve_next: str = Field(default="", max_length=2000, strict=True)

    @field_validator("happened")
    @classmethod
    def meaningful(cls, value):
        if not value.strip():
            raise ValueError("Cuéntanos qué pasó.")
        return value


class VisitFields(StrictInput):
    title: str | None = Field(default=None, max_length=120, strict=True)
    context: str | None = Field(default=None, max_length=6000, strict=True)
    scheduled_at: datetime | None = None
    feedback: Feedback | None = None

    @field_validator("scheduled_at", mode="before")
    @classmethod
    def iso_time(cls, value):
        if value is not None and not isinstance(value, (str, datetime)):
            raise ValueError("Usa una fecha ISO8601 con zona horaria.")
        if isinstance(value, str):
            try:
                datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                raise ValueError("Usa una fecha ISO8601 con zona horaria.") from None
        return value

    @field_validator("scheduled_at")
    @classmethod
    def aware_time(cls, value):
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("La fecha debe incluir su zona horaria.")
        return value


class CreateVisit(VisitFields):
    request_id: UUID
    intent: Literal["start", "schedule", "reflect"]
    context: str = Field(default="", max_length=6000, strict=True)


class Mutation(StrictInput):
    request_id: UUID
    expected_revision: int = Field(ge=1, strict=True)


class UpdateVisit(VisitFields):
    request_id: UUID
    expected_revision: int = Field(ge=1, strict=True)
    action: Literal["edit", "start", "reflect", "cancel"]
    completed_at: datetime | None = None

    @field_validator("completed_at", mode="before")
    @classmethod
    def iso_completion(cls, value):
        return VisitFields.iso_time(value)

    @field_validator("completed_at")
    @classmethod
    def aware_completion(cls, value):
        return VisitFields.aware_time(value)


def init_schema() -> None:
    # Called by the legacy main only; the pilot/V5 initializer remains unchanged.
    with persistence.connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS tour_visits (
            id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
            status TEXT NOT NULL, scheduled_at TEXT, started_at TEXT,
            completed_at TEXT, cancelled_at TEXT, event_date TEXT NOT NULL,
            context TEXT NOT NULL, feedback_json TEXT, revision INTEGER NOT NULL,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tour_visits_owner_date ON tour_visits(user_id,event_date,id);
        CREATE INDEX IF NOT EXISTS idx_tour_visits_expiry ON tour_visits(expires_at);
        CREATE TABLE IF NOT EXISTS tour_visit_analyses (
            visit_id TEXT NOT NULL, context_revision INTEGER NOT NULL,
            status TEXT NOT NULL, payload_json TEXT, lease_id TEXT,
            lease_until TEXT, PRIMARY KEY(visit_id,context_revision)
        );
        CREATE TABLE IF NOT EXISTS tour_visit_requests (
            user_id TEXT NOT NULL, request_id TEXT NOT NULL, operation TEXT NOT NULL,
            input_hash TEXT NOT NULL, visit_id TEXT, revision INTEGER,
            status TEXT NOT NULL, lease_id TEXT, lease_until TEXT, expires_at TEXT,
            PRIMARY KEY(user_id,request_id)
        );
        CREATE INDEX IF NOT EXISTS idx_tour_requests_visit ON tour_visit_requests(visit_id);
        """)


def _empty_analysis(revision, status):
    return {"context_revision": revision, "status": status, "summary": "", "strengths": "", "improvement": "", "next_practice": "", "recommended_steps": [], "provider": "hermes", "generated_at": None}


def _analysis(db, visit_id):
    row = db.execute("SELECT * FROM tour_visit_analyses WHERE visit_id=? ORDER BY context_revision DESC LIMIT 1", (visit_id,)).fetchone()
    if not row:
        return None
    result = json.loads(row["payload_json"]) if row["payload_json"] else _empty_analysis(row["context_revision"], row["status"])
    result["status"] = row["status"]
    return result


def _view(db, row, detail=True):
    result = {field: row[field] for field in SUMMARY_FIELDS}
    analysis = _analysis(db, row["id"])
    result["analysis_status"] = analysis["status"] if analysis else None
    if detail:
        result.update({field: row[field] for field in ("context", "created_at", "updated_at", "expires_at")})
        result["feedback"] = json.loads(row["feedback_json"]) if row["feedback_json"] else None
        result["analysis"] = analysis
    return result


def _owned(db, user_id, visit_id, now):
    row = db.execute("SELECT * FROM tour_visits WHERE id=? AND user_id=? AND expires_at>?", (visit_id, user_id, stamp(now))).fetchone()
    if not row:
        problem(404, "visit_not_found", "La visita no existe o ya no está disponible.")
    return row


def get_visit(user_id: str, visit_id: str):
    with persistence.connect() as db:
        return _view(db, _owned(db, user_id, visit_id, utcnow()))


def _hash(payload):
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _request(db, user_id, request_id, operation, payload, now):
    previous = db.execute("SELECT * FROM tour_visit_requests WHERE user_id=? AND request_id=?", (user_id, request_id)).fetchone()
    digest = _hash(payload)
    if previous and previous["status"] == "deleted" and previous["expires_at"] <= stamp(now):
        db.execute("DELETE FROM tour_visit_requests WHERE user_id=? AND request_id=?", (user_id, request_id))
        previous = None
    if previous:
        if previous["status"] == "deleted":
            problem(410, "request_deleted", "Esta solicitud pertenece a una visita eliminada.")
        if previous["operation"] != operation or previous["input_hash"] != digest:
            problem(409, "request_conflict", "La solicitud ya se usó con otros datos.")
        if previous["visit_id"]:
            record = db.execute("SELECT expires_at FROM tour_visits WHERE id=? AND user_id=?", (previous["visit_id"], user_id)).fetchone()
            if not record or record["expires_at"] <= stamp(now):
                problem(410, "request_deleted", "Esta solicitud pertenece a una visita eliminada.")
    return previous, digest


def _remember(db, user_id, request_id, operation, digest, visit_id, revision, status="ready", lease_id=None, lease_until=None):
    db.execute("""INSERT INTO tour_visit_requests (user_id,request_id,operation,input_hash,visit_id,revision,status,lease_id,lease_until)
        VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,request_id) DO UPDATE SET
        visit_id=excluded.visit_id, revision=excluded.revision,status=excluded.status,
        lease_id=excluded.lease_id,lease_until=excluded.lease_until""",
        (user_id, request_id, operation, digest, visit_id, revision, status, lease_id, lease_until))


def _validate_content(context, feedback):
    values = [context] + list((feedback or {}).values())
    if sum(len(item) for item in values) > 10000 or sum(len(item.encode("utf-8")) for item in values) > 24000:
        invalid("El contexto y feedback admiten juntos hasta 10000 caracteres y 24000 bytes UTF-8.")


def _past(value, now):
    if value is None or value > now or value <= now - timedelta(days=30):
        invalid("Confirma una fecha pasada dentro de los últimos 30 días.")
    return value


def _future(value, now):
    if value is None or value <= now:
        invalid("Elige una fecha y hora futuras.")
    return value


def _write(db, record):
    columns = list(record)
    db.execute(f"INSERT INTO tour_visits ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})", tuple(record.values()))


def create_visit(user_id: str, payload: CreateVisit):
    now = utcnow()
    request_id = str(payload.request_id)
    data = payload.model_dump(mode="json", exclude_unset=True)
    with persistence.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        previous, digest = _request(db, user_id, request_id, "create", data, now)
        if previous:
            return _view(db, _owned(db, user_id, previous["visit_id"], now)), False
        feedback = payload.feedback.model_dump() if payload.feedback else None
        if payload.intent == "start":
            if "feedback" in payload.model_fields_set or (payload.scheduled_at and payload.scheduled_at > now):
                invalid()
            event, status = now, "in_progress"
        elif payload.intent == "schedule":
            if "feedback" in payload.model_fields_set:
                invalid()
            event, status = _future(payload.scheduled_at, now), "scheduled"
        else:
            if feedback is None:
                invalid("Registra qué pasó en la visita.")
            event, status = _past(payload.scheduled_at, now), "completed"
        _validate_content(payload.context, feedback)
        record = {"id": str(uuid4()), "user_id": user_id, "title": payload.title or "", "status": status,
            "scheduled_at": stamp(event) if status == "scheduled" else None,
            "started_at": stamp(event) if status == "in_progress" else None,
            "completed_at": stamp(event) if status == "completed" else None, "cancelled_at": None,
            "event_date": event.astimezone(CANCUN).date().isoformat(), "context": payload.context,
            "feedback_json": json.dumps(feedback, ensure_ascii=False) if feedback else None,
            "revision": 1, "created_at": stamp(now), "updated_at": stamp(now), "expires_at": stamp(event + timedelta(days=30))}
        _write(db, record)
        _remember(db, user_id, request_id, "create", digest, record["id"], 1)
        return _view(db, record), True


def _revision(row, expected):
    if row["revision"] != expected:
        problem(409, "visit_conflict", "La visita cambió. Recarga antes de guardar.")


def update_visit(user_id: str, visit_id: str, payload: UpdateVisit):
    now = utcnow()
    data = payload.model_dump(mode="json", exclude_unset=True)
    operation = "update:" + visit_id
    with persistence.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        row = _owned(db, user_id, visit_id, now)
        previous, digest = _request(db, user_id, str(payload.request_id), operation, data, now)
        if previous:
            return _view(db, row)
        _revision(row, payload.expected_revision)
        record = dict(row)
        if record["status"] == "cancelled":
            invalid("Una visita cancelada sólo se puede consultar o eliminar.")
        allowed = {"request_id", "expected_revision", "action"}
        if payload.action == "edit":
            allowed.update({"title", "context"})
            if row["status"] == "scheduled":
                allowed.add("scheduled_at")
            if row["status"] == "completed":
                allowed.add("feedback")
        elif payload.action == "reflect":
            allowed.update({"feedback", "completed_at"})
        if payload.model_fields_set - allowed:
            invalid()
        if any(data.get(field) is None for field in payload.model_fields_set - {"request_id", "expected_revision", "action"}):
            invalid("Los campos enviados no pueden ser nulos.")
        if payload.action == "edit":
            if not payload.model_fields_set - {"request_id", "expected_revision", "action"}:
                invalid("Selecciona qué quieres editar.")
            for key in ("title", "context"):
                if key in payload.model_fields_set:
                    record[key] = getattr(payload, key)
            if "scheduled_at" in payload.model_fields_set:
                event = _future(payload.scheduled_at, now)
                record.update(scheduled_at=stamp(event), event_date=event.astimezone(CANCUN).date().isoformat(), expires_at=stamp(event + timedelta(days=30)))
            if "feedback" in payload.model_fields_set:
                record["feedback_json"] = json.dumps(payload.feedback.model_dump(), ensure_ascii=False)
        elif payload.action == "start":
            if row["status"] != "scheduled":
                invalid("Sólo se puede iniciar una visita programada.")
            record.update(status="in_progress", started_at=stamp(now), event_date=now.astimezone(CANCUN).date().isoformat(), expires_at=stamp(now + timedelta(days=30)))
        elif payload.action == "reflect":
            if row["status"] not in {"scheduled", "in_progress"} or payload.feedback is None:
                invalid()
            event = _past(payload.completed_at, now)
            if row["started_at"] and event <= datetime.fromisoformat(row["started_at"]):
                invalid("La finalización debe ser posterior al inicio.")
            record.update(status="completed", completed_at=stamp(event), feedback_json=json.dumps(payload.feedback.model_dump(), ensure_ascii=False), expires_at=stamp(event + timedelta(days=30)))
            if not row["started_at"]:
                record["event_date"] = event.astimezone(CANCUN).date().isoformat()
        elif payload.action == "cancel":
            if row["status"] not in {"scheduled", "in_progress"}:
                invalid("Sólo puedes cancelar una visita programada o en curso.")
            record.update(status="cancelled", cancelled_at=stamp(now), expires_at=stamp(now + timedelta(days=30)))
        _validate_content(record["context"], json.loads(record["feedback_json"]) if record["feedback_json"] else None)
        record.update(revision=row["revision"] + 1, updated_at=stamp(now))
        fields = [key for key in record if key not in {"id", "user_id"}]
        db.execute(f"UPDATE tour_visits SET {','.join(key+'=?' for key in fields)} WHERE id=? AND user_id=?", tuple(record[key] for key in fields) + (visit_id, user_id))
        db.execute("UPDATE tour_visit_analyses SET status='stale', lease_id=NULL, lease_until=NULL WHERE visit_id=?", (visit_id,))
        _remember(db, user_id, str(payload.request_id), operation, digest, visit_id, record["revision"])
        return _view(db, record)


def _remove(db, visit_id, now):
    # Explicit transaction covers all children; legacy connections have FK enforcement off.
    db.execute("DELETE FROM tour_visit_analyses WHERE visit_id=?", (visit_id,))
    db.execute("UPDATE tour_visit_requests SET status='deleted',visit_id=NULL,revision=NULL,lease_id=NULL,lease_until=NULL,expires_at=? WHERE visit_id=?", (stamp(now + timedelta(days=31)), visit_id))
    db.execute("DELETE FROM tour_visits WHERE id=?", (visit_id,))


def delete_visit(user_id: str, visit_id: str, payload: Mutation):
    now = utcnow()
    with persistence.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        operation = "delete:" + visit_id
        previous, digest = _request(db, user_id, str(payload.request_id), operation, payload.model_dump(mode="json"), now)
        row = _owned(db, user_id, visit_id, now)
        _revision(row, payload.expected_revision)
        _remember(db, user_id, str(payload.request_id), operation, digest, visit_id, row["revision"])
        _remove(db, visit_id, now)
    return {"deleted": True, "id": visit_id}


def list_visits(user_id: str, start: date, end: date, limit=50, cursor=None):
    if end < start or (end - start).days > 92:
        invalid("El rango debe abarcar de 1 a 93 días.")
    scope = _hash([user_id, start.isoformat(), end.isoformat()])
    after = None
    if cursor:
        try:
            if len(cursor) > 2000:
                raise ValueError()
            token = json.loads(base64.urlsafe_b64decode(cursor.encode()))
            after = token["after"]
            if token["scope"] != scope or not isinstance(after, list) or len(after) != 3 or not all(isinstance(item, str) for item in after):
                raise ValueError()
            date.fromisoformat(after[0])
            datetime.fromisoformat(after[1])
            UUID(after[2])
        except (ValueError, TypeError, KeyError, UnicodeError):
            invalid("El cursor no corresponde a este rango o cuenta.")
    order_time = "COALESCE(started_at,completed_at,scheduled_at,created_at)"
    sql = "SELECT * FROM tour_visits WHERE user_id=? AND event_date>=? AND event_date<=? AND expires_at>?"
    args = [user_id, start.isoformat(), end.isoformat(), stamp(utcnow())]
    if after:
        sql += f" AND (event_date,{order_time},id)>(?,?,?)"
        args.extend(after)
    sql += f" ORDER BY event_date,{order_time},id LIMIT ?"
    args.append(limit + 1)
    with persistence.connect() as db:
        rows = db.execute(sql, args).fetchall()
        page = rows[:limit]
        next_cursor = None
        if len(rows) > limit:
            last = page[-1]
            token = {"scope": scope, "after": [last["event_date"], last["started_at"] or last["completed_at"] or last["scheduled_at"] or last["created_at"], last["id"]]}
            next_cursor = base64.urlsafe_b64encode(json.dumps(token, separators=(",", ":")).encode()).decode()
        return {"visits": [_view(db, row, False) for row in page], "next_cursor": next_cursor}


def begin_analysis(user_id: str, visit_id: str, payload: Mutation):
    now = utcnow()
    with persistence.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        row = _owned(db, user_id, visit_id, now)
        if row["status"] == "cancelled":
            invalid("Una visita cancelada sólo se puede consultar o eliminar.")
        operation = "analysis:" + visit_id
        previous, digest = _request(db, user_id, str(payload.request_id), operation, payload.model_dump(mode="json"), now)
        _revision(row, payload.expected_revision)
        current = db.execute("SELECT * FROM tour_visit_analyses WHERE visit_id=? AND context_revision=?", (visit_id, row["revision"])).fetchone()
        if previous and previous["status"] == "ready" and current and current["status"] == "ready":
            return _view(db, row), None, _analysis(db, visit_id)
        if current and current["status"] == "pending" and current["lease_until"] > stamp(now):
            problem(429, "coach_busy", "El análisis sigue en curso. Intenta de nuevo en unos segundos.")
        lease_id = str(uuid4())
        lease_until = stamp(now + timedelta(seconds=LEASE_SECONDS))
        db.execute("""INSERT INTO tour_visit_analyses(visit_id,context_revision,status,lease_id,lease_until)
            VALUES(?,?,'pending',?,?) ON CONFLICT(visit_id,context_revision) DO UPDATE SET
            status='pending',payload_json=NULL,lease_id=excluded.lease_id,lease_until=excluded.lease_until""", (visit_id, row["revision"], lease_id, lease_until))
        _remember(db, user_id, str(payload.request_id), operation, digest, visit_id, row["revision"], "pending", lease_id, lease_until)
        return _view(db, row), lease_id, None


def finish_analysis(user_id: str, visit_id: str, revision: int, lease_id: str, analysis: dict | None):
    now = utcnow()
    with persistence.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        row = _owned(db, user_id, visit_id, now)
        _revision(row, revision)
        current = db.execute("SELECT * FROM tour_visit_analyses WHERE visit_id=? AND context_revision=?", (visit_id, revision)).fetchone()
        if not current or current["lease_id"] != lease_id or current["status"] != "pending":
            problem(409, "visit_conflict", "El análisis ya no corresponde a esta revisión. Intenta de nuevo.")
        status = "ready" if analysis else "failed"
        if analysis:
            analysis = {**analysis, "context_revision": revision, "status": "ready", "provider": "hermes", "generated_at": stamp(now)}
        db.execute("UPDATE tour_visit_analyses SET status=?,payload_json=?,lease_id=NULL,lease_until=NULL WHERE visit_id=? AND context_revision=?", (status, json.dumps(analysis, ensure_ascii=False) if analysis else None, visit_id, revision))
        db.execute("UPDATE tour_visit_requests SET status=?,lease_id=NULL,lease_until=NULL WHERE user_id=? AND lease_id=?", (status, user_id, lease_id))
        return analysis or _empty_analysis(revision, status)


def purge_expired(now: datetime | None = None) -> dict[str, int]:
    now = now or utcnow()
    with persistence.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        rows = db.execute("SELECT id FROM tour_visits WHERE expires_at<=?", (stamp(now),)).fetchall()
        for row in rows:
            _remove(db, row["id"], now)
        requests = db.execute("DELETE FROM tour_visit_requests WHERE status='deleted' AND expires_at<=?", (stamp(now),)).rowcount
    return {"visits_deleted": len(rows), "requests_deleted": requests}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="V1 visit retention maintenance")
    parser.add_argument("--purge", required=True, action="store_true")
    parser.parse_args()
    print(json.dumps(purge_expired()))
