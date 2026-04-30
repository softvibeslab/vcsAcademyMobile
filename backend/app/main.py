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

from backend.app import persistence


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
    checks = {
        "database": persistence.healthcheck()["status"] == "ok",
        "seed_users": len(users) >= 3,
        "seed_resources": len(resources) >= 3,
    }
    status = "ready" if all(checks.values()) else "degraded"
    return envelope({"status": status, "checks": checks})


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


@app.post("/api/smart-agent/chat")
def smart_agent_chat(payload: ChatIn, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    text = payload.message.lower()
    risk_flags: list[str] = []
    if "hide" in text and "fee" in text:
        risk_flags.append("hidden_fee_request")
        response = "No. Fees and conditions must be disclosed clearly. Practice a transparent explanation and confirm the client understands before moving forward."
        action = {"label": "Review fee disclosure training", "route": "Resources", "params": {"tag": "fee-disclosure"}}
    elif "price" in text or "pricing" in text:
        risk_flags.append("pricing_guardrail")
        response = "Use approved pricing materials only. I can help you practice the transition, but I will not invent prices, discounts, or incentives."
        action = {"label": "Open T.O. Pricing step", "route": "BlueprintStep", "params": {"step": 11}}
    elif "step 5" in text or "pact" in text:
        response = "Step 5 is a commitment-setting moment, not pressure. Confirm that if the program makes sense and is affordable, the guest can make a clear yes/no decision today."
        action = {"label": "Run Step 5 Roleplay", "route": "RoleplayLive", "params": {"blueprint_step": 5}}
    else:
        response = "Stay aligned to the Blueprint, keep the language professional, and choose one next action the rep can practice immediately."
        action = {"label": "Open Roadmap", "route": "Roadmap", "params": {}}
    audit(user, "smart_agent_chat", "ai_conversation", str(uuid4()), "blocked" if risk_flags else "success", {"risk_flags": risk_flags})
    return envelope({"response": response, "citations": ["Blueprint knowledge base"], "recommended_actions": [action], "risk_flags": risk_flags, "confidence": 0.82})


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
                }
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
    required_complete = len(persistence.get_completed_step_ids(user_id)) >= 11
    reviewed_roleplays = [item for item in persistence.list_roleplay_submissions() if item.get("user_id") == user_id and item.get("status") == "reviewed"]
    latest_decision = next(iter(persistence.list_certification_decisions(user_id)), None)
    return envelope(
        {
            "user_id": user_id,
            "status": latest_decision["status"] if latest_decision else ("ready_for_review" if required_complete and reviewed_roleplays else "in_progress"),
            "requirements": {
                "required_blueprint_steps_complete": required_complete,
                "required_roleplays_reviewed": bool(reviewed_roleplays),
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
