from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


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

CURRENT_USER = {
    "id": "user_demo_rep",
    "email": "rep@vcsa.local",
    "display_name": "Chris Rivera",
    "roles": ["sales_rep", "manager"],
    "team_id": "team_demo",
    "permissions": ["resource:step-5-script:read"],
}

goal_sheet_entries: dict[str, dict[str, Any]] = {}
completed_steps: set[str] = {"step_1"}
roleplay_sessions: dict[str, dict[str, Any]] = {}
roleplay_submissions: dict[str, dict[str, Any]] = {}
audit_events: list[dict[str, Any]] = []


class ApiResponse(BaseModel):
    success: bool = True
    data: Any = None
    message: str | None = None


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


def envelope(data: Any = None, message: str | None = None) -> dict[str, Any]:
    return {"success": True, "data": data, "message": message}


def blueprint_progress(step_id: str) -> int:
    if step_id in completed_steps:
        return 100
    return 35 if step_id == "step_2" else 0


def blueprint_status(step_id: str, step_number: int) -> str:
    if step_id in completed_steps:
        return "completed"
    if step_number == 2:
        return "current"
    return "locked"


def serialize_step(step: tuple[str, int, str, str]) -> dict[str, Any]:
    step_id, step_number, title, description = step
    return {
        "id": step_id,
        "step_number": step_number,
        "title": title,
        "description": description,
        "progress_percent": blueprint_progress(step_id),
        "status": blueprint_status(step_id, step_number),
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
    metrics = calculate_metrics(list(goal_sheet_entries.values()) + [entry])
    if entry.get("number_of_sales", 0) > 0:
        lead = f"Good work closing {entry['number_of_sales']} sale today."
    else:
        lead = "Good job logging the day honestly."
    return f"{lead} Your current closing rate is {metrics['closing_percent']}%. Next: practice one roleplay tied to the biggest no-sale reason."


def audit(action: str, target_type: str, target_id: str, outcome: str, metadata: dict[str, Any] | None = None) -> None:
    audit_events.append(
        {
            "actor_user_id": CURRENT_USER["id"],
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


@app.get("/api/mobile/me")
def mobile_me() -> dict[str, Any]:
    return envelope({"user": CURRENT_USER})


@app.get("/api/dashboard/rep")
def rep_dashboard() -> dict[str, Any]:
    steps = [serialize_step(step) for step in BLUEPRINT_STEPS]
    metrics = calculate_metrics(list(goal_sheet_entries.values()))
    return envelope(
        {
            "greeting": "Ready for today, Chris?",
            "certification_status": "in_progress",
            "blueprint_progress": round(sum(step["progress_percent"] for step in steps) / len(steps)),
            "next_lesson": steps[1],
            "metrics": metrics,
            "quick_access": ["Roadmap", "GoalSheet", "Roleplay Live", "Resources"],
            "pending_feedback": len([item for item in roleplay_submissions.values() if item["status"] == "reviewed"]),
        }
    )


@app.get("/api/blueprint/steps")
def get_blueprint_steps() -> dict[str, Any]:
    return envelope({"steps": [serialize_step(step) for step in BLUEPRINT_STEPS]})


@app.get("/api/blueprint/steps/{step_id}")
def get_blueprint_step(step_id: str) -> dict[str, Any]:
    step = next((item for item in BLUEPRINT_STEPS if item[0] == step_id), None)
    if not step:
        raise HTTPException(status_code=404, detail="Blueprint step not found")
    data = serialize_step(step)
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
def complete_blueprint_step(step_id: str) -> dict[str, Any]:
    if step_id not in {step[0] for step in BLUEPRINT_STEPS}:
        raise HTTPException(status_code=404, detail="Blueprint step not found")
    completed_steps.add(step_id)
    audit("blueprint_step_completed", "blueprint_step", step_id, "success")
    return envelope({"step_id": step_id, "status": "completed"})


@app.get("/api/goalsheet/today")
def goalsheet_today() -> dict[str, Any]:
    today = date.today().isoformat()
    return envelope(
        {
            "entry": goal_sheet_entries.get(
                today,
                {
                    "date": today,
                    "tour_outcome": "qualified",
                    "sales_outcome": "no_sale",
                    "sales_volume": 0,
                    "number_of_sales": 0,
                    "follow_ups": [],
                    "notes": "",
                },
            )
        }
    )


@app.post("/api/goalsheet")
def save_goalsheet(entry: GoalSheetEntryIn) -> dict[str, Any]:
    if entry.sales_volume < 0 or entry.number_of_sales < 0:
        raise HTTPException(status_code=400, detail="Sales volume and sales count must be non-negative")
    if entry.number_of_sales > 0 and entry.sales_outcome != "sold":
        raise HTTPException(status_code=400, detail="sales_outcome must be sold when number_of_sales is greater than zero")
    data = entry.model_dump()
    data["smart_agent_insight"] = create_goalsheet_insight(data)
    data["updated_at"] = datetime.utcnow().isoformat()
    goal_sheet_entries[data["date"]] = data
    return envelope({"entry": data})


@app.get("/api/goalsheet/history")
def goalsheet_history() -> dict[str, Any]:
    return envelope({"entries": sorted(goal_sheet_entries.values(), key=lambda item: item["date"], reverse=True)})


@app.get("/api/goalsheet/metrics")
def goalsheet_metrics() -> dict[str, Any]:
    return envelope({"metrics": calculate_metrics(list(goal_sheet_entries.values()))})


@app.post("/api/smart-agent/chat")
def smart_agent_chat(payload: ChatIn) -> dict[str, Any]:
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
    audit("smart_agent_chat", "ai_conversation", str(uuid4()), "blocked" if risk_flags else "success", {"risk_flags": risk_flags})
    return envelope({"response": response, "citations": ["Blueprint knowledge base"], "recommended_actions": [action], "risk_flags": risk_flags, "confidence": 0.82})


@app.post("/api/smart-agent/insights/goalsheet")
def goalsheet_insight(entry: GoalSheetEntryIn) -> dict[str, Any]:
    return envelope({"insight": create_goalsheet_insight(entry.model_dump())})


@app.get("/api/roleplay/scenarios")
def roleplay_scenarios() -> dict[str, Any]:
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
def create_roleplay_session(payload: RoleplaySessionIn) -> dict[str, Any]:
    session_id = f"rp_{uuid4().hex[:8]}"
    session = {
        "id": session_id,
        "scenario_id": payload.scenario_id,
        "blueprint_step_id": payload.blueprint_step_id,
        "status": "active",
        "started_at": datetime.utcnow().isoformat(),
    }
    roleplay_sessions[session_id] = session
    return envelope({"session": session})


@app.post("/api/roleplay/sessions/{session_id}/complete")
def complete_roleplay_session(session_id: str) -> dict[str, Any]:
    session = roleplay_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Roleplay session not found")
    session["status"] = "completed"
    session["summary"] = "Completed practice session. Submit for manager review when ready."
    return envelope({"session": session})


@app.post("/api/roleplay/submissions")
def create_roleplay_submission(payload: RoleplaySubmissionIn) -> dict[str, Any]:
    if payload.session_id not in roleplay_sessions:
        raise HTTPException(status_code=404, detail="Roleplay session not found")
    submission_id = f"sub_{uuid4().hex[:8]}"
    submission = {
        "id": submission_id,
        "session_id": payload.session_id,
        "user_id": CURRENT_USER["id"],
        "submission_type": payload.submission_type,
        "transcript": payload.transcript,
        "status": "submitted",
        "submitted_at": datetime.utcnow().isoformat(),
    }
    roleplay_submissions[submission_id] = submission
    return envelope({"submission": submission})


@app.get("/api/roleplay/submissions/pending")
def pending_roleplay_submissions() -> dict[str, Any]:
    return envelope({"submissions": [item for item in roleplay_submissions.values() if item["status"] == "submitted"]})


@app.post("/api/roleplay/submissions/{submission_id}/review")
def review_roleplay_submission(submission_id: str, payload: RoleplayReviewIn) -> dict[str, Any]:
    submission = roleplay_submissions.get(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Roleplay submission not found")
    submission["status"] = "reviewed"
    submission["manager_feedback"] = payload.model_dump()
    audit("manager_score_submitted", "roleplay_submission", submission_id, "success", {"score": payload.score})
    return envelope({"submission": submission})


@app.get("/api/resources")
def resources() -> dict[str, Any]:
    return envelope(
        {
            "resources": [
                {"id": "step-5-script", "title": "Step 5 Practice Script", "resource_type": "script", "sensitivity": "practice_script", "requires_access_grant": False},
                {"id": "pricing-guide", "title": "T.O. Pricing Guide", "resource_type": "policy", "sensitivity": "pricing_or_fee_related", "requires_access_grant": True},
            ]
        }
    )


@app.get("/api/resources/{resource_id}")
def get_resource(resource_id: str) -> dict[str, Any]:
    resource_list = resources()["data"]["resources"]
    resource = next((item for item in resource_list if item["id"] == resource_id), None)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    allowed = not resource["requires_access_grant"] or f"resource:{resource_id}:read" in CURRENT_USER["permissions"] or "admin" in CURRENT_USER["roles"]
    audit("sensitive_resource_access" if resource["requires_access_grant"] else "resource_access", "resource", resource_id, "success" if allowed else "blocked")
    if not allowed:
        raise HTTPException(status_code=403, detail="You do not have access to this resource")
    return envelope({"resource": {**resource, "body": "Training-safe resource content."}})


@app.get("/api/certifications/readiness/{user_id}")
def certification_readiness(user_id: str) -> dict[str, Any]:
    required_complete = len(completed_steps) >= 11
    reviewed_roleplays = [item for item in roleplay_submissions.values() if item.get("status") == "reviewed"]
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
def get_audit_events() -> dict[str, Any]:
    return envelope({"events": audit_events})
