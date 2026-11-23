"""Run on the VPS with an extracted, verified V1 bundle; no secrets are printed."""
from pathlib import Path
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request

EXPECTED_BASE = 'sha256:c0371abac3955d972e754854227584ff8a1992ee059b1c0256ac335831a5dea7'
OLD_CONTAINER = 'aisales-v1-20261122'
NEW_CONTAINER = 'aisales-v1-coach-20261122'
CANDIDATE = 'aisales-v1-coach-candidate-20261122'
IMAGE = 'aisales-v1-api:20261122-coach'
OLD_ROOT = '/srv/aisales-v1-release-20261122-agenda-viewport/web'
RELEASE = Path('/srv/aisales-v1-release-20261122-coach')
OPS = Path('/srv/aisales-v1/ops/20261122-coach')
VHOST = Path('/etc/nginx/sites-available/aisalesv1.softvibes.pro.conf')
KEY = Path('/etc/salesacademy-coach-v1/client.key')
DATABASE = Path('/srv/aisales-v1/data/academy.sqlite3')


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT, text=True).strip()


def inspect(name):
    return json.loads(run('docker', 'inspect', name))[0]


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def private_snapshot():
    container = inspect('aisales-pilot-20261120-accounts-r2')
    return {'containerId': container['Id'], 'image': container['Image'], 'running': container['State']['Running'],
            'nginx': digest('/etc/nginx/sites-available/aisales.softvibes.pro.conf'),
            'html': digest('/srv/aisales-release-20261120-role-accounts/web/index.html')}


def request(port, route, payload=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(f'http://127.0.0.1:{port}{route}', data=json.dumps(payload).encode() if payload is not None else None, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=40) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)


def wait_ready(port):
    for _ in range(30):
        try:
            status, body = request(port, '/api/ready')
            if status == 200 and body['data']['status'] == 'ready':
                return
        except (OSError, ValueError, KeyError):
            pass
        time.sleep(1)
    raise RuntimeError('Candidate API not ready')


def db_shape(path):
    with sqlite3.connect(f'file:{path}?mode=ro', uri=True) as connection:
        assert connection.execute('PRAGMA quick_check').fetchone()[0] == 'ok'
        schema = connection.execute("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
        users = connection.execute('SELECT count(*) FROM users').fetchone()[0]
        security = {}
        for table in ('users', 'access_items', 'license_codes', 'license_redemptions'):
            columns = [row[1] for row in connection.execute(f'PRAGMA table_info("{table}")') if row[1] != 'updated_at']
            selected = ','.join('"' + column + '"' for column in columns)
            rows = connection.execute(f'SELECT {selected} FROM "{table}" ORDER BY {selected}').fetchall()
            # Only digests leave memory: no password hashes, permissions, or code hashes in output.
            security[table] = hashlib.sha256(json.dumps(rows).encode()).hexdigest()
    return {'schema': hashlib.sha256(json.dumps(schema).encode()).hexdigest(), 'users': users, 'securityDigests': security}


def start_container(name, port, data, environment):
    return run('docker', 'run', '-d', '--name', name, '--network', 'host', '--restart', 'unless-stopped' if port == 18824 else 'no',
               '--env-file', str(environment), '-v', f'{data}:/data', '-v', f'{KEY}:/run/secrets/coach.key:ro',
               IMAGE, 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', str(port))


def smoke(port):
    status, login = request(port, '/api/auth/login', {'email': 'rep@vcsa.local', 'password': 'demo123'})
    assert status == 200
    token = login['data']['token']
    try:
        status, body = request(port, '/api/smart-agent/chat', {'message': 'Prueba sintética: ayúdame a practicar una objeción sin presionar.', 'mode': 'general_coach', 'conversation_history': []}, token)
        if status == 200:
            assert body['data']['provider'] == 'hermes' and body['data']['response'].strip()
            result = 'hermes_answered'
        else:
            assert status == 503 and body.get('detail', {}).get('code') == 'coach_unavailable', 'Unexpected integration failure'
            result = 'coach_unavailable_recoverable'
        session_status, _ = request(port, '/api/mobile/me', token=token)
        assert session_status == 200, 'Provider failure must not invalidate application session'
        public_status, public = request(port, '/api/smart-agent/public-chat', {'message': 'hola'})
        assert public_status == 200 and public['data'].get('provider', 'local') == 'local'
        return result
    finally:
        status, _ = request(port, '/api/auth/logout', {}, token)
        assert status == 200


def main():
    bundle = Path(sys.argv[1]).resolve()
    os.umask(0o077)
    assert not RELEASE.exists(), 'Release path already exists; inspect before rerun'
    assert not OPS.exists(), 'Operations path already exists; inspect before rerun'
    current = inspect(OLD_CONTAINER)
    assert current['Image'] == EXPECTED_BASE and current['State']['Running']
    assert json.loads(run('docker', 'image', 'inspect', 'aisales-api:20261114c'))[0]['Id'] == EXPECTED_BASE
    assert KEY.is_file() and (KEY.stat().st_mode & 0o077) == 0
    config = VHOST.read_text()
    assert config.count('root ' + OLD_ROOT + ';') == 1
    private_before = private_snapshot()
    before_shape = db_shape(DATABASE)
    OPS.mkdir(parents=True, mode=0o700)
    (OPS/'nginx-before.conf').write_text(config)
    (OPS/'before.json').write_text(json.dumps({'v5': private_before, 'database': before_shape}, indent=2))
    backup = OPS/'academy-before.sqlite3'
    with sqlite3.connect(f'file:{DATABASE}?mode=ro', uri=True) as source, sqlite3.connect(backup) as destination:
        source.backup(destination)
    candidate_data = OPS/'candidate-data'
    candidate_data.mkdir(mode=0o700)
    shutil.copy2(backup, candidate_data/'academy.sqlite3')
    env = dict(line.split('=', 1) for line in current['Config']['Env'] if '=' in line)
    env.update(VCSA_DB_PATH='/data/academy.sqlite3', VCSA_CORS_ORIGINS='https://aisalesv1.softvibes.pro', VCSA_SMART_AGENT_PROVIDER='hermes',
               VCSA_COACH_HERMES_URL='http://127.0.0.1:18643/chat', VCSA_COACH_HERMES_KEY_FILE='/run/secrets/coach.key')
    assert all('\n' not in value for value in env.values())
    environment = OPS/'api.env'
    environment.write_text(''.join(name+'='+value+'\n' for name,value in env.items()))
    print('Building derived legacy image', flush=True)
    run('docker', 'build', '-t', IMAGE, '-f', str(bundle/'Dockerfile.api'), str(bundle))
    start_container(CANDIDATE, 18825, candidate_data, environment)
    try:
        wait_ready(18825)
        candidate_result = smoke(18825)
        assert candidate_result == 'hermes_answered', 'Remote Hermes was verified; candidate must complete inference before activation'
        assert db_shape(candidate_data/'academy.sqlite3') == before_shape
        print('Candidate API passed; '+candidate_result, flush=True)
    finally:
        run('docker', 'rm', '-f', CANDIDATE)
    shutil.copytree(OLD_ROOT, RELEASE/'web')
    shutil.copytree(bundle/'web/assets', RELEASE/'web/assets', dirs_exist_ok=True)
    for relative in ('index.html', 'pilot.html', 'academia/index.html', 'academia/pilot.html'):
        target=RELEASE/'web'/relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(bundle/'web/v1.html', target)
    # Web artifacts are public-readable; secrets and ops remain root-only.
    for root, dirs, files in os.walk(RELEASE):
        os.chmod(root, 0o755)
        for name in dirs: os.chmod(Path(root,name),0o755)
        for name in files: os.chmod(Path(root,name),0o644)
    activated = False
    try:
        run('docker', 'stop', '-t', '15', OLD_CONTAINER)
        start_container(NEW_CONTAINER, 18824, DATABASE.parent, environment)
        wait_ready(18824)
        live_result = smoke(18824)
        assert live_result == 'hermes_answered', 'Activation requires a real Hermes response through the tunnel'
        assert db_shape(DATABASE) == before_shape
        VHOST.write_text(config.replace('root '+OLD_ROOT+';', 'root '+str(RELEASE/'web')+';'))
        run('nginx', '-t')
        run('systemctl', 'reload', 'nginx')
        assert private_snapshot() == private_before, 'Private V5 changed'
        activated = True
        result = {'release': str(RELEASE), 'image': inspect(NEW_CONTAINER)['Image'], 'container': NEW_CONTAINER,
                  'candidate': candidate_result, 'live': live_result, 'databaseShapeUnchanged': True, 'v5Unchanged': True,
                  'htmlSha256': digest(RELEASE/'web/index.html'), 'backup': str(backup)}
        (OPS/'activation.json').write_text(json.dumps(result, indent=2))
        print(json.dumps(result, indent=2), flush=True)
    finally:
        if not activated:
            subprocess.run(['docker','rm','-f',NEW_CONTAINER],capture_output=True)
            run('docker','start',OLD_CONTAINER)
            VHOST.write_text(config)
            run('nginx','-t')
            run('systemctl','reload','nginx')
            print('Activation rolled back to previous V1', flush=True)


if __name__ == '__main__':
    main()
