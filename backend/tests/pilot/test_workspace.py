"""Private documents, owner workspace and branding contract tests."""
import json
import unittest
from uuid import uuid4
from unittest.mock import patch

from backend.tests.pilot import test_activity as activity_tests
from backend.app.pilot import db, workspace, learning


class WorkspaceApiTests(unittest.TestCase):
    tearDown = activity_tests.ActivityApiTests.tearDown

    def setUp(self):
        activity_tests.ActivityApiTests.setUp(self)
        with db.transaction() as conn:
            workspace.init_schema(conn)
            learning.init_schema(conn)
        self.client.app.include_router(workspace.router)

    def create_note(self, **changes):
        payload = {"client_request_id": str(uuid4()), "title": "Practice reflection", "body": "Private learning detail", "pinned": False, **changes}
        response = self.client.post("/api/pilot/notes", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["data"]["note"], payload

    def test_notes_are_persistent_and_idempotent(self):
        note, payload = self.create_note()
        replay = self.client.post("/api/pilot/notes", json=payload)
        self.assertEqual(replay.json()["data"]["note"]["id"], note["id"])
        found = self.client.get("/api/pilot/notes?q=learning").json()["data"]["items"]
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["body"], "Private learning detail")
        payload["body"] = "Changed request"
        self.assertEqual(self.client.post("/api/pilot/notes", json=payload).status_code, 409)

    def test_owner_and_other_user_cannot_read_private_note(self):
        note, _ = self.create_note()
        for uid, org, role in (("owner_a", "org_a", "owner"), ("rep_b", "org_b", "representative")):
            self.user = {**self.user, "id": uid, "organization_id": org, "role": role}
            self.assertEqual(self.client.get("/api/pilot/notes/" + note["id"]).status_code, 404)
            self.assertEqual(self.client.get("/api/pilot/notes").json()["data"]["items"], [])

    def test_note_edit_conflict_delete_and_no_private_audit(self):
        note, payload = self.create_note()
        path = "/api/pilot/notes/" + note["id"]
        response = self.client.patch(path, json={"expected_version": 1, "body": "Updated private detail"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.patch(path, json={"expected_version": 1, "body": "Stale"}).status_code, 409)
        self.assertEqual(self.client.request("DELETE", path, json={"expected_version": 2}).status_code, 200)
        self.assertEqual(self.client.get(path).status_code, 404)
        replay = self.client.post("/api/pilot/notes", json=payload)
        self.assertEqual(replay.status_code, 404)
        with db.read() as conn:
            raw = " ".join(r[0] for r in conn.execute("SELECT metadata_json FROM pilot_audit"))
            raw += " ".join(r[0] for r in conn.execute("SELECT result_json FROM pilot_idempotency"))
        self.assertNotIn("Private learning detail", raw)
        self.assertNotIn("Updated private detail", raw)

    def test_diary_requires_three_answers_and_is_private(self):
        payload = {"client_request_id": str(uuid4()), "entry_date": "2026-11-19", "answer_1": "I prepared", "answer_2": "I rushed", "answer_3": "Pause and listen"}
        response = self.client.post("/api/pilot/diary", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        entry = response.json()["data"]["entry"]
        self.assertEqual(self.client.get("/api/pilot/diary").json()["data"]["items"][0]["answer_3"], "Pause and listen")
        self.assertEqual(self.client.post("/api/pilot/diary", json={**payload, "client_request_id": str(uuid4()), "answer_2": ""}).status_code, 422)
        self.user = {**self.user, "id": "owner_a", "role": "owner"}
        self.assertEqual(self.client.get("/api/pilot/diary/" + entry["id"]).status_code, 404)

    def test_unknown_scope_fields_are_rejected(self):
        response = self.client.post("/api/pilot/notes", json={"client_request_id": str(uuid4()), "title": "Hi", "body": "Text", "user_id": "rep_b"})
        self.assertEqual(response.status_code, 422)

    def test_locale_is_persisted_and_cannot_change_identity(self):
        response = self.client.patch("/api/pilot/me/preferences", json={"locale": "es"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["user"]["locale"], "es")
        self.assertEqual(self.client.patch("/api/pilot/me/preferences", json={"locale": "fr"}).status_code, 422)
        self.assertEqual(self.client.patch("/api/pilot/me/preferences", json={"locale": "en", "role": "owner"}).status_code, 422)
        with db.read() as conn:
            self.assertEqual(conn.execute("SELECT locale FROM users WHERE id='rep_a'").fetchone()[0], "es")
            self.assertEqual(conn.execute("SELECT locale FROM users WHERE id='rep_b'").fetchone()[0], "en")

    def test_settings_owner_only_and_versioned(self):
        self.assertEqual(self.client.get("/api/pilot/owner/settings").status_code, 403)
        self.user = {**self.user, "id": "owner_a", "role": "owner"}
        response = self.client.patch("/api/pilot/owner/settings", json={"expected_version": 1, "app_name": "Academy Alpha", "welcome_title_en": "Learn together"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["settings"]["version"], 2)
        self.assertEqual(self.client.patch("/api/pilot/owner/settings", json={"expected_version": 1, "app_name": "Stale"}).status_code, 409)
        self.assertEqual(self.client.patch("/api/pilot/owner/settings", json={"expected_version": 2, "app_name": "<script>bad</script>"}).status_code, 422)
        with db.read() as conn:
            self.assertEqual(conn.execute("SELECT app_name FROM pilot_organizations WHERE id='org_b'").fetchone()[0], "Academy")

    @patch("backend.app.pilot.workspace.progress_summary", return_value={"completed_lessons": 0, "accessible_lessons": 0, "published_lessons": 0, "progress_percent": None, "pending_requests": 0})
    def test_team_contains_only_own_organization_and_no_notes(self, _):
        self.create_note()
        self.user = {**self.user, "id": "owner_a", "role": "owner"}
        response = self.client.get("/api/pilot/owner/team")
        self.assertEqual(response.status_code, 200, response.text)
        items = response.json()["data"]["items"]
        self.assertEqual([item["user"]["id"] for item in items], ["rep_a"])
        self.assertNotIn("Private learning detail", response.text)
        self.assertEqual(self.client.get("/api/pilot/owner/team/rep_b").status_code, 404)

    def test_diary_tour_link_is_private_and_versioned(self):
        tour, _ = activity_tests.ActivityApiTests.create_tour(self)
        payload = {"client_request_id": str(uuid4()), "entry_date": "2026-11-19", "tour_id": tour["id"],
                   "answer_1": "Prepared", "answer_2": "Listened", "answer_3": "Practice"}
        response = self.client.post("/api/pilot/diary", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        entry = response.json()["data"]["entry"]
        self.assertEqual(self.client.post("/api/pilot/diary", json=payload).json()["data"]["entry"]["id"], entry["id"])
        path = "/api/pilot/diary/" + entry["id"]
        self.assertEqual(self.client.patch(path, json={"expected_version": 1, "tour_id": None}).status_code, 200)
        self.assertEqual(self.client.patch(path, json={"expected_version": 1, "answer_1": "Stale"}).status_code, 409)
        self.assertEqual(self.client.patch(path, json={"expected_version": 2, "entry_date": None}).status_code, 422)
        self.assertEqual(self.client.request("DELETE", path, json={"expected_version": 2}).status_code, 200)
        self.assertEqual(self.client.post("/api/pilot/diary", json=payload).status_code, 404)
        with db.read() as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM pilot_diary_entries").fetchone()[0], 0)
            remembered = " ".join(row[0] for row in conn.execute("SELECT result_json FROM pilot_idempotency WHERE operation='diary_create'"))
            remembered += " ".join(row[0] for row in conn.execute("SELECT metadata_json FROM pilot_audit WHERE target_type='diary'"))
        for answer in ("Prepared", "Listened", "Practice"):
            self.assertNotIn(answer, remembered)
        self.user = {**self.user, "id": "rep_b", "organization_id": "org_b"}
        self.assertEqual(self.client.post("/api/pilot/diary", json={**payload, "client_request_id": str(uuid4())}).status_code, 404)

    def test_note_pages_literal_search_and_pin_order(self):
        self.create_note(title="First")
        self.create_note(title="Second")
        pinned, _ = self.create_note(title="Pinned", pinned=True)
        first = self.client.get("/api/pilot/notes?limit=2").json()["data"]
        self.assertEqual(first["items"][0]["id"], pinned["id"])
        second = self.client.get("/api/pilot/notes", params={"limit": 2, "cursor": first["next_cursor"]}).json()["data"]
        self.assertEqual(len(second["items"]), 1)
        self.assertFalse({item["id"] for item in first["items"]} & {item["id"] for item in second["items"]})
        self.assertEqual(self.client.get("/api/pilot/notes?q=%25").json()["data"]["items"], [])
        self.assertEqual(self.client.get("/api/pilot/notes?cursor=!!").status_code, 422)

    def test_team_detail_matches_home_and_learning_schema(self):
        activity_tests.ActivityApiTests.create_tour(self)
        self.create_note(body="Never shared with owner")
        home = self.client.get("/api/pilot/metrics?period=month").json()["data"]
        with db.transaction() as conn:
            learning.seed_roadmap(conn, "org_a")
            lesson = conn.execute("SELECT id FROM pilot_lessons WHERE organization_id='org_a' ORDER BY position LIMIT 1").fetchone()[0]
            revision = conn.execute("SELECT id FROM pilot_lesson_revisions WHERE lesson_id=?", (lesson,)).fetchone()[0]
            conn.execute("INSERT INTO pilot_lesson_completions VALUES(?,?,?,?,?)", ("org_a", lesson, "rep_a", revision, db.now()))
            conn.execute("UPDATE pilot_lessons SET current_published_revision_id=?,status='published',team_access='closed' WHERE id=?", (revision, lesson))
            conn.execute("INSERT INTO pilot_access_requests(id,organization_id,lesson_id,user_id,status,created_at,updated_at) VALUES('request_a','org_a',?,'rep_a','pending',?,?)", (lesson, db.now(), db.now()))
        self.user = {**self.user, "id": "owner_a", "role": "owner"}
        response = self.client.get("/api/pilot/owner/team/rep_a?period=month")
        self.assertEqual(response.status_code, 200, response.text)
        detail = response.json()["data"]
        self.assertEqual(detail["metrics"], home)
        self.assertEqual(len(detail["tours"]), 1)
        self.assertEqual(detail["lessons"][0]["published_revision_id"], revision)
        self.assertEqual(detail["requests"][0].get("lesson_title"), "Meet & Greet")
        self.assertEqual(detail["requests"][0].get("display_name"), "rep_a")
        self.assertNotIn("Never shared with owner", response.text)
        self.assertNotIn("password_hash", response.text)
        self.assertNotIn("permissions_json", response.text)


if __name__ == "__main__":
    unittest.main()
