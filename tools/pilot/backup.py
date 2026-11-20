"""Online SQLite snapshot with restore/integrity verification; never prints rows."""
import argparse
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tempfile


def backup(source, destination):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if source == destination or destination.exists():
        raise ValueError('Destination must be a new private file')
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    try:
        with closing(sqlite3.connect(source.as_uri()+'?mode=ro', uri=True)) as src, closing(sqlite3.connect(destination)) as target:
            src.backup(target)
        with tempfile.TemporaryDirectory(prefix='pilot-restore-') as folder:
            restored=Path(folder)/'restore.sqlite'
            with closing(sqlite3.connect(destination)) as saved, closing(sqlite3.connect(restored)) as trial:
                saved.backup(trial)
                if trial.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise ValueError('Backup restore integrity failed')
                tables=[row[0] for row in trial.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
                counts={name:trial.execute('SELECT COUNT(*) FROM "'+name.replace('"','""')+'"').fetchone()[0] for name in tables}
        return {'integrity':'ok','restored':True,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'table_counts':counts}
    except BaseException:
        destination.unlink(missing_ok=True)
        raise


if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('source'); parser.add_argument('destination')
    args=parser.parse_args(); print(json.dumps(backup(args.source,args.destination),sort_keys=True))
