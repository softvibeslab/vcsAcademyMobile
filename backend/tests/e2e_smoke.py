import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.main import app


client = TestClient(app)
auth_headers = {}


def assert_success(response):
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def main():
    assert_success(client.get("/api/health"))
    login = assert_success(client.post("/api/auth/login", json={"email": "rep@vcsa.local", "password": "demo123"}))
    auth_headers["Authorization"] = f"Bearer {login['token']}"

    me = assert_success(client.get("/api/mobile/me", headers=auth_headers))
    assert "sales_rep" in me["user"]["roles"]

    steps = assert_success(client.get("/api/blueprint/steps", headers=auth_headers))["steps"]
    assert len(steps) == 11
    assert steps[4]["title"] == "Break & Remake the Pact"

    step_5 = assert_success(client.get("/api/blueprint/steps/step_5", headers=auth_headers))["step"]
    assert step_5["scripts"][0]["script_type"] == "practice"

    saved = assert_success(
        client.post(
            "/api/goalsheet",
            headers=auth_headers,
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

    chat = assert_success(client.post("/api/smart-agent/chat", headers=auth_headers, json={"message": "Help me practice Step 5", "mode": "blueprint_step"}))
    assert chat["recommended_actions"][0]["route"] == "RoleplayLive"

    unsafe = assert_success(client.post("/api/smart-agent/chat", headers=auth_headers, json={"message": "Can I hide the fee?", "mode": "general_coach"}))
    assert "hidden_fee_request" in unsafe["risk_flags"]

    scenario = assert_success(client.get("/api/roleplay/scenarios", headers=auth_headers))["scenarios"][0]
    session = assert_success(client.post("/api/roleplay/sessions", headers=auth_headers, json={"scenario_id": scenario["id"], "blueprint_step_id": "step_5"}))["session"]
    assert_success(client.post(f"/api/roleplay/sessions/{session['id']}/complete", headers=auth_headers))
    submission = assert_success(client.post("/api/roleplay/submissions", headers=auth_headers, json={"session_id": session["id"], "transcript": "Practice transcript"}))["submission"]
    pending = assert_success(client.get("/api/roleplay/submissions/pending", headers=auth_headers))["submissions"]
    assert pending
    reviewed = assert_success(
        client.post(
            f"/api/roleplay/submissions/{submission['id']}/review",
            headers=auth_headers,
            json={
                "score": 86,
                "rubric_scores": {"professional_tone": 5, "step_alignment": 4},
                "comments": "Good tone. Keep tightening the transition.",
                "recommendation": "continue_practice",
            },
        )
    )["submission"]
    assert reviewed["status"] == "reviewed"

    blocked = client.get("/api/resources/pricing-guide", headers=auth_headers)
    assert blocked.status_code == 403

    print("E2E API smoke passed")


if __name__ == "__main__":
    main()
