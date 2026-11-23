"""V1 visits: synthetic API contract tests; never connect to a deployed database."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
TEMP = tempfile.TemporaryDirectory(prefix="tour-contract-")
os.environ["VCSA_DB_PATH"] = str(Path(TEMP.name) / "academy.sqlite3")
os.environ["VCSA_SMART_AGENT_PROVIDER"] = "local"
from fastapi.testclient import TestClient
from backend.app import access, persistence
from backend.app.main import app


def rid():
    return str(uuid4())


def instant(days=0):
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


class TourVisitsContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        access.limiter.limit = 1000
        cls.rep = cls.login("rep@vcsa.local")
        cls.admin = cls.login("admin@vcsa.local")
        registered = cls.client.post("/api/auth/register", json={"display_name": "QA Tours", "email": "tours@example.invalid", "password": "Synthetic123", "accept_privacy": True})
        cls.free = {"Authorization": "Bearer " + registered.json()["data"]["token"]}

    @classmethod
    def login(cls, email):
        result = cls.client.post("/api/auth/login", json={"email": email, "password": "demo123"})
        assert result.status_code == 200
        return {"Authorization": "Bearer " + result.json()["data"]["token"]}

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        TEMP.cleanup()

    def create(self, **fields):
        payload = {"request_id": rid(), "intent": "start", "context": "Contexto sintético de visita", **fields}
        result = self.client.post("/api/tour-visits", headers=self.rep, json=payload)
        self.assertEqual(result.status_code, 201, result.text)
        return result.json()["data"]["visit"], payload

    def edit(self, visit, **fields):
        return self.client.patch("/api/tour-visits/" + visit["id"], headers=self.rep, json={"request_id": rid(), "expected_revision": visit["revision"], "action": "edit", **fields})

    def test_create_replay_conflict_and_multiple_visits_do_not_touch_goalsheet(self):
        before = self.client.get("/api/goalsheet/history", headers=self.rep).json()
        visit, payload = self.create()
        self.assertEqual(visit["status"], "in_progress")
        self.assertEqual(visit["revision"], 1)
        self.assertNotIn("user_id", visit)
        replay = self.client.post("/api/tour-visits", headers=self.rep, json=payload)
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(replay.json()["data"]["visit"]["id"], visit["id"])
        conflict = self.client.post("/api/tour-visits", headers=self.rep, json={**payload, "context": "Otro"})
        self.assertEqual(conflict.status_code, 409)
        second, _ = self.create()
        self.assertNotEqual(second["id"], visit["id"])
        self.assertEqual(before, self.client.get("/api/goalsheet/history", headers=self.rep).json())

    def test_owner_and_permissions_apply_to_every_operation(self):
        visit, _ = self.create()
        path = "/api/tour-visits/" + visit["id"]
        for method, suffix, body in [("get", "", None), ("patch", "", {"action": "edit", "context": " чужое", "expected_revision": 1, "request_id": rid()}), ("delete", "", {"expected_revision": 1, "request_id": rid()}), ("post", "/analysis", {"expected_revision": 1, "request_id": rid()})]:
            response = self.client.request(method, path + suffix, headers=self.admin, **({"json": body} if body else {}))
            self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(self.client.get(path).status_code, 401)
        self.client.patch("/api/admin/access-items/function:goalsheet", headers=self.admin, json={"level": "premium"})
        try:
            response = self.client.post("/api/tour-visits", headers=self.free, json={"request_id": rid(), "intent": "start", "context": "synthetic"})
            self.assertEqual(response.status_code, 403)
        finally:
            self.client.patch("/api/admin/access-items/function:goalsheet", headers=self.admin, json={"level": "gratis"})

    def test_revision_transition_and_completed_feedback_preserves_date(self):
        visit, _ = self.create(intent="schedule", scheduled_at=instant(2))
        changed = self.edit(visit, context="Preparación nueva")
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(self.edit(visit, context="Perdida").status_code, 409)
        visit = changed.json()["data"]["visit"]
        reflected = self.client.patch("/api/tour-visits/" + visit["id"], headers=self.rep, json={"request_id": rid(), "expected_revision": visit["revision"], "action": "reflect", "completed_at": instant(-1), "feedback": {"happened": "Escuché sus prioridades"}})
        self.assertEqual(reflected.status_code, 200, reflected.text)
        completed = reflected.json()["data"]["visit"]
        edited = self.edit(completed, feedback={"happened": "Confirmé las prioridades", "worked": "Escuchar"})
        self.assertEqual(edited.status_code, 200, edited.text)
        self.assertEqual(edited.json()["data"]["visit"]["completed_at"], completed["completed_at"])
        self.assertEqual(self.edit(edited.json()["data"]["visit"], scheduled_at=instant(3)).status_code, 422)

    def test_offset_cancun_and_invalid_or_old_times(self):
        from backend.app import tour_visits
        now = datetime(2026, 11, 23, 4, 30, tzinfo=timezone.utc)
        with patch.object(tour_visits, "utcnow", return_value=now):
            visit, _ = self.create()
            self.assertEqual(visit["event_date"], "2026-11-22")
            for intent, value in [("schedule", "2026-11-24T10:00:00"), ("schedule", "2026-11-21T10:00:00-05:00"), ("reflect", "2026-10-01T10:00:00-05:00"), ("reflect", "2026-11-25T10:00:00-05:00")]:
                payload = {"request_id": rid(), "intent": intent, "scheduled_at": value, "context": "synthetic"}
                if intent == "reflect":
                    payload["feedback"] = {"happened": "Aprendí"}
                response = self.client.post("/api/tour-visits", headers=self.rep, json=payload)
                self.assertEqual(response.status_code, 422, response.text)

    def test_payload_limits_and_unapproved_fields(self):
        for extra in [{"user_id": "user_demo_admin"}, {"context": "x" * 6001}, {"title": "x" * 121}, {"feedback": {"happened": "not allowed on start"}}, {"scheduled_at": instant(1)}]:
            result = self.client.post("/api/tour-visits", headers=self.rep, json={"request_id": rid(), "intent": "start", "context": "synthetic", **extra})
            self.assertEqual(result.status_code, 422)
        too_large = {"request_id": rid(), "intent": "reflect", "scheduled_at": instant(-1), "context": "x" * 6000, "feedback": {"happened": "y" * 4000, "worked": "z"}}
        self.assertEqual(self.client.post("/api/tour-visits", headers=self.rep, json=too_large).status_code, 422)

    def test_list_cursor_owner_range_and_detail(self):
        visit, _ = self.create()
        self.create()
        query = {"from": visit["event_date"], "to": visit["event_date"], "limit": 1}
        page = self.client.get("/api/tour-visits", headers=self.rep, params=query)
        self.assertEqual(page.status_code, 200, page.text)
        data = page.json()["data"]
        self.assertEqual(len(data["visits"]), 1)
        self.assertNotIn("context", data["visits"][0])
        self.assertTrue(data["next_cursor"])
        second = self.client.get("/api/tour-visits", headers=self.rep, params={**query, "cursor": data["next_cursor"]}).json()["data"]
        self.assertNotEqual(data["visits"][0]["id"], second["visits"][0]["id"])
        self.assertEqual(self.client.get("/api/tour-visits", headers=self.admin, params={**query, "cursor": data["next_cursor"]}).status_code, 422)
        detail = self.client.get("/api/tour-visits/" + visit["id"], headers=self.rep).json()["data"]["visit"]
        self.assertEqual(detail["context"], visit["context"])
        self.assertEqual(self.client.get("/api/tour-visits?from=2026-01-01&to=2026-11-30", headers=self.rep).status_code, 422)

    def test_delete_tombstone_prevents_recreation(self):
        visit, create = self.create()
        delete = {"request_id": rid(), "expected_revision": 1}
        response = self.client.request("DELETE", "/api/tour-visits/" + visit["id"], headers=self.rep, json=delete)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get("/api/tour-visits/" + visit["id"], headers=self.rep).status_code, 404)
        self.assertEqual(self.client.post("/api/tour-visits", headers=self.rep, json=create).status_code, 410)
        with persistence.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM tour_visit_analyses WHERE visit_id=?", (visit["id"],)).fetchone()[0], 0)
            row = dict(db.execute("SELECT * FROM tour_visit_requests WHERE request_id=?", (create["request_id"],)).fetchone())
            self.assertEqual(row["status"], "deleted")
            self.assertNotIn("Contexto sintético", json.dumps(row))

    def test_expiry_read_and_purge_preserve_future_visits(self):
        from backend.app import tour_visits
        now = datetime.now(timezone.utc)
        with patch.object(tour_visits, "utcnow", return_value=now):
            active, _ = self.create()
            future, _ = self.create(intent="schedule", scheduled_at=(now + timedelta(days=40)).isoformat())
        later = now + timedelta(days=30)
        with patch.object(tour_visits, "utcnow", return_value=later):
            self.assertEqual(self.client.get("/api/tour-visits/" + active["id"], headers=self.rep).status_code, 404)
            self.assertEqual(self.client.get("/api/tour-visits/" + future["id"], headers=self.rep).status_code, 200)
            result = tour_visits.purge_expired()
            self.assertGreaterEqual(result["visits_deleted"], 1)
            with persistence.connect() as db:
                self.assertIsNone(db.execute("SELECT id FROM tour_visits WHERE id=?", (active["id"],)).fetchone())

    def test_chat_rejects_foreign_context_before_provider(self):
        visit, _ = self.create()
        with patch("backend.app.main.get_provider") as provider:
            response = self.client.post("/api/smart-agent/chat", headers=self.admin, json={"message": "Contexto", "tour_id": visit["id"]})
            self.assertEqual(response.status_code, 404)
            provider.assert_not_called()
        response = self.client.post("/api/smart-agent/chat", headers=self.rep, json={"message": "Mi tour comenzó"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["tour_action_prompt"]["actions"], ["start", "schedule", "reflect"])

    def test_migration_repeated_keeps_existing_rows(self):
        from backend.app import tour_visits
        visit, _ = self.create()
        tour_visits.init_schema()
        tour_visits.init_schema()
        self.assertEqual(self.client.get("/api/tour-visits/" + visit["id"], headers=self.rep).status_code, 200)

    def analysis_value(self, visit):
        return {"context_revision": visit["revision"], "status": "ready", "summary": "Se confirmaron prioridades.", "strengths": "Escucha activa", "improvement": "Confirmar lo entendido", "next_practice": "Hacer una pregunta abierta", "recommended_steps": [], "provider": "hermes", "generated_at": instant()}

    def analyze(self, visit, request_id=None):
        return self.client.post("/api/tour-visits/" + visit["id"] + "/analysis", headers=self.rep, json={"expected_revision": visit["revision"], "request_id": request_id or rid()})

    def test_analysis_failure_saved_then_retry_and_success_replay(self):
        from backend.app.coach_hermes import CoachUnavailable
        visit, _ = self.create(intent="reflect", scheduled_at=instant(-1), feedback={"happened": "Hice preguntas abiertas"})
        request_id = rid()
        with patch("backend.app.main.coach_hermes.generate_visit_analysis", side_effect=CoachUnavailable(), create=True):
            self.assertEqual(self.analyze(visit, request_id).status_code, 503)
        saved = self.client.get("/api/tour-visits/" + visit["id"], headers=self.rep).json()["data"]["visit"]
        self.assertEqual(saved["feedback"]["happened"], "Hice preguntas abiertas")
        self.assertEqual(saved["analysis"]["status"], "failed")
        with patch("backend.app.main.coach_hermes.generate_visit_analysis", return_value=self.analysis_value(visit), create=True) as infer:
            response = self.analyze(visit, request_id)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(self.analyze(visit, request_id).json(), response.json())
            infer.assert_called_once()
            allowed = infer.call_args.args[2]
            # Legacy synthetic rep starts with step_1 completed and step_2 open.
            self.assertEqual({step["step_id"] for step in allowed}, {"step_1", "step_2"})

    def test_analysis_pending_lease_recovery_and_outdated_response(self):
        from backend.app import tour_visits
        visit, _ = self.create()
        request = tour_visits.Mutation(request_id=rid(), expected_revision=1)
        now = datetime.now(timezone.utc)
        with patch.object(tour_visits, "utcnow", return_value=now):
            snapshot, first_lease, _ = tour_visits.begin_analysis("user_demo_rep", visit["id"], request)
            with patch("backend.app.main.coach_hermes.generate_visit_analysis", create=True) as infer:
                self.assertEqual(self.analyze(visit).status_code, 429)
                infer.assert_not_called()
        with patch.object(tour_visits, "utcnow", return_value=now + timedelta(seconds=61)):
            snapshot, second_lease, _ = tour_visits.begin_analysis("user_demo_rep", visit["id"], request)
            self.assertNotEqual(first_lease, second_lease)
            from fastapi import HTTPException
            with self.assertRaises(HTTPException) as conflict:
                tour_visits.finish_analysis("user_demo_rep", visit["id"], 1, first_lease, self.analysis_value(visit))
            self.assertEqual(conflict.exception.status_code, 409)
            tour_visits.finish_analysis("user_demo_rep", visit["id"], 1, second_lease, self.analysis_value(visit))
        self.assertEqual(self.edit(visit, context="Nueva información").status_code, 200)
        saved = self.client.get("/api/tour-visits/" + visit["id"], headers=self.rep).json()["data"]["visit"]
        self.assertEqual(saved["analysis"]["status"], "stale")
        with self.assertRaises(HTTPException) as conflict:
            tour_visits.finish_analysis("user_demo_rep", visit["id"], 1, second_lease, self.analysis_value(visit))
        self.assertEqual(conflict.exception.status_code, 409)

    def test_edit_or_delete_during_inference_never_restores_old_context(self):
        visit, _ = self.create()
        def edit_while_running(*_args):
            self.assertEqual(self.edit(visit, context="Contexto revisado").status_code, 200)
            return self.analysis_value(visit)
        with patch("backend.app.main.coach_hermes.generate_visit_analysis", side_effect=edit_while_running, create=True):
            self.assertEqual(self.analyze(visit).status_code, 409)
        saved = self.client.get("/api/tour-visits/" + visit["id"], headers=self.rep).json()["data"]["visit"]
        self.assertEqual(saved["context"], "Contexto revisado")
        self.assertEqual(saved["analysis"]["status"], "stale")
        def delete_while_running(*_args):
            self.client.request("DELETE", "/api/tour-visits/" + visit["id"], headers=self.rep, json={"expected_revision": saved["revision"], "request_id": rid()})
            return self.analysis_value(saved)
        with patch("backend.app.main.coach_hermes.generate_visit_analysis", side_effect=delete_while_running, create=True):
            self.assertEqual(self.analyze(saved).status_code, 404)
        with persistence.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM tour_visit_analyses WHERE visit_id=?", (visit["id"],)).fetchone()[0], 0)

    def test_analysis_revalidates_roadmap_access_after_inference(self):
        visit, _ = self.create()
        def revoke_during_inference(*_args):
            self.client.patch("/api/admin/access-items/lesson:step_1", headers=self.admin, json={"visible": False})
            return {**self.analysis_value(visit), "recommended_steps": [{"step_id": "step_1", "title": "Meet & Greet", "reason": "Practicar la bienvenida"}]}
        try:
            with patch("backend.app.main.coach_hermes.generate_visit_analysis", side_effect=revoke_during_inference, create=True):
                result = self.analyze(visit)
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json()["data"]["analysis"]["recommended_steps"], [])
        finally:
            self.client.patch("/api/admin/access-items/lesson:step_1", headers=self.admin, json={"visible": True})

    def test_timestamp_contract_requires_iso_text_not_epoch_numbers(self):
        response = self.client.post("/api/tour-visits", headers=self.rep, json={"request_id": rid(), "intent": "schedule", "context": "synthetic", "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=2)).timestamp()})
        self.assertEqual(response.status_code, 422)
        visit, _ = self.create()
        response = self.client.patch("/api/tour-visits/" + visit["id"], headers=self.rep, json={"request_id": rid(), "expected_revision": 1, "action": "reflect", "feedback": {"happened": "synthetic"}, "completed_at": datetime.now(timezone.utc).timestamp()})
        self.assertEqual(response.status_code, 422)

    def test_cancelled_visit_is_readonly_except_delete(self):
        visit, _ = self.create()
        response = self.client.patch("/api/tour-visits/" + visit["id"], headers=self.rep, json={"request_id": rid(), "expected_revision": 1, "action": "cancel"})
        self.assertEqual(response.status_code, 200)
        cancelled = response.json()["data"]["visit"]
        self.assertEqual(cancelled["status"], "cancelled")
        self.assertEqual(self.edit(cancelled, context="Changed").status_code, 422)
        with patch("backend.app.main.coach_hermes.generate_visit_analysis", return_value=self.analysis_value(cancelled)) as infer:
            self.assertEqual(self.analyze(cancelled).status_code, 422)
            infer.assert_not_called()
        self.assertEqual(self.client.request("DELETE", "/api/tour-visits/" + visit["id"], headers=self.rep, json={"request_id": rid(), "expected_revision": 2}).status_code, 200)

    def test_purge_removes_analysis_and_tombstones_expire(self):
        from backend.app import tour_visits
        now = datetime.now(timezone.utc)
        with patch.object(tour_visits, "utcnow", return_value=now):
            visit, payload = self.create()
            with patch("backend.app.main.coach_hermes.generate_visit_analysis", return_value=self.analysis_value(visit)):
                self.assertEqual(self.analyze(visit).status_code, 200)
        later = now + timedelta(days=31)
        with patch.object(tour_visits, "utcnow", return_value=later):
            result = tour_visits.purge_expired()
            self.assertGreater(result["visits_deleted"], 0)
            with persistence.connect() as db:
                self.assertEqual(db.execute("SELECT count(*) FROM tour_visit_analyses WHERE visit_id=?", (visit["id"],)).fetchone()[0], 0)
            self.assertEqual(self.client.post("/api/tour-visits", headers=self.rep, json=payload).status_code, 410)
        with patch.object(tour_visits, "utcnow", return_value=later + timedelta(days=31)):
            result = tour_visits.purge_expired()
            self.assertGreater(result["requests_deleted"], 0)
            with persistence.connect() as db:
                self.assertIsNone(db.execute("SELECT request_id FROM tour_visit_requests WHERE request_id=?", (payload["request_id"],)).fetchone())

    def test_simultaneous_create_request_only_creates_once(self):
        from concurrent.futures import ThreadPoolExecutor
        body = {"request_id": rid(), "intent": "start", "context": "Synthetic simultaneous create"}
        def create(_):
            return self.client.post("/api/tour-visits", headers=self.rep, json=body)
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(create, range(2)))
        self.assertEqual(sorted(response.status_code for response in results), [200, 201])
        self.assertEqual(len({response.json()["data"]["visit"]["id"] for response in results}), 1)

    def test_invalid_unicode_rejected_before_hash_or_persistence(self):
        for field in ("context", "title"):
            payload = {"request_id": rid(), "intent": "start", field: "\ud800"}
            response = self.client.post("/api/tour-visits", headers={**self.rep, "Content-Type": "application/json"}, content=json.dumps(payload, ensure_ascii=True))
            self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main(verbosity=2)
