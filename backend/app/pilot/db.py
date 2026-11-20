"""Scoped SQLite access. No connection, migration, or seed occurs at import."""
import hashlib
import json
import os
import sqlite3
import threading
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

from .errors import fail

# The middleware chooses this ID; clients cannot assign audit correlation IDs.
request_id_context = ContextVar("pilot_request_id", default=None)
# SQLite has one writer. Queue threads in the application process instead of
# racing independent connections through SQLite's busy-handler backoff. Other
# processes still use BEGIN IMMEDIATE and the busy timeout; reads never lock here.
_write_lock = threading.RLock()


def new_id():
    return str(uuid4())


def now():
    return datetime.now(timezone.utc).isoformat()


def today():
    return datetime.now(ZoneInfo("America/Cancun")).date().isoformat()


def connect():
    path = Path(os.environ.get("VCSA_DB_PATH", "backend/data/academy.sqlite3"))
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=15000")
    # FULL sync retains commit durability with the persistent WAL journal.
    conn.execute("PRAGMA synchronous=FULL")
    return conn


@contextmanager
def read():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def transaction():
    with _write_lock:
        conn = connect()
        try:
            conn.execute("BEGIN IMMEDIATE")
            yield conn
            conn.commit()
        except BaseException:
            conn.rollback()
            raise
        finally:
            conn.close()


def check_version(row, expected):
    if row is None:
        fail(404, "not_found")
    if not isinstance(expected, int) or isinstance(expected, bool) or row["version"] != expected:
        fail(409, "version_conflict")


def audit(conn, user, action, target_type, target_id, metadata=None):
    conn.execute("""INSERT INTO pilot_audit
        (id,organization_id,actor_id,action,target_type,target_id,metadata_json,created_at,request_id)
        VALUES (?,?,?,?,?,?,?,?,?)""", (
        new_id(), user.get("organization_id"), user.get("id", "operator"), action,
        target_type, target_id, json.dumps(metadata or {}, sort_keys=True), now(), request_id_context.get() or new_id()))


def payload_hash(payload):
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode()).hexdigest()


def idempotent(conn, user, operation, key, payload):
    if not key or not isinstance(key, str) or len(key) > 100:
        fail(422, "request_id_required")
    row = conn.execute("SELECT * FROM pilot_idempotency WHERE organization_id=? AND user_id=? AND operation=? AND request_key=?", (user["organization_id"], user["id"], operation, key)).fetchone()
    if row:
        if row["payload_hash"] != payload_hash(payload):
            fail(409, "idempotency_conflict")
        return json.loads(row["result_json"])
    return None


def remember(conn, user, operation, key, payload, data):
    conn.execute("INSERT INTO pilot_idempotency VALUES (?,?,?,?,?,?,?)", (user["organization_id"], user["id"], operation, key, payload_hash(payload), json.dumps(data, default=str), now()))


def initialize():
    """Additive identity migration; preserves legacy tables and never seeds users."""
    # Change journal mode once at initialization, outside a transaction. WAL
    # lets private reads proceed while another request refreshes its session;
    # authorization still checks and writes last_seen_at on every request.
    with read() as conn:
        if conn.execute("PRAGMA journal_mode").fetchone()[0].lower() != "wal":
            mode = conn.execute("PRAGMA journal_mode=WAL").fetchone()[0]
            if mode.lower() != "wal":
                raise RuntimeError("pilot_wal_unavailable")
    with transaction() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL, roles_json TEXT NOT NULL DEFAULT '[]', team_id TEXT,
            permissions_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL)""")
        columns = {r[1] for r in conn.execute("PRAGMA table_info(users)")}
        for name, definition in {
            "organization_id": "TEXT", "pilot_role": "TEXT", "locale": "TEXT NOT NULL DEFAULT 'en'",
            "must_change_password": "INTEGER NOT NULL DEFAULT 1", "password_expires_at": "REAL",
            "session_version": "INTEGER NOT NULL DEFAULT 1",
        }.items():
            if name not in columns:
                conn.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")
        statements = [
            """CREATE TABLE IF NOT EXISTS pilot_organizations (
                id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'active',
                name TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'America/Cancun', currency TEXT NOT NULL DEFAULT 'USD',
                app_name TEXT NOT NULL, welcome_title_en TEXT NOT NULL, welcome_title_es TEXT,
                version INTEGER NOT NULL DEFAULT 1, roadmap_seed_version INTEGER NOT NULL DEFAULT 0,
                catalog_version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)""",
            """CREATE TABLE IF NOT EXISTS pilot_allowed_emails (
                id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES pilot_organizations(id),
                email_normalized TEXT NOT NULL UNIQUE, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
                user_id TEXT UNIQUE REFERENCES users(id), version INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL)""",
            """CREATE TABLE IF NOT EXISTS pilot_sessions (
                id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
                organization_id TEXT NOT NULL REFERENCES pilot_organizations(id), session_version INTEGER NOT NULL,
                csrf_token TEXT NOT NULL, created_at REAL NOT NULL, last_seen_at REAL NOT NULL,
                expires_at REAL NOT NULL, revoked_at REAL)""",
            """CREATE TABLE IF NOT EXISTS pilot_audit (
                id TEXT PRIMARY KEY, organization_id TEXT, actor_id TEXT NOT NULL, action TEXT NOT NULL,
                target_type TEXT NOT NULL, target_id TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL,
                request_id TEXT)""",
            """CREATE TABLE IF NOT EXISTS pilot_idempotency (
                organization_id TEXT NOT NULL, user_id TEXT NOT NULL, operation TEXT NOT NULL,
                request_key TEXT NOT NULL, payload_hash TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL,
                PRIMARY KEY(organization_id,user_id,operation,request_key))""",
            """CREATE TABLE IF NOT EXISTS pilot_login_failures (
                scope_hash TEXT NOT NULL, occurred_at REAL NOT NULL)""",
            "CREATE INDEX IF NOT EXISTS pilot_login_window ON pilot_login_failures(scope_hash,occurred_at)",
            "CREATE TABLE IF NOT EXISTS pilot_schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
        ]
        for statement in statements:
            conn.execute(statement)
        audit_columns = {row[1] for row in conn.execute("PRAGMA table_info(pilot_audit)")}
        if "request_id" not in audit_columns:
            conn.execute("ALTER TABLE pilot_audit ADD COLUMN request_id TEXT")
        conn.execute("INSERT OR IGNORE INTO pilot_schema_migrations VALUES (1,?)", (now(),))
        conn.execute("INSERT OR IGNORE INTO pilot_schema_migrations VALUES (2,?)", (now(),))
