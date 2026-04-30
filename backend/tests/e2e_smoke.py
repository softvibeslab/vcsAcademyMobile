import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.main import app


client = TestClient(app)


def assert_success(response):
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def main():
    assert_success(client.get("/api/health"))
    me = assert_success(client.get("/api/mobile/me"))
    assert "sales_rep" in me["user"]["roles"]

    steps = assert_success(client.get("/api/blueprint/steps"))["steps"]
    assert len(steps) == 11
    assert steps[4]["title"] == "Break & Remake the Pact"

    step_5 = assert_success(client.get("/api/blueprint/steps/step_5"))["step"]
    assert step_5["scripts"][0]["script_type"] == "practice"

    saved = assert_success(
        client.post(
            "/api/goalsheet",
            json={
                "date": "2026-04-29",
                "tour_outcome": "qualified",
                "sales_outcome": "sold",
                "sales_volume": 8450,
                "number_of_sales": 1,
                "follow_ups": [{"follow_up_date": "2026-05-01", "note": "Send approved brochure."}],
                "notes": "Strong Step 5 transition.",
            },
        )
    )["entry"]
    assert "smart_agent_insight" in saved

    chat = assert_success(client.post("/api/smart-agent/chat", json={"message": "Help me practice Step 5", "mode": "blueprint_step"}))
    assert chat["recommended_actions"][0]["route"] == "RoleplayLive"

    unsafe = assert_success(client.post("/api/smart-agent/chat", json={"message": "Can I hide the fee?", "mode": "general_coach"}))
    assert "hidden_fee_request" in unsafe["risk_flags"]

    scenario = assert_success(client.get("/api/roleplay/scenarios"))["scenarios"][0]
    session = assert_success(client.post("/api/roleplay/sessions", json={"scenario_id": scenario["id"], "blueprint_step_id": "step_5"}))["session"]
    assert_success(client.post(f"/api/roleplay/sessions/{session['id']}/complete"))
    submission = assert_success(client.post("/api/roleplay/submissions", json={"session_id": session["id"], "transcript": "Practice transcript"}))["submission"]
    pending = assert_success(client.get("/api/roleplay/submissions/pending"))["submissions"]
    assert pending
    reviewed = assert_success(
        client.post(
            f"/api/roleplay/submissions/{submission['id']}/review",
            json={
                "score": 86,
                "rubric_scores": {"professional_tone": 5, "step_alignment": 4},
                "comments": "Good tone. Keep tightening the transition.",
                "recommendation": "continue_practice",
            },
        )
    )["submission"]
    assert reviewed["status"] == "reviewed"

    blocked = client.get("/api/resources/pricing-guide")
    assert blocked.status_code == 403

    print("E2E API smoke passed")


if __name__ == "__main__":
    main()
