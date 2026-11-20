"""Private PDF uploads and authorized downloads; never a public static directory."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import tempfile
from uuid import UUID
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse
from backend.app.pilot import auth, db
from backend.app.pilot.errors import fail, ok

router = APIRouter()
MAX_PDF_BYTES = 10 * 1024 * 1024


def init_schema(conn):
    conn.execute("""CREATE TABLE IF NOT EXISTS pilot_assets (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, uploaded_by TEXT NOT NULL, storage_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('ready','deleted')), created_at TEXT NOT NULL)""")
    conn.execute("CREATE INDEX IF NOT EXISTS pilot_assets_org ON pilot_assets(organization_id,status)")


def asset_root():
    configured = os.environ.get("PILOT_ASSET_DIR")
    root = Path(configured) if configured else Path(os.environ.get("VCSA_DB_PATH", "backend/data/vcsa.sqlite3")).parent / "pilot-assets"
    root = root.resolve()
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    return root


def asset_descriptor(conn, identifier, organization_id):
    if not identifier:
        return None
    row = conn.execute("SELECT id,name,bytes,mime FROM pilot_assets WHERE id=? AND organization_id=? AND status='ready'", (identifier, organization_id)).fetchone()
    return dict(row) if row else None


def _asset_response(conn, identifier, organization_id):
    row = conn.execute("SELECT * FROM pilot_assets WHERE id=? AND organization_id=? AND status='ready'", (identifier, organization_id)).fetchone()
    if not row or not re.fullmatch(r"[A-Za-z0-9_-]+\.pdf", row["storage_key"]):
        fail(404, "pdf_not_found")
    path = asset_root() / row["storage_key"]
    if not path.is_file() or path.is_symlink():
        fail(404, "pdf_not_found")
    return FileResponse(path, media_type="application/pdf", filename=row["name"], content_disposition_type="attachment", headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox"})


@router.post("/api/pilot/owner/assets/pdf", status_code=201)
async def upload_pdf(request: Request, user=Depends(auth.require_owner)):
    if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/pdf":
        fail(415, "pdf_required")
    try:
        key = str(UUID(request.headers.get("x-client-request-id", "")))
    except ValueError:
        fail(422, "request_id_required")
    try:
        name = unquote(request.headers.get("x-file-name", "script.pdf"), errors="strict").strip()
    except UnicodeDecodeError:
        fail(422, "invalid_file_name")
    if len(name) > 180 or any(ch in name for ch in ("/", "\\", "\r", "\n", "\x00")) or not name.lower().endswith(".pdf"):
        fail(422, "invalid_file_name")
    name = re.sub(r"[^\w .()-]", "_", name) or "script.pdf"
    try:
        announced = int(request.headers.get("content-length", "0"))
    except ValueError:
        fail(400, "invalid_content_length")
    if announced > MAX_PDF_BYTES:
        fail(413, "pdf_too_large")
    root = asset_root()
    fd, temporary = tempfile.mkstemp(prefix="upload-", suffix=".part", dir=root)
    temporary_path, final_path, committed = Path(temporary), None, False
    count, digest, prefix, suffix = 0, hashlib.sha256(), b"", b""
    try:
        with os.fdopen(fd, "wb") as stream:
            async for chunk in request.stream():
                count += len(chunk)
                if count > MAX_PDF_BYTES:
                    fail(413, "pdf_too_large")
                if len(prefix) < 16:
                    prefix = (prefix + chunk)[:16]
                suffix = (suffix + chunk)[-2048:]
                digest.update(chunk)
                stream.write(chunk)
            stream.flush()
            os.fsync(stream.fileno())
        if count < 20 or not re.match(br"^%PDF-[12]\.[0-9]", prefix) or b"%%EOF" not in suffix:
            fail(415, "invalid_pdf")
        payload = {"name": name, "bytes": count, "sha256": digest.hexdigest()}
        with db.transaction() as conn:
            prior = db.idempotent(conn, user, "pdf_upload", key, payload)
            if prior is not None:
                return ok(prior)
            quota = int(os.environ.get("PILOT_ASSET_QUOTA_BYTES", str(1024 * 1024 * 1024)))
            used = conn.execute("SELECT COALESCE(SUM(bytes),0) FROM pilot_assets WHERE organization_id=? AND status='ready'", (user["organization_id"],)).fetchone()[0]
            if used + count > quota:
                fail(409, "asset_quota_exceeded")
            identifier = db.new_id()
            storage_key = identifier + ".pdf"
            if not re.fullmatch(r"[A-Za-z0-9_-]+\.pdf", storage_key):
                fail(500, "invalid_asset_identifier")
            final_path = root / storage_key
            os.replace(temporary_path, final_path)
            os.chmod(final_path, 0o600)
            conn.execute("INSERT INTO pilot_assets(id,organization_id,uploaded_by,storage_key,name,mime,bytes,sha256,created_at) VALUES (?,?,?,?,?,'application/pdf',?,?,?)", (identifier, user["organization_id"], user["id"], storage_key, name, count, digest.hexdigest(), db.now()))
            result = {"asset": asset_descriptor(conn, identifier, user["organization_id"])}
            db.remember(conn, user, "pdf_upload", key, payload, result)
            db.audit(conn, user, "pdf_uploaded", "asset", identifier, {"bytes": count})
        committed = True
        return ok(result)
    finally:
        temporary_path.unlink(missing_ok=True)
        if final_path is not None and not committed:
            final_path.unlink(missing_ok=True)


@router.get("/api/pilot/owner/assets/{asset_id}/download")
def owner_download(asset_id: str, user=Depends(auth.require_owner)):
    with db.read() as conn:
        return _asset_response(conn, asset_id, user["organization_id"])


@router.get("/api/pilot/lessons/{lesson_id}/pdf")
def lesson_download(lesson_id: str, user=Depends(auth.require_user)):
    from backend.app.pilot import learning
    with db.read() as conn:
        lesson = learning._lesson(conn, lesson_id, user)
        if lesson["status"] != "published":
            fail(404, "lesson_not_found")
        if not learning.lesson_allowed(conn, lesson, user):
            fail(403, "lesson_access_required")
        revision = learning._revision(conn, lesson)
        if not revision:
            fail(404, "pdf_not_found")
        return _asset_response(conn, revision["pdf_asset_id"], user["organization_id"])
