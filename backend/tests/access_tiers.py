"""Acceso Público / Gratis / Premium (historia HU-AISALES-ACCESO-01, feature 2026-11-14-acceso-free-premium).

Uso: .venv/bin/python backend/tests/access_tiers.py  (base SQLite temporal propia).
"""

import os
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
os.environ["VCSA_DB_PATH"] = os.path.join(tempfile.mkdtemp(prefix="aisales-access-"), "academy.sqlite3")

from fastapi.testclient import TestClient  # noqa: E402

from backend.app import access, persistence  # noqa: E402
from backend.app.main import app  # noqa: E402

client = TestClient(app)
TODAY = date.today()


def ok(response):
    assert response.status_code == 200, response.text
    return response.json()["data"]


def login(email, password="demo123"):
    token = ok(client.post("/api/auth/login", json={"email": email, "password": password}))["token"]
    return {"Authorization": f"Bearer {token}"}


def register(email, password="clave-segura-1", name="Usuaria Nueva"):
    return client.post("/api/auth/register", json={"display_name": name, "email": email, "password": password, "accept_privacy": True})


def headers_of(response):
    return {"Authorization": f"Bearer {response.json()['data']['token']}"}


def item(catalog, item_id):
    return next((i for i in catalog["items"] if i["id"] == item_id), None)


class AccessTiers(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        access.limiter.limit = 1000
        cls.admin = login("admin@vcsa.local")
        cls.rep_demo = login("rep@vcsa.local")

    # ESC-01 · AC-01, AC-09
    def test_esc01_admin_changes_level_and_non_admin_gets_403(self):
        changed = ok(client.patch("/api/admin/access-items/lesson:step_3", json={"level": "premium"}, headers=self.admin))["item"]
        self.assertEqual(changed["level"], "premium")
        events = ok(client.get("/api/admin/audit-events", headers=self.admin))["events"]
        self.assertTrue(any(e["action"] == "access_level_changed" and e["target_id"] == "lesson:step_3" for e in events))
        ok(client.patch("/api/admin/access-items/lesson:step_3", json={"level": "gratis"}, headers=self.admin))
        manager = login("manager@vcsa.local")
        for h in (self.rep_demo, manager):
            self.assertEqual(client.patch("/api/admin/access-items/lesson:step_3", json={"level": "publico"}, headers=h).status_code, 403)
            self.assertEqual(client.get("/api/admin/license-codes", headers=h).status_code, 403)
        self.assertEqual(client.patch("/api/admin/access-items/lesson:step_3", json={"level": "vip"}, headers=self.admin).status_code, 422)

    # ESC-02 · AC-02, AC-10
    def test_esc02_public_catalog_hides_locked_content_and_hidden_items(self):
        ok(client.patch("/api/admin/access-items/resource:step-5-script", json={"visible": False}, headers=self.admin))
        try:
            catalog = ok(client.get("/api/public/catalog"))
            self.assertEqual(catalog["tier"], "visitante")
            self.assertTrue(item(catalog, "lesson:step_1")["allowed"])
            for locked, level in (("lesson:step_2", "gratis"), ("lesson:step_4", "premium")):
                entry = item(catalog, locked)
                self.assertEqual((entry["allowed"], entry["level"]), (False, level))
                self.assertNotIn("body", entry)
            self.assertIsNone(item(catalog, "resource:step-5-script"))
            self.assertIsNotNone(item(ok(client.get("/api/public/catalog", headers=self.admin)), "resource:step-5-script"))
            step1 = ok(client.get("/api/public/blueprint/steps/step_1"))["step"]
            self.assertTrue(step1["scripts"])
            denied = client.get("/api/public/blueprint/steps/step_2")
            self.assertEqual(denied.status_code, 403)
            self.assertEqual(denied.json()["detail"]["requires"], "gratis")
        finally:
            ok(client.patch("/api/admin/access-items/resource:step-5-script", json={"visible": True}, headers=self.admin))

    # ESC-03 · AC-03, AC-04 (+ validaciones)
    def test_esc03_register_free_and_duplicate(self):
        created = register("nuevo@demo.local")
        self.assertEqual(created.status_code, 200, created.text)
        data = created.json()["data"]
        self.assertEqual((data["user"]["plan"], data["user"]["tier"]), ("gratis", "gratis"))
        self.assertIn("sales_rep", data["user"]["roles"])
        h = headers_of(created)
        self.assertEqual(client.get("/api/blueprint/steps/step_2", headers=h).status_code, 200)
        self.assertEqual(client.get("/api/blueprint/steps/step_4", headers=h).status_code, 403)
        duplicate = register("NUEVO@demo.local")
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(duplicate.json()["detail"], "Ese correo ya tiene cuenta. Inicia sesión.")
        self.assertEqual(sum(1 for u in persistence.list_users() if u["email"].lower() == "nuevo@demo.local"), 1)
        self.assertEqual(register("corto@demo.local", password="1234567").status_code, 422)
        self.assertEqual(register("sin-arroba").status_code, 422)
        no_consent = client.post("/api/auth/register", json={"display_name": "X", "email": "x@demo.local", "password": "clave-segura-1", "accept_privacy": False})
        self.assertEqual(no_consent.status_code, 422)

    # ESC-04 · AC-05, AC-06, AC-07
    def test_esc04_redeem_codes(self):
        h = headers_of(register("gratis@demo.local"))
        denied = client.get("/api/blueprint/steps/step_4", headers=h)
        self.assertEqual((denied.status_code, denied.json()["detail"]["requires"]), (403, "premium"))
        self.assertEqual(client.get("/api/blueprint/steps/step_4", headers=h).json()["detail"]["code"], "requires_plan")

        def new_code(**kw):
            body = {"plan_days": 90, "max_uses": 1, "expires_at": (TODAY + timedelta(days=30)).isoformat(), **kw}
            return ok(client.post("/api/admin/license-codes", json=body, headers=self.admin))["code"]

        used = new_code()
        ok(client.post("/api/me/redeem", json={"code": used["code"]}, headers=headers_of(register("otro@demo.local"))))
        expired = new_code(expires_at=(TODAY - timedelta(days=1)).isoformat(), max_uses=5)
        revoked = new_code(max_uses=5)
        ok(client.delete(f"/api/admin/license-codes/{revoked['id']}", headers=self.admin))
        for bad in (used["code"], expired["code"], revoked["code"], "SA-NOEXISTE"):
            response = client.post("/api/me/redeem", json={"code": bad}, headers=h)
            self.assertEqual(response.status_code, 400, bad)
            self.assertEqual(response.json()["detail"], "Código no válido o vencido.")
        self.assertEqual(ok(client.get("/api/mobile/me", headers=h))["user"]["tier"], "gratis")

        good = new_code()
        me = ok(client.post("/api/me/redeem", json={"code": good["code"].lower()}, headers=h))["user"]
        self.assertEqual((me["plan"], me["tier"]), ("premium", "premium"))
        self.assertEqual(me["plan_expires_at"], (TODAY + timedelta(days=90)).isoformat())
        self.assertEqual(client.get("/api/blueprint/steps/step_4", headers=h).status_code, 200)
        listed = ok(client.get("/api/admin/license-codes", headers=self.admin))["codes"]
        self.assertTrue(all("code" not in c and "code_hash" not in c for c in listed))
        self.assertEqual(next(c for c in listed if c["id"] == good["id"])["uses"], 1)

    # ESC-05 · AC-08, AC-11, AC-12
    def test_esc05_expiry_progress_lock_and_staff(self):
        user = ok(register("vencido@demo.local"))["user"]
        h_exp = login("vencido@demo.local", "clave-segura-1")
        ok(client.patch(f"/api/admin/users/{user['id']}/plan", json={"plan": "premium", "plan_expires_at": (TODAY - timedelta(days=1)).isoformat()}, headers=self.admin))
        self.assertEqual(ok(client.get("/api/mobile/me", headers=h_exp))["user"]["tier"], "gratis")
        self.assertEqual(client.get("/api/blueprint/steps/step_4", headers=h_exp).status_code, 403)

        prem = ok(register("premium@demo.local"))["user"]
        h_prem = login("premium@demo.local", "clave-segura-1")
        ok(client.patch(f"/api/admin/users/{prem['id']}/plan", json={"plan": "premium", "plan_expires_at": None}, headers=self.admin))
        steps = {s["id"]: s for s in ok(client.get("/api/blueprint/steps", headers=h_prem))["steps"]}
        self.assertEqual(steps["step_1"]["status"], "current")
        self.assertEqual(steps["step_5"]["lock"], "progress")
        free_steps = {s["id"]: s for s in ok(client.get("/api/blueprint/steps", headers=h_exp))["steps"]}
        self.assertEqual(free_steps["step_5"]["lock"], "plan")
        ok(client.post("/api/blueprint/steps/step_1/complete", headers=h_prem))
        steps = {s["id"]: s for s in ok(client.get("/api/blueprint/steps", headers=h_prem))["steps"]}
        self.assertEqual((steps["step_1"]["status"], steps["step_2"]["status"]), ("completed", "current"))

        for email in ("manager@vcsa.local", "admin@vcsa.local"):
            self.assertEqual(client.get("/api/blueprint/steps/step_9", headers=login(email)).status_code, 200)
        self.assertEqual(ok(client.get("/api/mobile/me", headers=self.rep_demo))["user"]["tier"], "premium")

    def test_functions_and_resources_follow_levels(self):
        h = headers_of(register("funciones@demo.local"))
        self.assertEqual(client.get("/api/goalsheet/today", headers=h).status_code, 200)
        scenarios = ok(client.get("/api/roleplay/scenarios", headers=h))["scenarios"]
        self.assertTrue(scenarios and all(s["allowed"] is False for s in scenarios))
        blocked = client.post("/api/roleplay/sessions", json={"scenario_id": scenarios[0]["id"], "blueprint_step_id": scenarios[0]["blueprint_step_id"]}, headers=h)
        self.assertEqual(blocked.status_code, 403)
        resources = {r["id"]: r for r in ok(client.get("/api/resources", headers=h))["resources"]}
        self.assertEqual(resources["pricing-guide"]["level"], "premium")
        self.assertFalse(resources["pricing-guide"]["has_access"])
        self.assertEqual(client.get("/api/resources/pricing-guide", headers=h).status_code, 403)
        ok(client.patch("/api/admin/access-items/function:goalsheet", json={"level": "premium"}, headers=self.admin))
        try:
            self.assertEqual(client.get("/api/goalsheet/today", headers=h).status_code, 403)
        finally:
            ok(client.patch("/api/admin/access-items/function:goalsheet", json={"level": "gratis"}, headers=self.admin))
        self.assertTrue(ok(client.post("/api/smart-agent/public-chat", json={"message": "hola"}))["response"])

    # Revisión de código (PR #1)
    def test_review_progress_order_enforced_on_complete(self):
        prem = ok(register("orden@demo.local"))["user"]
        ok(client.patch(f"/api/admin/users/{prem['id']}/plan", json={"plan": "premium", "plan_expires_at": None}, headers=self.admin))
        h = login("orden@demo.local", "clave-segura-1")
        blocked = client.post("/api/blueprint/steps/step_11/complete", headers=h)
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(blocked.json()["detail"], "Completa el paso anterior.")
        ok(client.post("/api/blueprint/steps/step_1/complete", headers=h))
        ok(client.post("/api/blueprint/steps/step_1/complete", headers=h))  # repasar un paso ya hecho sigue permitido

    def test_review_smart_agent_knowledge_respects_tier(self):
        from backend.app.main import smart_agent_knowledge
        visitor_ids = {k["id"] for k in smart_agent_knowledge(None)}
        self.assertFalse(visitor_ids & {"step-5-script", "agenda-control-guide", "pricing-guide"}, visitor_ids)
        free = ok(register("conocimiento@demo.local"))["user"]
        free_ids = {k["id"] for k in smart_agent_knowledge(persistence.get_user(free["id"]))}
        self.assertIn("agenda-control-guide", free_ids)
        self.assertNotIn("pricing-guide", free_ids)

    def test_review_goalsheet_gate_covers_reminders_and_insights(self):
        h = headers_of(register("metas@demo.local"))
        ok(client.patch("/api/admin/access-items/function:goalsheet", json={"level": "premium"}, headers=self.admin))
        try:
            self.assertEqual(client.get("/api/reminders/upcoming", headers=h).status_code, 403)
            body = {"tour_outcome": "qualified", "sales_outcome": "no_sale"}
            self.assertEqual(client.post("/api/smart-agent/insights/goalsheet", json=body, headers=h).status_code, 403)
        finally:
            ok(client.patch("/api/admin/access-items/function:goalsheet", json={"level": "gratis"}, headers=self.admin))

    def test_review_redeem_rules(self):
        multi = ok(client.post("/api/admin/license-codes", json={"plan_days": 30, "max_uses": 5, "expires_at": (TODAY + timedelta(days=30)).isoformat()}, headers=self.admin))["code"]
        self.assertGreaterEqual(len(multi["code"].replace("SA-", "").replace("-", "")), 12)
        h = headers_of(register("repite@demo.local"))
        ok(client.post("/api/me/redeem", json={"code": multi["code"]}, headers=h))
        again = client.post("/api/me/redeem", json={"code": multi["code"]}, headers=h)
        self.assertEqual((again.status_code, again.json()["detail"]), (400, "Ya usaste este código."))
        listed = next(c for c in ok(client.get("/api/admin/license-codes", headers=self.admin))["codes"] if c["id"] == multi["id"])
        self.assertEqual(listed["uses"], 1)
        unlimited = ok(register("ilimitado@demo.local"))["user"]
        ok(client.patch(f"/api/admin/users/{unlimited['id']}/plan", json={"plan": "premium", "plan_expires_at": None}, headers=self.admin))
        h_unl = login("ilimitado@demo.local", "clave-segura-1")
        bogus = client.post("/api/me/redeem", json={"code": "SA-CUALQUIER-COSA"}, headers=h_unl)
        self.assertEqual((bogus.status_code, bogus.json()["detail"]), (400, "Código no válido o vencido."))
        fresh = ok(client.post("/api/admin/license-codes", json={"plan_days": 30, "max_uses": 1, "expires_at": (TODAY + timedelta(days=30)).isoformat()}, headers=self.admin))["code"]
        permanent = client.post("/api/me/redeem", json={"code": fresh["code"]}, headers=h_unl)
        self.assertEqual((permanent.status_code, permanent.json()["detail"]), (400, "Ya tienes Premium sin vencimiento."))
        self.assertEqual(next(c for c in ok(client.get("/api/admin/license-codes", headers=self.admin))["codes"] if c["id"] == fresh["id"])["uses"], 0)

    def test_review_code_hash_is_keyed(self):
        import hashlib
        code = ok(client.post("/api/admin/license-codes", json={"plan_days": 30, "max_uses": 1, "expires_at": (TODAY + timedelta(days=30)).isoformat()}, headers=self.admin))["code"]
        with persistence.connect() as db:
            stored = db.execute("SELECT code_hash FROM license_codes WHERE id = ?", (code["id"],)).fetchone()["code_hash"]
        self.assertNotEqual(stored, hashlib.sha256(code["code"].upper().encode()).hexdigest())
        self.assertEqual(stored, access._hash(code["code"]))

    def test_review_admin_plan_change_survives_restart(self):
        ok(client.patch("/api/admin/users/user_demo_rep/plan", json={"plan": "gratis", "plan_expires_at": None}, headers=self.admin))
        try:
            from backend.app.main import BLUEPRINT_STEPS, ROLEPLAY_SCENARIOS
            access.init_schema(BLUEPRINT_STEPS, ROLEPLAY_SCENARIOS)
            self.assertEqual(persistence.get_user("user_demo_rep")["plan"], "gratis")
        finally:
            ok(client.patch("/api/admin/users/user_demo_rep/plan", json={"plan": "premium", "plan_expires_at": None}, headers=self.admin))

    def test_review_hidden_lesson_not_in_knowledge(self):
        from backend.app.main import smart_agent_knowledge
        ok(client.patch("/api/admin/access-items/lesson:step_1", json={"visible": False}, headers=self.admin))
        try:
            self.assertNotIn("step_1", {k["id"] for k in smart_agent_knowledge(None)})
        finally:
            ok(client.patch("/api/admin/access-items/lesson:step_1", json={"visible": True}, headers=self.admin))

    def test_review_limiter_prunes_stale_keys(self):
        limiter = access.Limiter(limit=5, window=0)
        for i in range(50):
            limiter.allow(f"k{i}")
        limiter.allow("otra")
        self.assertLessEqual(len(limiter.hits), 1)

    def test_rate_limit_ignores_spoofed_forwarded_for(self):
        access.limiter.limit, access.limiter.hits = 2, {}
        try:
            codes = [client.post("/api/auth/register", headers={"X-Forwarded-For": f"10.0.0.{i}"},
                                 json={"display_name": "X", "email": f"spoof{i}@demo.local", "password": "clave-segura-1", "accept_privacy": True}).status_code
                     for i in range(3)]
            self.assertEqual(codes, [200, 200, 429])
        finally:
            access.limiter.limit, access.limiter.hits = 1000, {}

    def test_rate_limit_on_register(self):
        access.limiter.limit, access.limiter.hits = 2, {}
        try:
            codes = [register(f"spam{i}@demo.local").status_code for i in range(3)]
            self.assertEqual(codes, [200, 200, 429])
        finally:
            access.limiter.limit, access.limiter.hits = 1000, {}


if __name__ == "__main__":
    unittest.main(verbosity=2)
