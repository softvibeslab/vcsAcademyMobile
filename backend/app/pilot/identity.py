"""Manual account operations. Credentials never appear in HTTP responses or logs."""
import argparse
import json
import os
import re
import secrets
import time
from pathlib import Path
from backend.app.persistence import hash_password
from . import db
from .errors import fail


def create_organization(name, slug):
    from . import bootstrap, learning
    if not name.strip() or len(name) > 60 or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,59}', slug):
        fail(422, 'invalid_organization')
    bootstrap.initialize()
    with db.transaction() as conn:
        if conn.execute('SELECT id FROM pilot_organizations WHERE slug=?', (slug,)).fetchone():
            fail(409, 'organization_exists')
        organization_id = db.new_id()
        conn.execute('''INSERT INTO pilot_organizations
            (id,slug,name,app_name,welcome_title_en,welcome_title_es,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?)''', (organization_id, slug, name.strip(), name.strip(),
                'Your next sale starts here.', 'Tu próxima venta empieza aquí.', db.now(), db.now()))
        db.audit(conn, {'id':'operator','organization_id':organization_id}, 'organization_created', 'organization', organization_id)
        learning.seed_roadmap(conn, organization_id)
        return dict(conn.execute('SELECT * FROM pilot_organizations WHERE id=?',(organization_id,)).fetchone())


def reserve_credentials(path):
    target = Path(path).expanduser().resolve()
    repo = Path(__file__).resolve().parents[3]
    asset_dir = Path(os.environ.get('PILOT_ASSET_DIR', 'backend/data/pilot-assets')).resolve()
    forbidden = [repo, asset_dir, Path('/var/www'), Path('/srv/aisales/current/web')]
    if any(target.is_relative_to(folder) for folder in forbidden):
        fail(422, 'credentials_must_be_outside_site')
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o600)
    return target, fd


def create_account(organization_id, email, display_name, role, credential_file, adopt_existing=False):
    email = email.strip().lower()
    if role not in {'representative','owner'} or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or len(email)>254 or not display_name.strip() or len(display_name)>120:
        fail(422, 'invalid_account')
    password = secrets.token_urlsafe(32)
    password_hash = hash_password(password)
    target, fd = reserve_credentials(credential_file)
    try:
        with os.fdopen(fd, 'w') as output:
            json.dump({'email':email, 'temporary_password':password, 'expires_in_hours':48, 'change_required':True},output)
            output.flush()
            os.fsync(output.fileno())
        with db.transaction() as conn:
            org = conn.execute("SELECT id FROM pilot_organizations WHERE id=? AND status='active'", (organization_id,)).fetchone()
            if not org:
                fail(404, 'organization_not_found')
            existing = conn.execute('SELECT * FROM users WHERE lower(email)=?',(email,)).fetchone()
            if existing and (not adopt_existing or existing['organization_id']):
                fail(409, 'account_exists')
            user_id = existing['id'] if existing else db.new_id()
            if existing:
                conn.execute('''UPDATE users SET organization_id=?,pilot_role=?,display_name=?,password_hash=?,
                    must_change_password=1,password_expires_at=?,session_version=session_version+1,status='active',locale='en',updated_at=? WHERE id=?''',
                    (organization_id,role,display_name.strip(),password_hash,time.time()+48*3600,db.now(),user_id))
            else:
                conn.execute('''INSERT INTO users (id,email,display_name,password_hash,created_at,updated_at,
                    organization_id,pilot_role,locale,must_change_password,password_expires_at)
                    VALUES (?,?,?,?,?,?,?,?,'en',1,?)''', (user_id,email,display_name.strip(),password_hash,db.now(),db.now(),organization_id,role,time.time()+48*3600))
            conn.execute('''INSERT INTO pilot_allowed_emails (id,organization_id,email_normalized,role,user_id,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?)''',(db.new_id(),organization_id,email,role,user_id,db.now(),db.now()))
            conn.execute('UPDATE pilot_sessions SET revoked_at=? WHERE user_id=?',(time.time(),user_id))
            db.audit(conn, {'id':'operator','organization_id':organization_id}, 'account_created', 'user', user_id)
        return {'id':user_id,'organization_id':organization_id,'role':role,'credential_file':str(target)}
    except BaseException:
        target.unlink(missing_ok=True)
        raise


def revoke_account(organization_id, email):
    with db.transaction() as conn:
        row = conn.execute('SELECT id FROM users WHERE organization_id=? AND lower(email)=?',(organization_id,email.strip().lower())).fetchone()
        if not row:
            fail(404,'account_not_found')
        conn.execute("UPDATE users SET status='inactive',session_version=session_version+1,updated_at=? WHERE id=?",(db.now(),row['id']))
        conn.execute("UPDATE pilot_allowed_emails SET status='revoked',version=version+1,updated_at=? WHERE user_id=?",(db.now(),row['id']))
        conn.execute('UPDATE pilot_sessions SET revoked_at=? WHERE user_id=?',(time.time(),row['id']))
        db.audit(conn,{'id':'operator','organization_id':organization_id},'account_revoked','user',row['id'])
    return {'revoked':True}


def reset_account(organization_id, email, credential_file):
    password = secrets.token_urlsafe(32)
    target, fd = reserve_credentials(credential_file)
    try:
        with os.fdopen(fd,'w') as output:
            json.dump({'email':email,'temporary_password':password,'expires_in_hours':48,'change_required':True},output)
        with db.transaction() as conn:
            row=conn.execute("SELECT id FROM users WHERE organization_id=? AND lower(email)=? AND status='active'",(organization_id,email.strip().lower())).fetchone()
            if not row:
                fail(404,'account_not_found')
            conn.execute('UPDATE users SET password_hash=?,must_change_password=1,password_expires_at=?,session_version=session_version+1,updated_at=? WHERE id=?',(hash_password(password),time.time()+48*3600,db.now(),row['id']))
            conn.execute('UPDATE pilot_sessions SET revoked_at=? WHERE user_id=?',(time.time(),row['id']))
            db.audit(conn,{'id':'operator','organization_id':organization_id},'account_reset','user',row['id'])
        return {'id':row['id'],'credential_file':str(target)}
    except BaseException:
        target.unlink(missing_ok=True)
        raise


def main(argv=None):
    parser=argparse.ArgumentParser(description='Private pilot account operations')
    commands=parser.add_subparsers(dest='command',required=True)
    org=commands.add_parser('pilot-org-create'); org.add_argument('--name',required=True);org.add_argument('--slug',required=True)
    for name in ['pilot-account-create','pilot-account-reset-password','pilot-account-revoke','pilot-account-list']:
        command=commands.add_parser(name);command.add_argument('--organization',required=True)
        if name!='pilot-account-list':command.add_argument('--email',required=True)
        if name in {'pilot-account-create','pilot-account-reset-password'}:command.add_argument('--credential-file',required=True)
        if name=='pilot-account-create':
            command.add_argument('--name',required=True);command.add_argument('--role',choices=['owner','representative'],required=True);command.add_argument('--adopt-existing',action='store_true')
    args=parser.parse_args(argv);db.initialize()
    if args.command=='pilot-org-create':
        result=create_organization(args.name,args.slug)
    elif args.command=='pilot-account-create':
        result=create_account(args.organization,args.email,args.name,args.role,args.credential_file,args.adopt_existing)
    elif args.command=='pilot-account-reset-password':
        result=reset_account(args.organization,args.email,args.credential_file)
    elif args.command=='pilot-account-revoke':
        result=revoke_account(args.organization,args.email)
    else:
        with db.read() as conn:
            result=[dict(row) for row in conn.execute('SELECT id,email,display_name,pilot_role,status FROM users WHERE organization_id=?',(args.organization,))]
    print(json.dumps(result))


if __name__=='__main__':
    main()
