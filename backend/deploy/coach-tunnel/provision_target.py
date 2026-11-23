"""Authorize exactly one source key for local TCP forwarding to the private Coach."""
from pathlib import Path
import json
import os
import pwd
import subprocess
import sys

ACCOUNT = 'sa-coach-tunnel'
HOME = Path('/var/lib/salesacademy-coach-tunnel')
CONFIG = Path('/etc/ssh/sshd_config')
SCOPED = Path('/etc/ssh/sshd_config.coach-v1')
OPS = Path('/var/lib/salesacademy-coach-tunnel-ops')
INCLUDE = 'Include /etc/ssh/sshd_config.coach-v1'
SOURCE = '76.13.231.12'


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT, text=True).strip()


def policy(user):
    return run('/usr/sbin/sshd', '-T', '-C', f'user={user},host=salesmastersminds,addr={SOURCE}')


def main():
    if os.geteuid() != 0:
        raise SystemExit('Run as root on the Hermes VPS')
    os.umask(0o077)
    public_key = Path(sys.argv[1])
    parts = public_key.read_text().strip().split()
    assert len(parts) >= 2 and parts[0] == 'ssh-ed25519', 'Expected source public key'
    fingerprint = run('ssh-keygen', '-lf', str(public_key)).split()[1]
    try:
        account = pwd.getpwnam(ACCOUNT)
        assert account.pw_dir == str(HOME), 'Unexpected existing account'
    except KeyError:
        run('useradd', '--system', '--user-group', '--home-dir', str(HOME), '--shell', '/usr/sbin/nologin', ACCOUNT)
        account = pwd.getpwnam(ACCOUNT)
    HOME.mkdir(mode=0o755, exist_ok=True)
    os.chown(HOME, 0, 0)
    HOME.chmod(0o755)
    directory = HOME / '.ssh'
    directory.mkdir(mode=0o700, exist_ok=True)
    os.chown(directory, account.pw_uid, account.pw_gid)
    directory.chmod(0o700)
    authorized = directory / 'authorized_keys'
    authorized.write_text(f'from="{SOURCE}",restrict,port-forwarding,permitopen="127.0.0.1:18643",command="/usr/sbin/nologin" ' + parts[0] + ' ' + parts[1] + ' salesacademy-coach-v1-tunnel\n')
    os.chown(authorized, account.pw_uid, account.pw_gid)
    authorized.chmod(0o600)
    OPS.mkdir(mode=0o700, exist_ok=True)
    original = CONFIG.read_text()
    old_scope = SCOPED.read_text() if SCOPED.exists() else None
    before_root = policy('root')
    before_other = policy('nobody')
    if not (OPS / 'sshd_config.before').exists():
        (OPS / 'sshd_config.before').write_text(original)
        (OPS / 'root-policy.before').write_text(before_root)
        (OPS / 'other-policy.before').write_text(before_other)
    scoped = f'''# This Match is included at EOF, after global sshd directives.
Match User {ACCOUNT}
    AuthenticationMethods publickey
    PubkeyAuthentication yes
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    AllowTcpForwarding local
    AllowStreamLocalForwarding no
    PermitOpen 127.0.0.1:18643
    PermitListen none
    AllowAgentForwarding no
    X11Forwarding no
    PermitTTY no
    PermitUserRC no
    PermitTunnel no
    GatewayPorts no
    ForceCommand /usr/sbin/nologin
    MaxSessions 0
'''
    try:
        SCOPED.write_text(scoped)
        SCOPED.chmod(0o644)
        if INCLUDE not in original.splitlines():
            CONFIG.write_text(original.rstrip() + '\n\n# Sales Academy V1: dedicated forwarding account only.\n' + INCLUDE + '\n')
        run('/usr/sbin/sshd', '-t')
        assert policy('root') == before_root and policy('nobody') == before_other, 'Unrelated SSH policy changed'
        effective = dict(line.split(' ', 1) for line in policy(ACCOUNT).splitlines() if ' ' in line)
        expected = {'authenticationmethods': 'publickey', 'pubkeyauthentication': 'yes', 'passwordauthentication': 'no',
                    'kbdinteractiveauthentication': 'no', 'allowtcpforwarding': 'local', 'allowstreamlocalforwarding': 'no',
                    'permitopen': '127.0.0.1:18643', 'permitlisten': 'none', 'allowagentforwarding': 'no',
                    'x11forwarding': 'no', 'permittty': 'no', 'permituserrc': 'no', 'permittunnel': 'no',
                    'gatewayports': 'no', 'forcecommand': '/usr/sbin/nologin', 'maxsessions': '0'}
        for key, value in expected.items():
            assert effective.get(key) == value, f'Unexpected tunnel policy: {key}'
        run('systemctl', 'reload', 'ssh.service')
        report = {'targetPrepared': True, 'account': ACCOUNT, 'keyFingerprint': fingerprint,
                  'sourceRestriction': SOURCE, 'effectivePolicy': expected, 'rootPolicyUnchanged': True,
                  'otherPolicyUnchanged': True, 'configValidated': True, 'secretValuesPrinted': False}
        (OPS / 'target-policy.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))
    except Exception:
        CONFIG.write_text(original)
        if old_scope is None:
            SCOPED.unlink(missing_ok=True)
        else:
            SCOPED.write_text(old_scope)
        run('/usr/sbin/sshd', '-t')
        run('systemctl', 'reload', 'ssh.service')
        raise


if __name__ == '__main__':
    main()
