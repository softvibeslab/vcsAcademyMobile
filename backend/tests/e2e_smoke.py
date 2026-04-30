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
    health_response = client.get("/api/health")
    assert health_response.headers.get("x-content-type-options") == "nosniff"
    assert health_response.headers.get("x-frame-options") == "DENY"
    assert_success(health_response)
    ready = assert_success(client.get("/api/ready"))
    assert ready["status"] == "ready"
    unauthenticated = client.get("/api/mobile/me")
    assert unauthenticated.status_code == 401

    rep_login = assert_success(client.post("/api/auth/login", json={"email": "rep@vcsa.local", "password": "demo123"}))
    auth_headers["Authorization"] = f"Bearer {rep_login['token']}"
    manager_login = assert_success(client.post("/api/auth/login", json={"email": "manager@vcsa.local", "password": "demo123"}))
    manager_headers = {"Authorization": f"Bearer {manager_login['token']}"}
    admin_login = assert_success(client.post("/api/auth/login", json={"email": "admin@vcsa.local", "password": "demo123"}))
    admin_headers = {"Authorization": f"Bearer {admin_login['token']}"}

    me = assert_success(client.get("/api/mobile/me", headers=auth_headers))
    assert "sales_rep" in me["user"]["roles"]
    assert "manager" not in me["user"]["roles"]

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
    rep_forbidden = client.get("/api/roleplay/submissions/pending", headers=auth_headers)
    assert rep_forbidden.status_code == 403
    pending = assert_success(client.get("/api/roleplay/submissions/pending", headers=manager_headers))["submissions"]
    assert pending
    reviewed = assert_success(
        client.post(
            f"/api/roleplay/submissions/{submission['id']}/review",
            headers=manager_headers,
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

    manager_dashboard = assert_success(client.get("/api/manager/team-dashboard", headers=manager_headers))
    assert manager_dashboard["summary"]["active_reps"] >= 1

    readiness = assert_success(client.get("/api/certifications/readiness/user_demo_rep", headers=manager_headers))
    assert readiness["requirements"]["required_roleplays_reviewed"] is True
    decision = assert_success(
        client.post(
            "/api/certifications/user_demo_rep/decision",
            headers=manager_headers,
            json={"status": "needs_practice", "notes": "Complete the remaining Blueprint steps before final approval."},
        )
    )["decision"]
    assert decision["status"] == "needs_practice"
    mine = assert_success(client.get("/api/certifications/mine", headers=auth_headers))["decisions"]
    assert mine

    resources = assert_success(client.get("/api/resources", headers=auth_headers))["resources"]
    assert any(item["id"] == "pricing-guide" and item["has_access"] is False for item in resources)
    admin_users = assert_success(client.get("/api/admin/users", headers=admin_headers))["users"]
    assert any(item["email"] == "rep@vcsa.local" for item in admin_users)
    invited = assert_success(
        client.post(
            "/api/admin/users/invite",
            headers=admin_headers,
            json={
                "id": "user_qa_auth",
                "email": "qa-auth@vcsa.local",
                "display_name": "QA Auth Rep",
                "roles": ["sales_rep"],
                "team_id": "team_demo",
                "permissions": ["resource:step-5-script:read"],
                "status": "active",
                "password": "tempdemo123",
            },
        )
    )
    assert invited["invite_token"]
    qa_headers = {
        "Authorization": f"Bearer {assert_success(client.post('/api/auth/login', json={'email': 'qa-auth@vcsa.local', 'password': 'tempdemo123'}))['token']}"
    }
    assert_success(
        client.post(
            "/api/auth/change-password",
            headers=qa_headers,
            json={"current_password": "tempdemo123", "new_password": "changedemo123"},
        )
    )
    assert client.post("/api/auth/login", json={"email": "qa-auth@vcsa.local", "password": "tempdemo123"}).status_code == 401
    changed_login = assert_success(client.post("/api/auth/login", json={"email": "qa-auth@vcsa.local", "password": "changedemo123"}))
    reset_request = assert_success(client.post("/api/auth/forgot-password", json={"email": "qa-auth@vcsa.local"}))
    assert reset_request["reset_token"]
    assert_success(client.post("/api/auth/reset-password", json={"token": reset_request["reset_token"], "new_password": "resetdemo123"}))
    assert client.get("/api/mobile/me", headers={"Authorization": f"Bearer {changed_login['token']}"}).status_code == 401
    assert_success(client.post("/api/auth/login", json={"email": "qa-auth@vcsa.local", "password": "resetdemo123"}))
    disabled = assert_success(client.patch("/api/admin/users/user_qa_auth/status", headers=admin_headers, json={"status": "inactive"}))["user"]
    assert disabled["status"] == "inactive"
    assert client.post("/api/auth/login", json={"email": "qa-auth@vcsa.local", "password": "resetdemo123"}).status_code == 401
    assert_success(client.patch("/api/admin/users/user_qa_auth/status", headers=admin_headers, json={"status": "active"}))
    saved_resource = assert_success(
        client.post(
            "/api/admin/resources",
            headers=admin_headers,
            json={
                "id": "launch-checklist",
                "title": "Launch Checklist",
                "resource_type": "checklist",
                "sensitivity": "general_training",
                "requires_access_grant": False,
                "body": "Production launch checklist for the academy.",
                "tags": ["launch", "qa"],
                "status": "published",
            },
        )
    )["resource"]
    assert saved_resource["id"] == "launch-checklist"
    audit_events = assert_success(client.get("/api/admin/audit-events", headers=admin_headers))["events"]
    assert audit_events

    assert_success(client.post("/api/auth/logout", headers=auth_headers))
    expired = client.get("/api/mobile/me", headers=auth_headers)
    assert expired.status_code == 401

    print("E2E API smoke passed")


if __name__ == "__main__":
    main()
