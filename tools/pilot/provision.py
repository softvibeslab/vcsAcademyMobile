"""Apply an explicit private provisioning manifest. No implicit role mapping."""
import argparse
import json
import os
from pathlib import Path
import re
from backend.app.pilot import bootstrap, db, identity


def provision(manifest_path, credentials_dir):
    manifest=json.loads(Path(manifest_path).read_text())
    accounts=manifest['accounts']
    credential_root=Path(credentials_dir).expanduser().resolve()
    repository=Path(identity.__file__).resolve().parents[3]
    asset_root=Path(os.environ.get('PILOT_ASSET_DIR','backend/data/pilot-assets')).resolve()
    forbidden=[repository,asset_root,Path('/var/www'),Path('/srv/aisales/current/web').resolve()]
    if any(credential_root.is_relative_to(path) for path in forbidden):
        raise ValueError('Credentials must be outside the repository and site')
    seen_emails,seen_names=set(),set()
    for account in accounts:
        name=account['credential_name']
        email=account['email'].strip().lower()
        if not isinstance(name,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}',name):
            raise ValueError('Credential name must be a safe filename identifier')
        if email in seen_emails or name in seen_names:
            raise ValueError('Duplicate account or credential name in manifest')
        if account['role'] not in {'owner','representative'}:
            raise ValueError('Invalid explicit pilot role')
        seen_emails.add(email);seen_names.add(name)
    bootstrap.initialize()
    with db.read() as conn:
        row=conn.execute('SELECT * FROM pilot_organizations WHERE slug=?',(manifest['slug'],)).fetchone()
        for account in accounts:
            current=conn.execute('SELECT organization_id,pilot_role FROM users WHERE lower(email)=?',(account['email'].strip().lower(),)).fetchone()
            if current and current['organization_id'] and (not row or current['organization_id']!=row['id'] or current['pilot_role']!=account['role']):
                raise ValueError('Existing account assignment differs from approved manifest')
    org=dict(row) if row else identity.create_organization(manifest['name'],manifest['slug'])
    credential_root.mkdir(parents=True,exist_ok=True,mode=0o700)
    os.chmod(credential_root,0o700)
    count=0
    for account in accounts:
        with db.read() as conn:
            current=conn.execute('SELECT id,organization_id,pilot_role FROM users WHERE lower(email)=?',(account['email'].strip().lower(),)).fetchone()
        if current and current['organization_id']:
            if current['organization_id']!=org['id'] or current['pilot_role']!=account['role']:
                raise ValueError('Existing account assignment differs from approved manifest')
            continue
        identity.create_account(org['id'],account['email'],account['name'],account['role'],credential_root/(account['credential_name']+'.json'),adopt_existing=True)
        count+=1
    return {'organization_id':org['id'],'accounts_created':count}


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('manifest');parser.add_argument('credentials_dir')
    args=parser.parse_args();print(json.dumps(provision(args.manifest,args.credentials_dir)))
