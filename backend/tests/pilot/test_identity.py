import os
import tempfile
import unittest
from unittest.mock import patch

from backend.app.pilot import db
from backend.app.pilot import identity
from pathlib import Path
import json
import sqlite3


class MigrationTests(unittest.TestCase):
    def test_new_accounts_on_legacy_users_schema_without_json_defaults(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'VCSA_DB_PATH': directory+'/legacy.sqlite'}):
            with sqlite3.connect(directory+'/legacy.sqlite') as conn:
                conn.execute('''CREATE TABLE users (
                    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL, roles_json TEXT NOT NULL, team_id TEXT,
                    permissions_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)''')
            org = identity.create_organization('Legacy academy', 'legacy')
            for role in ['owner', 'representative']:
                identity.create_account(org['id'], role+'@example.invalid', role, role, Path(directory)/(role+'.json'))
            with db.read() as conn:
                users = list(conn.execute('SELECT roles_json,permissions_json,pilot_role FROM users'))
            self.assertEqual({row['pilot_role'] for row in users}, {'owner','representative'})
            self.assertTrue(all(row['roles_json']=='[]' and row['permissions_json']=='[]' for row in users))

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
            self.assertEqual(len(saved['temporary_password']), 10)
            self.assertTrue(any(c.isupper() for c in saved['temporary_password']))
            self.assertTrue(any(c.islower() for c in saved['temporary_password']))
            self.assertTrue(any(c.isdigit() for c in saved['temporary_password']))
            self.assertEqual(secret_path.stat().st_mode & 0o777, 0o600)
            with db.read() as conn:
                account = conn.execute('SELECT * FROM users').fetchone()
                self.assertEqual(account['must_change_password'], 1)
                self.assertNotEqual(account['password_hash'], saved['temporary_password'])
                self.assertEqual(conn.execute('SELECT count(*) FROM pilot_allowed_emails').fetchone()[0], 1)

            reset_path = Path(directory) / 'reset.json'
            identity.reset_account(organization['id'], 'rep@example.invalid', str(reset_path))
            replacement = json.loads(reset_path.read_text())['temporary_password']
            self.assertEqual(len(replacement), 10)
            self.assertNotEqual(replacement, saved['temporary_password'])
            self.assertEqual(reset_path.stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
