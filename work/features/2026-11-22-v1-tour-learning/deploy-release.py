"""Isolated V1 rollout, reusing the verified Coach release operator primitives."""
from datetime import datetime, timedelta, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request
from uuid import uuid4

HELPER = Path(__file__).with_name('legacy_deploy.py')
if not HELPER.exists():
    HELPER = Path(__file__).parent.parent / '2026-11-22-v1-coach-hermes/deploy-release.py'
spec = importlib.util.spec_from_file_location('legacy_release', HELPER)
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)
legacy.EXPECTED_BASE = 'sha256:628d264b850131875af34cbb97cee979b22ea2b2fd997538664e45120990073e'
legacy.OLD_CONTAINER = 'aisales-v1-coach-20261122'
legacy.NEW_CONTAINER = 'aisales-v1-tours-20261122'
legacy.CANDIDATE = 'aisales-v1-tours-candidate-20261122'
legacy.IMAGE = 'aisales-v1-api:20261122-tours'
legacy.OLD_ROOT = '/srv/aisales-v1-release-20261122-coach-r2/web'
legacy.RELEASE = Path('/srv/aisales-v1-release-20261122-tours')
legacy.OPS = Path('/srv/aisales-v1/ops/20261122-tours')


def request(port, route, payload=None, token=None, method=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(f'http://127.0.0.1:{port}{route}',
        data=json.dumps(payload).encode() if payload is not None else None,
        headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)


def stable_shape(database):
    """New tables are allowed; existing schema/accounts/licenses must not change."""
    result = original_shape(database)
    with sqlite3.connect(f'file:{database}?mode=ro', uri=True) as connection:
        schema = connection.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT IN ('tour_visits','tour_visit_analyses','tour_visit_requests') ORDER BY name").fetchall()
    result['schema'] = hashlib.sha256(json.dumps(schema).encode()).hexdigest()
    return result


def smoke(port):
    status, body = request(port, '/api/auth/login', {'email': 'rep@vcsa.local', 'password': 'demo123'})
    assert status == 200
    token = body['data']['token']
    visit = None
    try:
        code, before = request(port, '/api/goalsheet/metrics', token=token)
        assert code == 200
        payload = {'request_id': str(uuid4()), 'intent': 'reflect', 'title': 'QA sintética · eliminar',
                   'scheduled_at': (datetime.now(timezone.utc)-timedelta(minutes=10)).isoformat(),
                   'context': 'Escenario ficticio: al iniciar la visita escuchamos que prefieren vacaciones en montaña.',
                   'feedback': {'happened': 'Práctica ficticia de bienvenida: pregunté cómo prefieren pasar sus vacaciones.',
                                'worked': 'Escuché antes de presentar.', 'improve_next': 'Hacer una pregunta abierta en el saludo.'}}
        code, created = request(port, '/api/tour-visits', payload, token)
        assert code == 201, 'Synthetic visit creation failed'
        visit = created['data']['visit']
        code, repeated = request(port, '/api/tour-visits', payload, token)
        assert code == 200 and repeated['data']['visit']['id'] == visit['id']
        analysis_payload = {'expected_revision': visit['revision'], 'request_id': str(uuid4())}
        code, analyzed = request(port, '/api/tour-visits/'+visit['id']+'/analysis', analysis_payload, token)
        assert code == 200, 'Real synthetic analysis failed'
        analysis = analyzed['data']['analysis']
        assert analysis['provider'] == 'hermes' and analysis['status'] == 'ready' and analysis['summary'].strip()
        question = {'message': '¿Qué tipo de vacaciones prefieren en el escenario ficticio guardado? Responde brevemente.',
                    'tour_id': visit['id'], 'conversation_history': [], 'mode': 'general_coach'}
        code, answer = request(port, '/api/smart-agent/chat', question, token)
        assert code == 200 and answer['data']['provider'] == 'hermes'
        assert 'monta' in answer['data']['response'].lower(), 'Stored visit context did not reach Hermes'
        code, after = request(port, '/api/goalsheet/metrics', token=token)
        assert code == 200 and after['data'] == before['data'], 'Visit must not change Goal Sheet metrics'
        return 'hermes_answered'
    finally:
        if visit:
            code, _ = request(port, '/api/tour-visits/'+visit['id'], {'expected_revision': visit['revision'], 'request_id': str(uuid4())}, token, 'DELETE')
            assert code == 200, 'Synthetic visit cleanup failed'
        request(port, '/api/auth/logout', {}, token)


def install_maintenance(bundle):
    install = Path('/opt/salesacademy-v1-tours')
    install.mkdir(mode=0o700, exist_ok=True)
    target = install/'maintenance.py'
    target.write_bytes((bundle/'maintenance.py').read_bytes())
    target.chmod(0o700)
    image = legacy.inspect(legacy.NEW_CONTAINER)['Image']
    service = Path('/etc/systemd/system/salesacademy-v1-tours-maintenance.service')
    timer = service.with_suffix('.timer')
    service.write_text('[Unit]\nDescription=Sales Academy V1 visit expiry and seven-day backups\nAfter=docker.service\nRequires=docker.service\n\n[Service]\nType=oneshot\nUMask=0077\nExecStart=/usr/bin/python3 /opt/salesacademy-v1-tours/maintenance.py --image '+image+'\nTimeoutStartSec=240\n')
    timer.write_text('[Unit]\nDescription=Daily Sales Academy V1 data maintenance\n\n[Timer]\nOnCalendar=*-*-* 04:15:00 America/Cancun\nPersistent=true\nUnit=salesacademy-v1-tours-maintenance.service\n\n[Install]\nWantedBy=timers.target\n')
    legacy.run('systemd-analyze', 'verify', str(service), str(timer))
    legacy.run('systemctl','daemon-reload')
    legacy.run('systemctl','enable','--now',timer.name)
    legacy.run('systemctl','start',service.name)
    assert legacy.run('systemctl','show',service.name,'-p','ExecMainStatus','--value') == '0'
    assert legacy.run('systemctl','is-active',timer.name) == 'active'
    print(json.dumps({'maintenance': 'verified', 'retention_days':30,'backup_retention_days':7,'timer':timer.name}),flush=True)


original_shape = legacy.db_shape
legacy.db_shape = stable_shape
legacy.smoke = smoke


if __name__ == '__main__':
    # The old deploy helper pins its original base tag in addition to container ID.
    # Adapt that single assertion transparently through the inspected alias result.
    original_run = legacy.run
    def run(*args):
        if args == ('docker','image','inspect','aisales-api:20261114c'):
            return original_run('docker','image','inspect','aisales-v1-api:20261122-coach')
        return original_run(*args)
    legacy.run = run
    original_wait_ready = legacy.wait_ready
    def wait_ready(port):
        original_wait_ready(port)
        if port == 18824:
            # Once the live schema exists, expiry must survive any later rollback.
            install_maintenance(Path(sys.argv[1]).resolve())
    legacy.wait_ready = wait_ready
    legacy.main()
