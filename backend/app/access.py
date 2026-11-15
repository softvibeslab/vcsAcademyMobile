"""Niveles de acceso Público / Gratis / Premium (historia HU-AISALES-ACCESO-01).

Cada lección, escenario, función o recurso tiene un nivel que el admin cambia. El servidor
decide qué abre cada quien; el contenido bloqueado nunca viaja al cliente.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sqlite3
import time
from datetime import date, datetime, timedelta
from typing import Any

from backend.app import persistence

LEVELS = ("publico", "gratis", "premium")
STAFF_ROLES = {"admin", "manager", "to_manager", "trainer", "coach"}
OPENS = {
    "visitante": {"publico"},
    "gratis": {"publico", "gratis"},
    "premium": {"publico", "gratis", "premium"},
    "staff": {"publico", "gratis", "premium"},
}
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


class Limiter:
    """Límite simple en memoria por clave (IP + acción) y minuto."""

    def __init__(self, limit: int = 5, window: int = 60) -> None:
        self.limit, self.window, self.hits = limit, window, {}

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        # Barre claves vencidas para que el diccionario no crezca con cada IP vista.
        self.hits = {k: v for k, v in self.hits.items() if v and now - v[-1] < self.window}
        recent = [t for t in self.hits.get(key, []) if now - t < self.window]
        if len(recent) >= self.limit:
            self.hits[key] = recent
            return False
        self.hits[key] = [*recent, now]
        return True


limiter = Limiter()


# ---------- esquema ----------

def _columns(db: sqlite3.Connection, table: str) -> set[str]:
    return {row["name"] for row in db.execute(f"PRAGMA table_info({table})")}


def init_schema(lessons: list[tuple[str, int, str, str]], scenarios: list[dict[str, Any]]) -> None:
    """Migración idempotente + elementos por defecto (no pisa lo que el admin ya cambió)."""
    now = datetime.utcnow().isoformat()
    with persistence.connect() as db:
        cols = _columns(db, "users")
        if "plan" not in cols:
            db.execute("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'gratis'")
            # Solo al migrar: rep demo Premium sin vencimiento (Q-07). Después manda el admin.
            db.execute("UPDATE users SET plan = 'premium' WHERE id = 'user_demo_rep'")
        if "plan_expires_at" not in cols:
            db.execute("ALTER TABLE users ADD COLUMN plan_expires_at TEXT")
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS access_items (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                ref_id TEXT NOT NULL,
                title TEXT NOT NULL,
                level TEXT NOT NULL,
                visible INTEGER NOT NULL DEFAULT 1,
                sort INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS license_redemptions (
                code_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                redeemed_at TEXT NOT NULL,
                PRIMARY KEY (code_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS license_codes (
                id TEXT PRIMARY KEY,
                code_hash TEXT NOT NULL UNIQUE,
                hint TEXT NOT NULL,
                plan_days INTEGER NOT NULL,
                max_uses INTEGER NOT NULL,
                uses INTEGER NOT NULL DEFAULT 0,
                expires_at TEXT NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        defaults: list[tuple[str, str, str, str, str, int]] = []
        for step_id, number, title, _desc in lessons:
            level = "publico" if number == 1 else "gratis" if number <= 3 else "premium"
            defaults.append((f"lesson:{step_id}", "leccion", step_id, f"{number} · {title}", level, number))
        for i, scenario in enumerate(scenarios):
            defaults.append((f"scenario:{scenario['id']}", "escenario", scenario["id"], scenario["title"], "premium", 100 + i))
        for i, (ref, title, level) in enumerate((
            ("coach", "AI Sales Coach", "publico"),
            ("calculators", "Calculadoras", "publico"),
            ("goalsheet", "Goal Sheet", "gratis"),
            ("notebook", "Notebook y Diario", "gratis"),
        )):
            defaults.append((f"function:{ref}", "funcion", ref, title, level, 200 + i))
        for i, res in enumerate(db.execute("SELECT id, title, requires_access_grant FROM resources ORDER BY title").fetchall()):
            defaults.append((f"resource:{res['id']}", "recurso", res["id"], res["title"], "premium" if res["requires_access_grant"] else "gratis", 300 + i))
        db.executemany(
            "INSERT OR IGNORE INTO access_items (id, kind, ref_id, title, level, visible, sort, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
            [(*d, now) for d in defaults],
        )


# ---------- reglas ----------

def tier(user: dict[str, Any] | None, today: date | None = None) -> str:
    if not user:
        return "visitante"
    if STAFF_ROLES.intersection(user.get("roles", [])):
        return "staff"
    if user.get("plan") == "premium":
        expires = user.get("plan_expires_at")
        if not expires or date.fromisoformat(expires[:10]) >= (today or date.today()):
            return "premium"
    return "gratis"


def can_open(level: str, user_tier: str) -> bool:
    return level in OPENS.get(user_tier, set())


def plan_view(user: dict[str, Any]) -> dict[str, Any]:
    return {**user, "plan": user.get("plan") or "gratis", "plan_expires_at": user.get("plan_expires_at"), "tier": tier(user)}


# ---------- elementos ----------

def _row_item(row: sqlite3.Row) -> dict[str, Any]:
    return {"id": row["id"], "kind": row["kind"], "ref_id": row["ref_id"], "title": row["title"], "level": row["level"], "visible": bool(row["visible"]), "updated_at": row["updated_at"]}


def list_items() -> list[dict[str, Any]]:
    with persistence.connect() as db:
        return [_row_item(r) for r in db.execute("SELECT * FROM access_items ORDER BY sort, title")]


def get_item(item_id: str) -> dict[str, Any] | None:
    with persistence.connect() as db:
        row = db.execute("SELECT * FROM access_items WHERE id = ?", (item_id,)).fetchone()
        return _row_item(row) if row else None


def ensure_resource_item(resource: dict[str, Any]) -> dict[str, Any]:
    item_id = f"resource:{resource['id']}"
    found = get_item(item_id)
    if found:
        return found
    with persistence.connect() as db:
        db.execute(
            "INSERT OR IGNORE INTO access_items (id, kind, ref_id, title, level, visible, sort, updated_at) VALUES (?, 'recurso', ?, ?, ?, 1, 399, ?)",
            (item_id, resource["id"], resource["title"], "premium" if resource.get("requires_access_grant") else "gratis", datetime.utcnow().isoformat()),
        )
    return get_item(item_id) or {}


def update_item(item_id: str, level: str | None, visible: bool | None) -> dict[str, Any] | None:
    if not get_item(item_id):
        return None
    with persistence.connect() as db:
        if level is not None:
            db.execute("UPDATE access_items SET level = ?, updated_at = ? WHERE id = ?", (level, datetime.utcnow().isoformat(), item_id))
        if visible is not None:
            db.execute("UPDATE access_items SET visible = ?, updated_at = ? WHERE id = ?", (1 if visible else 0, datetime.utcnow().isoformat(), item_id))
    return get_item(item_id)


def decide(item_id: str, user: dict[str, Any] | None) -> dict[str, Any]:
    """{'exists', 'visible', 'level', 'allowed'} para un elemento y un usuario."""
    found = get_item(item_id)
    if not found:
        return {"exists": False, "visible": False, "level": "premium", "allowed": False}
    user_tier = tier(user)
    visible = found["visible"] or user_tier == "staff" and "admin" in (user or {}).get("roles", [])
    return {"exists": True, "visible": visible, "level": found["level"], "allowed": visible and can_open(found["level"], user_tier)}


def catalog(user: dict[str, Any] | None) -> dict[str, Any]:
    user_tier = tier(user)
    is_admin = "admin" in (user or {}).get("roles", [])
    items = [
        {**{k: i[k] for k in ("id", "kind", "ref_id", "title", "level", "visible")}, "allowed": can_open(i["level"], user_tier)}
        for i in list_items()
        if i["visible"] or is_admin
    ]
    return {"tier": user_tier, "items": items}


# ---------- usuarios ----------

def set_plan(user_id: str, plan: str, expires_at: str | None) -> dict[str, Any] | None:
    with persistence.connect() as db:
        db.execute("UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = ? WHERE id = ?", (plan, expires_at, datetime.utcnow().isoformat(), user_id))
    user = persistence.get_user(user_id)
    return plan_view(user) if user else None


# ---------- códigos ----------

def _secret() -> bytes:
    """Clave del HMAC de códigos: VCSA_CODE_SECRET o un archivo 0600 junto a la base (fuera de la tabla)."""
    env = os.environ.get("VCSA_CODE_SECRET")
    if env:
        return env.encode("utf-8")
    path = persistence.DB_PATH.parent / ".license-secret"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(secrets.token_hex(32))
    return path.read_text().strip().encode("utf-8")


def _normalize(code: str) -> str:
    return code.strip().upper()


def _hash(code: str) -> str:
    return hmac.new(_secret(), _normalize(code).encode("utf-8"), hashlib.sha256).hexdigest()


def _legacy_hash(code: str) -> str:
    return hashlib.sha256(_normalize(code).encode("utf-8")).hexdigest()


def _row_code(row: sqlite3.Row, today: date) -> dict[str, Any]:
    if row["revoked"]:
        status = "revocado"
    elif row["uses"] >= row["max_uses"]:
        status = "usado"
    elif date.fromisoformat(row["expires_at"]) < today:
        status = "vencido"
    else:
        status = "activo"
    return {"id": row["id"], "hint": row["hint"], "plan_days": row["plan_days"], "max_uses": row["max_uses"], "uses": row["uses"],
            "expires_at": row["expires_at"], "revoked": bool(row["revoked"]), "status": status, "created_at": row["created_at"]}


def create_code(plan_days: int, max_uses: int, expires_at: str, created_by: str) -> dict[str, Any]:
    raw = "".join(secrets.choice(CODE_ALPHABET) for _ in range(12))
    code = f"SA-{raw[:4]}-{raw[4:8]}-{raw[8:]}"
    code_id = f"lic_{secrets.token_hex(6)}"
    with persistence.connect() as db:
        db.execute(
            "INSERT INTO license_codes (id, code_hash, hint, plan_days, max_uses, uses, expires_at, revoked, created_by, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, ?)",
            (code_id, _hash(code), code[-4:], plan_days, max_uses, expires_at, created_by, datetime.utcnow().isoformat()),
        )
        row = db.execute("SELECT * FROM license_codes WHERE id = ?", (code_id,)).fetchone()
    return {**_row_code(row, date.today()), "code": code}


def list_codes() -> list[dict[str, Any]]:
    with persistence.connect() as db:
        return [_row_code(r, date.today()) for r in db.execute("SELECT * FROM license_codes ORDER BY created_at DESC")]


def revoke_code(code_id: str) -> dict[str, Any] | None:
    with persistence.connect() as db:
        db.execute("UPDATE license_codes SET revoked = 1 WHERE id = ?", (code_id,))
        row = db.execute("SELECT * FROM license_codes WHERE id = ?", (code_id,)).fetchone()
    return _row_code(row, date.today()) if row else None


def redeem(user: dict[str, Any], code: str, today: date | None = None) -> tuple[dict[str, Any] | None, str]:
    """Canjea un código. Devuelve (usuario, "") o (None, "invalid" | "repeat" | "permanent").

    Todo ocurre en una transacción IMMEDIATE: dos canjes simultáneos se serializan, el vencimiento
    se calcula con el plan vigente en la base y un mismo usuario no puede repetir un código.
    """
    today = today or date.today()
    connection = persistence.connect()
    try:
        connection.isolation_level = None
        db = connection
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT * FROM license_codes WHERE code_hash IN (?, ?)", (_hash(code), _legacy_hash(code))).fetchone()
        if not row or _row_code(row, today)["status"] != "activo":
            db.execute("ROLLBACK")
            return None, "invalid"
        fresh = db.execute("SELECT plan, plan_expires_at FROM users WHERE id = ?", (user["id"],)).fetchone()
        if fresh["plan"] == "premium" and not fresh["plan_expires_at"]:
            db.execute("ROLLBACK")
            return None, "permanent"
        if db.execute("SELECT 1 FROM license_redemptions WHERE code_id = ? AND user_id = ?", (row["id"], user["id"])).fetchone():
            db.execute("ROLLBACK")
            return None, "repeat"
        claimed = db.execute(
            "UPDATE license_codes SET uses = uses + 1 WHERE id = ? AND revoked = 0 AND uses < max_uses AND expires_at >= ?",
            (row["id"], today.isoformat()),
        ).rowcount
        if not claimed:
            db.execute("ROLLBACK")
            return None, "invalid"
        db.execute("INSERT INTO license_redemptions (code_id, user_id, redeemed_at) VALUES (?, ?, ?)", (row["id"], user["id"], datetime.utcnow().isoformat()))
        current = fresh["plan_expires_at"] if fresh["plan"] == "premium" else None
        start = max(today, date.fromisoformat(current[:10])) if current else today
        expires = (start + timedelta(days=row["plan_days"])).isoformat()
        db.execute("UPDATE users SET plan = 'premium', plan_expires_at = ?, updated_at = ? WHERE id = ?", (expires, datetime.utcnow().isoformat(), user["id"]))
        db.execute("COMMIT")
    except Exception:
        if connection.in_transaction:
            connection.execute("ROLLBACK")
        raise
    finally:
        connection.close()
    return plan_view(persistence.get_user(user["id"])), ""
