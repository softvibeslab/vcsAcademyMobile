"""SQLite persistence with short, explicit transactions and immutable publications."""

from __future__ import annotations
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import sqlite3


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


@contextmanager
def database(root, write=False):
    con = sqlite3.connect(Path(root) / "growth.sqlite", timeout=15)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    try:
        if write:
            con.execute("BEGIN IMMEDIATE")
        yield con
        if write:
            con.commit()
    except BaseException:
        if write:
            con.rollback()
        raise
    finally:
        con.close()


def initialize(root, seed=None):
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    os.chmod(root, 0o700)
    with database(root) as con:
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript("""
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT NOT NULL UNIQUE COLLATE NOCASE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','editor')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS draft(singleton INTEGER PRIMARY KEY CHECK(singleton=1),document TEXT NOT NULL,revision INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS publications(id INTEGER PRIMARY KEY,document TEXT NOT NULL,created_at TEXT NOT NULL,author TEXT NOT NULL,checksum TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS state(singleton INTEGER PRIMARY KEY CHECK(singleton=1),publication_id INTEGER NOT NULL REFERENCES publications(id));
        CREATE TABLE IF NOT EXISTS resource_slugs(id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor_id INTEGER,action TEXT NOT NULL,entity_id TEXT,created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS demo_requests(id TEXT PRIMARY KEY,idempotency_hash TEXT NOT NULL UNIQUE,body_hash TEXT NOT NULL,email TEXT NOT NULL,role TEXT NOT NULL,room_count TEXT NOT NULL,need TEXT NOT NULL,contact_consent_at TEXT NOT NULL,marketing_opt_in INTEGER NOT NULL,privacy_version TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS events(event_id TEXT PRIMARY KEY,flow_id TEXT,event TEXT NOT NULL,resource_id TEXT,placement TEXT,consent_version TEXT,received_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);
        INSERT OR IGNORE INTO schema_version VALUES(1);
        """)
        con.commit()
    os.chmod(root / "growth.sqlite", 0o600)
    if seed is not None:
        with database(root, True) as con:
            if con.execute("SELECT 1 FROM draft").fetchone() is None:
                data = encode(seed)
                con.execute("INSERT INTO draft VALUES(1,?,1)", (data,))
                cur = con.execute(
                    "INSERT INTO publications(document,created_at,author,checksum) VALUES(?,?,?,?)",
                    (data, now(), "Contenido inicial aprobado", digest(data)),
                )
                con.execute("INSERT INTO state VALUES(1,?)", (cur.lastrowid,))
                for r in seed["resources"]:
                    if r["status"] == "published":
                        con.execute(
                            "INSERT INTO resource_slugs VALUES(?,?)",
                            (r["id"], r["slug"]),
                        )


def audit(con, actor, action, entity=None):
    con.execute(
        "INSERT INTO audit(actor_id,action,entity_id,created_at) VALUES(?,?,?,?)",
        (actor, action, str(entity) if entity is not None else None, now()),
    )


def draft_state(con):
    row = con.execute(
        "SELECT document,revision FROM draft WHERE singleton=1"
    ).fetchone()
    active = con.execute(
        "SELECT publication_id FROM state WHERE singleton=1"
    ).fetchone()
    return {
        "document": json.loads(row["document"]),
        "revision": row["revision"],
        "publishedRevision": active["publication_id"],
    }


def published(con):
    row = con.execute(
        "SELECT p.* FROM publications p JOIN state s ON p.id=s.publication_id WHERE s.singleton=1"
    ).fetchone()
    return json.loads(row["document"])


def purge_expired_data(data_root, now_override=None):
    """Apply v1 retention without touching editorial publications or staff accounts.

    Run from the local operator command/scheduler. Demo requests expire 90 days
    after their latest status update, analytics and audit entries after 30 days.
    Backups have their own rotation policy; this never opens operational stores.
    """
    instant = now_override or datetime.now(timezone.utc)
    if not isinstance(instant, datetime) or instant.tzinfo is None:
        raise ValueError("now_override must be a timezone-aware datetime.")
    instant = instant.astimezone(timezone.utc)
    old_requests = (instant - timedelta(days=90)).isoformat(timespec="seconds")
    old_events = (instant - timedelta(days=30)).isoformat(timespec="seconds")
    with database(data_root, True) as con:
        result = {
            "requests": con.execute(
                "DELETE FROM demo_requests WHERE updated_at<?", (old_requests,)
            ).rowcount,
            "events": con.execute(
                "DELETE FROM events WHERE received_at<?", (old_events,)
            ).rowcount,
            "sessions": con.execute(
                "DELETE FROM sessions WHERE expires<=?", (int(instant.timestamp()),)
            ).rowcount,
            "rateLimits": con.execute(
                "DELETE FROM rate_limits WHERE expires<=?", (int(instant.timestamp()),)
            ).rowcount,
            "audit": con.execute(
                "DELETE FROM audit WHERE created_at<?", (old_events,)
            ).rowcount,
        }
        # Additive advisor tables exist only in deployments with the advisor module.
        tables = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "advisor_sessions" in tables:
            result["advisorSessions"] = con.execute(
                "DELETE FROM advisor_sessions WHERE expires<=?", (int(instant.timestamp()),)
            ).rowcount
        if "advisor_leads" in tables:
            result["advisorLeads"] = con.execute(
                "DELETE FROM advisor_leads WHERE updated_at<?", (old_requests,)
            ).rowcount
    return result
