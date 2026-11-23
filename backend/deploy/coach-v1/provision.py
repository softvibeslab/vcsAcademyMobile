"""Install only the isolated Coach bridge on the Sales Academy VPS as root."""
from pathlib import Path
import json
import os
import pwd
import secrets
import shutil
import subprocess

BASE = Path('/opt/salesacademy-coach-v1')
STATE = Path('/var/lib/salesacademy-coach-v1')
ETC = Path('/etc/salesacademy-coach-v1')
PROFILE = STATE / '.hermes/profiles/sales-academy-coach-v1'
UNITS = Path('/etc/systemd/system')
PYTHON = Path('/opt/salesacademy-advisor/venv/bin/python')
ACCOUNT = 'sa-coach-v1'


def command(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def write_file(path, content, mode=0o600, group=0):
    path.write_text(content)
    path.chmod(mode)
    os.chown(path, 0, group)


def main():
    if os.geteuid() != 0:
        raise SystemExit('Run on the VPS as root')
    export_mode = os.environ.get('COACH_EXPORT_MODE', 'copy')
    credential_python = Path(os.environ.get('COACH_CREDENTIAL_PYTHON', '/usr/bin/python3'))
    hermes_code = Path(os.environ.get('COACH_HERMES_CODE', '/usr/local/lib/hermes-agent'))
    auth_code = Path(os.environ.get('COACH_AUTH_CODE', '/usr/local/lib/hermes-agent'))
    auth_bootstrap = os.environ.get('COACH_AUTH_BOOTSTRAP', '0')
    if export_mode not in {'copy', 'hermes'} or auth_bootstrap not in {'0', '1'}:
        raise SystemExit('Unexpected runtime configuration')
    if not PYTHON.is_file() or not credential_python.is_file() or not hermes_code.is_dir():
        raise SystemExit('Existing Hermes runtime must be available')
    if export_mode == 'copy' and not Path('/etc/salesacademy-advisor/provider.json').is_file():
        raise SystemExit('Existing minimized provider export must be available')
    if export_mode == 'hermes' and not auth_code.is_dir():
        raise SystemExit('Authoritative Hermes runtime must be available')
    try:
        account = pwd.getpwnam(ACCOUNT)
        if account.pw_dir != str(STATE):
            raise SystemExit('Unexpected service account')
    except KeyError:
        command(['useradd', '--system', '--user-group', '--home-dir', str(STATE), '--shell', '/usr/sbin/nologin', ACCOUNT])
        account = pwd.getpwnam(ACCOUNT)
    BASE.mkdir(mode=0o755, exist_ok=True)
    STATE.mkdir(mode=0o750, exist_ok=True)
    ETC.mkdir(mode=0o750, exist_ok=True)
    for directory in (STATE, ETC):
        os.chown(directory, 0, account.pw_gid)
        directory.chmod(0o750)
    source = Path(__file__).resolve().parent
    for name in ('bridge.py', 'worker.py', 'export_provider.py', 'SOUL.md', 'verify_bridge.py'):
        if source / name != BASE / name:
            shutil.copyfile(source / name, BASE / name)
        os.chown(BASE / name, 0, 0)
        (BASE / name).chmod(0o644)
    # Only a minimized access export reaches the non-root bridge. The existing
    # advisor service and root authentication store remain separate.
    command([str(credential_python), '-I', str(BASE / 'export_provider.py')])
    provider = json.loads((ETC / 'provider.json').read_text())
    for directory in (STATE / '.hermes', STATE / '.hermes/profiles', PROFILE):
        directory.mkdir(mode=0o750, exist_ok=True)
        os.chown(directory, 0, account.pw_gid)
        directory.chmod(0o750)
    config = {
        'model': {'default': provider['model'], 'provider': provider['provider'], 'base_url': provider['base_url'], 'max_tokens': 1200},
        'agent': {'max_iterations': 1, 'reasoning_effort': 'low'},
        'memory': {'memory_enabled': False, 'user_profile_enabled': False, 'provider': '', 'flush_min_turns': 0},
        'sessions': {'write_json_snapshots': False},
        'platform_toolsets': {'api_server': [], 'cli': []}, 'mcp_servers': {}, 'hooks': {},
    }
    # JSON is valid YAML; no additional provisioner dependency is necessary.
    write_file(PROFILE / 'config.yaml', json.dumps(config, ensure_ascii=False, indent=2), 0o640, account.pw_gid)
    write_file(PROFILE / 'SOUL.md', (BASE / 'SOUL.md').read_text(), 0o640, account.pw_gid)
    write_file(PROFILE / '.no-bundled-skills', '', 0o640, account.pw_gid)
    key_path = ETC / 'client.key'
    key = key_path.read_text().strip() if key_path.exists() else secrets.token_urlsafe(48)
    if len(key) < 32 or any(character.isspace() for character in key):
        raise SystemExit('Unexpected bridge key')
    write_file(key_path, key + '\n')
    write_file(ETC / 'bridge.env', 'COACH_BRIDGE_KEY=' + key + '\n')
    write_file(ETC / 'client.env', 'VCSA_SMART_AGENT_PROVIDER=hermes\nVCSA_COACH_HERMES_URL=http://127.0.0.1:18643/chat\nVCSA_COACH_HERMES_KEY_FILE=/run/secrets/coach.key\n')
    bridge_unit = f'''[Unit]
Description=Sales Academy V1 isolated Hermes Coach bridge
After=network-online.target salesacademy-coach-v1-credential.service
Wants=network-online.target
Requires=salesacademy-coach-v1-credential.service
[Service]
Type=simple
User={ACCOUNT}
Group={ACCOUNT}
WorkingDirectory={BASE}
Environment=HERMES_HOME={PROFILE}
Environment=COACH_PROFILE_HOME={PROFILE}
Environment=COACH_PROVIDER_FILE={ETC}/provider.json
Environment=COACH_HERMES_CODE={hermes_code}
Environment=PYTHONDONTWRITEBYTECODE=1
Environment=PYTHONUNBUFFERED=1
EnvironmentFile={ETC}/bridge.env
ExecStart={PYTHON} {BASE}/bridge.py
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
MemoryMax=1G
TasksMax=100
[Install]
WantedBy=multi-user.target
'''
    export_unit = f'''[Unit]
Description=Copy existing minimal inference export for Sales Academy V1 Coach
After=salesacademy-advisor-credential.service
[Service]
Type=oneshot
User=root
Environment=COACH_EXPORT_MODE={export_mode}
Environment=COACH_AUTH_CODE={auth_code}
Environment=COACH_AUTH_BOOTSTRAP={auth_bootstrap}
Environment=HERMES_HOME=/root/.hermes
ExecStart={credential_python} -I {BASE}/export_provider.py
UMask=0077
TimeoutStartSec=10
NoNewPrivileges=true
PrivateTmp=true
'''
    timer = '''[Unit]
Description=Maintain isolated Sales Academy V1 inference export
[Timer]
OnBootSec=75
OnUnitActiveSec=300
Persistent=true
Unit=salesacademy-coach-v1-credential.service
[Install]
WantedBy=timers.target
'''
    write_file(UNITS / 'salesacademy-coach-v1.service', bridge_unit, 0o644)
    write_file(UNITS / 'salesacademy-coach-v1-credential.service', export_unit, 0o644)
    write_file(UNITS / 'salesacademy-coach-v1-credential.timer', timer, 0o644)
    command(['systemd-analyze', 'verify', str(UNITS / 'salesacademy-coach-v1.service'), str(UNITS / 'salesacademy-coach-v1-credential.service'), str(UNITS / 'salesacademy-coach-v1-credential.timer')])
    command(['systemctl', 'daemon-reload'])
    command(['systemctl', 'start', 'salesacademy-coach-v1-credential.service'])
    command(['systemctl', 'enable', '--now', 'salesacademy-coach-v1-credential.timer'])
    command(['systemctl', 'enable', 'salesacademy-coach-v1.service'])
    command(['systemctl', 'restart', 'salesacademy-coach-v1.service'])
    print(json.dumps({'profile': str(PROFILE), 'bridge': 'http://127.0.0.1:18643/chat', 'keyFile': str(key_path), 'service': 'salesacademy-coach-v1.service', 'providerReauthenticated': False, 'existingServicesChanged': False, 'secretValuesPrinted': False}))


if __name__ == '__main__':
    main()
