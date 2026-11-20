"""Allowlisted identity, revocable cookies, and CSRF for the private pilot."""
import hashlib
import os
import secrets
import time
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from backend.app.persistence import hash_password, verify_password
from . import db
from .errors import fail, ok

router = APIRouter()


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Login(StrictModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class PasswordChange(StrictModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class Recovery(StrictModel):
    email: str = Field(min_length=3, max_length=254)


def secure_cookie():
    return os.environ.get("PILOT_SECURE_COOKIE", "true").lower() != "false"


def cookie_name():
    return "__Host-aisales_session" if secure_cookie() else "aisales_test_session"


def fingerprint(value):
    return hashlib.sha256(value.encode()).hexdigest()


def check_origin(request):
    allowed = {s.strip() for s in os.environ.get("PILOT_ORIGIN", "https://aisales.softvibes.pro").split(",") if s.strip()}
    if request.headers.get("origin") not in allowed:
        fail(403, "origin_not_allowed")


def public_user(user):
    return {key: user.get(key) for key in ("id", "display_name", "email", "organization_id", "locale", "must_change_password")} | {"role": user.get("pilot_role", user.get("role"))}


def session_payload(conn, user, csrf):
    organization = conn.execute("SELECT id,app_name,welcome_title_en,welcome_title_es,version FROM pilot_organizations WHERE id=?", (user["organization_id"],)).fetchone()
    return {"user": public_user(user), "organization": dict(organization), "must_change_password": bool(user["must_change_password"]), "csrf_token": csrf}


def create_session(conn, user, response):
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    epoch = time.time()
    conn.execute("INSERT INTO pilot_sessions VALUES (?,?,?,?,?,?,?,?,?,NULL)", (
        db.new_id(), fingerprint(token), user["id"], user["organization_id"], user["session_version"], csrf, epoch, epoch, epoch+8*3600))
    response.set_cookie(cookie_name(), token, max_age=8*3600, httponly=True, secure=secure_cookie(), samesite="lax", path="/")
    return session_payload(conn, user, csrf)


def authenticated(request: Request, allow_temporary=False):
    token = request.cookies.get(cookie_name(), "")
    if not token:
        fail(401, "authentication_required")
    with db.transaction() as conn:
        row = conn.execute("""SELECT u.*,s.id AS session_id,s.csrf_token,s.expires_at AS session_expires,
            s.last_seen_at,s.revoked_at,s.session_version AS token_version,s.organization_id AS session_org,
            a.status AS allow_status,a.role AS allowed_role,o.status AS org_status
            FROM pilot_sessions s JOIN users u ON u.id=s.user_id
            JOIN pilot_allowed_emails a ON a.user_id=u.id AND a.organization_id=u.organization_id
            JOIN pilot_organizations o ON o.id=u.organization_id WHERE s.token_hash=?""", (fingerprint(token),)).fetchone()
        epoch = time.time()
        if (not row or row["status"] != "active" or row["allow_status"] != "active" or row["org_status"] != "active"
            or row["revoked_at"] is not None or row["session_expires"] <= epoch or row["last_seen_at"]+1800 <= epoch
            or row["token_version"] != row["session_version"] or row["session_org"] != row["organization_id"]
            or row["allowed_role"] != row["pilot_role"]):
            fail(401, "session_expired")
        if row["must_change_password"] and row["password_expires_at"] and row["password_expires_at"] <= epoch:
            fail(401, "temporary_password_expired")
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            check_origin(request)
            if not secrets.compare_digest(request.headers.get("x-csrf-token", ""), row["csrf_token"]):
                fail(403, "csrf_invalid")
        if row["must_change_password"] and not allow_temporary:
            fail(403, "password_change_required")
        conn.execute("UPDATE pilot_sessions SET last_seen_at=? WHERE id=?", (epoch, row["session_id"]))
        user = dict(row)
        user["role"] = user["pilot_role"]
        return user


def require_user(request: Request):
    return authenticated(request)


def require_owner(user=Depends(require_user)):
    if user["role"] != "owner":
        fail(403, "owner_required")
    return user


@router.post("/api/auth/login")
def login(payload: Login, request: Request, response: Response):
    check_origin(request)
    email = payload.email.strip().lower()
    ip = request.client.host if request.client else "unknown"
    if os.environ.get("PILOT_TRUST_PROXY") == "true":
        ip = request.headers.get("x-real-ip", ip)
    scopes = [(fingerprint("email:"+email), 5), (fingerprint("ip:"+ip), 30)]
    epoch = time.time()
    with db.transaction() as conn:
        conn.execute("DELETE FROM pilot_login_failures WHERE occurred_at<?", (epoch-900,))
        for scope, maximum in scopes:
            if conn.execute("SELECT count(*) FROM pilot_login_failures WHERE scope_hash=?", (scope,)).fetchone()[0] >= maximum:
                fail(429, "login_rate_limited")
        row = conn.execute("""SELECT u.*,a.status AS allow_status,a.role AS allowed_role,o.status AS org_status
            FROM users u LEFT JOIN pilot_allowed_emails a ON a.user_id=u.id AND a.organization_id=u.organization_id
            LEFT JOIN pilot_organizations o ON o.id=u.organization_id WHERE lower(u.email)=?""", (email,)).fetchone()
        eligible = bool(row and row["status"] == "active" and row["allow_status"] == "active" and row["org_status"] == "active" and row["pilot_role"] in {"owner", "representative"} and row["allowed_role"] == row["pilot_role"])
        valid = False
        if row:
            try:
                valid = verify_password(payload.password, row["password_hash"])
            except (ValueError, TypeError):
                valid = False
        else:
            hash_password(payload.password, b"pilot-login-salt")
        expired = bool(row and row["must_change_password"] and row["password_expires_at"] and row["password_expires_at"] <= epoch)
        if not eligible or not valid or expired:
            for scope, _ in scopes:
                conn.execute("INSERT INTO pilot_login_failures VALUES (?,?)", (scope, epoch))
            error = "access_not_available" if not eligible else "temporary_password_expired" if expired else "invalid_credentials"
            data = None
        else:
            user = dict(row)
            data = create_session(conn, user, response)
            db.audit(conn, user, "login", "user", user["id"])
            conn.execute("DELETE FROM pilot_login_failures WHERE scope_hash=?", (scopes[0][0],))
            error = None
    if error:
        fail(401, error)
    return ok(data)


@router.get("/api/mobile/me")
def me(request: Request):
    user = authenticated(request, allow_temporary=True)
    with db.read() as conn:
        return ok(session_payload(conn, user, user["csrf_token"]))


@router.post("/api/auth/change-password")
def change_password(payload: PasswordChange, request: Request, response: Response):
    user = authenticated(request, allow_temporary=True)
    if not verify_password(payload.current_password, user["password_hash"]):
        fail(400, "current_password_incorrect")
    if payload.current_password == payload.new_password:
        fail(422, "password_must_change")
    password_hash = hash_password(payload.new_password)
    with db.transaction() as conn:
        result = conn.execute("UPDATE users SET password_hash=?,must_change_password=0,password_expires_at=NULL,session_version=session_version+1,updated_at=? WHERE id=? AND password_hash=? AND session_version=?", (password_hash, db.now(), user["id"], user["password_hash"], user["session_version"]))
        if result.rowcount != 1:
            fail(409, "version_conflict")
        conn.execute("UPDATE pilot_sessions SET revoked_at=? WHERE user_id=?", (time.time(), user["id"]))
        updated = dict(conn.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone())
        db.audit(conn, user, "password_changed", "user", user["id"])
        data = create_session(conn, updated, response)
    return ok(data)


@router.post("/api/auth/forgot-password")
def forgot_password(payload: Recovery, request: Request):
    check_origin(request)
    return ok({"delivery": "manual", "code": "contact_administrator"})


@router.post("/api/auth/logout")
def logout(request: Request, response: Response):
    check_origin(request)
    if request.cookies.get(cookie_name()):
        try:
            user = authenticated(request, allow_temporary=True)
        except Exception as exc:
            if getattr(exc, "status_code", None) != 401:
                raise
        else:
            with db.transaction() as conn:
                conn.execute("UPDATE pilot_sessions SET revoked_at=? WHERE id=?", (time.time(), user["session_id"]))
                db.audit(conn, user, "logout", "session", user["session_id"])
    response.delete_cookie(cookie_name(), httponly=True, secure=secure_cookie(), samesite="lax", path="/")
    return ok({"logged_out": True})
