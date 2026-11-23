"""Real SQLite backup and retention checks with temporary synthetic data."""
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

SCRIPT = Path(__file__).resolve().parents[1] / 'deploy/tour-learning/maintenance.py'
module = None
if SCRIPT.exists():
    spec = importlib.util.spec_from_file_location('tour_maintenance', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)


class MaintenanceTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(module, 'Tour maintenance behavior has not been implemented')
        self.temp = tempfile.TemporaryDirectory(prefix='tour-maintenance-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.now = datetime(2026, 11, 22, 15, 0, tzinfo=timezone.utc)

    def test_backup_copies_committed_wal_and_is_private(self):
        database = self.root / 'source.sqlite3'
        with sqlite3.connect(database) as connection:
            connection.execute('PRAGMA journal_mode=WAL')
            connection.execute('CREATE TABLE fixture (value TEXT)')
            connection.execute('INSERT INTO fixture VALUES (?)', ('synthetic learning',))
            connection.commit()
            target = module.backup(database, self.root / 'backups', self.now)
            with sqlite3.connect(target) as copied:
                self.assertEqual(copied.execute('SELECT value FROM fixture').fetchone()[0], 'synthetic learning')
        self.assertEqual(target.stat().st_mode & 0o777, 0o600)
        self.assertEqual(target.parent.stat().st_mode & 0o777, 0o700)

    def test_prune_only_owned_backups_older_than_seven_days(self):
        directory = self.root / 'backups'
        directory.mkdir()
        paths = []
        for age in (6, 7, 8):
            stamp = self.now - timedelta(days=age)
            path = directory / ('v1-tours-' + stamp.strftime('%Y%m%dT%H%M%SZ') + '.sqlite3')
            path.write_text('synthetic')
            os.utime(path, (stamp.timestamp(), stamp.timestamp()))
            paths.append(path)
        historical = directory / 'unrelated-backup.sqlite3'
        historical.write_text('do not remove')
        os.utime(historical, (0, 0))
        self.assertEqual(module.prune(directory, self.now), 2)
        self.assertTrue(paths[0].exists())
        self.assertFalse(paths[1].exists())
        self.assertFalse(paths[2].exists())
        self.assertTrue(historical.exists())

    def test_prune_does_not_follow_symlinks(self):
        directory = self.root / 'backups'
        directory.mkdir()
        outside = self.root / 'outside.sqlite3'
        outside.write_text('preserve')
        link = directory / 'v1-tours-20260101T000000Z.sqlite3'
        link.symlink_to(outside)
        self.assertEqual(module.prune(directory, self.now), 0)
        self.assertTrue(outside.exists())

    def test_prune_expires_only_owned_regular_partials_at_seven_days(self):
        directory = self.root / 'backups'
        directory.mkdir()
        partials = []
        for suffix, age in [('abcd1234', 6), ('abcd1235', 7), ('abcd1236', 10)]:
            path = directory / ('.backup-' + suffix + '.partial')
            path.write_text('synthetic interrupted backup')
            when = (self.now - timedelta(days=age)).timestamp()
            os.utime(path, (when, when))
            partials.append(path)
        unrelated = directory / '.backup-not-owned.partial'
        unrelated.write_text('preserve unrelated file')
        os.utime(unrelated, (0, 0))
        outside = self.root / 'outside.sqlite3'
        outside.write_text('preserve symlink target')
        os.utime(outside, (0, 0))
        link = directory / '.backup-abcd1237.partial'
        link.symlink_to(outside)
        os.utime(link, (0, 0), follow_symlinks=False)
        subdirectory = directory / '.backup-abcd1238.partial'
        subdirectory.mkdir()
        os.utime(subdirectory, (0, 0))
        self.assertEqual(module.prune(directory, self.now), 2)
        self.assertTrue(partials[0].exists(), 'A recent partial must survive retention')
        self.assertFalse(partials[1].exists(), 'Seven-day partial must expire')
        self.assertFalse(partials[2].exists(), 'Older interrupted backup must expire')
        self.assertTrue(unrelated.exists())
        self.assertTrue(link.is_symlink())
        self.assertTrue(outside.exists())
        self.assertTrue(subdirectory.is_dir())

    def test_missing_database_does_not_create_empty_backup(self):
        with self.assertRaises((FileNotFoundError, sqlite3.OperationalError)):
            module.backup(self.root / 'missing.sqlite3', self.root / 'backups', self.now)
        self.assertEqual(list((self.root / 'backups').glob('*.sqlite3')), [])

    def test_retention_still_prunes_when_visit_cleanup_fails(self):
        directory = self.root / 'backups'
        directory.mkdir()
        stale = directory / 'v1-tours-20200101T000000Z.sqlite3'
        stale.write_text('synthetic historical backup')
        database = self.root / 'academy.sqlite3'
        database.touch()
        arguments = ['maintenance.py', '--image', 'synthetic:fixture', '--database', str(database), '--backups', str(directory)]
        with patch('sys.argv', arguments), patch.object(module.subprocess, 'run', return_value=SimpleNamespace(returncode=1, stdout='', stderr='')):
            with self.assertRaises(RuntimeError):
                module.main()
        self.assertFalse(stale.exists(), 'Backup expiry must run even when the purge or backup job fails')


if __name__ == '__main__':
    unittest.main(verbosity=2)
