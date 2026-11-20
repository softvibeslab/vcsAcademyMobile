import os
import tempfile
import unittest
from unittest.mock import patch

from backend.app.pilot import db
from backend.app.pilot import identity
from pathlib import Path
import json


class MigrationTests(unittest.TestCase):
    def test_additive_identity_schema_without_demo_seed(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"VCSA_DB_PATH": directory + "/test.sqlite"}):
            db.initialize()
            with db.read() as conn:
                tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            self.assertTrue({"users", "pilot_organizations", "pilot_sessions", "pilot_allowed_emails"}.issubset(tables), tables)
            with db.read() as conn:
                self.assertEqual(conn.execute("SELECT count(*) FROM users").fetchone()[0], 0)
            db.initialize()
            with db.read() as conn:
                self.assertEqual(conn.execute("SELECT count(*) FROM users").fetchone()[0], 0)

    def test_manual_account_credentials_private_and_no_default_access(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"VCSA_DB_PATH": directory + "/test.sqlite"}):
            db.initialize()
            organization = identity.create_organization('Academy Alpha', 'alpha')
            self.assertIsNotNone(organization)
            secret_path = Path(directory) / 'credentials.json'
            result = identity.create_account(organization['id'], 'rep@example.invalid', 'Rep', 'representative', str(secret_path))
            self.assertNotIn('password', str(result))
            saved = json.loads(secret_path.read_text())
            self.assertGreaterEqual(len(saved['temporary_password']), 24)
            self.assertEqual(secret_path.stat().st_mode & 0o777, 0o600)
            with db.read() as conn:
                account = conn.execute('SELECT * FROM users').fetchone()
                self.assertEqual(account['must_change_password'], 1)
                self.assertNotEqual(account['password_hash'], saved['temporary_password'])
                self.assertEqual(conn.execute('SELECT count(*) FROM pilot_allowed_emails').fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main()
