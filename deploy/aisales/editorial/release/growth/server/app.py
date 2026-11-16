"""Sales Academy editorial service. Public routes never touch the operational API."""

from __future__ import annotations
import copy
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

from flask import (
    Flask,
    Response,
    g,
    jsonify,
    render_template,
    request,
    send_file,
    send_from_directory,
)
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash
from .content import (
    ContentError,
    validate_document,
    validate_resource,
    public_document,
    markdown,
    string,
)
from .store import (
    initialize,
    database,
    draft_state,
    published,
    audit,
    now,
    encode,
    digest,
)
from .videos import load_video_catalog
from .campaign import WHATSAPP_DEMO_URL

COOKIE = "sa_growth_session"
SESSION_LIFETIME = 8 * 3600
USERNAME = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.@-]{2,63}$")
EVENTS = {
    "landing_viewed",
    "resource_viewed",
    "diagnostic_started",
    "diagnostic_completed",
    "recommendation_opened",
}
GROWTH = Path(__file__).resolve().parents[1]


def check_credentials(username, password):
    if not isinstance(username, str) or not USERNAME.fullmatch(username):
        raise ContentError("Usa un usuario de 3 a 64 caracteres, sin espacios.")
    if not isinstance(password, str) or not 12 <= len(password) <= 128:
        raise ContentError("La contraseña debe tener entre 12 y 128 caracteres.")


def user_public(row):
    return {
        "id": row["id"],
        "username": row["username"],
        "role": row["role"],
        "active": bool(row["active"]),
    }


def create_staff(data_root, username, password, role="owner"):
    """Local operator bootstrap. Never exposed as an unauthenticated HTTP route."""
    check_credentials(username, password)
    if not isinstance(role, str) or role not in {"owner", "editor"}:
        raise ContentError("Rol inválido.")
    initialize(data_root)
    with database(data_root, True) as con:
        try:
            cur = con.execute(
                "INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)",
                (username, generate_password_hash(password), role, now()),
            )
        except sqlite3.IntegrityError:
            raise ContentError("El usuario ya existe.", 409, "user_exists") from None
        audit(con, None, "operator_user_created", cur.lastrowid)
        return user_public(
            con.execute("SELECT * FROM users WHERE id=?", (cur.lastrowid,)).fetchone()
        )


def reset_staff_password(data_root, username, password):
    check_credentials(username, password)
    with database(data_root, True) as con:
        row = con.execute(
            "SELECT * FROM users WHERE username=?", (username,)
        ).fetchone()
        if not row:
            raise ContentError("El usuario no existe.", 404, "not_found")
        con.execute(
            "UPDATE users SET password_hash=? WHERE id=?",
            (generate_password_hash(password), row["id"]),
        )
        con.execute("DELETE FROM sessions WHERE user_id=?", (row["id"],))
        audit(con, None, "operator_password_reset", row["id"])
        return user_public(row)


def create_app(config=None):
    from .media import MediaStore, MediaError

    app = Flask(
        __name__, template_folder=str(GROWTH / "site/templates"), static_folder=None
    )
    app.config.update(
        DATA_ROOT=os.environ.get("SA_GROWTH_DATA_ROOT"),
        COOKIE_SECURE=True,
        PUBLIC_CONTACT_ENABLED=False,
        RATE_LIMIT_ENABLED=True,
        MAX_CONTENT_LENGTH=11 * 1024 * 1024,
        JSON_SORT_KEYS=False,
        ADVISOR_ENABLED=os.environ.get("ADVISOR_ENABLED", "").lower() in {"1", "true", "yes"},
        ADVISOR_HERMES_URL=os.environ.get("ADVISOR_HERMES_URL", ""),
        ADVISOR_HERMES_KEY=os.environ.get("ADVISOR_HERMES_KEY", ""),
        ADVISOR_DAILY_LIMIT=int(os.environ.get("ADVISOR_DAILY_LIMIT", "200")),
        ADVISOR_KNOWLEDGE_PATH=GROWTH / "content/advisor-knowledge.md",
    )
    app.config.update(config or {})
    video_catalog = load_video_catalog()
    if not app.config["DATA_ROOT"]:
        raise RuntimeError("Set DATA_ROOT outside the public site directory.")
    root = Path(app.config["DATA_ROOT"]).resolve()
    if root == GROWTH / "site" or (GROWTH / "site") in root.parents:
        raise RuntimeError("DATA_ROOT must not be public.")
    seed = (
        copy.deepcopy(app.config.get("SEED_DOCUMENT"))
        if app.config.get("SEED_DOCUMENT") is not None
        else json.loads((GROWTH / "content/seed.json").read_text())
    )
    validate_document(seed)
    initialize(root, seed)
    media = MediaStore(root / "media")
    app.extensions["growth_media"] = media
    app.extensions["growth_data_root"] = root
    invalid_password_hash = generate_password_hash(secrets.token_urlsafe(32))
    pepper_path = root / "rate-pepper"
    if not pepper_path.exists():
        try:
            fd = os.open(pepper_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "w") as stream:
                stream.write(secrets.token_hex(32))
        except FileExistsError:
            pass
    pepper = pepper_path.read_text()

    def fail(message, status=400, code="invalid_request"):
        raise ContentError(message, status, code)

    def body(max_bytes=1024 * 1024):
        if request.content_length is not None and request.content_length > max_bytes:
            fail("La solicitud excede el tamaño permitido.", 413, "too_large")
        if len(request.get_data(cache=True)) > max_bytes:
            fail("La solicitud excede el tamaño permitido.", 413, "too_large")
        if not request.is_json:
            fail("Envía un documento JSON válido.", 415, "json_required")
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            fail("El cuerpo debe ser un objeto JSON.")
        return data

    def exact(data, allowed, required=()):
        if set(data) - set(allowed) or not set(required) <= set(data):
            fail("Faltan campos o hay campos no permitidos.")

    def owner():
        if not g.user or g.user["role"] != "owner":
            fail("No tienes permiso para esta acción.", 403, "forbidden")

    def revision(data):
        value = data.get("revision")
        if type(value) is not int or value < 1:
            fail("La revisión es obligatoria.")
        return value

    def page_args():
        try:
            cursor = int(request.args.get("cursor", "0"))
            limit = int(request.args.get("limit", "24"))
        except ValueError:
            fail("Paginación inválida.")
        if cursor < 0 or not 1 <= limit <= 50:
            fail("El límite debe estar entre 1 y 50.")
        return cursor, limit

    def paginate(rows, cursor, limit, convert=lambda x: dict(x)):
        result = [convert(row) for row in rows]
        return {
            "items": result[:limit],
            "nextCursor": cursor + limit if len(result) > limit else None,
        }

    def origin_check():
        origin = request.headers.get("Origin")
        if origin and origin != request.host_url.rstrip("/"):
            fail("Origen de solicitud no permitido.", 403, "origin_rejected")
        if request.headers.get("Sec-Fetch-Site") == "cross-site":
            fail("Origen de solicitud no permitido.", 403, "origin_rejected")

    def rate_limit(bucket, maximum, window=900):
        if not app.config["RATE_LIMIT_ENABLED"]:
            return
        stamp = int(time.time())
        key = digest(pepper + "|" + bucket + "|" + (request.remote_addr or "unknown"))
        with database(root, True) as con:
            con.execute("DELETE FROM rate_limits WHERE expires<?", (stamp,))
            row = con.execute(
                "SELECT count,expires FROM rate_limits WHERE key=?", (key,)
            ).fetchone()
            if row and row["count"] >= maximum:
                g.retry_after = max(1, row["expires"] - stamp)
                fail("Demasiados intentos. Intenta más tarde.", 429, "rate_limited")
            if row:
                con.execute("UPDATE rate_limits SET count=count+1 WHERE key=?", (key,))
            else:
                con.execute(
                    "INSERT INTO rate_limits VALUES(?,1,?)", (key, stamp + window)
                )

    @app.before_request
    def authentication():
        g.user = None
        g.csrf = None
        token = request.cookies.get(COOKIE, "")
        if token and len(token) <= 200:
            with database(root) as con:
                row = con.execute(
                    "SELECT u.*,s.csrf,s.expires FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>? AND u.active=1",
                    (digest(token), int(time.time())),
                ).fetchone()
                if row:
                    g.user = user_public(row)
                    g.csrf = row["csrf"]
        # Login and CMS static shell remain public; all data and previews require a session.
        protected = request.url_rule is not None and (
            (request.path.startswith("/cms/api/") and request.path != "/cms/api/login")
            or request.path.startswith("/cms/preview")
        )
        if protected and not g.user:
            fail("Inicia sesión para continuar.", 401, "unauthorized")
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            origin_check()
            if protected:
                token = request.headers.get("X-CSRF-Token", "")
                if not g.csrf or not hmac.compare_digest(g.csrf, token):
                    fail(
                        "La sesión de seguridad cambió. Vuelve a entrar.",
                        403,
                        "csrf_required",
                    )

    @app.after_request
    def headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
        )
        if request.path.startswith(("/cms/", "/growth-api/")):
            response.headers["Cache-Control"] = "no-store"
            response.headers["X-Robots-Tag"] = "noindex, nofollow"
        if request.path.startswith("/cms/preview"):
            response.headers["Cache-Control"] = "no-store"
        if app.config["COOKIE_SECURE"] and request.is_secure:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        if response.status_code == 429:
            response.headers["Retry-After"] = str(getattr(g, "retry_after", 900))
        return response

    @app.errorhandler(ContentError)
    @app.errorhandler(MediaError)
    def known_error(error):
        return jsonify(
            error={"code": error.code, "message": error.message}
        ), error.status

    @app.errorhandler(HTTPException)
    def http_error(error):
        messages = {
            404: "No encontramos este recurso.",
            405: "Método no permitido.",
            413: "El archivo o la solicitud excede el límite.",
        }
        return jsonify(
            error={
                "code": str(error.code),
                "message": messages.get(
                    error.code, "No se pudo procesar la solicitud."
                ),
            }
        ), error.code

    @app.errorhandler(Exception)
    def server_error(error):
        # No stack traces, request bodies or contact information are written to logs.
        app.logger.error("growth_request_failed type=%s", type(error).__name__)
        return jsonify(
            error={
                "code": "server_error",
                "message": "No se pudo completar la operación. Puedes reintentar.",
            }
        ), 500

    def active_document():
        with database(root) as con:
            return public_document(published(con))

    def context(doc, preview=False):
        references = {
            mid
            for resource in doc["resources"]
            for mid in [resource.get("coverId"), *resource.get("attachments", [])]
            if mid
        }
        media_items = {}
        for mid in references:
            item = media.get(mid)
            if item:
                media_items[mid] = {
                    key: item[key] for key in ("id", "title", "alt", "mime", "variants")
                }
        return {
            "doc": doc,
            "resources": doc["resources"],
            "media_items": media_items,
            "video_catalog": video_catalog,
            "whatsapp_demo_url": WHATSAPP_DEMO_URL,
            "preview": preview,
            "contact_enabled": bool(app.config["PUBLIC_CONTACT_ENABLED"])
            and not preview,
            "advisor_enabled": bool(app.config["ADVISOR_ENABLED"]) and not preview,
        }

    @app.get("/growth-assets/<path:filename>")
    def assets(filename):
        return send_from_directory(GROWTH / "site/assets", filename)

    @app.get("/growth-api/health")
    def health():
        return jsonify(ok=True)

    @app.get("/descubre/")
    def landing():
        return render_template("landing.html", **context(active_document()))

    @app.get("/descubre/diagnostico/")
    def diagnostic():
        return render_template("diagnostic.html", **context(active_document()))

    @app.get("/descubre/privacidad/")
    def privacy():
        return render_template("privacy.html", **context(active_document()))

    @app.get("/descubre/analisis/")
    def analysis():
        response = Response(
            render_template("analysis.html", **context(active_document()))
        )
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        return response

    @app.get("/mediahub/")
    def hub():
        doc = active_document()
        filters = {
            k: request.args.get(k, "")[:200] for k in ("q", "role", "topic", "type")
        }
        selected = doc["resources"]
        for key in ("role", "topic", "type"):
            if filters[key]:
                selected = [r for r in selected if r[key] == filters[key]]
        if filters["q"]:
            q = filters["q"].casefold()
            selected = [
                r for r in selected if q in (r["title"] + " " + r["excerpt"]).casefold()
            ]
        ctx = context(doc)
        ctx.update(resources=selected, filters=filters, q=filters["q"])
        return render_template("hub.html", **ctx)

    def find_resource(slug, doc):
        resource = next((r for r in doc["resources"] if r["slug"] == slug), None)
        if resource is None:
            fail("No encontramos este recurso.", 404, "not_found")
        return resource

    @app.get("/mediahub/<slug>/")
    def resource_detail(slug):
        doc = active_document()
        return render_template(
            "resource.html", resource=find_resource(slug, doc), **context(doc)
        )

    @app.get("/mediahub/<slug>/descargar/")
    def resource_download(slug):
        r = find_resource(slug, active_document())
        response = Response(markdown(r), content_type="text/markdown; charset=utf-8")
        response.headers["Content-Disposition"] = (
            f'attachment; filename="{r["slug"]}.md"'
        )
        return response

    @app.get("/cms/")
    def cms():
        return render_template("cms.html", video_catalog=video_catalog)

    @app.get("/cms/preview/")
    def preview():
        with database(root) as con:
            doc = draft_state(con)["document"]
        # A draft resource is visible only in this authenticated preview.
        ctx = context(doc, True)
        if request.args.get("resource"):
            return render_template(
                "resource.html",
                resource=find_resource(request.args["resource"], doc),
                **ctx,
            )
        if request.args.get("page") == "hub":
            return render_template(
                "hub.html",
                filters={"q": "", "role": "", "topic": "", "type": ""},
                q="",
                **ctx,
            )
        return render_template("landing.html", **ctx)

    @app.post("/cms/api/login")
    def login():
        data = body(4096)
        exact(data, {"username", "password"}, {"username", "password"})
        if (
            not isinstance(data["username"], str)
            or not isinstance(data["password"], str)
            or len(data["username"]) > 64
            or len(data["password"]) > 128
        ):
            fail("Usuario o contraseña incorrectos.", 401, "invalid_credentials")
        rate_limit("login", 10)
        with database(root) as con:
            row = con.execute(
                "SELECT * FROM users WHERE username=?", (data["username"],)
            ).fetchone()
        valid = check_password_hash(
            row["password_hash"] if row else invalid_password_hash, data["password"]
        )
        if not valid or not row or not row["active"]:
            fail("Usuario o contraseña incorrectos.", 401, "invalid_credentials")
        token = secrets.token_urlsafe(48)
        csrf = secrets.token_urlsafe(32)
        with database(root, True) as con:
            current = con.execute(
                "SELECT * FROM users WHERE id=?", (row["id"],)
            ).fetchone()
            # Password verification is expensive and runs outside the lock. Recheck
            # its exact input under the write lock so operator resets cannot race it.
            if (
                not current
                or not current["active"]
                or current["password_hash"] != row["password_hash"]
            ):
                fail("Usuario o contraseña incorrectos.", 401, "invalid_credentials")
            row = current
            con.execute("DELETE FROM sessions WHERE expires<?", (int(time.time()),))
            previous = request.cookies.get(COOKIE)
            if previous:
                con.execute(
                    "DELETE FROM sessions WHERE token_hash=?", (digest(previous),)
                )
            con.execute(
                "INSERT INTO sessions VALUES(?,?,?,?)",
                (digest(token), row["id"], csrf, int(time.time()) + SESSION_LIFETIME),
            )
            audit(con, row["id"], "login")
        response = jsonify(user=user_public(row), csrf=csrf)
        response.set_cookie(
            COOKIE,
            token,
            max_age=SESSION_LIFETIME,
            secure=app.config["COOKIE_SECURE"],
            httponly=True,
            samesite="Strict",
            path="/",
        )
        return response

    @app.get("/cms/api/session")
    def session():
        return jsonify(user=g.user, csrf=g.csrf)

    @app.post("/cms/api/logout")
    def logout():
        with database(root, True) as con:
            con.execute(
                "DELETE FROM sessions WHERE token_hash=?",
                (digest(request.cookies.get(COOKIE, "")),),
            )
            audit(con, g.user["id"], "logout")
        response = jsonify(ok=True)
        response.delete_cookie(
            COOKIE,
            path="/",
            secure=app.config["COOKIE_SECURE"],
            httponly=True,
            samesite="Strict",
        )
        return response

    def assert_revision(con, expected):
        actual = con.execute("SELECT revision FROM draft WHERE singleton=1").fetchone()[
            "revision"
        ]
        if actual != expected:
            fail(
                "Otra persona guardó cambios. Revisa la versión más reciente antes de guardar.",
                409,
                "revision_conflict",
            )

    def validate_slugs(con, doc):
        old = {
            r["id"]: r["slug"]
            for r in con.execute("SELECT id,slug FROM resource_slugs")
        }
        claimed = {slug: rid for rid, slug in old.items()}
        for r in doc["resources"]:
            if r["id"] in old and old[r["id"]] != r["slug"]:
                fail(
                    "El enlace de un recurso publicado es permanente.",
                    409,
                    "immutable_slug",
                )
            if r["slug"] in claimed and claimed[r["slug"]] != r["id"]:
                fail("Este enlace ya pertenece a otro recurso.", 409, "slug_conflict")

    def save_document(con, doc, expected):
        assert_revision(con, expected)
        validate_document(doc)
        validate_slugs(con, doc)
        con.execute(
            "UPDATE draft SET document=?,revision=revision+1 WHERE singleton=1",
            (encode(doc),),
        )
        audit(con, g.user["id"], "draft_saved", expected + 1)
        return draft_state(con)

    @app.get("/cms/api/draft")
    def get_draft():
        with database(root) as con:
            return jsonify(draft_state(con))

    @app.put("/cms/api/draft")
    def put_draft():
        data = body()
        exact(data, {"document", "revision"}, {"document", "revision"})
        expected = revision(data)
        with database(root, True) as con:
            return jsonify(save_document(con, data["document"], expected))

    @app.route("/cms/api/resources", methods=["GET", "POST"])
    def resources():
        if request.method == "GET":
            cursor, limit = page_args()
            with database(root) as con:
                items = draft_state(con)["document"]["resources"]
            return jsonify(
                items=items[cursor : cursor + limit],
                nextCursor=cursor + limit if len(items) > cursor + limit else None,
            )
        data = body()
        exact(data, {"resource", "revision"}, {"resource", "revision"})
        expected = revision(data)
        validate_resource(data["resource"])
        with database(root, True) as con:
            doc = draft_state(con)["document"]
            doc["resources"].append(data["resource"])
            return jsonify(save_document(con, doc, expected)), 201

    @app.patch("/cms/api/resources/<rid>")
    def patch_resource(rid):
        data = body()
        exact(data, {"resource", "revision"}, {"resource", "revision"})
        expected = revision(data)
        validate_resource(data["resource"])
        if data["resource"]["id"] != rid:
            fail("El identificador es inmutable.")
        with database(root, True) as con:
            doc = draft_state(con)["document"]
            index = next(
                (i for i, r in enumerate(doc["resources"]) if r["id"] == rid), None
            )
            if index is None:
                fail("No encontramos este recurso.", 404, "not_found")
            doc["resources"][index] = data["resource"]
            return jsonify(save_document(con, doc, expected))

    @app.post("/cms/api/publish")
    def publish_document():
        owner()
        data = body(4096)
        exact(data, {"revision"}, {"revision"})
        expected = revision(data)
        with database(root, True) as con:
            assert_revision(con, expected)
            doc = draft_state(con)["document"]
            validate_document(doc)
            validate_slugs(con, doc)
            media.verify_publish(doc)
            encoded = encode(doc)
            cur = con.execute(
                "INSERT INTO publications(document,created_at,author,checksum) VALUES(?,?,?,?)",
                (encoded, now(), g.user["username"], digest(encoded)),
            )
            pid = cur.lastrowid
            for r in doc["resources"]:
                if r["status"] == "published":
                    con.execute(
                        "INSERT OR IGNORE INTO resource_slugs VALUES(?,?)",
                        (r["id"], r["slug"]),
                    )
            con.execute("UPDATE state SET publication_id=? WHERE singleton=1", (pid,))
            audit(con, g.user["id"], "published", pid)
        return jsonify(publicationId=pid, revision=expected)

    @app.get("/cms/api/revisions")
    def revisions():
        owner()
        cursor, limit = page_args()
        with database(root) as con:
            rows = con.execute(
                "SELECT id,created_at,author FROM publications ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit + 1, cursor),
            ).fetchall()
        return jsonify(
            paginate(
                rows,
                cursor,
                limit,
                lambda r: {
                    "id": r["id"],
                    "createdAt": r["created_at"],
                    "author": r["author"],
                    "summary": "Publicación editorial completa",
                },
            )
        )

    @app.post("/cms/api/restore")
    def restore():
        owner()
        data = body(4096)
        exact(data, {"publicationId", "revision"}, {"publicationId", "revision"})
        expected = revision(data)
        if type(data["publicationId"]) is not int:
            fail("Publicación inválida.")
        with database(root, True) as con:
            row = con.execute(
                "SELECT document FROM publications WHERE id=?", (data["publicationId"],)
            ).fetchone()
            if not row:
                fail("La publicación no existe.", 404, "not_found")
            result = save_document(con, json.loads(row["document"]), expected)
            audit(con, g.user["id"], "restored_to_draft", data["publicationId"])
            return jsonify(result)

    @app.route("/cms/api/users", methods=["GET", "POST"])
    def users():
        owner()
        if request.method == "GET":
            cursor, limit = page_args()
            with database(root) as con:
                rows = con.execute(
                    "SELECT * FROM users ORDER BY id LIMIT ? OFFSET ?",
                    (limit + 1, cursor),
                ).fetchall()
            return jsonify(paginate(rows, cursor, limit, user_public))
        data = body(4096)
        exact(data, {"username", "password", "role"}, {"username", "password", "role"})
        user = create_staff(root, data["username"], data["password"], data["role"])
        with database(root, True) as con:
            audit(con, g.user["id"], "user_created", user["id"])
        return jsonify(user=user), 201

    @app.patch("/cms/api/users/<int:uid>")
    def patch_user(uid):
        owner()
        data = body(4096)
        exact(data, {"role", "active", "password"})
        if not data:
            fail("No hay cambios.")
        if "role" in data and (
            not isinstance(data["role"], str) or data["role"] not in {"owner", "editor"}
        ):
            fail("Rol inválido.")
        if "active" in data and type(data["active"]) is not bool:
            fail("Estado inválido.")
        with database(root, True) as con:
            row = con.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
            if not row:
                fail("Usuario no encontrado.", 404, "not_found")
            new_role = data.get("role", row["role"])
            active = data.get("active", bool(row["active"]))
            password_hash = row["password_hash"]
            if "password" in data:
                check_credentials(row["username"], data["password"])
                password_hash = generate_password_hash(data["password"])
            if (
                row["role"] == "owner"
                and row["active"]
                and (new_role != "owner" or not active)
            ):
                if (
                    con.execute(
                        "SELECT COUNT(*) FROM users WHERE role='owner' AND active=1"
                    ).fetchone()[0]
                    <= 1
                ):
                    fail(
                        "Debe quedar al menos un propietario activo.", 409, "last_owner"
                    )
            con.execute(
                "UPDATE users SET role=?,active=?,password_hash=? WHERE id=?",
                (new_role, int(active), password_hash, uid),
            )
            con.execute("DELETE FROM sessions WHERE user_id=?", (uid,))
            audit(con, g.user["id"], "user_updated", uid)
            return jsonify(
                user=user_public(
                    con.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
                )
            )

    @app.route("/cms/api/media", methods=["GET", "POST"])
    def media_items():
        if request.method == "GET":
            cursor, limit = page_args()
            return jsonify(media.list(request.args.get("q", "")[:200], cursor, limit))
        if "file" not in request.files:
            fail("Selecciona un archivo.")
        f = request.files["file"]
        allowed = {"title", "alt", "origin", "rightsStatus", "reviewStatus"}
        if set(request.form) - allowed:
            fail("Metadatos no permitidos.")
        item = media.upload(
            f.stream, f.filename, {k: request.form[k] for k in request.form}
        )
        with database(root, True) as con:
            audit(con, g.user["id"], "media_uploaded", item["id"])
        return jsonify(item=item), 201

    @app.patch("/cms/api/media/<mid>")
    def patch_media(mid):
        data = body(8192)
        exact(
            data, {"title", "alt", "origin", "rightsStatus", "reviewStatus", "archived"}
        )
        item = media.update(mid, data)
        with database(root, True) as con:
            audit(con, g.user["id"], "media_updated", mid)
        return jsonify(item=item)

    @app.get("/cms/api/media-storage")
    def media_storage():
        return jsonify(media.usage())

    @app.get("/cms/api/media/<mid>/usage")
    def media_usage(mid):
        if media.get(mid) is None:
            fail("Medio no encontrado.", 404, "not_found")
        uses = []

        def append_uses(document, kind, identifier, label):
            for resource in document["resources"]:
                if mid == resource.get("coverId") or mid in resource.get(
                    "attachments", []
                ):
                    use = {
                        "type": kind,
                        "id": identifier,
                        "title": resource["title"],
                        "label": label,
                        "resourceId": resource["id"],
                    }
                    if kind != "draft":
                        use["revisionId"] = identifier
                    uses.append(use)

        with database(root) as con:
            draft = draft_state(con)
            append_uses(draft["document"], "draft", draft["revision"], "Borrador")
            active = con.execute("SELECT publication_id FROM state").fetchone()[0]
            for row in con.execute("SELECT id,document FROM publications"):
                is_active = row["id"] == active
                append_uses(
                    json.loads(row["document"]),
                    "published" if is_active else "revision",
                    row["id"],
                    "Publicación activa" if is_active else "Versión retenida",
                )
        return jsonify(uses=uses)

    @app.get("/media/<mid>/<variant>")
    def media_file(mid, variant):
        item = media.get(mid)
        if item is None:
            fail("Medio no encontrado.", 404, "not_found")
        is_public = variant != "original" and mid in media.references(active_document())
        if not is_public and not g.user:
            fail("Medio no encontrado.", 404, "not_found")
        if variant not in {"web", "thumbnail", "download", "original"}:
            fail("Variante no encontrada.", 404, "not_found")
        path = media.path(mid, variant)
        # PDF is always downloaded, never embedded as active browser content.
        mimetype = "image/webp" if variant in {"web", "thumbnail"} else item["mime"]
        response = send_file(
            path,
            mimetype=mimetype,
            as_attachment=(
                variant in {"download", "original"} or item["mime"] == "application/pdf"
            ),
            download_name=item.get("filename", mid),
            conditional=True,
        )
        if not is_public:
            response.headers["Cache-Control"] = "no-store"
            response.headers["X-Robots-Tag"] = "noindex, nofollow"
        return response

    def uuid_value(value):
        if not isinstance(value, str):
            fail("Identificador inválido.")
        try:
            parsed = uuid.UUID(value)
            if str(parsed) != value.lower():
                raise ValueError()
        except ValueError:
            fail("Identificador inválido.")
        return value.lower()

    @app.post("/growth-api/demo-requests")
    def demo_requests():
        if not app.config["PUBLIC_CONTACT_ENABLED"]:
            fail(
                "La recepción pública todavía no está habilitada.",
                503,
                "contact_unavailable",
            )
        data = body(4096)
        allowed = {
            "email",
            "role",
            "roomCountBucket",
            "need",
            "contactConsent",
            "marketingOptIn",
            "privacyVersion",
        }
        exact(data, allowed, allowed)
        email = data["email"]
        if (
            not isinstance(email, str)
            or len(email) > 254
            or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)
            or any(x in email for x in "\r\n\x00")
        ):
            fail("Escribe un correo válido.")
        if (
            not all(
                isinstance(data[k], str) for k in ("role", "roomCountBucket", "need")
            )
            or data["role"] not in {"director", "leader", "rep", "other"}
            or data["roomCountBucket"] not in {"one", "two", "three", "more"}
            or data["need"] not in {"coordination", "practice", "coaching", "pilot"}
        ):
            fail("Selecciona opciones válidas.")
        if (
            data["contactConsent"] is not True
            or type(data["marketingOptIn"]) is not bool
            or data["privacyVersion"] != "2026-11-07"
        ):
            fail("Revisa los consentimientos y el aviso de privacidad.")
        key = uuid_value(request.headers.get("Idempotency-Key"))
        normalized = {**data, "email": email.strip().lower()}
        body_hash = digest(encode(normalized))
        key_hash = digest(key)
        rate_limit("demo_requests", 10, 3600)
        with database(root, True) as con:
            previous = con.execute(
                "SELECT id,body_hash FROM demo_requests WHERE idempotency_hash=?",
                (key_hash,),
            ).fetchone()
            if previous:
                if previous["body_hash"] != body_hash:
                    fail(
                        "Este reintento contiene datos distintos. Envía una nueva solicitud.",
                        409,
                        "idempotency_conflict",
                    )
                return jsonify(id=previous["id"], received=True), 200
            rid = str(uuid.uuid4())
            stamp = now()
            con.execute(
                "INSERT INTO demo_requests VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    rid,
                    key_hash,
                    body_hash,
                    normalized["email"],
                    data["role"],
                    data["roomCountBucket"],
                    data["need"],
                    stamp,
                    int(data["marketingOptIn"]),
                    data["privacyVersion"],
                    "new",
                    stamp,
                    stamp,
                ),
            )
            # Transactional receipt, not browser tracking: one event per accepted request.
            con.execute(
                "INSERT INTO events(event_id,event,received_at) VALUES(?,?,?)",
                (rid, "demo_requested", stamp),
            )
        return jsonify(id=rid, received=True), 201

    def demo_public(row):
        return {
            "id": row["id"],
            "email": row["email"],
            "role": row["role"],
            "roomCountBucket": row["room_count"],
            "need": row["need"],
            "contactConsentAt": row["contact_consent_at"],
            "marketingOptIn": bool(row["marketing_opt_in"]),
            "privacyVersion": row["privacy_version"],
            "status": row["status"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }

    @app.route("/cms/api/demo-requests", methods=["GET", "PATCH"])
    def staff_demo_requests():
        owner()
        if request.method == "GET":
            cursor, limit = page_args()
            with database(root) as con:
                rows = con.execute(
                    "SELECT * FROM demo_requests ORDER BY created_at DESC,id LIMIT ? OFFSET ?",
                    (limit + 1, cursor),
                ).fetchall()
            return jsonify(paginate(rows, cursor, limit, demo_public))
        data = body(4096)
        exact(data, {"id", "status"}, {"id", "status"})
        rid = uuid_value(data["id"])
        if not isinstance(data["status"], str) or data["status"] not in {
            "new",
            "contacted",
            "qualified",
            "closed",
        }:
            fail("Estado inválido.")
        with database(root, True) as con:
            cur = con.execute(
                "UPDATE demo_requests SET status=?,updated_at=? WHERE id=?",
                (data["status"], now(), rid),
            )
            if cur.rowcount != 1:
                fail("Solicitud no encontrada.", 404, "not_found")
            audit(con, g.user["id"], "request_status_updated", rid)
            return jsonify(
                item=demo_public(
                    con.execute(
                        "SELECT * FROM demo_requests WHERE id=?", (rid,)
                    ).fetchone()
                )
            )

    @app.post("/growth-api/events")
    def events():
        data = body(2048)
        exact(
            data,
            {"eventId", "flowId", "event", "placement", "consentVersion", "resourceId"},
            {"eventId", "flowId", "event", "placement", "consentVersion"},
        )
        eid = uuid_value(data["eventId"])
        flow = uuid_value(data["flowId"])
        if (
            not isinstance(data["event"], str)
            or not isinstance(data["placement"], str)
            or data["event"] not in EVENTS
            or data["placement"] not in {"hero", "resource", "result", "footer"}
            or data["consentVersion"] != "2026-11-07"
        ):
            fail("Evento no permitido.")
        resource_id = data.get("resourceId")
        if resource_id is not None and (
            not isinstance(resource_id, str)
            or resource_id not in {r["id"] for r in active_document()["resources"]}
        ):
            fail("Recurso no permitido.")
        rate_limit("events", 120, 60)
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(
            timespec="seconds"
        )
        with database(root, True) as con:
            con.execute("DELETE FROM events WHERE received_at<?", (cutoff,))
            if con.execute("SELECT 1 FROM events WHERE event_id=?", (eid,)).fetchone():
                return "", 204
            con.execute(
                "INSERT INTO events VALUES(?,?,?,?,?,?,?)",
                (
                    eid,
                    flow,
                    data["event"],
                    resource_id,
                    data["placement"],
                    data["consentVersion"],
                    now(),
                ),
            )
        return jsonify(accepted=True), 202

    @app.get("/cms/api/metrics")
    def metrics():
        owner()
        counts = {key: 0 for key in ("new", "contacted", "qualified", "closed")}
        event_counts = {key: 0 for key in sorted(EVENTS | {"demo_requested"})}
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(
            timespec="seconds"
        )
        with database(root) as con:
            for r in con.execute(
                "SELECT status,COUNT(*) AS n FROM demo_requests GROUP BY status"
            ):
                counts[r["status"]] = r["n"]
            for r in con.execute(
                "SELECT event,COUNT(*) AS n FROM events WHERE received_at>=? GROUP BY event",
                (cutoff,),
            ):
                event_counts[r["event"]] = r["n"]
            diagnostic = con.execute(
                """
                WITH consented AS (
                    SELECT flow_id, event FROM events
                    WHERE received_at>=? AND consent_version=? AND flow_id IS NOT NULL
                ), started AS (
                    SELECT DISTINCT flow_id FROM consented WHERE event='diagnostic_started'
                ), completed AS (
                    SELECT DISTINCT flow_id FROM consented WHERE event='diagnostic_completed'
                )
                SELECT
                    (SELECT COUNT(*) FROM started) AS started_flows,
                    (SELECT COUNT(*) FROM started JOIN completed USING(flow_id)) AS completed_flows
                """,
                (cutoff, "2026-11-07"),
            ).fetchone()
            publications_count = con.execute(
                "SELECT COUNT(*) FROM publications"
            ).fetchone()[0]
            resource_count = len(public_document(published(con))["resources"])
        counts["total"] = sum(counts.values())
        started_flows = diagnostic["started_flows"]
        completed_flows = diagnostic["completed_flows"]
        return jsonify(
            requests=counts,
            events=event_counts,
            publications=publications_count,
            resources=resource_count,
            diagnostic={
                "startedFlows": started_flows,
                "completedFlows": completed_flows,
                "completionRate": round(100.0 * completed_flows / started_flows, 2)
                if started_flows
                else None,
            },
        )

    from .advisor import register_advisor
    register_advisor(app, root, active_document, owner, rate_limit, body, exact,
                     origin_check, page_args)
    return app
