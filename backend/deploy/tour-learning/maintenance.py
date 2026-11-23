"""Daily V1 expiry and consistent private backups; emits counts, never records."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import argparse
import fcntl
import json
import os
import re
import sqlite3
import stat
import subprocess
import tempfile
import uuid

BACKUP_NAME = re.compile(r'^v1-tours-(\d{8}T\d{6}Z)(?:-[a-f0-9]{8})?\.sqlite3$')
PARTIAL_NAME = re.compile(r'^\.backup-[a-z0-9_]{8}\.partial$')


def backup(database: Path, directory: Path, now: datetime) -> Path:
    source = database.resolve(strict=True)
    directory.mkdir(parents=True, mode=0o700, exist_ok=True)
    os.chmod(directory, 0o700)
    name = 'v1-tours-' + now.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8] + '.sqlite3'
    target = directory / name
    fd, temporary_name = tempfile.mkstemp(prefix='.backup-', suffix='.partial', dir=directory)
    os.close(fd)
    temporary = Path(temporary_name)
    try:
        with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True, timeout=30) as current, sqlite3.connect(temporary) as copy:
            current.backup(copy, pages=100, sleep=0.1)
            if copy.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
                raise RuntimeError('Backup verification failed')
        os.chmod(temporary, 0o600)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
    return target


def prune(directory: Path, now: datetime) -> int:
    removed = 0
    cutoff = now.astimezone(timezone.utc) - timedelta(days=7)
    for path in directory.iterdir():
        match = BACKUP_NAME.fullmatch(path.name)
        partial = PARTIAL_NAME.fullmatch(path.name)
        if not match and not partial:
            continue
        metadata = path.lstat()
        if not stat.S_ISREG(metadata.st_mode):
            continue
        try:
            # Interrupted workers may leave private SQLite partials; main holds
            # the maintenance lock while expiring them by their last write.
            created = (datetime.fromtimestamp(metadata.st_mtime, timezone.utc) if partial
                       else datetime.strptime(match[1], '%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc))
        except ValueError:
            continue
        if created <= cutoff:
            path.unlink()
            removed += 1
    return removed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--database', type=Path, default=Path('/srv/aisales-v1/data/academy.sqlite3'))
    parser.add_argument('--backups', type=Path, default=Path('/srv/aisales-v1/backups/tour-learning'))
    parser.add_argument('--image', required=True)
    args = parser.parse_args()
    os.umask(0o077)
    args.backups.mkdir(parents=True, mode=0o700, exist_ok=True)
    with (args.backups / '.maintenance.lock').open('a') as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        # Backup retention is independent of a successful purge or new snapshot.
        removed = prune(args.backups, datetime.now(timezone.utc))
        # A dedicated, pinned image keeps expiry operational after an API rollback.
        process = subprocess.run([
            'docker', 'run', '--rm', '--network', 'none', '--cap-drop', 'ALL',
            '--security-opt', 'no-new-privileges', '--read-only', '--tmpfs', '/tmp',
            '-e', 'PYTHONDONTWRITEBYTECODE=1', '-e', 'VCSA_DB_PATH=/data/academy.sqlite3',
            '-v', str(args.database.resolve().parent) + ':/data',
            args.image, 'python', '-m', 'backend.app.tour_visits', '--purge',
        ], text=True, capture_output=True, timeout=120)
        if process.returncode:
            raise RuntimeError('Visit expiry failed; no backup produced')
        counts = json.loads(process.stdout.strip().splitlines()[-1])
        now = datetime.now(timezone.utc)
        backup(args.database, args.backups, now)
        removed += prune(args.backups, now)
        print(json.dumps({'purged': {k: int(counts[k]) for k in ('visits_deleted', 'requests_deleted')},
                          'backup_created': True, 'backups_removed': removed}))


if __name__ == '__main__':
    main()
