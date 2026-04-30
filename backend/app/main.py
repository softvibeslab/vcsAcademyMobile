from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.app import persistence


app = FastAPI(title="VCSA Academy API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    return envelope({"status": "ok", "service": "vcsa-academy-api"})


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
    return envelope(
        {
            "resources": [
                {"id": "step-5-script", "title": "Step 5 Practice Script", "resource_type": "script", "sensitivity": "practice_script", "requires_access_grant": False},
                {"id": "pricing-guide", "title": "T.O. Pricing Guide", "resource_type": "policy", "sensitivity": "pricing_or_fee_related", "requires_access_grant": True},
            ]
        }
    )


@app.get("/api/resources/{resource_id}")
def get_resource(resource_id: str, user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    resource_list = [
        {"id": "step-5-script", "title": "Step 5 Practice Script", "resource_type": "script", "sensitivity": "practice_script", "requires_access_grant": False},
        {"id": "pricing-guide", "title": "T.O. Pricing Guide", "resource_type": "policy", "sensitivity": "pricing_or_fee_related", "requires_access_grant": True},
    ]
    resource = next((item for item in resource_list if item["id"] == resource_id), None)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    allowed = not resource["requires_access_grant"] or f"resource:{resource_id}:read" in user["permissions"] or "admin" in user["roles"]
    audit(user, "sensitive_resource_access" if resource["requires_access_grant"] else "resource_access", "resource", resource_id, "success" if allowed else "blocked")
    if not allowed:
        raise HTTPException(status_code=403, detail="You do not have access to this resource")
    return envelope({"resource": {**resource, "body": "Training-safe resource content."}})


@app.get("/api/certifications/readiness/{user_id}")
def certification_readiness(user_id: str, user: dict[str, Any] = Depends(require_manager)) -> dict[str, Any]:
    required_complete = len(persistence.get_completed_step_ids(user_id)) >= 11
    reviewed_roleplays = [item for item in persistence.list_roleplay_submissions() if item.get("user_id") == user_id and item.get("status") == "reviewed"]
    return envelope(
        {
            "user_id": user_id,
            "status": "ready_for_review" if required_complete and reviewed_roleplays else "in_progress",
            "requirements": {
                "required_blueprint_steps_complete": required_complete,
                "required_roleplays_reviewed": bool(reviewed_roleplays),
                "manager_approval_complete": False,
            },
        }
    )


@app.get("/api/admin/audit-events")
def get_audit_events(user: dict[str, Any] = Depends(require_manager)) -> dict[str, Any]:
    return envelope({"events": persistence.list_audit_events()})
