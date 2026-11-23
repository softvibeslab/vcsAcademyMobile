"""Stage, activate or roll back the application VPS's private Coach SSH tunnel."""
from pathlib import Path
import json
import os
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

ACCOUNT = 'sa-coach-tunnel'
HOME = Path('/var/lib/salesacademy-coach-tunnel')
OPS = Path('/var/lib/salesacademy-coach-tunnel-ops')
UNITS = Path('/etc/systemd/system')
REMOTE = '2.25.231.154'
UNIT = 'salesacademy-coach-v1-tunnel.service'
STAGE = 'salesacademy-coach-v1-tunnel-stage.service'
OLD = 'salesacademy-coach-v1.service'
OLD_TIMER = 'salesacademy-coach-v1-credential.timer'
KEY = Path('/etc/salesacademy-coach-v1/client.key')


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT, text=True).strip()


def state(unit):
    values = run('systemctl', 'show', '-p', 'ActiveState,UnitFileState', unit)
    return dict(line.split('=', 1) for line in values.splitlines())


def unit_text(port):
    return f'''[Unit]
Description=Sales Academy V1 private SSH transport to Hermes
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=0
[Service]
Type=simple
User={ACCOUNT}
Group={ACCOUNT}
ExecStart=/usr/bin/ssh -F /dev/null -NT -i {HOME}/id_ed25519 -o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none -o UserKnownHostsFile={HOME}/known_hosts -o GlobalKnownHostsFile=/dev/null -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=ssh-ed25519 -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o ConnectTimeout=10 -o ControlMaster=no -o ControlPath=none -o ForwardAgent=no -o RequestTTY=no -o LogLevel=ERROR -L 127.0.0.1:{port}:127.0.0.1:18643 {ACCOUNT}@{REMOTE}
Restart=always
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
CapabilityBoundingSet=
MemoryMax=96M
TasksMax=24
[Install]
WantedBy=multi-user.target
'''


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *_args):
        return None


def probe(port, infer=False):
    opener = build_opener(ProxyHandler({}), NoRedirect())
    url = f'http://127.0.0.1:{port}'
    for _ in range(15):
        try:
            with opener.open(url + '/health', timeout=3) as response:
                body = json.load(response)
                if response.status == 200 and body.get('profile') == 'sales-academy-coach-v1':
                    break
        except (OSError, ValueError, URLError):
            time.sleep(1)
    else:
        raise RuntimeError('Private tunnel did not reach the Coach bridge')
    result = {'port': port, 'health': True, 'profile': body['profile'], 'inferenceTested': infer}
    # Prove the shared Bearer reaches the remote bridge without consuming model
    # calls while the titular is completing authentication.
    headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY.read_text().strip()}
    invalid = Request(url + '/chat', data=json.dumps({'messages': [{'role': 'tool', 'content': 'Synthetic transport check'}]}).encode(), headers=headers)
    try:
        opener.open(invalid, timeout=5)
        raise RuntimeError('Bridge accepted a prohibited role')
    except HTTPError as error:
        payload = json.load(error)
        assert error.code == 400 and payload.get('error', {}).get('code') == 'invalid_role', 'Tunnel key or protocol mismatch'
    result['authenticatedTransport'] = True
    if infer:
        body = {'messages': [{'role': 'user', 'content': 'Prueba sintética de conexión: dame una pregunta breve para escuchar una objeción sin presionar.'}]}
        headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY.read_text().strip()}
        request = Request(url + '/chat', data=json.dumps(body).encode(), headers=headers)
        started = time.monotonic()
        try:
            with opener.open(request, timeout=35) as response:
                reply = json.load(response)
                assert response.status == 200 and isinstance(reply.get('reply'), str) and reply['reply'].strip()
                result.update(inferenceAvailable=True, httpStatus=200)
        except HTTPError as error:
            payload = json.load(error)
            assert error.code == 503 and payload.get('error', {}).get('code') == 'coach_unavailable', 'Tunnel authentication/transport failed'
            result.update(inferenceAvailable=False, httpStatus=503, errorCode='coach_unavailable')
        result['elapsedSeconds'] = round(time.monotonic() - started, 2)
    return result


def install_unit(name, port):
    path = UNITS / name
    path.write_text(unit_text(port))
    path.chmod(0o644)
    run('systemd-analyze', 'verify', str(path))
    run('systemctl', 'daemon-reload')


def listener(port):
    text = run('ss', '-ltnp', f'sport = :{port}')
    assert f'127.0.0.1:{port}' in text and '"ssh"' in text, 'Expected only SSH loopback listener'
    assert '0.0.0.0:' + str(port) not in text and '[::]:' + str(port) not in text
    return {'loopbackOnly': True, 'process': 'ssh', 'port': port}


def rollback():
    snapshot = json.loads((OPS / 'source-before.json').read_text())
    subprocess.run(['systemctl', 'disable', '--now', UNIT], capture_output=True)
    subprocess.run(['systemctl', 'stop', STAGE], capture_output=True)
    for name in (OLD, OLD_TIMER):
        previous = snapshot[name]
        if previous.get('UnitFileState') == 'enabled':
            run('systemctl', 'enable', name)
        if previous.get('ActiveState') == 'active':
            run('systemctl', 'start', name)
    return {'rolledBack': True, 'previousBridge': state(OLD), 'previousTimer': state(OLD_TIMER)}


def main():
    if os.geteuid() != 0:
        raise SystemExit('Run as root on the application VPS')
    os.umask(0o077)
    OPS.mkdir(mode=0o700, exist_ok=True)
    phase = sys.argv[1]
    if phase == 'stage':
        if not (OPS / 'source-before.json').exists():
            (OPS / 'source-before.json').write_text(json.dumps({OLD: state(OLD), OLD_TIMER: state(OLD_TIMER)}, indent=2))
        install_unit(STAGE, 18644)
        run('systemctl', 'restart', STAGE)
        result = {'stage': probe(18644, infer=True), 'listener': listener(18644), 'oldBridgeUntouched': state(OLD)['ActiveState'] == 'active'}
    elif phase == 'activate':
        assert (OPS / 'source-before.json').exists(), 'Stage before activation'
        probe(18644)
        install_unit(UNIT, 18643)
        try:
            run('systemctl', 'stop', OLD)
            run('systemctl', 'enable', '--now', UNIT)
            result = {'active': probe(18643), 'listener': listener(18643)}
            assert run('systemctl', 'show', '-p', 'User', '--value', UNIT) == ACCOUNT
            run('systemctl', 'disable', OLD)
            run('systemctl', 'disable', '--now', OLD_TIMER)
            run('systemctl', 'stop', STAGE)
            result.update(nonRootService=True, oldBridgeDisabled=True, oldDedicatedTimerDisabled=True, rollback='python3 tunnel_service.py rollback')
        except Exception:
            rollback()
            raise
    elif phase == 'rollback':
        result = rollback()
    else:
        raise SystemExit('Expected stage, activate or rollback')
    (OPS / (phase + '.json')).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
