"""Pilot learning contract: private, editable lessons and validated media."""

import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

from backend.app.pilot import learning, assets, auth, db


class VideoContract(unittest.TestCase):
    def test_youtube_link_is_normalized_to_provider_and_id(self):
        self.assertEqual(
            learning.normalize_video("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
            {"provider": "youtube", "id": "dQw4w9WgXcQ", "privacy_hash": None},
        )

    def test_vimeo_unlisted_link_preserves_privacy_hash(self):
        self.assertEqual(
            learning.normalize_video("https://vimeo.com/123456789/abcdef1234"),
            {"provider": "vimeo", "id": "123456789", "privacy_hash": "abcdef1234"},
        )

    def test_non_provider_host_is_rejected(self):
        for url in ["https://youtube.com.evil.invalid/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "http://youtu.be/dQw4w9WgXcQ", "https://user@youtube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com:444/watch?v=dQw4w9WgXcQ", "https://127.0.0.1/video.pdf", "<iframe src='https://youtube.com'></iframe>"]:
            with self.subTest(url=url), self.assertRaises(HTTPException) as caught:
                learning.normalize_video(url)
            self.assertEqual(caught.exception.status_code, 422)

    def test_lesson_catalog_is_a_private_route(self):
        app = FastAPI()
        app.include_router(learning.router)
        response = TestClient(app).get("/api/pilot/lessons")
        self.assertEqual(response.status_code, 401)


class LearningAPI(unittest.TestCase):
    """Synthetic tenants and users; production auth is separately tested by core."""
    pdf = b"%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.env = patch.dict(os.environ, {"VCSA_DB_PATH": self.temp.name + "/test.sqlite3", "PILOT_ASSET_DIR": self.temp.name + "/private-assets"})
        self.env.start()
        self.addCleanup(self.env.stop)
        db.initialize()
        self.users = {}
        with db.transaction() as conn:
            learning.init_schema(conn)
            assets.init_schema(conn)
            for org in ("a", "b"):
                conn.execute("INSERT INTO pilot_organizations(id,slug,name,app_name,welcome_title_en,created_at,updated_at) VALUES (?,?,?,?,?,?,?)", (org, org, "Example", "Pilot", "Welcome", db.now(), db.now()))
                for suffix, role in (("owner", "owner"), ("rep", "representative"), ("other", "representative")):
                    identifier = org + "-" + suffix
                    self.users[identifier] = {"id": identifier, "organization_id": org, "role": role, "locale": "en", "display_name": identifier}
                    conn.execute("INSERT INTO users(id,email,display_name,password_hash,organization_id,pilot_role,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)", (identifier, identifier + "@example.invalid", identifier, "unusable", org, role, db.now(), db.now()))
        app = FastAPI()
        app.include_router(learning.router)
        app.include_router(assets.router)

        def test_user(x_test_user: str = Header("a-rep")):
            return self.users[x_test_user]

        def test_owner(x_test_user: str = Header("a-rep")):
            user = self.users[x_test_user]
            if user["role"] != "owner":
                raise HTTPException(403)
            return user

        app.dependency_overrides[auth.require_user] = test_user
        app.dependency_overrides[auth.require_owner] = test_owner
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def call(self, method, path, *, user="a-owner", status=200, **kwargs):
        headers = {"X-Test-User": user, **kwargs.pop("headers", {})}
        response = self.client.request(method, "/api/pilot" + path, headers=headers, **kwargs)
        self.assertEqual(response.status_code, status, response.text[:600])
        if status < 300 and response.headers.get("content-type", "").startswith("application/json"):
            return response.json()["data"]
        return response

    def create(self, title="Example lesson", user="a-owner"):
        return self.call("POST", "/owner/lessons", user=user, status=201, json={"client_request_id": str(uuid4()), "title_en": title})

    def upload(self, user="a-owner", key=None):
        return self.call("POST", "/owner/assets/pdf", user=user, status=201, content=self.pdf, headers={"Content-Type": "application/pdf", "X-Client-Request-ID": key or str(uuid4()), "X-File-Name": "Learning script.pdf"})["asset"]

    def publish(self, data=None, *, team_access="closed", user="a-owner"):
        data = data or self.create(user=user)
        identifier = data["lesson"]["id"]
        data = self.call("PATCH", f"/owner/lessons/{identifier}/draft", user=user, json={"expected_version": data["lesson"]["version"], "video_url": "https://youtu.be/dQw4w9WgXcQ", "pdf_asset_id": self.upload(user)["id"]})
        data = self.call("POST", f"/owner/lessons/{identifier}/publish", user=user, json={"expected_version": data["lesson"]["version"], "revision_id": data["draft"]["id"]})
        if team_access == "open":
            self.call("PATCH", f"/owner/lessons/{identifier}/access", user=user, json={"expected_version": data["lesson"]["version"], "team_access": "open"})
            data = self.call("GET", f"/owner/lessons/{identifier}/draft", user=user)
        return data

    def test_seed_uses_persistent_organization_marker_and_never_recreates(self):
        with db.transaction() as conn:
            learning.seed_roadmap(conn, "a")
            marker = conn.execute("SELECT roadmap_seed_version FROM pilot_organizations WHERE id='a'").fetchone()[0]
        self.assertEqual(marker, 1)
        cards = self.call("GET", "/owner/lessons")["items"]
        self.assertEqual(len(cards), 11)
        self.assertEqual([c["team_access"] for c in cards], ["open"] * 3 + ["closed"] * 8)
        self.assertTrue(all(c["status"] == "draft" for c in cards))
        self.assertEqual(self.call("GET", "/lessons", user="a-rep")["items"], [])
        self.call("POST", f"/owner/lessons/{cards[0]['id']}/archive", json={"expected_version": 1})
        with db.transaction() as conn:
            learning.seed_roadmap(conn, "a")
        self.assertEqual(len(self.call("GET", "/owner/lessons")["items"]), 11)
        self.assertEqual(self.call("GET", f"/owner/lessons/{cards[0]['id']}/draft")["lesson"]["status"], "archived")

    def test_create_idempotency_and_reject_client_tenant_or_representative(self):
        payload = {"client_request_id": str(uuid4()), "title_en": "Repeat"}
        one = self.call("POST", "/owner/lessons", status=201, json=payload)
        two = self.call("POST", "/owner/lessons", status=201, json=payload)
        self.assertEqual(one, two)
        self.call("POST", "/owner/lessons", status=409, json={**payload, "title_en": "Changed"})
        self.call("POST", "/owner/lessons", status=422, json={**payload, "organization_id": "b"})
        self.call("POST", "/owner/lessons", user="a-rep", status=403, json=payload)
        self.call("GET", f"/owner/lessons/{one['lesson']['id']}/draft", user="b-owner", status=404)

    def test_publish_requires_media_and_rejects_other_tenant_asset(self):
        data = self.create()
        identifier = data["lesson"]["id"]
        self.call("POST", f"/owner/lessons/{identifier}/publish", status=422, json={"expected_version": 1, "revision_id": data["draft"]["id"]})
        self.call("PATCH", f"/owner/lessons/{identifier}/draft", status=422, json={"expected_version": 1, "pdf_asset_id": self.upload("b-owner")["id"]})
        self.assertEqual(self.call("GET", f"/owner/lessons/{identifier}/draft")["lesson"]["version"], 1)

    def test_closed_catalog_and_direct_content_never_leak_media(self):
        data = self.publish()
        identifier = data["lesson"]["id"]
        cards = self.call("GET", "/lessons", user="a-rep")["items"]
        self.assertEqual(len(cards), 1)
        self.assertFalse(cards[0]["allowed"])
        self.assertNotIn("video", str(cards))
        self.assertNotIn(data["published_revision"]["pdf_asset_id"], str(cards))
        for suffix in ("", "/pdf", "/complete"):
            self.call("POST" if suffix == "/complete" else "GET", f"/lessons/{identifier}{suffix}", user="a-rep", status=403)
        self.call("GET", f"/lessons/{identifier}", user="b-owner", status=404)
        self.call("GET", "/lessons?include_drafts=true", user="a-rep", status=403)

    def test_pending_dedup_owner_resolution_and_user_isolation(self):
        identifier = self.publish()["lesson"]["id"]
        path = f"/lessons/{identifier}/access-requests"
        first = self.call("POST", path, user="a-rep")["request"]
        self.assertEqual(first, self.call("POST", path, user="a-rep")["request"])
        self.assertEqual(self.call("GET", "/access-requests/mine", user="a-other")["items"], [])
        self.call("POST", f"/owner/access-requests/{first['id']}/resolve", user="b-owner", status=404, json={"expected_version": 1, "decision": "approved"})
        resolved = self.call("POST", f"/owner/access-requests/{first['id']}/resolve", json={"expected_version": 1, "decision": "approved"})["request"]
        self.assertEqual(resolved["status"], "approved")
        self.call("GET", f"/lessons/{identifier}", user="a-rep")
        self.call("GET", f"/lessons/{identifier}", user="a-other", status=403)
        self.call("POST", f"/owner/access-requests/{first['id']}/resolve", status=409, json={"expected_version": 1, "decision": "rejected"})

    def test_rejection_enforces_24_hour_cooldown(self):
        identifier = self.publish()["lesson"]["id"]
        path = f"/lessons/{identifier}/access-requests"
        first = self.call("POST", path, user="a-rep")["request"]
        self.call("POST", f"/owner/access-requests/{first['id']}/resolve", json={"expected_version": 1, "decision": "rejected"})
        self.call("POST", path, user="a-rep", status=429)
        with db.transaction() as conn:
            conn.execute("UPDATE pilot_access_requests SET updated_at='2020-01-01T00:00:00+00:00' WHERE id=?", (first["id"],))
        second = self.call("POST", path, user="a-rep")["request"]
        self.assertNotEqual(first["id"], second["id"])
        with db.read() as conn:
            summary = learning.progress_summary(conn, self.users["a-rep"])
        self.assertEqual(summary["requested_lessons"], 1)
        self.assertEqual(summary["pending_requests"], 1)
        self.assertIsNone(summary["progress_percent"])

    def test_team_access_resolves_pending_except_individual_deny(self):
        data = self.publish()
        identifier = data["lesson"]["id"]
        for person in ("a-rep", "a-other"):
            self.call("POST", f"/lessons/{identifier}/access-requests", user=person)
        self.call("PUT", f"/owner/lessons/{identifier}/access/a-other", json={"decision": "deny", "expected_version": 0})
        self.call("PATCH", f"/owner/lessons/{identifier}/access", json={"team_access": "open", "expected_version": data["lesson"]["version"]})
        self.call("GET", f"/lessons/{identifier}", user="a-rep")
        self.call("GET", f"/lessons/{identifier}", user="a-other", status=403)
        self.assertEqual(self.call("GET", "/access-requests/mine", user="a-rep")["items"][0]["status"], "resolved_by_team_access")
        self.assertEqual(self.call("GET", "/access-requests/mine", user="a-other")["items"][0]["status"], "pending")
        self.call("DELETE", f"/owner/lessons/{identifier}/access/a-other", headers={"If-Match": "1"})
        self.call("GET", f"/lessons/{identifier}", user="a-other")
        self.assertEqual(self.call("GET", "/access-requests/mine", user="a-other")["items"][0]["status"], "resolved_by_team_access")

    def test_owner_permission_editor_exposes_scoped_versions_and_pending_counts(self):
        identifier = self.publish()["lesson"]["id"]
        self.call("PUT", f"/owner/lessons/{identifier}/access/a-other", json={"decision": "deny", "expected_version": 0})
        detail = self.call("GET", f"/owner/lessons/{identifier}/draft")
        self.assertEqual(detail["access_exceptions"], [{"user_id": "a-other", "display_name": "a-other", "decision": "deny", "version": 1}])
        for person in ("a-rep", "a-other"):
            self.call("POST", f"/lessons/{identifier}/access-requests", user=person)
        requests = self.call("GET", "/owner/access-requests?limit=1")
        self.assertEqual(requests["total_pending"], 2)
        self.assertEqual(requests["pending_by_lesson"], [{"lesson_id": identifier, "count": 2}])
        self.assertEqual(self.call("GET", "/owner/access-requests", user="b-owner")["total_pending"], 0)

    def test_edit_publish_archive_preserve_completion_and_old_revision(self):
        self.publish(team_access="open")
        data = self.publish(team_access="open")
        identifier = data["lesson"]["id"]
        first = self.call("POST", f"/lessons/{identifier}/complete", user="a-rep")["completion"]
        self.assertEqual(first, self.call("POST", f"/lessons/{identifier}/complete", user="a-rep")["completion"])
        draft = self.call("PATCH", f"/owner/lessons/{identifier}/draft", json={"expected_version": data["lesson"]["version"], "title_en": "New approved later"})
        self.assertEqual(self.call("GET", f"/lessons/{identifier}", user="a-rep")["lesson"]["title"], "Example lesson")
        self.call("PATCH", f"/owner/lessons/{identifier}/draft", status=409, json={"expected_version": data["lesson"]["version"], "title_en": "Stale"})
        published = self.call("POST", f"/owner/lessons/{identifier}/publish", json={"expected_version": draft["lesson"]["version"], "revision_id": draft["draft"]["id"]})
        detail = self.call("GET", f"/lessons/{identifier}", user="a-rep")
        self.assertEqual(detail["lesson"]["title"], "New approved later")
        self.assertTrue(detail["lesson"]["completed"])
        self.assertEqual(self.call("POST", f"/lessons/{identifier}/complete", user="a-rep")["completion"], first)
        with db.read() as conn:
            summary = learning.progress_summary(conn, self.users["a-rep"])
        self.assertEqual(summary["progress_percent"], 50)
        archived = self.call("POST", f"/owner/lessons/{identifier}/archive", json={"expected_version": published["lesson"]["version"]})
        self.call("GET", f"/lessons/{identifier}/pdf", user="a-rep", status=404)
        restored = self.call("POST", f"/owner/lessons/{identifier}/restore", json={"expected_version": archived["lesson"]["version"]})
        self.assertEqual(restored["lesson"]["status"], "draft")
        self.call("GET", f"/lessons/{identifier}", user="a-rep", status=404)
        self.call("POST", f"/owner/lessons/{identifier}/publish", json={"expected_version": restored["lesson"]["version"], "revision_id": restored["draft"]["id"]})
        self.assertTrue(self.call("GET", f"/lessons/{identifier}", user="a-rep")["lesson"]["completed"])

    def test_reorder_is_atomic_versioned_and_preserves_access(self):
        first, second = self.publish(team_access="open"), self.publish()
        catalog = self.call("GET", "/owner/lessons")
        ids = [second["lesson"]["id"], first["lesson"]["id"]]
        self.call("POST", "/owner/lessons/reorder", status=422, json={"lesson_ids": [ids[0], ids[0]], "expected_catalog_version": catalog["catalog_version"]})
        self.call("POST", "/owner/lessons/reorder", json={"lesson_ids": ids, "expected_catalog_version": catalog["catalog_version"]})
        self.call("POST", "/owner/lessons/reorder", status=409, json={"lesson_ids": ids, "expected_catalog_version": catalog["catalog_version"]})
        cards = self.call("GET", "/lessons", user="a-rep")["items"]
        self.assertEqual([row["id"] for row in cards], ids)
        self.assertEqual([row["allowed"] for row in cards], [False, True])

    def test_pdf_upload_idempotency_headers_private_storage_and_cross_tenant(self):
        key = str(uuid4())
        one = self.upload(key=key)
        self.assertEqual(self.upload(key=key), one)
        self.assertEqual(len(list(Path(self.temp.name, "private-assets").iterdir())), 1)

        response = self.call("GET", f"/owner/assets/{one['id']}/download")
        self.assertEqual(response.content, self.pdf)
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertTrue(response.headers["content-disposition"].startswith("attachment"))
        self.assertEqual(response.headers["cache-control"], "private, no-store")
        self.assertNotIn("storage_key", one)
        self.call("GET", f"/owner/assets/{one['id']}/download", user="b-owner", status=404)
        self.call("GET", f"/owner/assets/{one['id']}/download", user="a-rep", status=403)
        self.call("POST", "/owner/assets/pdf", status=409, content=self.pdf + b"changed", headers={"Content-Type": "application/pdf", "X-Client-Request-ID": key, "X-File-Name": "Learning script.pdf"})
        self.assertEqual(len(list(Path(self.temp.name, "private-assets").iterdir())), 1)

    def test_encoded_pdf_filename_is_decoded_then_validated(self):
        headers = {"Content-Type": "application/pdf", "X-Client-Request-ID": str(uuid4()), "X-File-Name": "Gu%C3%ADa%20de%20pr%C3%A1ctica.pdf"}
        asset = self.call("POST", "/owner/assets/pdf", status=201, content=self.pdf, headers=headers)["asset"]
        self.assertEqual(asset["name"], "Guía de práctica.pdf")
        self.call("POST", "/owner/assets/pdf", status=422, content=self.pdf, headers={**headers, "X-Client-Request-ID": str(uuid4()), "X-File-Name": "%2E%2E%2Fsecret.pdf"})

    def test_pdf_validation_and_stream_limit_cleanup(self):
        headers = {"Content-Type": "application/pdf", "X-Client-Request-ID": str(uuid4())}
        self.call("POST", "/owner/assets/pdf", status=415, content=b"<html>not a pdf</html>", headers=headers)
        self.call("POST", "/owner/assets/pdf", status=422, content=self.pdf, headers={**headers, "X-File-Name": "../bad.pdf"})
        self.call("POST", "/owner/assets/pdf", status=415, content=self.pdf, headers={**headers, "Content-Type": "text/html"})
        with patch.object(assets, "MAX_PDF_BYTES", 64):
            self.call("POST", "/owner/assets/pdf", status=413, content=(chunk for chunk in (b"%PDF-1.7\n", b"x" * 80, b"%%EOF")), headers=headers)
        self.assertEqual(list(Path(self.temp.name, "private-assets").iterdir()), [])

    def test_pdf_quota_and_auth_are_checked_without_leaving_files(self):
        with patch.dict(os.environ, {"PILOT_ASSET_QUOTA_BYTES": "1"}):
            self.call("POST", "/owner/assets/pdf", status=409, content=self.pdf, headers={"Content-Type": "application/pdf", "X-Client-Request-ID": str(uuid4())})
        self.assertEqual(list(Path(self.temp.name, "private-assets").iterdir()), [])
        data = self.publish(team_access="open")
        identifier = data["lesson"]["id"]
        result = self.call("GET", f"/lessons/{identifier}/pdf", user="a-rep")
        self.assertEqual(result.content, self.pdf)
        self.call("PUT", f"/owner/lessons/{identifier}/access/a-rep", json={"decision": "deny", "expected_version": 0})
        self.call("GET", f"/lessons/{identifier}/pdf", user="a-rep", status=403)

    def test_catalog_pagination_and_language_fallback(self):
        one = self.publish()
        self.publish()
        first = self.call("GET", "/lessons?limit=1", user="a-rep")
        self.assertEqual(len(first["items"]), 1)
        next_page = self.call("GET", "/lessons?limit=1&cursor=" + first["next_cursor"], user="a-rep")
        self.assertNotEqual(first["items"][0]["id"], next_page["items"][0]["id"])
        self.assertIsNone(next_page["next_cursor"])
        self.call("GET", "/lessons?cursor=bad", user="a-rep", status=400)
        self.users["a-rep"]["locale"] = "es"
        self.assertEqual(self.call("GET", "/lessons", user="a-rep")["items"][0]["content_language"], "en")

    def test_integrated_app_requires_cookie_csrf_active_membership_for_media(self):
        from backend.app import persistence
        from backend.app.pilot.app import app

        identifier = self.publish(team_access="open")["lesson"]["id"]
        password = "SyntheticTest123!"
        with db.transaction() as conn:
            conn.execute("UPDATE users SET password_hash=?,must_change_password=0 WHERE id='a-rep'", (persistence.hash_password(password),))
            conn.execute("INSERT INTO pilot_allowed_emails(id,organization_id,email_normalized,role,user_id,created_at,updated_at) VALUES ('allow-a-rep','a','a-rep@example.invalid','representative','a-rep',?,?)", (db.now(), db.now()))
        with patch.dict(os.environ, {"PILOT_ORIGIN": "http://testserver", "PILOT_SECURE_COOKIE": "false"}), TestClient(app, headers={"Origin": "http://testserver"}) as client:
            self.assertEqual(client.get("/api/pilot/lessons").status_code, 401)
            self.assertEqual(client.get(f"/api/pilot/lessons/{identifier}/pdf").status_code, 401)
            login = client.post("/api/auth/login", json={"email": "a-rep@example.invalid", "password": password})
            self.assertEqual(login.status_code, 200, login.text)
            csrf = login.json()["data"]["csrf_token"]
            self.assertEqual(client.get(f"/api/pilot/lessons/{identifier}/pdf").status_code, 200)
            self.assertEqual(client.get("/api/pilot/owner/lessons").status_code, 403)
            self.assertEqual(client.post(f"/api/pilot/lessons/{identifier}/complete").status_code, 403)
            self.assertEqual(client.post(f"/api/pilot/lessons/{identifier}/complete", headers={"X-CSRF-Token": csrf}).status_code, 200)
            with db.transaction() as conn:
                conn.execute("UPDATE pilot_allowed_emails SET status='revoked' WHERE id='allow-a-rep'")
            self.assertEqual(client.get(f"/api/pilot/lessons/{identifier}/pdf").status_code, 401)


if __name__ == "__main__":
    unittest.main()
