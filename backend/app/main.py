from __future__ import annotations

import os
import time
from datetime import date, datetime
from typing import Any, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.app.env import load_local_env

load_local_env()

from backend.app import persistence
from backend.app.smart_agent import get_provider, provider_status


app = FastAPI(title="VCSA Academy API", version="0.1.0")

cors_origins = [
    origin.strip()
    for origin in os.environ.get("VCSA_CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8082,http://localhost:8082").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def operational_headers(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or f"req_{uuid4().hex[:12]}"
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Response-Time-ms"] = str(round((time.perf_counter() - start) * 1000, 2))
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request.headers.get("x-request-id") or f"req_{uuid4().hex[:12]}"
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "message": "Unexpected server error",
            "error": {"code": "internal_server_error", "request_id": request_id},
        },
        headers={"X-Request-ID": request_id},
    )


BLUEPRINT_STEPS = [
    ("step_1", 1, "Meet & Greet", "Make a great first impression."),
    ("step_2", 2, "Agenda", "Set expectations and control the flow."),
    ("step_3", 3, "Breakfast / F.O.R.M.", "Build rapport through family, occupation, recreation, and motivation."),
    ("step_4", 4, "Discovery / Survey", "Learn travel patterns, goals, and objections."),
    ("step_5", 5, "Break & Remake the Pact", "Confirm commitment before the tour."),
    ("step_6", 6, "Property Tour", "Connect the experience to customer goals."),
    ("step_7", 7, "Model Suite", "Help the customer imagine ownership."),
    ("step_8", 8, "Screen Tour & Flower", "Visualize programs and fit."),
    ("step_9", 9, "Point of Confirmation", "Confirm value, fit, and readiness."),
    ("step_10", 10, "Programs", "Present approved program options clearly."),
    ("step_11", 11, "T.O. Pricing", "Transition pricing with full disclosure."),
]


class ApiResponse(BaseModel):
    success: bool = True
    data: Any = None
    message: str | None = None


class LoginIn(BaseModel):
    email: str
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class ForgotPasswordIn(BaseModel):
    email: str


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class UserStatusIn(BaseModel):
    status: Literal["active", "inactive"]


class PermissionGrantIn(BaseModel):
    permission: str
    action: Literal["grant", "revoke"] = "grant"


class UserIn(BaseModel):
    id: str | None = None
    email: str
    display_name: str
    roles: list[str] = ["sales_rep"]
    team_id: str = "team_demo"
    permissions: list[str] = []
    status: Literal["active", "inactive"] = "active"
    password: str | None = None


class GoalSheetEntryIn(BaseModel):
    date: str = Field(default_factory=lambda: date.today().isoformat())
    tour_outcome: Literal["qualified", "close_today", "not_qualified", "no_tour"]
    sales_outcome: Literal["sold", "no_sale"]
    sales_volume: float = 0
    number_of_sales: int = 0
    manager_to_name: str | None = None
    no_sale_reason: str | None = None
    follow_ups: list[dict[str, str]] = []
    notes: str | None = None


class ChatIn(BaseModel):
    message: str
    mode: str = "general_coach"
    module_area: str | None = None
    conversation_history: list[dict[str, str]] = []


class RoleplaySessionIn(BaseModel):
    scenario_id: str
    blueprint_step_id: str


class RoleplaySubmissionIn(BaseModel):
    session_id: str
    transcript: str
    submission_type: str = "text"


class RoleplayTurnIn(BaseModel):
    message: str


class RoleplayReviewIn(BaseModel):
    score: int
    rubric_scores: dict[str, int]
    comments: str
    recommendation: str = "continue_practice"


class ResourceIn(BaseModel):
    id: str | None = None
    title: str
    resource_type: str = "article"
    sensitivity: str = "general_training"
    requires_access_grant: bool = False
    body: str = ""
    tags: list[str] = []
    status: Literal["draft", "published", "archived"] = "published"


class CertificationDecisionIn(BaseModel):
    status: Literal["approved", "denied", "needs_practice"]
    notes: str = ""


@app.on_event("startup")
def startup() -> None:
    persistence.init_db()


persistence.init_db()


def envelope(data: Any = None, message: str | None = None) -> dict[str, Any]:
    return {"success": True, "data": data, "message": message}


def get_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def require_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = get_bearer_token(authorization)
    user = persistence.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def require_manager(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    if not set(user["roles"]).intersection({"manager", "to_manager", "trainer", "coach", "admin"}):
        raise HTTPException(status_code=403, detail="Manager or trainer role required")
    return user


def require_admin(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    if "admin" not in user["roles"]:
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


def demo_user_catalog() -> list[dict[str, Any]]:
    return [
        {
            "id": item["id"],
            "email": item["email"],
            "display_name": item["display_name"],
            "roles": item["roles"],
            "primary_role": item["roles"][0],
            "role_label": item["role_label"],
            "description": item["description"],
            "password": persistence.DEMO_PASSWORD,
        }
        for item in persistence.DEMO_USERS
    ]


def has_resource_access(resource: dict[str, Any], user: dict[str, Any]) -> bool:
    return (
        not resource["requires_access_grant"]
        or f"resource:{resource['id']}:read" in user["permissions"]
        or "admin" in user["roles"]
    )


def blueprint_progress(step_id: str, completed_steps: set[str]) -> int:
    if step_id in completed_steps:
        return 100
    return 35 if step_id == "step_2" else 0


def blueprint_status(step_id: str, step_number: int, completed_steps: set[str]) -> str:
    if step_id in completed_steps:
        return "completed"
    if step_number == 2:
        return "current"
    return "locked"


def serialize_step(step: tuple[str, int, str, str], completed_steps: set[str]) -> dict[str, Any]:
    step_id, step_number, title, description = step
    return {
        "id": step_id,
        "step_number": step_number,
        "title": title,
        "description": description,
        "progress_percent": blueprint_progress(step_id, completed_steps),
        "status": blueprint_status(step_id, step_number, completed_steps),
        "required_for_certification": True,
    }


def smart_agent_knowledge(user: dict[str, Any]) -> list[dict[str, Any]]:
    step_items = [
        {
            "id": step_id,
            "title": f"Blueprint Step {step_number}: {title}",
            "summary": description,
            "body": description,
            "tags": ["blueprint", f"step-{step_number}", title.lower()],
        }
        for step_id, step_number, title, description in BLUEPRINT_STEPS
    ]
    resource_items = [
        {
            "id": resource["id"],
            "title": resource["title"],
            "summary": resource["body"][:180],
            "body": resource["body"] if has_resource_access(resource, user) else "",
            "tags": resource.get("tags", []),
        }
        for resource in persistence.list_resources()
        if has_resource_access(resource, user) or not resource["requires_access_grant"]
    ]
    return step_items + resource_items


def calculate_metrics(entries: list[dict[str, Any]]) -> dict[str, Any]:
    qualified_tours = len([entry for entry in entries if entry["tour_outcome"] in {"qualified", "close_today"}])
    sales_count = sum(int(entry.get("number_of_sales", 0)) for entry in entries)
    volume = sum(float(entry.get("sales_volume", 0)) for entry in entries)
    return {
        "qualified_tours": qualified_tours,
        "sales_count": sales_count,
        "volume": volume,
        "closing_percent": 0 if qualified_tours == 0 else round((sales_count / qualified_tours) * 100),
        "vpg": 0 if qualified_tours == 0 else round(volume / qualified_tours),
    }


def user_summary(user_id: str) -> dict[str, Any]:
    profile = persistence.get_user(user_id)
    completed_steps = persistence.get_completed_step_ids(user_id)
    goalsheets = persistence.list_goalsheets(user_id)
    reviewed_roleplays = [
        item
        for item in persistence.list_roleplay_submissions()
        if item.get("user_id") == user_id and item.get("status") == "reviewed"
    ]
    latest_decision = next(iter(persistence.list_certification_decisions(user_id)), None)
    return {
        "user": profile or {"id": user_id, "display_name": user_id, "roles": []},
        "blueprint_progress": round((len(completed_steps) / len(BLUEPRINT_STEPS)) * 100),
        "completed_steps": len(completed_steps),
        "metrics": calculate_metrics(goalsheets),
        "reviewed_roleplays": len(reviewed_roleplays),
        "certification_status": latest_decision["status"] if latest_decision else "in_progress",
    }


def create_goalsheet_insight(entry: dict[str, Any]) -> str:
    metrics = calculate_metrics([entry])
    if entry.get("number_of_sales", 0) > 0:
        lead = f"Good work closing {entry['number_of_sales']} sale today."
    else:
        lead = "Good job logging the day honestly."
    return f"{lead} Your current closing rate is {metrics['closing_percent']}%. Next: practice one roleplay tied to the biggest no-sale reason."


def upcoming_followups(user_id: str) -> list[dict[str, Any]]:
    reminders: list[dict[str, Any]] = []
    for entry in persistence.list_goalsheets(user_id):
        for index, follow_up in enumerate(entry.get("follow_ups", [])):
            reminders.append(
                {
                    "id": f"{entry['id']}_followup_{index + 1}",
                    "source": "goalsheet",
                    "entry_date": entry.get("date"),
                    "follow_up_date": follow_up.get("follow_up_date") or follow_up.get("date"),
                    "note": follow_up.get("note", ""),
                    "status": "scheduled",
                }
            )
    return sorted(reminders, key=lambda item: item.get("follow_up_date") or "")


def roleplay_ai_turn(session: dict[str, Any], message: str) -> dict[str, Any]:
    text = message.lower()
    turns = session.get("turns", [])
    if "price" in text or "cost" in text or "fee" in text:
        buyer = "I understand, but I need you to be clear with me. What fees or conditions should I know before I decide?"
        coaching = "Good moment for disclosure awareness. Do not invent numbers. Redirect to approved materials and manager/T.O. support."
    elif "today" in text or "yes" in text or "commit" in text:
        buyer = "If it truly fits and is affordable, I could make a decision today. I just do not want to feel pushed."
        coaching = "Strong Step 5 setup. Keep it calm, respectful, and framed as a clear yes/no decision."
    elif "vacation" in text or "family" in text or "why" in text:
        buyer = "We usually travel with family, but we have not been consistent. I want something that makes trips easier."
        coaching = "Good discovery path. Summarize motivation before moving to the next Blueprint step."
    else:
        buyer = "That makes sense, but I still need help connecting this to how we actually vacation."
        coaching = "Ask one open question, summarize the answer, then tie the response to the active Blueprint step."
    turn = {
        "rep": message,
        "buyer": buyer,
        "coach_tip": coaching,
        "created_at": datetime.utcnow().isoformat(),
    }
    session["turns"] = [*turns, turn][-8:]
    session["transcript"] = "\n".join(
        f"Rep: {item['rep']}\nBuyer: {item['buyer']}\nCoach: {item['coach_tip']}"
        for item in session["turns"]
    )
    return turn


def score_roleplay_transcript(transcript: str) -> dict[str, Any]:
    text = transcript.lower()
    score = 72
    rubric = {
        "step_alignment": 3,
        "professional_tone": 4,
        "discovery_quality": 3,
        "compliance_awareness": 3,
    }
    if "yes" in text or "decision today" in text:
        score += 6
        rubric["step_alignment"] = 4
    if "family" in text or "vacation" in text or "why" in text:
        score += 5
        rubric["discovery_quality"] = 4
    if "fee" in text or "approved" in text or "manager" in text:
        score += 7
        rubric["compliance_awareness"] = 5
    if "hide" in text or "skip the fee" in text:
        score -= 10
        rubric["professional_tone"] = 2
    return {
        "score": max(0, min(100, score)),
        "rubric_scores": rubric,
        "summary": "AI coach scored the practice against Blueprint alignment, tone, discovery quality, and compliance awareness.",
        "recommendation": "Submit for manager review after one more focused repetition." if score < 85 else "Ready for manager review.",
    }


def certification_requirements(user_id: str) -> dict[str, bool]:
    required_complete = len(persistence.get_completed_step_ids(user_id)) >= 11
    reviewed_roleplays = [
        item
        for item in persistence.list_roleplay_submissions()
        if item.get("user_id") == user_id and item.get("status") == "reviewed"
    ]
    return {
        "required_blueprint_steps_complete": required_complete,
        "required_roleplays_reviewed": bool(reviewed_roleplays),
    }


def audit(user: dict[str, Any], action: str, target_type: str, target_id: str, outcome: str, metadata: dict[str, Any] | None = None) -> None:
    persistence.add_audit_event(
        {
            "id": f"audit_{uuid4().hex[:12]}",
            "actor_user_id": user["id"],
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "timestamp": datetime.utcnow().isoformat(),
            "outcome": outcome,
            "metadata": metadata or {},
        }
    )


@app.get("/api/health")
def health() -> dict[str, Any]:
    return envelope({"status": "ok", "service": "vcsa-academy-api", "database": persistence.healthcheck()})


@app.get("/api/ready")
def ready() -> dict[str, Any]:
    users = persistence.list_users()
    resources = persistence.list_resources(include_unpublished=True)
    smart_agent = provider_status(os.environ.get("VCSA_SMART_AGENT_PROVIDER", "local"))
    checks = {
        "database": persistence.healthcheck()["status"] == "ok",
        "seed_users": len(users) >= 3,
        "seed_resources": len(resources) >= 3,
        "smart_agent": smart_agent["provider"] in {"local", "openai", "zai"},
    }
    status = "ready" if all(checks.values()) else "degraded"
    return envelope({"status": status, "checks": checks, "smart_agent": smart_agent})


@app.post("/api/auth/login")
def login(payload: LoginIn, response: Response) -> dict[str, Any]:
    user = persistence.authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    session = persistence.create_session(user["id"])
    response.set_cookie(
        key="vcsa_session",
        value=session["token"],
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    audit(user, "auth_login", "user", user["id"], "success")
    return envelope({"user": user, "token": session["token"], "expires_at": session["expires_at"]})


@app.get("/api/auth/demo-users")
def demo_users() -> dict[str, Any]:
    return envelope({"users": demo_user_catalog()})


@app.post("/api/auth/change-password")
def change_password(payload: ChangePasswordIn, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    if not persistence.authenticate(user["email"], payload.current_password):
        audit(user, "auth_change_password", "user", user["id"], "blocked")
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    persistence.set_user_password(user["id"], payload.new_password)
    audit(user, "auth_change_password", "user", user["id"], "success")
    return envelope(message="Password changed")


@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordIn) -> dict[str, Any]:
    user = persistence.get_user_by_email(payload.email)
    reset = persistence.create_password_reset_token(user["id"]) if user else None
    if user:
        audit(user, "auth_password_reset_requested", "user", user["id"], "success")
    return envelope(
        {
            "delivery": "demo_local",
            "reset_token": reset["token"] if reset else None,
            "expires_at": reset["expires_at"] if reset else None,
        },
        "If the user exists, reset instructions were generated.",
    )


@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordIn) -> dict[str, Any]:
    reset = persistence.consume_password_reset_token(payload.token)
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = persistence.get_user(reset["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    persistence.set_user_password(user["id"], payload.new_password)
    audit(user, "auth_password_reset_completed", "user", user["id"], "success")
    return envelope(message="Password reset")


@app.post("/api/auth/logout")
def logout(response: Response, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = get_bearer_token(authorization)
    if token:
        persistence.delete_session(token)
    response.delete_cookie("vcsa_session")
    return envelope(message="Logged out")


@app.get("/api/mobile/me")
def mobile_me(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    return envelope({"user": user})


@app.get("/api/manager/team-dashboard")
def manager_team_dashboard(user: dict[str, Any] = Depends(require_manager)) -> dict[str, Any]:
    team_users = [
        item
        for item in persistence.list_users()
        if item.get("team_id") == user.get("team_id") and "sales_rep" in item.get("roles", [])
    ]
    pending = persistence.list_roleplay_submissions("submitted")
    team_goalsheets = [
        item
        for item in persistence.list_all_goalsheets()
        if any(rep["id"] == item.get("user_id") for rep in team_users)
    ]
    return envelope(
        {
            "team_id": user.get("team_id"),
            "summary": {
                "active_reps": len(team_users),
                "pending_reviews": len(pending),
                "team_metrics": calculate_metrics(team_goalsheets),
            },
            "reps": [user_summary(item["id"]) for item in team_users],
            "pending_submissions": pending,
        }
    )


@app.get("/api/dashboard/rep")
def rep_dashboard(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    completed_steps = persistence.get_completed_step_ids(user["id"])
    steps = [serialize_step(step, completed_steps) for step in BLUEPRINT_STEPS]
    metrics = calculate_metrics(persistence.list_goalsheets(user["id"]))
    return envelope(
        {
            "greeting": f"Ready for today, {user['display_name'].split()[0]}?",
            "certification_status": "in_progress",
            "blueprint_progress": round(sum(step["progress_percent"] for step in steps) / len(steps)),
            "next_lesson": steps[1],
            "metrics": metrics,
            "quick_access": ["Roadmap", "GoalSheet", "Roleplay Live", "Resources"],
            "pending_feedback": len([item for item in persistence.list_roleplay_submissions() if item.get("user_id") == user["id"] and item.get("status") == "reviewed"]),
        }
    )


@app.get("/api/blueprint/steps")
def get_blueprint_steps(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    completed_steps = persistence.get_completed_step_ids(user["id"])
    return envelope({"steps": [serialize_step(step, completed_steps) for step in BLUEPRINT_STEPS]})


@app.get("/api/blueprint/steps/{step_id}")
def get_blueprint_step(step_id: str, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    step = next((item for item in BLUEPRINT_STEPS if item[0] == step_id), None)
    if not step:
        raise HTTPException(status_code=404, detail="Blueprint step not found")
    data = serialize_step(step, persistence.get_completed_step_ids(user["id"]))
    data.update(
        {
            "purpose": "Train the exact behavior for this moment in the official Blueprint.",
            "media": [{"type": "video", "title": f"{data['title']} training", "duration": "6 min"}],
            "scripts": [
                {
                    "id": f"{step_id}-practice-script",
                    "title": f"{data['title']} practice script",
                    "script_type": "practice",
                    "body": "Use this as training language, not legal or official contractual language.",
                    "compliance_note": "Practice scripts must be labeled as training guidance.",
                }
            ],
            "checklist": ["Know the purpose", "Practice the transition", "Ask Smart Agent for coaching", "Run a roleplay"],
        }
    )
    return envelope({"step": data})


@app.post("/api/blueprint/steps/{step_id}/complete")
def complete_blueprint_step(step_id: str, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    if step_id not in {step[0] for step in BLUEPRINT_STEPS}:
        raise HTTPException(status_code=404, detail="Blueprint step not found")
    persistence.complete_step(user["id"], step_id)
    audit(user, "blueprint_step_completed", "blueprint_step", step_id, "success")
    return envelope({"step_id": step_id, "status": "completed"})


@app.get("/api/goalsheet/today")
def goalsheet_today(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    today = date.today().isoformat()
    existing = persistence.get_goalsheet(user["id"], today)
    return envelope(
        {
            "entry": existing
            or {
                "date": today,
                "tour_outcome": "qualified",
                "sales_outcome": "no_sale",
                "sales_volume": 0,
                "number_of_sales": 0,
                "follow_ups": [],
                "notes": "",
            }
        }
    )


@app.post("/api/goalsheet")
def save_goalsheet(entry: GoalSheetEntryIn, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    if entry.sales_volume < 0 or entry.number_of_sales < 0:
        raise HTTPException(status_code=400, detail="Sales volume and sales count must be non-negative")
    if entry.number_of_sales > 0 and entry.sales_outcome != "sold":
        raise HTTPException(status_code=400, detail="sales_outcome must be sold when number_of_sales is greater than zero")
    data = entry.model_dump()
    data["smart_agent_insight"] = create_goalsheet_insight(data)
    saved = persistence.upsert_goalsheet(user["id"], data["date"], data)
    audit(user, "goalsheet_saved", "goalsheet_entry", saved["id"], "success")
    return envelope({"entry": saved})


@app.get("/api/goalsheet/history")
def goalsheet_history(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    return envelope({"entries": persistence.list_goalsheets(user["id"])})


@app.get("/api/goalsheet/metrics")
def goalsheet_metrics(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    return envelope({"metrics": calculate_metrics(persistence.list_goalsheets(user["id"]))})


@app.get("/api/reminders/upcoming")
def reminders_upcoming(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    return envelope({"reminders": upcoming_followups(user["id"])})


@app.get("/api/smart-agent/status")
def smart_agent_status() -> dict[str, Any]:
    return envelope(provider_status(os.environ.get("VCSA_SMART_AGENT_PROVIDER", "local")))


@app.post("/api/smart-agent/chat")
def smart_agent_chat(payload: ChatIn, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    provider_name = os.environ.get("VCSA_SMART_AGENT_PROVIDER", "local")
    provider = get_provider(provider_name)
    result = provider.answer(payload.message, payload.mode, user, smart_agent_knowledge(user))
    audit(user, "smart_agent_chat", "ai_conversation", str(uuid4()), "blocked" if result.risk_flags else "success", {"risk_flags": result.risk_flags, "provider": provider.provider_name, "requested_provider": provider_name})
    return envelope(
        {
            "response": result.response,
            "citations": result.citations,
            "recommended_actions": result.recommended_actions,
            "risk_flags": result.risk_flags,
            "confidence": result.confidence,
        }
    )


@app.post("/api/smart-agent/public-chat")
def public_smart_agent_chat(payload: ChatIn) -> dict[str, Any]:
    anonymous_user = {
        "id": "public_welcome_agent",
        "email": "visitor@vcsa.local",
        "display_name": "Welcome Visitor",
        "roles": ["visitor"],
        "team_id": "team_demo",
        "permissions": [],
        "status": "active",
    }
    provider = get_provider(os.environ.get("VCSA_SMART_AGENT_PROVIDER", "local"))
    result = provider.answer(payload.message, "welcome_intake", anonymous_user, smart_agent_knowledge(anonymous_user))
    return envelope(
        {
            "response": result.response,
            "citations": result.citations,
            "recommended_actions": result.recommended_actions,
            "risk_flags": result.risk_flags,
            "confidence": result.confidence,
            "requires_login": True,
        }
    )


@app.post("/api/smart-agent/insights/goalsheet")
def goalsheet_insight(entry: GoalSheetEntryIn, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    return envelope({"insight": create_goalsheet_insight(entry.model_dump())})


@app.get("/api/roleplay/scenarios")
def roleplay_scenarios(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    return envelope(
        {
            "scenarios": [
                {
                    "id": "scenario_step_5_commitment",
                    "blueprint_step_id": "step_5",
                    "title": "Step 5 Commitment Check",
                    "difficulty": "medium",
                    "buyer_context": "Guest likes the property but avoids making decisions today.",
                    "objective": "Practice a clear, respectful yes/no commitment.",
                    "success_criteria": ["Professional tone", "Clear transition", "No pressure", "Full disclosure awareness"],
                },
                {
                    "id": "scenario_discovery_motivation",
                    "blueprint_step_id": "step_4",
                    "title": "Discovery Motivation",
                    "difficulty": "easy",
                    "buyer_context": "Guest gives short answers and has not explained why vacation ownership matters.",
                    "objective": "Use F.O.R.M. and discovery questions to uncover motivation.",
                    "success_criteria": ["Open-ended questions", "Active listening", "Clear summary", "No interrogation"],
                },
                {
                    "id": "scenario_confirmation_objection",
                    "blueprint_step_id": "step_9",
                    "title": "Point of Confirmation Objection",
                    "difficulty": "hard",
                    "buyer_context": "Guest likes the experience but says they need to think about it before hearing programs.",
                    "objective": "Confirm value and surface the real objection without pressure.",
                    "success_criteria": ["Calm tone", "Value recap", "Objection clarity", "Manager handoff readiness"],
                },
            ]
        }
    )


@app.post("/api/roleplay/sessions")
def create_roleplay_session(payload: RoleplaySessionIn, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    session_id = f"rp_{uuid4().hex[:8]}"
    session = {
        "id": session_id,
        "user_id": user["id"],
        "scenario_id": payload.scenario_id,
        "blueprint_step_id": payload.blueprint_step_id,
        "status": "active",
        "started_at": datetime.utcnow().isoformat(),
    }
    return envelope({"session": persistence.save_roleplay_session(session)})


@app.post("/api/roleplay/sessions/{session_id}/complete")
def complete_roleplay_session(session_id: str, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    session = persistence.get_roleplay_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Roleplay session not found")
    if session["user_id"] != user["id"] and "admin" not in user["roles"]:
        raise HTTPException(status_code=403, detail="You do not have access to this roleplay session")
    session["status"] = "completed"
    session["summary"] = "Completed practice session. Submit for manager review when ready."
    return envelope({"session": persistence.save_roleplay_session(session)})


@app.post("/api/roleplay/sessions/{session_id}/turn")
def roleplay_session_turn(session_id: str, payload: RoleplayTurnIn, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    session = persistence.get_roleplay_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Roleplay session not found")
    if session["user_id"] != user["id"] and "admin" not in user["roles"]:
        raise HTTPException(status_code=403, detail="You do not have access to this roleplay session")
    if session.get("status") != "active":
        raise HTTPException(status_code=400, detail="Roleplay session is not active")
    turn = roleplay_ai_turn(session, payload.message)
    scored = score_roleplay_transcript(session.get("transcript", ""))
    session["ai_score"] = scored
    saved = persistence.save_roleplay_session(session)
    audit(user, "roleplay_ai_turn", "roleplay_session", session_id, "success", {"score": scored["score"]})
    return envelope({"turn": turn, "session": saved, "ai_score": scored})


@app.post("/api/roleplay/submissions")
def create_roleplay_submission(payload: RoleplaySubmissionIn, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    session = persistence.get_roleplay_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Roleplay session not found")
    if session["user_id"] != user["id"] and "admin" not in user["roles"]:
        raise HTTPException(status_code=403, detail="You do not have access to this roleplay session")
    submission_id = f"sub_{uuid4().hex[:8]}"
    submission = {
        "id": submission_id,
        "session_id": payload.session_id,
        "user_id": user["id"],
        "submission_type": payload.submission_type,
        "transcript": payload.transcript,
        "status": "submitted",
        "submitted_at": datetime.utcnow().isoformat(),
    }
    return envelope({"submission": persistence.save_roleplay_submission(submission)})


@app.get("/api/roleplay/submissions/pending")
def pending_roleplay_submissions(user: dict[str, Any] = Depends(require_manager)) -> dict[str, Any]:
    return envelope({"submissions": persistence.list_roleplay_submissions("submitted")})


@app.get("/api/roleplay/submissions/mine")
def my_roleplay_submissions(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    submissions = [item for item in persistence.list_roleplay_submissions() if item.get("user_id") == user["id"]]
    return envelope({"submissions": submissions})


@app.post("/api/roleplay/submissions/{submission_id}/review")
def review_roleplay_submission(submission_id: str, payload: RoleplayReviewIn, user: dict[str, Any] = Depends(require_manager)) -> dict[str, Any]:
    submission = persistence.get_roleplay_submission(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Roleplay submission not found")
    submission["status"] = "reviewed"
    submission["manager_feedback"] = payload.model_dump()
    saved = persistence.save_roleplay_submission(submission)
    audit(user, "manager_score_submitted", "roleplay_submission", submission_id, "success", {"score": payload.score})
    return envelope({"submission": saved})


@app.get("/api/resources")
def resources(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    visible_resources = [
        {key: value for key, value in resource.items() if key != "body"} | {"has_access": has_resource_access(resource, user)}
        for resource in persistence.list_resources()
    ]
    return envelope({"resources": visible_resources})


@app.get("/api/resources/{resource_id}")
def get_resource(resource_id: str, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    resource = persistence.get_resource(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    allowed = has_resource_access(resource, user)
    audit(user, "sensitive_resource_access" if resource["requires_access_grant"] else "resource_access", "resource", resource_id, "success" if allowed else "blocked")
    if not allowed:
        raise HTTPException(status_code=403, detail="You do not have access to this resource")
    return envelope({"resource": resource})


@app.get("/api/certifications/readiness/{user_id}")
def certification_readiness(user_id: str, user: dict[str, Any] = Depends(require_manager)) -> dict[str, Any]:
    requirements = certification_requirements(user_id)
    latest_decision = next(iter(persistence.list_certification_decisions(user_id)), None)
    ready_for_review = all(requirements.values())
    return envelope(
        {
            "user_id": user_id,
            "status": latest_decision["status"] if latest_decision else ("ready_for_review" if ready_for_review else "in_progress"),
            "requirements": {
                **requirements,
                "manager_approval_complete": bool(latest_decision and latest_decision["status"] == "approved"),
            },
            "latest_decision": latest_decision,
        }
    )


@app.get("/api/certifications/mine")
def my_certifications(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    return envelope({"decisions": persistence.list_certification_decisions(user["id"])})


@app.post("/api/certifications/{user_id}/decision")
def certification_decision(user_id: str, payload: CertificationDecisionIn, user: dict[str, Any] = Depends(require_manager)) -> dict[str, Any]:
    if not persistence.get_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    requirements = certification_requirements(user_id)
    if payload.status == "approved" and not all(requirements.values()):
        audit(user, "certification_decision", "user", user_id, "blocked", {"status": payload.status, "requirements": requirements})
        raise HTTPException(status_code=400, detail="Certification approval is blocked until all requirements are complete")
    decision = persistence.save_certification_decision(
        {
            "user_id": user_id,
            "manager_user_id": user["id"],
            "status": payload.status,
            "notes": payload.notes,
        }
    )
    audit(user, "certification_decision", "user", user_id, "success", {"status": payload.status})
    return envelope({"decision": decision})


@app.get("/api/admin/users")
def admin_users(user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return envelope({"users": persistence.list_users()})


@app.post("/api/admin/users")
def admin_save_user(payload: UserIn, user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    saved = persistence.save_user(payload.model_dump(exclude={"password"}), payload.password)
    audit(user, "admin_user_saved", "user", saved["id"], "success", {"roles": saved["roles"]})
    return envelope({"user": saved})


@app.post("/api/admin/users/invite")
def admin_invite_user(payload: UserIn, user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    temporary_password = payload.password or f"Temp{uuid4().hex[:8]}!"
    saved = persistence.save_user(payload.model_dump(exclude={"password"}), temporary_password)
    reset = persistence.create_password_reset_token(saved["id"], "invite", ttl_minutes=7 * 24 * 60)
    audit(user, "admin_user_invited", "user", saved["id"], "success", {"roles": saved["roles"]})
    return envelope(
        {
            "user": saved,
            "temporary_password": temporary_password,
            "invite_token": reset["token"],
            "expires_at": reset["expires_at"],
        }
    )


@app.patch("/api/admin/users/{user_id}/status")
def admin_update_user_status(user_id: str, payload: UserStatusIn, user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    saved = persistence.set_user_status(user_id, payload.status)
    if not saved:
        raise HTTPException(status_code=404, detail="User not found")
    audit(user, "admin_user_status_changed", "user", user_id, "success", {"status": payload.status})
    return envelope({"user": saved})


@app.post("/api/admin/users/{user_id}/permissions")
def admin_update_user_permissions(user_id: str, payload: PermissionGrantIn, user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    target = persistence.get_user(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    permissions = set(target.get("permissions", []))
    if payload.action == "grant":
        permissions.add(payload.permission)
    else:
        permissions.discard(payload.permission)
    saved = persistence.set_user_permissions(user_id, sorted(permissions))
    audit(user, "admin_user_permission_changed", "user", user_id, "success", {"permission": payload.permission, "action": payload.action})
    return envelope({"user": saved})


@app.get("/api/admin/resources")
def admin_resources(user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return envelope({"resources": persistence.list_resources(include_unpublished=True)})


@app.post("/api/admin/resources")
def admin_save_resource(payload: ResourceIn, user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    saved = persistence.save_resource(payload.model_dump())
    audit(user, "admin_resource_saved", "resource", saved["id"], "success", {"sensitivity": saved["sensitivity"]})
    return envelope({"resource": saved})


@app.get("/api/admin/audit-events")
def get_audit_events(user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return envelope({"events": persistence.list_audit_events()})
