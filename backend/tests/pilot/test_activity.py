"""Pilot activity contract tests. All identities and values are synthetic."""
import unittest
import json
import os
import tempfile
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
from unittest.mock import patch
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from backend.app.pilot.metrics import calculate_metrics
from backend.app.pilot.activity import validate_tour
from backend.app.pilot import activity, auth, db


def mixed_tours():
    return [
        {"tour_kind": kind, "sale_status": sale, "net_volume_cents": cents,
         "record_status": "active", "channel": channel}
        for kind, sale, cents, channel in [
            ("q", "no_sale", 0, "agency"), ("ct", "no_sale", 0, "member"),
            ("ct", "sold", 100000, "agency"), ("nq", "sold", 200000, "member"),
            ("nq", "no_sale", 0, "agency"), ("no_tour", None, 0, "member"),
        ]
    ]


class MetricsTests(unittest.TestCase):
    def test_six_metrics_use_effective_q_and_net(self):
        result = calculate_metrics(mixed_tours(), mixed_tours(), {
            "budget_volume_cents": 600000, "target_close_bps": 5000})
        self.assertEqual(result["activity_totals"]["qualified_tours"], 3)
        self.assertEqual(result["activity_totals"]["sales"], 2)
        self.assertEqual(result["kpis"], {
            "closing_percent": "66.67", "vpg_cents": 100000,
            "average_ticket_cents": 150000, "budget_attainment_percent": "50.00",
            "budget_difference_cents": -300000, "closing_difference_pp": "16.67"})
        self.assertEqual(result["activity_totals"]["channels"], {"agency": 3, "member": 2})

    def test_cancelled_nq_is_not_effective_q(self):
        tours = mixed_tours()
        tours[3]["sale_status"] = "cancelled"
        result = calculate_metrics(tours, tours, {"budget_volume_cents": 600000, "target_close_bps": 5000})
        self.assertEqual(result["activity_totals"]["qualified_tours"], 2)
        self.assertEqual(result["activity_totals"]["net_volume_cents"], 100000)
        self.assertEqual(result["kpis"]["closing_percent"], "50.00")
        self.assertEqual(result["kpis"]["closing_difference_pp"], "0.00")

    def test_no_denominators_return_none(self):
        result = calculate_metrics([], [], None)
        self.assertTrue(all(value is None for value in result["kpis"].values()))
        self.assertFalse(result["availability"]["has_records"])

    def test_monthly_comparisons_do_not_use_daily_totals(self):
        result = calculate_metrics([mixed_tours()[0]], mixed_tours(), {
            "budget_volume_cents": 600000, "target_close_bps": 5000})
        self.assertEqual(result["kpis"]["closing_percent"], "0.00")
        self.assertEqual(result["kpis"]["budget_attainment_percent"], "50.00")
        self.assertEqual(result["kpis"]["closing_difference_pp"], "16.67")

    def test_void_and_no_tour_never_contribute_sales_or_volume(self):
        tours = mixed_tours()
        tours[2]["record_status"] = "voided"
        tours[-1].update(sale_status="sold", net_volume_cents=999999)
        result = calculate_metrics(tours)
        self.assertEqual(result["activity_totals"]["sales"], 1)
        self.assertEqual(result["activity_totals"]["net_volume_cents"], 200000)

    def test_money_rounds_half_up_at_final_cent(self):
        tours = [{"tour_kind": "q", "sale_status": "sold", "net_volume_cents": 1},
                 {"tour_kind": "q", "sale_status": "no_sale", "net_volume_cents": 0}]
        self.assertEqual(calculate_metrics(tours)["kpis"]["vpg_cents"], 1)


class TourValidationTests(unittest.TestCase):
    def valid(self, **changes):
        return {"occurred_on": "2026-11-19", "tour_kind": "q", "channel": "agency",
                "sale_status": "sold", "net_volume_cents": 100000, **changes}

    @patch("backend.app.pilot.db.today", return_value="2026-11-20")
    def test_no_tour_omitted_sale_is_normalized(self, _):
        result = validate_tour({"occurred_on": "2026-11-19", "tour_kind": "no_tour"})
        self.assertIsNone(result["sale_status"])
        self.assertEqual(result["net_volume_cents"], 0)

    @patch("backend.app.pilot.db.today", return_value="2026-11-20")
    def test_no_tour_cannot_carry_sale(self, _):
        with self.assertRaises(HTTPException):
            validate_tour(self.valid(tour_kind="no_tour"))

    @patch("backend.app.pilot.db.today", return_value="2026-11-20")
    def test_sale_and_channel_constraints(self, _):
        for changes in ({"net_volume_cents": 0}, {"channel": None},
                        {"net_volume_cents": -1}, {"net_volume_cents": 100000001},
                        {"sale_status": "no_sale", "net_volume_cents": 100}):
            with self.subTest(changes=changes), self.assertRaises(HTTPException):
                validate_tour(self.valid(**changes))

    @patch("backend.app.pilot.db.today", return_value="2026-11-20")
    def test_future_and_invalid_dates_fail(self, _):
        for day in ("2026-11-21", "2026-02-30", "not-a-date"):
            with self.subTest(day=day), self.assertRaises(HTTPException):
                validate_tour(self.valid(occurred_on=day))


class ActivityApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="pilot-activity-test-")
        self.env = patch.dict(os.environ, {"VCSA_DB_PATH": self.tmp.name + "/test.sqlite3"})
        self.env.start()
        self.clock = patch("backend.app.pilot.db.today", return_value="2026-11-20")
        self.clock.start()
        db.initialize()
        with db.transaction() as conn:
            for org in ("org_a", "org_b"):
                conn.execute("INSERT INTO pilot_organizations(id,slug,name,app_name,welcome_title_en,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
                             (org, org, org, "Academy", "Welcome", db.now(), db.now()))
            for uid, org, role in (("rep_a", "org_a", "representative"), ("rep_b", "org_b", "representative"), ("owner_a", "org_a", "owner")):
                conn.execute("INSERT INTO users(id,email,display_name,password_hash,created_at,updated_at,organization_id,pilot_role) VALUES(?,?,?,?,?,?,?,?)",
                             (uid, uid + "@example.invalid", uid, "not-a-real-credential", db.now(), db.now(), org, role))
            activity.init_schema(conn)
        self.user = {"id": "rep_a", "organization_id": "org_a", "role": "representative", "locale": "en", "display_name": "Rep A"}
        app = FastAPI()
        app.include_router(activity.router)
        app.dependency_overrides[auth.require_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.clock.stop()
        self.env.stop()
        self.tmp.cleanup()

    def create_tour(self, **changes):
        payload = {"client_request_id": str(uuid4()), "occurred_on": "2026-11-19",
                   "tour_kind": "ct", "channel": "agency", "sale_status": "sold", "net_volume_cents": 100000, **changes}
        response = self.client.post("/api/pilot/tours", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["data"]["tour"], payload

    def test_two_tours_same_day_and_idempotency(self):
        first, payload = self.create_tour()
        second, _ = self.create_tour()
        self.assertNotEqual(first["id"], second["id"])
        replay = self.client.post("/api/pilot/tours", json=payload)
        self.assertIn(replay.status_code, (200, 201))
        self.assertEqual(replay.json()["data"]["tour"]["id"], first["id"])
        payload["net_volume_cents"] += 1
        self.assertEqual(self.client.post("/api/pilot/tours", json=payload).status_code, 409)
        items = self.client.get("/api/pilot/tours").json()["data"]["items"]
        self.assertEqual(len(items), 2)

    def test_tour_scope_cannot_be_overridden(self):
        tour, payload = self.create_tour()
        payload.update(client_request_id=str(uuid4()), user_id="rep_b")
        self.assertEqual(self.client.post("/api/pilot/tours", json=payload).status_code, 422)
        self.user = {**self.user, "id": "rep_b", "organization_id": "org_b"}
        response = self.client.patch("/api/pilot/tours/" + tour["id"], json={"expected_version": 1, "net_volume_cents": 2})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.client.get("/api/pilot/tours").json()["data"]["items"], [])

    def test_cancellation_is_atomic_with_followups(self):
        tour, _ = self.create_tour()
        response = self.client.post(f"/api/pilot/tours/{tour['id']}/followups", json={
            "client_request_id": str(uuid4()), "due_at": "2026-11-21T15:00:00Z", "action_text": "Review the agreed next step"})
        self.assertEqual(response.status_code, 201, response.text)
        cancel = self.client.post(f"/api/pilot/tours/{tour['id']}/cancel-sale", json={"expected_version": 1, "reason_code": "customer_cancelled"})
        self.assertEqual(cancel.status_code, 200, cancel.text)
        self.assertEqual(cancel.json()["data"]["tour"]["net_volume_cents"], 100000)
        pending = self.client.get("/api/pilot/followups?status=pending").json()["data"]["items"]
        self.assertEqual(pending, [])
        metric = self.client.get("/api/pilot/metrics?period=month").json()["data"]
        self.assertEqual(metric["activity_totals"]["qualified_tours"], 0)
        self.assertEqual(metric["activity_totals"]["net_volume_cents"], 0)
        self.assertEqual(self.client.post(f"/api/pilot/tours/{tour['id']}/cancel-sale", json={"expected_version": 1, "reason_code": "other"}).status_code, 409)
        restore = self.client.post(f"/api/pilot/tours/{tour['id']}/restore-sale", json={"expected_version": 2})
        self.assertEqual(restore.status_code, 200)
        self.assertEqual(self.client.get("/api/pilot/followups?status=pending").json()["data"]["items"], [])

    def test_meta_is_current_month_unique_and_immutable(self):
        payload = {"month": "2026-11", "budget_volume_cents": 600000, "target_close_bps": 5000}
        response = self.client.post("/api/pilot/monthly-goals", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        goal = response.json()["data"]["goal"]
        self.assertEqual(self.client.post("/api/pilot/monthly-goals", json=payload).status_code, 409)
        self.assertEqual(self.client.patch(f"/api/pilot/monthly-goals/{goal['id']}", json={"budget_volume_cents": 1}).status_code, 405)
        self.assertEqual(self.client.post("/api/pilot/monthly-goals", json={**payload, "month": "2026-12"}).status_code, 422)
        self.assertEqual(self.client.get("/api/pilot/monthly-goals/2026-11").json()["data"]["goal"]["budget_volume_cents"], 600000)

    def test_no_tour_can_coexist_but_cannot_have_followup(self):
        self.create_tour()
        tour, _ = self.create_tour(tour_kind="no_tour", sale_status=None, net_volume_cents=0, channel=None)
        self.assertFalse(tour["effective_q"])
        response = self.client.post(f"/api/pilot/tours/{tour['id']}/followups", json={"client_request_id": str(uuid4()), "due_at": "2026-11-21T15:00:00Z", "action_text": "Review"})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(len(self.client.get("/api/pilot/tours").json()["data"]["items"]), 2)

    def test_edit_version_and_date_validation(self):
        tour, _ = self.create_tour()
        path = "/api/pilot/tours/" + tour["id"]
        self.assertEqual(self.client.patch(path, json={"expected_version": 1, "net_volume_cents": 150000}).status_code, 200)
        self.assertEqual(self.client.patch(path, json={"expected_version": 1, "net_volume_cents": 200000}).status_code, 409)
        self.assertEqual(self.client.patch(path, json={"expected_version": 2, "occurred_on": "2026-12-01"}).status_code, 422)

    def test_legacy_history_is_preserved_and_private(self):
        with db.transaction() as conn:
            conn.execute("CREATE TABLE goalsheet_entries(id TEXT PRIMARY KEY,user_id TEXT,entry_date TEXT,payload_json TEXT)")
            conn.execute("INSERT INTO goalsheet_entries VALUES(?,?,?,?)", ("legacy_a", "rep_a", "2026-10-01", json.dumps({"number_of_sales": 2, "sales_volume": 5600})))
            conn.execute("INSERT INTO goalsheet_entries VALUES(?,?,?,?)", ("legacy_b", "rep_b", "2026-10-01", json.dumps({"notes": "Private B"})))
        response = self.client.get("/api/pilot/legacy/goalsheets")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertFalse(data["included_in_pilot_metrics"])
        self.assertEqual(len(data["entries"]), 1)
        self.assertNotIn("Private B", response.text)
        self.assertEqual(self.client.get("/api/pilot/tours").json()["data"]["items"], [])

    def test_rejected_goal_duplicates_and_mutations_are_audited(self):
        payload = {"month": "2026-11", "budget_volume_cents": 100000}
        goal = self.client.post("/api/pilot/monthly-goals", json=payload).json()["data"]["goal"]
        self.assertEqual(self.client.post("/api/pilot/monthly-goals", json=payload).status_code, 409)
        self.assertEqual(self.client.delete("/api/pilot/monthly-goals/" + goal["id"]).status_code, 405)
        with db.read() as conn:
            actions = [row[0] for row in conn.execute("SELECT action FROM pilot_audit WHERE target_id=?", (goal["id"],))]
        self.assertIn("monthly_goal_duplicate_rejected", actions)
        self.assertIn("monthly_goal_mutation_rejected", actions)

    def test_followup_lists_have_bounded_stable_pages(self):
        tour, _ = self.create_tour()
        path = f"/api/pilot/tours/{tour['id']}/followups"
        for index in range(3):
            self.assertEqual(self.client.post(path, json={"client_request_id": str(uuid4()), "due_at": "2026-11-21T15:00:00Z", "action_text": f"Action {index}"}).status_code, 201)
        first = self.client.get(path + "?limit=2").json()["data"]
        self.assertEqual(len(first["items"]), 2)
        second = self.client.get(path, params={"limit": 2, "cursor": first["next_cursor"]}).json()["data"]
        self.assertEqual(len(second["items"]), 1)
        self.assertFalse({item["id"] for item in first["items"]} & {item["id"] for item in second["items"]})

    def test_concurrent_monthly_goal_and_next_month(self):
        payload = {"month": "2026-11", "budget_volume_cents": 100000}
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(lambda _: self.client.post("/api/pilot/monthly-goals", json=payload).status_code, range(2)))
        self.assertEqual(sorted(statuses), [201, 409])
        with db.transaction() as conn:
            with self.assertRaises(sqlite3.IntegrityError):
                conn.execute("UPDATE pilot_monthly_goals SET budget_volume_cents=200000")
            with self.assertRaises(sqlite3.IntegrityError):
                conn.execute("DELETE FROM pilot_monthly_goals")
        with patch("backend.app.pilot.db.today", return_value="2026-12-01"):
            self.assertEqual(self.client.post("/api/pilot/monthly-goals", json={**payload, "month": "2026-12"}).status_code, 201)
        with db.read() as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM pilot_monthly_goals").fetchone()[0], 2)

    def test_original_month_recalculation_and_q_cancel_semantics(self):
        q, _ = self.create_tour(occurred_on="2026-10-31", tour_kind="q")
        ct, _ = self.create_tour(occurred_on="2026-10-31", tour_kind="ct")
        for tour in (q, ct):
            self.assertEqual(self.client.post(f"/api/pilot/tours/{tour['id']}/cancel-sale", json={"expected_version": 1, "reason_code": "customer_cancelled"}).status_code, 200)
        october = self.client.get("/api/pilot/metrics?period=month&anchor_date=2026-10-31").json()["data"]
        november = self.client.get("/api/pilot/metrics?period=month").json()["data"]
        self.assertEqual(october["activity_totals"]["qualified_tours"], 1)
        self.assertEqual(october["activity_totals"]["sales"], 0)
        self.assertEqual(november["activity_totals"]["records"], 0)

    def test_database_aggregates_match_canonical_fixture_and_daily_budget(self):
        fixture = mixed_tours()
        for entry in fixture:
            self.create_tour(**{key: entry[key] for key in ("tour_kind", "channel", "sale_status", "net_volume_cents")})
        self.client.post("/api/pilot/monthly-goals", json={"month": "2026-11", "budget_volume_cents": 600000, "target_close_bps": 5000})
        actual = self.client.get("/api/pilot/metrics?period=month").json()["data"]
        expected = calculate_metrics(fixture, fixture, actual["goal"])
        for key in ("activity_totals", "monthly_totals", "kpis", "availability"):
            self.assertEqual(actual[key], expected[key])
        current = {"tour_kind": "q", "channel": "member", "sale_status": "no_sale", "net_volume_cents": 0}
        self.create_tour(occurred_on="2026-11-20", **current)
        daily = self.client.get("/api/pilot/metrics?period=today").json()["data"]
        expected = calculate_metrics([current], fixture + [current], daily["goal"])
        for key in ("activity_totals", "monthly_totals", "kpis", "availability"):
            self.assertEqual(daily[key], expected[key])


if __name__ == "__main__":
    unittest.main()
