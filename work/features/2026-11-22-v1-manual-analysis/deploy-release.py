"""Verified V1 rollout; candidate data are synthetic and production is not cloned.

Usage: python3 deploy-release.py ARCHIVE SHA256 [--verify-only]
Run --verify-only anywhere; activation itself must run on the V1 VPS as root.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import os
import re
import shutil
import socket
import sqlite3
import subprocess
import tarfile
import tempfile
import urllib.error
import urllib.request
from uuid import uuid4

EXPECTED_BASE = 'sha256:fca7efccd615e61adde9c395893fe40125c767cb99a72936b210081ab4d66a00'
BASE_TAG = 'aisales-v1-api:20261122-tours'
OLD_CONTAINER = 'aisales-v1-tours-20261122'
NEW_CONTAINER = 'aisales-v1-manual-analysis-20261122'
CANDIDATE = 'aisales-v1-manual-analysis-candidate-20261122'
IMAGE = 'aisales-v1-api:20261122-manual-analysis'
OLD_ROOT = Path('/srv/aisales-v1-release-20261122-visit-modal/web')
RELEASE = Path('/srv/aisales-v1-release-20261122-manual-analysis')
OPS = Path('/srv/aisales-v1/ops/20261122-manual-analysis')
DEMO_ID = 'fdaef241-a407-40bd-a3fc-a2ed7fbe125d'
REQUIRED_FILES = {'Dockerfile.api', 'deploy-release.py', 'legacy_deploy.py', 'api/coach_hermes.py', 'web/v1.html'}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def unpack_verified(archive, expected, destination):
    assert re.fullmatch('[a-f0-9]{64}', expected) and digest(archive) == expected, 'Archive checksum mismatch'
    with tarfile.open(archive) as package:
        members = package.getmembers()
        names = [member.name.rstrip('/') for member in members]
        assert len(names) == len(set(names)), 'Duplicate archive entries'
        for member in members:
            path = Path(member.name)
            assert path.parts and path.parts[0] == 'bundle' and not path.is_absolute() and '..' not in path.parts
            assert member.isdir() or member.isfile(), 'Archive must not contain links or devices'
        package.extractall(destination, filter='data')
    bundle = destination / 'bundle'
    manifest = json.loads((bundle / 'manifest.json').read_text())
    assert isinstance(manifest, dict) and REQUIRED_FILES <= set(manifest), 'Incomplete release manifest'
    actual = {str(path.relative_to(bundle)) for path in bundle.rglob('*') if path.is_file()}
    assert actual == set(manifest) | {'manifest.json'}, 'Unlisted release files'
    for name, checksum in manifest.items():
        assert isinstance(name, str) and isinstance(checksum, str) and re.fullmatch('[a-f0-9]{64}', checksum)
        assert not Path(name).is_absolute() and '..' not in Path(name).parts
        assert name in REQUIRED_FILES or name.startswith('web/'), 'Unapproved backend/operator file'
        assert digest(bundle / name) == checksum, 'Release file checksum mismatch: ' + name
    assert digest(__file__) == manifest['deploy-release.py'], 'Invoke the operator matching this bundle'
    return bundle, manifest


def load_legacy(bundle):
    spec = importlib.util.spec_from_file_location('legacy_manual_release', bundle / 'legacy_deploy.py')
    legacy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(legacy)
    legacy.IMAGE = IMAGE
    return legacy


def request(port, route, payload=None, token=None, method=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(f'http://127.0.0.1:{port}{route}',
        data=json.dumps(payload).encode() if payload is not None else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        try:
            return error.code, json.load(error)
        finally:
            error.close()


def full_database_shape(legacy, database):
    result = legacy.db_shape(database)
    with sqlite3.connect(f'file:{database}?mode=ro', uri=True) as connection:
        schema = connection.execute("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type,name").fetchall()
    result['schema'] = hashlib.sha256(json.dumps(schema).encode()).hexdigest()
    return result


def demo_digest(database):
    with sqlite3.connect(f'file:{database}?mode=ro', uri=True) as connection:
        rows = {'visit': connection.execute('SELECT * FROM tour_visits WHERE id=?', (DEMO_ID,)).fetchall(),
                'analyses': connection.execute('SELECT * FROM tour_visit_analyses WHERE visit_id=? ORDER BY context_revision', (DEMO_ID,)).fetchall(),
                'requests': connection.execute('SELECT * FROM tour_visit_requests WHERE visit_id=? ORDER BY user_id,request_id', (DEMO_ID,)).fetchall()}
    assert len(rows['visit']) == 1 and rows['analyses'], 'Expected persistent demo is missing'
    return hashlib.sha256(json.dumps(rows, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def v5_snapshot(legacy):
    result = legacy.private_snapshot()
    result['startedAt'] = legacy.inspect('aisales-pilot-20261120-accounts-r2')['State']['StartedAt']
    assert result['containerId'] == 'bb6574ae827be1350f1a4bf931f9b001388dbf117fb2190683d0100fe2d938a8'
    assert result['image'] == 'sha256:c8f3fc47861568675f3a6a92ac00c1e2f0462f4409c3aed20b1216b3f9813556'
    assert result['running'] and result['startedAt'] == '2026-11-20T18:25:07.022636776Z'
    assert result['nginx'] == '2f0759d85abb98ec544c2dccbed1593206d61f78707beaf6c2a922786171da9d'
    assert result['html'] == '8295063c1ea548f99000a5004c32c60e300e6bab6cce43aba0018d116df18be4'
    return result


def maintenance_snapshot(legacy):
    paths = [Path('/opt/salesacademy-v1-tours/maintenance.py'),
             Path('/etc/systemd/system/salesacademy-v1-tours-maintenance.service'),
             Path('/etc/systemd/system/salesacademy-v1-tours-maintenance.timer')]
    assert EXPECTED_BASE in paths[1].read_text(), 'Maintenance image changed; inspect before deploy'
    assert legacy.run('systemctl', 'is-active', 'salesacademy-v1-tours-maintenance.timer') == 'active'
    assert legacy.run('systemctl', 'is-enabled', 'salesacademy-v1-tours-maintenance.timer') == 'enabled'
    return {str(path): digest(path) for path in paths}


def candidate_smoke(port):
    """Use only the new empty candidate DB; never run this against production."""
    assert port == 18825
    code, login = request(port, '/api/auth/login', {'email': 'rep@vcsa.local', 'password': 'demo123'})
    assert code == 200, 'Synthetic candidate login failed'
    token = login['data']['token']
    visit = None
    try:
        code, before = request(port, '/api/goalsheet/metrics', token=token)
        assert code == 200
        payload = {'request_id': str(uuid4()), 'intent': 'reflect', 'title': 'QA manual · bienvenida',
                   'scheduled_at': (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(),
                   'context': 'Escenario ficticio: expliqué la propuesta antes de confirmar prioridades.',
                   'feedback': {'happened': 'Práctica ficticia de bienvenida y descubrimiento.',
                                'worked': 'Escuché con calma.', 'improve_next': 'Preguntar antes de presentar.'}}
        code, created = request(port, '/api/tour-visits', payload, token)
        assert code == 201, 'Synthetic visit creation failed'
        visit = created['data']['visit']
        assert visit['revision'] == 1 and visit['analysis'] is None, 'Saving must not generate learning'
        contribution = 'Quiero practicar una pregunta abierta sobre sus vacaciones.'
        edit = {'request_id': str(uuid4()), 'expected_revision': 1, 'action': 'edit',
                'context': visit['context'] + '\n\nAporte para el análisis:\n' + contribution}
        code, changed = request(port, '/api/tour-visits/' + visit['id'], edit, token, 'PATCH')
        assert code == 200, 'Synthetic contribution save failed'
        visit = changed['data']['visit']
        assert visit['revision'] == 2 and visit['context'] == edit['context'] and visit['analysis'] is None
        code, replay = request(port, '/api/tour-visits/' + visit['id'], edit, token, 'PATCH')
        assert code == 200 and replay['data']['visit']['revision'] == 2, 'Contribution replay duplicated an edit'
        analysis_payload = {'expected_revision': 2, 'request_id': str(uuid4())}
        code, analyzed = request(port, '/api/tour-visits/' + visit['id'] + '/analysis', analysis_payload, token)
        assert code == 200, 'Real synthetic Hermes analysis failed'
        analysis = analyzed['data']['analysis']
        assert analysis['provider'] == 'hermes' and analysis['status'] == 'ready' and analysis['context_revision'] == 2
        limits = {'summary': 240, 'strengths': 180, 'improvement': 180, 'next_practice': 180}
        assert all(isinstance(analysis[field], str) and 0 < len(analysis[field]) <= limit for field, limit in limits.items())
        code, repeated = request(port, '/api/tour-visits/' + visit['id'] + '/analysis', analysis_payload, token)
        assert code == 200 and repeated['data']['analysis'] == analysis, 'Analysis replay changed the result'
        code, stored = request(port, '/api/tour-visits/' + visit['id'], token=token)
        assert code == 200 and stored['data']['visit']['context'] == edit['context']
        assert stored['data']['visit']['expires_at'] == created['data']['visit']['expires_at'], 'A contribution must not extend retention'
        code, after = request(port, '/api/goalsheet/metrics', token=token)
        assert code == 200 and after['data'] == before['data'], 'Visit must not change Goal Sheet metrics'
        return {'provider': 'hermes', 'revision': 2, 'analysis': analysis, 'savedWithoutAnalysis': True,
                'contributionReplayUnchanged': True, 'analysisReplayUnchanged': True, 'retentionUnchanged': True, 'goalSheetUnchanged': True}
    finally:
        try:
            if visit:
                # Refresh only our synthetic record before deleting it, including failures after PATCH.
                code, stored = request(port, '/api/tour-visits/' + visit['id'], token=token)
                assert code == 200, 'Synthetic visit refresh for cleanup failed'
                code, _ = request(port, '/api/tour-visits/' + visit['id'],
                                  {'expected_revision': stored['data']['visit']['revision'], 'request_id': str(uuid4())}, token, 'DELETE')
                assert code == 200, 'Synthetic visit cleanup failed'
        finally:
            code, _ = request(port, '/api/auth/logout', {}, token)
            assert code == 200, 'Synthetic candidate logout failed'


def install_web(bundle):
    web = RELEASE / 'web'
    shutil.copytree(OLD_ROOT, web)
    shutil.copytree(bundle / 'web', web, dirs_exist_ok=True)
    for relative in ('index.html', 'pilot.html', 'academia/index.html', 'academia/pilot.html'):
        target = web / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(bundle / 'web/v1.html', target)
    for root, directories, files in os.walk(RELEASE):
        os.chmod(root, 0o755)
        for name in directories:
            os.chmod(Path(root, name), 0o755)
        for name in files:
            os.chmod(Path(root, name), 0o644)


def activate(bundle, manifest, expected):
    legacy = load_legacy(bundle)
    assert not RELEASE.exists(), 'Release already exists; inspect before rerun'
    current = legacy.inspect(OLD_CONTAINER)
    assert current['Id'] == 'c1c8218d0e5f9695757d37841a5d04ff59b11aef79d4c09ffbcaeefd5786bfbf'
    assert current['Image'] == EXPECTED_BASE and current['State']['Running']
    assert current['State']['StartedAt'] == '2026-11-23T02:03:56.494379239Z'
    base = json.loads(legacy.run('docker', 'image', 'inspect', BASE_TAG))[0]
    assert base['Id'] == EXPECTED_BASE, 'Base image tag changed'
    existing_names = legacy.run('docker', 'ps', '-a', '--format', '{{.Names}}').splitlines()
    assert NEW_CONTAINER not in existing_names and CANDIDATE not in existing_names, 'Inspect existing candidate/new container first'
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 18825))
    assert legacy.KEY.is_file() and legacy.KEY.stat().st_mode & 0o077 == 0
    config = legacy.VHOST.read_text()
    assert config.count('root ' + str(OLD_ROOT) + ';') == 1, 'Unexpected active V1 web root'
    before = {'v5': v5_snapshot(legacy), 'database': full_database_shape(legacy, legacy.DATABASE),
              'demoSha256': demo_digest(legacy.DATABASE), 'maintenance': maintenance_snapshot(legacy)}
    (OPS / 'nginx-before.conf').write_text(config)
    (OPS / 'before.json').write_text(json.dumps(before, indent=2) + '\n')
    env = dict(line.split('=', 1) for line in current['Config']['Env'] if '=' in line)
    env.update(VCSA_DB_PATH='/data/academy.sqlite3', VCSA_CORS_ORIGINS='https://aisalesv1.softvibes.pro',
               VCSA_SMART_AGENT_PROVIDER='hermes', VCSA_COACH_HERMES_URL='http://127.0.0.1:18643/chat',
               VCSA_COACH_HERMES_KEY_FILE='/run/secrets/coach.key')
    assert all('\n' not in value and '\r' not in value for value in env.values())
    environment = OPS / 'api.env'
    environment.write_text(''.join(name + '=' + value + '\n' for name, value in env.items()))
    environment.chmod(0o600)
    print('Building derived V1 image; production data remain in place', flush=True)
    legacy.run('docker', 'build', '-t', IMAGE, '-f', str(bundle / 'Dockerfile.api'), str(bundle))
    new_image = json.loads(legacy.run('docker', 'image', 'inspect', IMAGE))[0]
    base_layers = base['RootFS']['Layers']
    assert new_image['RootFS']['Layers'][:len(base_layers)] == base_layers, 'New image must derive from pinned V1 base'
    candidate_data = OPS / 'candidate-data'
    candidate_data.mkdir(mode=0o700)
    candidate_started = False
    try:
        legacy.start_container(CANDIDATE, 18825, candidate_data, environment)
        candidate_started = True
        legacy.wait_ready(18825)
        assert legacy.inspect(CANDIDATE)['State']['Running'], 'Candidate process stopped during readiness'
        candidate_before = full_database_shape(legacy, candidate_data / 'academy.sqlite3')
        synthetic = candidate_smoke(18825)
        assert full_database_shape(legacy, candidate_data / 'academy.sqlite3') == candidate_before
        (OPS / 'candidate-synthetic.json').write_text(json.dumps(synthetic, ensure_ascii=False, indent=2) + '\n')
        print('Synthetic candidate passed real Hermes analysis and cleanup', flush=True)
    finally:
        if candidate_started:
            legacy.run('docker', 'rm', '-f', CANDIDATE)
        shutil.rmtree(candidate_data)
    # No backup/migration is needed: schema is unchanged and rollback reuses the current DB.
    assert full_database_shape(legacy, legacy.DATABASE) == before['database'], 'Production schema/accounts changed during preflight'
    assert demo_digest(legacy.DATABASE) == before['demoSha256']
    install_web(bundle)
    activated = False
    try:
        legacy.run('docker', 'stop', '-t', '15', OLD_CONTAINER)
        legacy.start_container(NEW_CONTAINER, 18824, legacy.DATABASE.parent, environment)
        legacy.wait_ready(18824)
        assert legacy.inspect(NEW_CONTAINER)['State']['Running'], 'Production process stopped during readiness'
        assert full_database_shape(legacy, legacy.DATABASE) == before['database'], 'Production schema/accounts changed'
        assert demo_digest(legacy.DATABASE) == before['demoSha256'], 'Persistent demo changed'
        legacy.VHOST.write_text(config.replace('root ' + str(OLD_ROOT) + ';', 'root ' + str(RELEASE / 'web') + ';'))
        legacy.run('nginx', '-t')
        legacy.run('systemctl', 'reload', 'nginx')
        assert v5_snapshot(legacy) == before['v5'], 'Private V5 changed'
        assert maintenance_snapshot(legacy) == before['maintenance'], 'Maintenance timer/image changed'
        result = {'release': str(RELEASE), 'root': str(RELEASE / 'web'), 'container': NEW_CONTAINER,
                  'image': legacy.inspect(NEW_CONTAINER)['Image'], 'candidate': 'hermes_answered', 'live': 'ready',
                  'archiveSha256': expected, 'filesVerified': len(manifest), 'htmlSha256': digest(RELEASE / 'web/index.html'),
                  'databaseShapeUnchanged': True, 'persistentDemoUnchanged': True, 'demoSha256': before['demoSha256'],
                  'v5Unchanged': True, 'maintenanceUnchanged': True, 'productionDatabaseCopied': False,
                  'candidateDataRemoved': not candidate_data.exists(), 'rollbackConfig': str(OPS / 'nginx-before.conf')}
        (OPS / 'activation.json').write_text(json.dumps(result, indent=2) + '\n')
        activated = True
        print(json.dumps(result, indent=2), flush=True)
    finally:
        if not activated:
            subprocess.run(['docker', 'rm', '-f', NEW_CONTAINER], capture_output=True, check=False)
            legacy.run('docker', 'start', OLD_CONTAINER)
            legacy.wait_ready(18824)
            legacy.VHOST.write_text(config)
            legacy.run('nginx', '-t')
            legacy.run('systemctl', 'reload', 'nginx')
            assert legacy.inspect(OLD_CONTAINER)['State']['Running'], 'Previous V1 did not resume'
            assert legacy.VHOST.read_text() == config, 'Rollback did not restore the previous web root'
            assert v5_snapshot(legacy) == before['v5'] and maintenance_snapshot(legacy) == before['maintenance']
            print('Activation rolled back to previous V1; database was not restored', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('sha256')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    if args.verify_only:
        with tempfile.TemporaryDirectory(prefix='sa-manual-verify-') as directory:
            _, manifest = unpack_verified(args.archive, args.sha256, Path(directory))
            print(json.dumps({'archiveVerified': True, 'filesVerified': len(manifest), 'activationAttempted': False}))
        return
    assert os.geteuid() == 0, 'Activation must run as root on the V1 VPS'
    assert not OPS.exists(), 'Operations path exists; inspect evidence before rerun'
    OPS.mkdir(parents=True, mode=0o700)
    bundle, manifest = unpack_verified(args.archive, args.sha256, OPS)
    activate(bundle, manifest, args.sha256)


if __name__ == '__main__':
    main()
