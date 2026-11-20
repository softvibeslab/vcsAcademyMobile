"""Private daily DB+PDF archive; seven-day retention, atomic final artifact."""
import argparse
from contextlib import closing
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import tarfile
import tempfile
import time
try:
    from .backup import backup
except ImportError:  # Direct operator CLI invocation.
    from backup import backup


OWNED_BACKUP = re.compile(
    r"(?:daily-\d{8}T\d{6}Z\.tar\.gz|"
    r"\d{8}(?:T\d{6}Z)?-[A-Za-z0-9-]+\.(?:sqlite|json|nginx)|"
    r"\d{8}(?:T\d{6}Z)?-[A-Za-z0-9-]+-assets\.tar\.gz)"
)


def run(database, assets, folder):
    root=Path(folder).resolve()
    source=Path(assets).resolve()
    if not source.is_dir():
        raise FileNotFoundError('Private asset directory is missing')
    if root.is_relative_to(source):
        raise ValueError('Backup destination must be outside the asset directory')
    root.mkdir(parents=True,exist_ok=True,mode=0o700)
    os.chmod(root,0o700)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    final=root/('daily-'+stamp+'.tar.gz');partial=root/(final.name+'.partial')
    if final.exists() or final.is_symlink():
        raise ValueError('A verified backup already exists for this timestamp')
    fd=os.open(partial,os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,'O_NOFOLLOW',0),0o600)
    os.close(fd)
    try:
        with tempfile.TemporaryDirectory(prefix='pilot-daily-') as temporary:
            temp=Path(temporary)
            report=backup(database,temp/'academy.sqlite3')
            asset_hashes={}
            for path in source.rglob('*'):
                if path.is_symlink():
                    raise ValueError('Asset backups must not follow symbolic links')
                if path.is_file():
                    asset_hashes[path.relative_to(source).as_posix()]=hashlib.sha256(path.read_bytes()).hexdigest()
                elif not path.is_dir():
                    raise ValueError('Asset backups contain an unsupported file type')
            report['asset_sha256']=asset_hashes
            (temp/'verification.json').write_text(json.dumps(report,sort_keys=True))
            with tarfile.open(partial,'w:gz') as archive:
                archive.add(temp/'academy.sqlite3',arcname='academy.sqlite3')
                archive.add(temp/'verification.json',arcname='verification.json')
                archive.add(source,arcname='private-assets',recursive=True)
            with tarfile.open(partial) as archive:
                if 'academy.sqlite3' not in archive.getnames():
                    raise ValueError('Database snapshot missing from archive')
                archive.extractall(temp/'restored',filter='data')
            with closing(sqlite3.connect(temp/'restored'/'academy.sqlite3')) as conn:
                if conn.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise ValueError('Daily database restore integrity failed')
            for name,digest in asset_hashes.items():
                if hashlib.sha256((temp/'restored'/'private-assets'/name).read_bytes()).hexdigest() != digest:
                    raise ValueError('Daily asset restore checksum failed')
            partial.replace(final)
    finally:
        partial.unlink(missing_ok=True)
    removed=0
    for path in root.iterdir():
        if OWNED_BACKUP.fullmatch(path.name) and path.is_file() and not path.is_symlink() and path != final and path.stat().st_mtime < time.time()-7*86400:
            path.unlink();removed+=1
    return {'backup':final.name,'integrity':'ok','restore':'verified','assets_verified':len(asset_hashes),'retention_days':7,'expired_files_removed':removed}


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('database');parser.add_argument('assets');parser.add_argument('folder')
    args=parser.parse_args();print(json.dumps(run(args.database,args.assets,args.folder)))
