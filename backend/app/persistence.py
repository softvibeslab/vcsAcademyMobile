from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


DB_PATH = Path(os.environ.get("VCSA_DB_PATH", "backend/data/vcsa.sqlite3"))
SESSION_TTL_DAYS = int(os.environ.get("VCSA_SESSION_TTL_DAYS", "7"))


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def json_dumps(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True)


def json_loads(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    return json.loads(value)


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"pbkdf2_sha256${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, encoded_salt, encoded_digest = stored_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    salt = base64.b64decode(encoded_salt)
    expected = base64.b64decode(encoded_digest)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return secrets.compare_digest(actual, expected)


def init_db() -> None:
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                roles_json TEXT NOT NULL,
                team_id TEXT,
                permissions_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS training_progress (
                user_id TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                status TEXT NOT NULL,
                progress_percent INTEGER NOT NULL,
                completed_at TEXT,
                PRIMARY KEY(user_id, entity_type, entity_id)
            );

            CREATE TABLE IF NOT EXISTS goalsheet_entries (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                entry_date TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, entry_date)
            );

            CREATE TABLE IF NOT EXISTS roleplay_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS roleplay_submissions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY,
                actor_user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_id TEXT NOT NULL,
                outcome TEXT NOT NULL,
                metadata_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS resources (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                sensitivity TEXT NOT NULL,
                requires_access_grant INTEGER NOT NULL DEFAULT 0,
                body TEXT NOT NULL,
                tags_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'published',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS certification_decisions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                manager_user_id TEXT NOT NULL,
                status TEXT NOT NULL,
                notes TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_goalsheet_user_date ON goalsheet_entries(user_id, entry_date);
            CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON audit_events(actor_user_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_certification_user_created ON certification_decisions(user_id, created_at);
            """
        )
    seed_demo_data()


def row_to_user(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "display_name": row["display_name"],
        "roles": json_loads(row["roles_json"], []),
        "team_id": row["team_id"],
        "permissions": json_loads(row["permissions_json"], []),
        "status": row["status"],
    }


def upsert_seed_user(
    user_id: str,
    email: str,
    display_name: str,
    roles: list[str],
    permissions: list[str],
    team_id: str = "team_demo",
) -> None:
    now = datetime.utcnow().isoformat()
    with connect() as db:
        db.execute(
            """
            INSERT INTO users (
                id, email, display_name, password_hash, roles_json, team_id,
                permissions_json, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                display_name = excluded.display_name,
                roles_json = excluded.roles_json,
                team_id = excluded.team_id,
                permissions_json = excluded.permissions_json,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                email,
                display_name,
                hash_password("demo123"),
                json_dumps(roles),
                team_id,
                json_dumps(permissions),
                "active",
                now,
                now,
            ),
        )


def seed_demo_data() -> None:
    now = datetime.utcnow().isoformat()
    upsert_seed_user(
        "user_demo_rep",
        "rep@vcsa.local",
        "Chris Rivera",
        ["sales_rep"],
        ["resource:step-5-script:read"],
    )
    upsert_seed_user(
        "user_demo_manager",
        "manager@vcsa.local",
        "Maya Torres",
        ["manager", "trainer"],
        ["resource:step-5-script:read", "resource:pricing-guide:read"],
    )
    upsert_seed_user(
        "user_demo_admin",
        "admin@vcsa.local",
        "Admin Demo",
        ["admin"],
        ["resource:step-5-script:read", "resource:pricing-guide:read", "resource:finance-worksheet:read"],
    )
    with connect() as db:
        db.execute(
            """
            INSERT OR REPLACE INTO training_progress (
                user_id, entity_type, entity_id, status, progress_percent, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("user_demo_rep", "blueprint_step", "step_1", "completed", 100, now),
        )
        default_resources = [
            (
                "step-5-script",
                "Step 5 Practice Script",
                "script",
                "practice_script",
                0,
                "Use this as training language for practicing a clear, respectful commitment check.",
                ["blueprint", "step-5", "practice"],
            ),
            (
                "pricing-guide",
                "T.O. Pricing Guide",
                "policy",
                "pricing_or_fee_related",
                1,
                "Approved pricing materials only. This content is restricted to authorized leaders.",
                ["pricing", "sensitive", "to"],
            ),
            (
                "finance-worksheet",
                "Finance Worksheet",
                "worksheet",
                "finance",
                1,
                "Internal finance worksheet. Use only with approved access and current source documents.",
                ["finance", "sensitive"],
            ),
        ]
        for resource in default_resources:
            db.execute(
                """
                INSERT INTO resources (
                    id, title, resource_type, sensitivity, requires_access_grant, body,
                    tags_json, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    resource_type = excluded.resource_type,
                    sensitivity = excluded.sensitivity,
                    requires_access_grant = excluded.requires_access_grant,
                    body = excluded.body,
                    tags_json = excluded.tags_json,
                    status = excluded.status,
                    updated_at = excluded.updated_at
                """,
                (*resource[:6], json_dumps(resource[6]), now, now),
            )


def list_users() -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT * FROM users ORDER BY display_name").fetchall()
        return [row_to_user(row) for row in rows if row_to_user(row)]


def get_user(user_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return row_to_user(row)


def save_user(user: dict[str, Any], password: str | None = None) -> dict[str, Any]:
    now = datetime.utcnow().isoformat()
    user_id = user.get("id") or f"user_{secrets.token_hex(6)}"
    password_hash = hash_password(password or "demo123")
    with connect() as db:
        existing = db.execute("SELECT id, password_hash, created_at FROM users WHERE id = ? OR lower(email) = lower(?)", (user_id, user["email"])).fetchone()
        if existing:
            user_id = existing["id"]
        db.execute(
            """
            INSERT INTO users (
                id, email, display_name, password_hash, roles_json, team_id,
                permissions_json, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                email = excluded.email,
                display_name = excluded.display_name,
                password_hash = excluded.password_hash,
                roles_json = excluded.roles_json,
                team_id = excluded.team_id,
                permissions_json = excluded.permissions_json,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                user["email"],
                user["display_name"],
                existing["password_hash"] if existing and not password else password_hash,
                json_dumps(user.get("roles", ["sales_rep"])),
                user.get("team_id", "team_demo"),
                json_dumps(user.get("permissions", [])),
                user.get("status", "active"),
                existing["created_at"] if existing else now,
                now,
            ),
        )
    saved = get_user(user_id)
    if not saved:
        raise RuntimeError("Failed to save user")
    return saved


def authenticate(email: str, password: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT * FROM users WHERE lower(email) = lower(?) AND status = 'active'", (email,)).fetchone()
        if not row or not verify_password(password, row["password_hash"]):
            return None
        return row_to_user(row)


def create_session(user_id: str) -> dict[str, Any]:
    now = datetime.utcnow()
    expires_at = now + timedelta(days=SESSION_TTL_DAYS)
    token = secrets.token_urlsafe(32)
    with connect() as db:
        db.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now.isoformat(), expires_at.isoformat()),
        )
    return {"token": token, "expires_at": expires_at.isoformat()}


def get_user_by_token(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    with connect() as db:
        row = db.execute(
            """
            SELECT users.*
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ? AND sessions.expires_at > ?
            """,
            (token, datetime.utcnow().isoformat()),
        ).fetchone()
        return row_to_user(row)


def delete_session(token: str) -> None:
    with connect() as db:
        db.execute("DELETE FROM sessions WHERE token = ?", (token,))


def get_completed_step_ids(user_id: str) -> set[str]:
    with connect() as db:
        rows = db.execute(
            """
            SELECT entity_id FROM training_progress
            WHERE user_id = ? AND entity_type = 'blueprint_step' AND status = 'completed'
            """,
            (user_id,),
        ).fetchall()
        return {row["entity_id"] for row in rows}


def complete_step(user_id: str, step_id: str) -> None:
    now = datetime.utcnow().isoformat()
    with connect() as db:
        db.execute(
            """
            INSERT INTO training_progress (
                user_id, entity_type, entity_id, status, progress_percent, completed_at
            ) VALUES (?, 'blueprint_step', ?, 'completed', 100, ?)
            ON CONFLICT(user_id, entity_type, entity_id) DO UPDATE SET
                status = excluded.status,
                progress_percent = excluded.progress_percent,
                completed_at = excluded.completed_at
            """,
            (user_id, step_id, now),
        )


def upsert_goalsheet(user_id: str, entry_date: str, payload: dict[str, Any]) -> dict[str, Any]:
    now = datetime.utcnow().isoformat()
    entry_id = f"gs_{user_id}_{entry_date}"
    payload = {**payload, "id": entry_id, "user_id": user_id, "updated_at": now}
    with connect() as db:
        created = db.execute(
            "SELECT created_at FROM goalsheet_entries WHERE user_id = ? AND entry_date = ?",
            (user_id, entry_date),
        ).fetchone()
        db.execute(
            """
            INSERT INTO goalsheet_entries (id, user_id, entry_date, payload_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, entry_date) DO UPDATE SET
                payload_json = excluded.payload_json,
                updated_at = excluded.updated_at
            """,
            (entry_id, user_id, entry_date, json_dumps(payload), created["created_at"] if created else now, now),
        )
    return payload


def get_goalsheet(user_id: str, entry_date: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute(
            "SELECT payload_json FROM goalsheet_entries WHERE user_id = ? AND entry_date = ?",
            (user_id, entry_date),
        ).fetchone()
        return json_loads(row["payload_json"], None) if row else None


def list_goalsheets(user_id: str) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            "SELECT payload_json FROM goalsheet_entries WHERE user_id = ? ORDER BY entry_date DESC",
            (user_id,),
        ).fetchall()
        return [json_loads(row["payload_json"], {}) for row in rows]


def list_all_goalsheets() -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT payload_json FROM goalsheet_entries ORDER BY entry_date DESC").fetchall()
        return [json_loads(row["payload_json"], {}) for row in rows]


def save_roleplay_session(session: dict[str, Any]) -> dict[str, Any]:
    now = datetime.utcnow().isoformat()
    payload = {**session, "updated_at": now}
    with connect() as db:
        created = db.execute("SELECT created_at FROM roleplay_sessions WHERE id = ?", (session["id"],)).fetchone()
        db.execute(
            """
            INSERT INTO roleplay_sessions (id, user_id, payload_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at
            """,
            (session["id"], session["user_id"], json_dumps(payload), created["created_at"] if created else now, now),
        )
    return payload


def get_roleplay_session(session_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT payload_json FROM roleplay_sessions WHERE id = ?", (session_id,)).fetchone()
        return json_loads(row["payload_json"], None) if row else None


def save_roleplay_submission(submission: dict[str, Any]) -> dict[str, Any]:
    now = datetime.utcnow().isoformat()
    payload = {**submission, "updated_at": now}
    with connect() as db:
        created = db.execute("SELECT created_at FROM roleplay_submissions WHERE id = ?", (submission["id"],)).fetchone()
        db.execute(
            """
            INSERT INTO roleplay_submissions (id, user_id, payload_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at
            """,
            (submission["id"], submission["user_id"], json_dumps(payload), created["created_at"] if created else now, now),
        )
    return payload


def get_roleplay_submission(submission_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT payload_json FROM roleplay_submissions WHERE id = ?", (submission_id,)).fetchone()
        return json_loads(row["payload_json"], None) if row else None


def list_roleplay_submissions(status: str | None = None) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT payload_json FROM roleplay_submissions ORDER BY created_at DESC").fetchall()
        submissions = [json_loads(row["payload_json"], {}) for row in rows]
        if status:
            submissions = [item for item in submissions if item.get("status") == status]
        return submissions


def row_to_resource(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "title": row["title"],
        "resource_type": row["resource_type"],
        "sensitivity": row["sensitivity"],
        "requires_access_grant": bool(row["requires_access_grant"]),
        "body": row["body"],
        "tags": json_loads(row["tags_json"], []),
        "status": row["status"],
        "updated_at": row["updated_at"],
    }


def list_resources(include_unpublished: bool = False) -> list[dict[str, Any]]:
    with connect() as db:
        if include_unpublished:
            rows = db.execute("SELECT * FROM resources ORDER BY title").fetchall()
        else:
            rows = db.execute("SELECT * FROM resources WHERE status = 'published' ORDER BY title").fetchall()
        return [item for row in rows if (item := row_to_resource(row))]


def get_resource(resource_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT * FROM resources WHERE id = ?", (resource_id,)).fetchone()
        return row_to_resource(row)


def save_resource(resource: dict[str, Any]) -> dict[str, Any]:
    now = datetime.utcnow().isoformat()
    resource_id = resource.get("id") or f"res_{secrets.token_hex(6)}"
    with connect() as db:
        existing = db.execute("SELECT created_at FROM resources WHERE id = ?", (resource_id,)).fetchone()
        db.execute(
            """
            INSERT INTO resources (
                id, title, resource_type, sensitivity, requires_access_grant, body,
                tags_json, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                resource_type = excluded.resource_type,
                sensitivity = excluded.sensitivity,
                requires_access_grant = excluded.requires_access_grant,
                body = excluded.body,
                tags_json = excluded.tags_json,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (
                resource_id,
                resource["title"],
                resource.get("resource_type", "article"),
                resource.get("sensitivity", "general_training"),
                1 if resource.get("requires_access_grant", False) else 0,
                resource.get("body", ""),
                json_dumps(resource.get("tags", [])),
                resource.get("status", "published"),
                existing["created_at"] if existing else now,
                now,
            ),
        )
    saved = get_resource(resource_id)
    if not saved:
        raise RuntimeError("Failed to save resource")
    return saved


def save_certification_decision(decision: dict[str, Any]) -> dict[str, Any]:
    now = datetime.utcnow().isoformat()
    payload = {**decision, "id": decision.get("id") or f"cert_{secrets.token_hex(6)}", "created_at": now}
    with connect() as db:
        db.execute(
            """
            INSERT INTO certification_decisions (id, user_id, manager_user_id, status, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (payload["id"], payload["user_id"], payload["manager_user_id"], payload["status"], payload.get("notes", ""), now),
        )
    return payload


def list_certification_decisions(user_id: str | None = None) -> list[dict[str, Any]]:
    with connect() as db:
        if user_id:
            rows = db.execute("SELECT * FROM certification_decisions WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
        else:
            rows = db.execute("SELECT * FROM certification_decisions ORDER BY created_at DESC").fetchall()
        return [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "manager_user_id": row["manager_user_id"],
                "status": row["status"],
                "notes": row["notes"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]


def add_audit_event(event: dict[str, Any]) -> None:
    with connect() as db:
        db.execute(
            """
            INSERT INTO audit_events (
                id, actor_user_id, action, target_type, target_id, outcome, metadata_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event["id"],
                event["actor_user_id"],
                event["action"],
                event["target_type"],
                event["target_id"],
                event["outcome"],
                json_dumps(event.get("metadata", {})),
                event["timestamp"],
            ),
        )


def list_audit_events() -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT * FROM audit_events ORDER BY created_at DESC").fetchall()
        return [
            {
                "id": row["id"],
                "actor_user_id": row["actor_user_id"],
                "action": row["action"],
                "target_type": row["target_type"],
                "target_id": row["target_id"],
                "timestamp": row["created_at"],
                "outcome": row["outcome"],
                "metadata": json_loads(row["metadata_json"], {}),
            }
            for row in rows
        ]
