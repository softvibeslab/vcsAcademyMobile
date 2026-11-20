"""Pull only private daily snapshots to the operator machine; seven-day retention."""
import argparse
import os
from pathlib import Path
import re
import subprocess
import time


def sync(host, key, destination):
    if not re.fullmatch(r'[A-Za-z0-9_.@-]+',host):
        raise ValueError('Invalid SSH host')
    root=Path(destination).expanduser().resolve();root.mkdir(parents=True,exist_ok=True,mode=0o700);root.chmod(0o700)
    options=['-i',str(Path(key).expanduser()),'-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes']
    remote='/srv/aisales/private-ops/backups'
    command="find /srv/aisales/private-ops/backups -maxdepth 1 -type f -name 'daily-*.tar.gz' -mtime -7 -printf '%f\\n'"
    names=subprocess.check_output(['/usr/bin/ssh',*options,host,command],text=True).splitlines()
    copied=0
    for name in names:
        if not re.fullmatch(r'daily-\d{8}T\d{6}Z\.tar\.gz',name):
            raise ValueError('Unexpected backup filename')
        final=root/name
        if final.exists():continue
        partial=root/(name+'.partial')
        try:
            subprocess.run(['/usr/bin/scp','-p',*options,host+':'+remote+'/'+name,str(partial)],check=True)
            partial.chmod(0o600);partial.replace(final);copied+=1
        finally:
            partial.unlink(missing_ok=True)
    removed=0
    for path in root.glob('daily-*.tar.gz'):
        if re.fullmatch(r'daily-\d{8}T\d{6}Z\.tar\.gz',path.name) and path.is_file() and not path.is_symlink() and path.stat().st_mtime<time.time()-7*86400:
            path.unlink();removed+=1
    print(f'Private backups synchronized: {copied}; expired copies removed: {removed}.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--host',required=True);parser.add_argument('--key',required=True);parser.add_argument('--destination',required=True)
    args=parser.parse_args();sync(args.host,args.key,args.destination)
