from contextlib import asynccontextmanager
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from . import activity, assets, auth, bootstrap, db, learning, workspace
from .errors import ok


@asynccontextmanager
async def lifespan(app):
    bootstrap.initialize()
    yield

# Kept separate from legacy main.py: a private deployment cannot mount demo routes.
app = FastAPI(title="Sales Academy Pilot", version="1.0.0", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(auth.router)
app.include_router(activity.router)
app.include_router(workspace.router)
app.include_router(learning.router)
app.include_router(assets.router)


@app.middleware("http")
async def private_headers(request: Request, call_next):
    request.state.request_id = str(uuid4())
    context_token = db.request_id_context.set(request.state.request_id)
    try:
        response = await call_next(request)
        response.headers.update({"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Request-ID": request.state.request_id, "Referrer-Policy": "no-referrer"})
        return response
    finally:
        db.request_id_context.reset(context_token)


def error_response(request, status, code, fields=None):
    return JSONResponse(status_code=status, content={"success": False, "data": None, "message": code, "error": {"code": code, "field_errors": fields or {}, "request_id": getattr(request.state, "request_id", "")}})


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": str(exc.detail)}
    return error_response(request, exc.status_code, detail.get("code", "request_failed"), detail.get("field_errors"))


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    fields = {".".join(str(p) for p in item["loc"][1:]): item["type"] for item in exc.errors()}
    return error_response(request, 422, "validation_error", fields)


@app.exception_handler(Exception)
async def unexpected_error(request, exc):
    return error_response(request, 500, "internal_server_error")


@app.get("/api/health")
@app.get("/api/ready")
def ready():
    with db.read() as conn:
        conn.execute("SELECT version FROM pilot_schema_migrations LIMIT 1").fetchone()
    return ok({"status": "ready", "mode": "private_pilot", "version": "1.0.0"})
