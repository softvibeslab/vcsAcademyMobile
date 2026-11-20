"""Synthetic operational tests: retention, restore, private files and mapping."""
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import stat
import sys
import tarfile
import tempfile
import time
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from backend.app.pilot import bootstrap, db
from tools.pilot import backup, provision


def load_daily():
    source = Path(__file__).resolve().parents[3] / "tools/pilot/daily_backup.py"
    spec = importlib.util.spec_from_file_location("pilot_daily_backup_under_test", source)
    module = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {"backup": backup}):
        spec.loader.exec_module(module)
    return module


daily_backup = load_daily()


class OperationsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="pilot-ops-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.database = self.root / "active.sqlite3"
        self.assets = self.root / "assets"
        self.assets.mkdir(mode=0o700)
        self.env = patch.dict(os.environ, {"VCSA_DB_PATH": str(self.database), "PILOT_ASSET_DIR": str(self.assets)})
        self.env.start()
        self.addCleanup(self.env.stop)
        bootstrap.initialize()
        self.pdf = self.assets / "example.pdf"
        self.pdf.write_bytes(b"%PDF-1.7\nSynthetic test document\n%%EOF\n")

    def manifest(self, *, slug="synthetic", accounts=None):
        if accounts is None:
            accounts = [{"email": "owner@example.invalid", "name": "Example owner", "role": "owner", "credential_name": "example-owner"}, {"email": "rep@example.invalid", "name": "Example representative", "role": "representative", "credential_name": "example-rep"}]
        path = self.root / (slug + ".json")
        path.write_text(json.dumps({"slug": slug, "name": "Synthetic organization", "accounts": accounts}))
        return path

    def test_sqlite_backup_restores_and_does_not_replace_existing_destination(self):
        destination = self.root / "snapshots" / "before.sqlite3"
        result = backup.backup(self.database, destination)
        self.assertTrue(result["restored"])
        self.assertEqual(result["integrity"], "ok")
        self.assertEqual(stat.S_IMODE(destination.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(destination.parent.stat().st_mode), 0o700)
        original = destination.read_bytes()
        with self.assertRaises(ValueError):
            backup.backup(self.database, destination)
        self.assertEqual(destination.read_bytes(), original)
        with self.assertRaises(ValueError):
            backup.backup(self.database, self.database)

    def test_failed_sqlite_backup_removes_incomplete_destination(self):
        destination = self.root / "failed.sqlite3"
        with self.assertRaises(sqlite3.OperationalError):
            backup.backup(self.root / "missing.sqlite3", destination)
        self.assertFalse(destination.exists())

    def test_daily_archive_restores_pdf_database_and_private_modes(self):
        folder = self.root / "daily"
        folder.mkdir(mode=0o755)
        os.chmod(folder, 0o755)
        result = daily_backup.run(self.database, self.assets, folder)
        archive = folder / result["backup"]
        self.assertEqual(result["restore"], "verified")
        self.assertEqual(stat.S_IMODE(folder.stat().st_mode), 0o700)
        self.assertEqual(stat.S_IMODE(archive.stat().st_mode), 0o600)
        with tarfile.open(archive) as handle:
            self.assertEqual(handle.extractfile("private-assets/example.pdf").read(), self.pdf.read_bytes())
            report = json.loads(handle.extractfile("verification.json").read())
            self.assertTrue(report["restored"])
            self.assertIn("pilot_schema_migrations", report["table_counts"])
            handle.extractall(self.root / "restored", filter="data")
        with sqlite3.connect(self.root / "restored" / "academy.sqlite3") as conn:
            self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone()[0], "ok")
        self.assertEqual(list(folder.glob("*.partial")), [])

    def test_retention_removes_only_owned_backups_after_seven_days(self):
        folder = self.root / "daily"
        folder.mkdir()
        old_names = ["daily-20260101T010203Z.tar.gz", "20260101-v5.sqlite", "20260101-v5.json", "20260101-v5.nginx", "20260101-v5-assets.tar.gz"]
        for name in [*old_names, "operator-notes.txt", "daily-20260102T010203Z.tar.gz"]:
            target = folder / name
            target.write_bytes(b"synthetic")
            age = 6 if name == "daily-20260102T010203Z.tar.gz" else 8
            os.utime(target, (time.time() - age * 86400, time.time() - age * 86400))
        outside = self.root / "outside.txt"
        outside.write_text("synthetic")
        link = folder / "daily-20260103T010203Z.tar.gz"
        link.symlink_to(outside)
        result = daily_backup.run(self.database, self.assets, folder)
        self.assertEqual(result["retention_days"], 7)
        self.assertEqual(result["expired_files_removed"], len(old_names))
        self.assertTrue((folder / "operator-notes.txt").exists())
        self.assertTrue((folder / "daily-20260102T010203Z.tar.gz").exists())
        self.assertTrue(link.is_symlink())
        self.assertTrue(outside.exists())
        self.assertTrue(all(not (folder / name).exists() for name in old_names))

    def test_failed_daily_archive_removes_partial_and_preserves_prior_archive(self):
        folder = self.root / "daily"
        folder.mkdir()
        prior = folder / "daily-20260101T010203Z.tar.gz"
        prior.write_bytes(b"previous verified archive")
        with self.assertRaises((FileNotFoundError, ValueError)):
            daily_backup.run(self.database, self.root / "missing-assets", folder)
        self.assertEqual(list(folder.glob("*.partial")), [])
        self.assertEqual(prior.read_bytes(), b"previous verified archive")

    def test_provision_is_idempotent_and_keeps_credentials_private(self):
        manifest, credentials = self.manifest(), self.root / "credentials"
        first = provision.provision(manifest, credentials)
        self.assertEqual(first["accounts_created"], 2)
        original = {path.name: path.read_bytes() for path in credentials.iterdir()}
        second = provision.provision(manifest, credentials)
        self.assertEqual(second["organization_id"], first["organization_id"])
        self.assertEqual(second["accounts_created"], 0)
        self.assertEqual(original, {path.name: path.read_bytes() for path in credentials.iterdir()})
        self.assertEqual(stat.S_IMODE(credentials.stat().st_mode), 0o700)
        self.assertTrue(all(stat.S_IMODE(path.stat().st_mode) == 0o600 for path in credentials.iterdir()))
        with db.read() as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0], 2)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM pilot_allowed_emails").fetchone()[0], 2)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM pilot_lessons").fetchone()[0], 11)
            self.assertTrue(all(row[0] for row in conn.execute("SELECT must_change_password FROM users")))

    def test_provision_adopts_only_explicit_legacy_mapping(self):
        with db.transaction() as conn:
            for name in ("mapped", "unmapped"):
                conn.execute("INSERT INTO users(id,email,display_name,password_hash,roles_json,team_id,created_at,updated_at) VALUES (?,?,?,'unusable','[\"owner\"]','team_demo',?,?)", (name, name + "@example.invalid", name, db.now(), db.now()))
        result = provision.provision(self.manifest(accounts=[{"email": "mapped@example.invalid", "name": "Example", "role": "representative", "credential_name": "mapped"}]), self.root / "credentials")
        with db.read() as conn:
            mapped = conn.execute("SELECT organization_id,pilot_role FROM users WHERE id='mapped'").fetchone()
            unmapped = conn.execute("SELECT organization_id,pilot_role FROM users WHERE id='unmapped'").fetchone()
            self.assertEqual(tuple(mapped), (result["organization_id"], "representative"))
            self.assertEqual(tuple(unmapped), (None, None))
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM pilot_tours").fetchone()[0], 0)

    def test_provision_never_moves_already_mapped_account(self):
        first = provision.provision(self.manifest(), self.root / "credentials")
        with self.assertRaises(ValueError):
            provision.provision(self.manifest(slug="different"), self.root / "other-credentials")
        with db.read() as conn:
            self.assertEqual({row[0] for row in conn.execute("SELECT organization_id FROM users")}, {first["organization_id"]})

    def test_provision_rejects_credential_path_escape_before_writing(self):
        manifest = self.manifest(accounts=[{"email": "escape@example.invalid", "name": "Example", "role": "representative", "credential_name": "../escaped"}])
        with self.assertRaises((ValueError, HTTPException)):
            provision.provision(manifest, self.root / "credentials")
        self.assertFalse((self.root / "escaped.json").exists())
        with db.read() as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0], 0)

    def test_provision_rejects_credentials_inside_repository(self):
        repository = Path(__file__).resolve().parents[3]
        destination = repository / "never-create-operation-test-credentials"
        with self.assertRaises((ValueError, HTTPException)):
            provision.provision(self.manifest(), destination)
        self.assertFalse(destination.exists())

    def test_provision_private_existing_credentials_directory(self):
        credentials = self.root / "credentials"
        credentials.mkdir(mode=0o755)
        os.chmod(credentials, 0o755)
        provision.provision(self.manifest(), credentials)
        self.assertEqual(stat.S_IMODE(credentials.stat().st_mode), 0o700)

    def test_provision_supports_operator_tools_mounted_outside_application(self):
        with patch.object(provision, "__file__", "/tools/pilot/provision.py"):
            result = provision.provision(self.manifest(), self.root / "credentials")
        self.assertEqual(result["accounts_created"], 2)


if __name__ == "__main__":
    unittest.main()
