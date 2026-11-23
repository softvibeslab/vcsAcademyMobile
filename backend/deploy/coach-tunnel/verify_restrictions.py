"""Live checks on the source VPS using only the newly restricted service identity."""
import json
from pathlib import Path
import subprocess

ACCOUNT = 'sa-coach-tunnel'
HOME = Path('/var/lib/salesacademy-coach-tunnel')
HOST = ACCOUNT + '@2.25.231.154'
BASE = ['runuser', '-u', ACCOUNT, '--', '/usr/bin/ssh', '-F', '/dev/null', '-i', str(HOME/'id_ed25519'),
        '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'IdentityAgent=none',
        '-o', 'UserKnownHostsFile=' + str(HOME/'known_hosts'), '-o', 'GlobalKnownHostsFile=/dev/null',
        '-o', 'StrictHostKeyChecking=yes', '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'ConnectTimeout=8']


def call(arguments, data=None):
    return subprocess.run(BASE + arguments, input=data, capture_output=True, text=True, timeout=12)


def main():
    checks = {}
    allowed = call(['-W', '127.0.0.1:18643', HOST], 'GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n')
    checks['permittedDestinationAccessible'] = allowed.returncode == 0 and '200 OK' in allowed.stdout and 'sales-academy-coach-v1' in allowed.stdout
    command = call(['-T', HOST, 'id'])
    checks['commandSessionRejected'] = command.returncode != 0 and 'uid=' not in command.stdout and 'channel 0: open failed:' in command.stderr.lower()
    denied = call(['-W', '127.0.0.1:22', HOST])
    checks['otherDestinationRejected'] = denied.returncode != 0 and 'administratively prohibited' in denied.stderr.lower()
    reverse = call(['-NT', '-o', 'ExitOnForwardFailure=yes', '-R', '127.0.0.1:18646:127.0.0.1:18643', HOST])
    checks['remoteForwardRejected'] = reverse.returncode != 0 and 'forwarding failed' in reverse.stderr.lower()
    tty = call(['-tt', HOST, 'id'])
    checks['ptySessionRejected'] = tty.returncode != 0 and 'uid=' not in tty.stdout and 'channel 0: open failed:' in tty.stderr.lower()
    report = {'checks': checks, 'passed': all(checks.values()), 'keyNeverExported': True, 'secretValuesPrinted': False}
    print(json.dumps(report, indent=2))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
