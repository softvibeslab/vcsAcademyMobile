import hashlib
import os
import tempfile
import time
import unittest
import threading
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend.app import persistence
from backend.app.pilot import db
from backend.app.pilot.app import app


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"VCSA_DB_PATH": self.tmp.name + "/pilot.sqlite", "PILOT_ORIGIN": "http://testserver", "PILOT_SECURE_COOKIE": "false"})
        self.env.start()
        db.initialize()
        with db.transaction() as conn:
            conn.execute("INSERT INTO pilot_organizations(id,slug,name,app_name,welcome_title_en,created_at,updated_at) VALUES ('org','org','Academy','Academy','Welcome',?,?)", (db.now(), db.now()))
            conn.execute("INSERT INTO users(id,email,display_name,password_hash,created_at,updated_at,organization_id,pilot_role,must_change_password) VALUES ('rep','rep@example.invalid','Rep',?,?,?,'org','representative',0)", (persistence.hash_password('TestPassword123!'), db.now(), db.now()))
            conn.execute("INSERT INTO pilot_allowed_emails(id,organization_id,email_normalized,role,user_id,created_at,updated_at) VALUES ('allow','org','rep@example.invalid','representative','rep',?,?)", (db.now(), db.now()))
        self.client = TestClient(app, headers={"Origin": "http://testserver"})

    def tearDown(self):
        self.client.close()
        self.env.stop()
        self.tmp.cleanup()

    def login(self):
        return self.client.post('/api/auth/login', json={"email":"rep@example.invalid","password":"TestPassword123!"})

    def test_private_login_cookie_and_revoke(self):
        response = self.login()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn('token', response.json()['data'])
        self.assertIn('httponly', response.headers['set-cookie'].lower())
        self.assertEqual(self.client.get('/api/mobile/me').status_code, 200)
        with db.transaction() as conn:
            conn.execute("UPDATE pilot_allowed_emails SET status='revoked'")
        self.assertEqual(self.client.get('/api/mobile/me').status_code, 401)

    def test_temporary_password_limits_and_csrf(self):
        with db.transaction() as conn:
            conn.execute("UPDATE users SET must_change_password=1,password_expires_at=?", (time.time()+1000,))
        response = self.login()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()['data']['must_change_password'])
        payload={"current_password":"TestPassword123!","new_password":"AnotherPassword456!"}
        self.assertEqual(self.client.post('/api/auth/change-password',json=payload).status_code,403)
        csrf=response.json()['data']['csrf_token']
        changed=self.client.post('/api/auth/change-password',json=payload,headers={'X-CSRF-Token':csrf})
        self.assertEqual(changed.status_code,200,changed.text)
        self.assertFalse(changed.json()['data']['must_change_password'])
        self.assertEqual(self.login().status_code,401)

    def test_demo_and_recovery_tokens_are_unavailable(self):
        for path in ['/api/auth/demo-users','/api/public/catalog','/api/blueprint/steps','/api/admin/users']:
            self.assertEqual(self.client.get(path).status_code,404)
        for path in ['/api/auth/register','/api/auth/reset-password']:
            self.assertEqual(self.client.post(path,json={}).status_code,404)
        response=self.client.post('/api/auth/forgot-password',json={'email':'rep@example.invalid'})
        self.assertEqual(response.status_code,200,response.text)
        self.assertNotIn('reset_token',response.text)

    def test_ten_character_password_change_and_shorter_rejection(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        headers = {'X-CSRF-Token':response.json()['data']['csrf_token']}
        payload = {'current_password':'TestPassword123!', 'new_password':'Short123!'}
        self.assertEqual(self.client.post('/api/auth/change-password', json=payload, headers=headers).status_code, 422)
        payload['new_password'] = 'NewPass123'
        self.assertEqual(len(payload['new_password']), 10)
        changed = self.client.post('/api/auth/change-password', json=payload, headers=headers)
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertFalse(changed.json()['data']['must_change_password'])
        login = self.client.post('/api/auth/login', json={'email':'rep@example.invalid','password':'NewPass123'})
        self.assertEqual(login.status_code, 200)

    def test_origin_and_failed_login_rate_limit(self):
        response=self.client.post('/api/auth/login',json={'email':'rep@example.invalid','password':'bad'},headers={'Origin':'https://attacker.invalid'})
        self.assertEqual(response.status_code,403)
        responses=[self.client.post('/api/auth/login',json={'email':'rep@example.invalid','password':'bad'}).status_code for _ in range(6)]
        self.assertEqual(responses[:5],[401]*5)
        self.assertEqual(responses[5],429)

    def test_audit_request_id_matches_server_response(self):
        response = self.client.post('/api/auth/login', json={"email":"rep@example.invalid","password":"TestPassword123!"},
                                    headers={'X-Request-ID':'client-cannot-choose-audit-id'})
        self.assertEqual(response.status_code, 200, response.text)
        server_id = response.headers['x-request-id']
        self.assertNotEqual(server_id, 'client-cannot-choose-audit-id')
        with db.read() as conn:
            audit = dict(conn.execute("SELECT * FROM pilot_audit WHERE action='login'").fetchone())
        self.assertEqual(audit.get('request_id'), server_id)

    def test_audit_request_id_migration_is_additive(self):
        with db.transaction() as conn:
            conn.execute('DROP TABLE pilot_audit')
            conn.execute('CREATE TABLE pilot_audit(id TEXT PRIMARY KEY,organization_id TEXT,actor_id TEXT NOT NULL,action TEXT NOT NULL,target_type TEXT NOT NULL,target_id TEXT NOT NULL,metadata_json TEXT NOT NULL,created_at TEXT NOT NULL)')
            conn.execute("INSERT INTO pilot_audit VALUES('old','org','rep','legacy','user','rep','{}','2026-11-01T00:00:00Z')")
        db.initialize()
        db.initialize()
        with db.read() as conn:
            old = dict(conn.execute("SELECT * FROM pilot_audit WHERE id='old'").fetchone())
        self.assertIn('request_id', old)
        self.assertEqual(old['metadata_json'], '{}')
        self.assertEqual(old['created_at'], '2026-11-01T00:00:00Z')

    def test_concurrent_requests_keep_separate_audit_ids(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = list(pool.map(lambda _: self.login(), range(2)))
        self.assertEqual([response.status_code for response in responses], [200, 200])
        server_ids = {response.headers['x-request-id'] for response in responses}
        self.assertEqual(len(server_ids), 2)
        with db.read() as conn:
            stored_ids = {row[0] for row in conn.execute("SELECT request_id FROM pilot_audit WHERE action='login'")}
        self.assertEqual(stored_ids, server_ids)
        self.assertIsNone(db.request_id_context.get())

    def test_storage_uses_wal_with_full_durability(self):
        with db.read() as conn:
            self.assertEqual(conn.execute('PRAGMA journal_mode').fetchone()[0], 'wal')
            self.assertEqual(conn.execute('PRAGMA synchronous').fetchone()[0], 2)
            self.assertEqual(conn.execute('PRAGMA foreign_keys').fetchone()[0], 1)
        db.initialize()
        with db.read() as conn:
            self.assertEqual(conn.execute('PRAGMA journal_mode').fetchone()[0], 'wal')

    def test_writers_queue_before_connect_and_rollback_releases_queue(self):
        ready, second_connect = threading.Event(), threading.Event()
        original_connect = db.connect
        outcomes = []

        def observed_connect():
            if threading.current_thread().name == 'second-pilot-writer':
                second_connect.set()
            return original_connect()

        def write_second():
            ready.set()
            with db.transaction() as conn:
                conn.execute("UPDATE users SET display_name='Committed' WHERE id='rep'")
            outcomes.append('committed')

        worker = threading.Thread(target=write_second, name='second-pilot-writer')
        try:
            with patch('backend.app.pilot.db.connect', side_effect=observed_connect):
                with self.assertRaisesRegex(RuntimeError, 'synthetic rollback'):
                    with db.transaction() as conn:
                        conn.execute("UPDATE users SET display_name='Must roll back' WHERE id='rep'")
                        worker.start()
                        self.assertTrue(ready.wait(1))
                        self.assertFalse(second_connect.wait(.1), 'second writer should wait before opening SQLite')
                        with db.read() as reader:
                            self.assertEqual(reader.execute("SELECT display_name FROM users WHERE id='rep'").fetchone()[0], 'Rep')
                        raise RuntimeError('synthetic rollback')
        finally:
            if worker.ident is not None:
                worker.join(5)
        self.assertFalse(worker.is_alive())
        self.assertEqual(outcomes, ['committed'])
        with db.read() as conn:
            self.assertEqual(conn.execute("SELECT display_name FROM users WHERE id='rep'").fetchone()[0], 'Committed')


if __name__=='__main__':
    unittest.main()
