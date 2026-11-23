"""Prepare a dedicated outbound SSH identity on the application VPS; never exports it."""
from pathlib import Path
import json
import os
import pwd
import subprocess
import sys

ACCOUNT = 'sa-coach-tunnel'
HOME = Path('/var/lib/salesacademy-coach-tunnel')
KEY = HOME / 'id_ed25519'
KNOWN_HOSTS = HOME / 'known_hosts'
REMOTE = '2.25.231.154'
HOST_FINGERPRINT = 'SHA256:60cjycbenLy0+xBtZOe3nPpGpu1aiMFj3r/595gGCIo'


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT, text=True).strip()


def main():
    if os.geteuid() != 0:
        raise SystemExit('Run as root on the application VPS')
    os.umask(0o077)
    public_host_key = Path(sys.argv[1])
    parts = public_host_key.read_text().strip().split()
    assert len(parts) >= 2 and parts[0] == 'ssh-ed25519', 'Expected ED25519 host key'
    assert HOST_FINGERPRINT in run('ssh-keygen', '-lf', str(public_host_key)), 'Untrusted remote host key'
    try:
        account = pwd.getpwnam(ACCOUNT)
        assert account.pw_dir == str(HOME), 'Unexpected existing account'
    except KeyError:
        run('useradd', '--system', '--user-group', '--home-dir', str(HOME), '--shell', '/usr/sbin/nologin', ACCOUNT)
        account = pwd.getpwnam(ACCOUNT)
    HOME.mkdir(mode=0o750, exist_ok=True)
    os.chown(HOME, 0, account.pw_gid)
    HOME.chmod(0o750)
    if not KEY.exists():
        run('ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-C', 'salesacademy-coach-v1-tunnel', '-f', str(KEY))
    # The private key never leaves this VPS. The service can read it but cannot
    # replace files in its root-owned home; the target restricts this key to one hop.
    os.chown(KEY, 0, account.pw_gid)
    KEY.chmod(0o640)
    public = Path(str(KEY) + '.pub')
    os.chown(public, 0, account.pw_gid)
    public.chmod(0o640)
    KNOWN_HOSTS.write_text(REMOTE + ' ' + parts[0] + ' ' + parts[1] + '\n')
    os.chown(KNOWN_HOSTS, 0, account.pw_gid)
    KNOWN_HOSTS.chmod(0o640)
    print(json.dumps({'sourcePrepared': True, 'account': ACCOUNT, 'keyGeneratedOnSourceOnly': True,
                      'keyFingerprint': run('ssh-keygen', '-lf', str(public)).split()[1],
                      'hostFingerprint': HOST_FINGERPRINT, 'secretValuesPrinted': False}))


if __name__ == '__main__':
    main()
