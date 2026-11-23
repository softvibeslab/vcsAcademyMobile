"""Publish responsive Agenda static files without restarting either API.

Usage: python3 publish-web.py ARCHIVE SHA256 [--verify-only]
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tarfile
import tempfile

OPS = Path('/srv/aisales-v1/ops/20261122-responsive-agenda')
OLD = Path('/srv/aisales-v1-release-20261122-manual-analysis/web')
NEW = Path('/srv/aisales-v1-release-20261122-responsive-agenda/web')
VHOST = Path('/etc/nginx/sites-available/aisalesv1.softvibes.pro.conf')
V1_CONTAINER = 'aisales-v1-manual-analysis-20261122'
V1_IMAGE = 'sha256:ed2da844f2d1588dff0e0dcc687e6ffb1587f42f0cfba33cf43636b13817830d'
V5_CONTAINER = 'aisales-pilot-20261120-accounts-r2'


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT, text=True).strip()


def baseline():
    result = {
        'v5html': digest('/srv/aisales-release-20261120-role-accounts/web/index.html'),
        'v5nginx': digest('/etc/nginx/sites-available/aisales.softvibes.pro.conf'),
        'containers': {},
    }
    for name in (V1_CONTAINER, V5_CONTAINER):
        value = json.loads(run('docker', 'inspect', name))[0]
        assert value['State']['Running'], 'Expected API is not running'
        if name == V1_CONTAINER:
            assert value['Image'] == V1_IMAGE, 'Active V1 image changed; inspect before publishing'
            assert value['Id'] == '15c7f3e29918cc32b0ec5c10516173728d31be2593c6518da2e42d43b95d4d80', 'Active V1 container changed'
            assert value['State']['StartedAt'] == '2026-11-23T04:16:37.04046738Z', 'Active V1 was restarted; inspect before publishing'
        result['containers'][name] = {
            'id': value['Id'], 'image': value['Image'],
            'running': value['State']['Running'], 'startedAt': value['State']['StartedAt'],
        }
    return result


def unpack_verified(archive, expected, destination):
    assert re.fullmatch('[a-f0-9]{64}', expected) and digest(archive) == expected, 'Archive checksum mismatch'
    with tarfile.open(archive) as package:
        members = package.getmembers()
        names = [member.name.rstrip('/') for member in members]
        assert len(names) == len(set(names)), 'Duplicate archive entries'
        for member in members:
            path = Path(member.name)
            assert path.parts and not path.is_absolute() and '..' not in path.parts, 'Unsafe archive path'
            assert member.isdir() or member.isfile(), 'Archive must contain only regular files/directories'
            assert path.parts[0] == 'web' or member.isfile() and member.name == 'manifest.json', 'Unexpected archive entry'
        package.extractall(destination, filter='data')
    manifest = json.loads((destination / 'manifest.json').read_text())
    assert isinstance(manifest, dict) and 'web/v1.html' in manifest, 'Missing V1 HTML'
    actual = {str(path.relative_to(destination)) for path in destination.rglob('*') if path.is_file()}
    assert actual == set(manifest) | {'manifest.json'}, 'Unlisted or missing release files'
    for name, sha in manifest.items():
        assert isinstance(name, str) and name.startswith('web/') and '..' not in Path(name).parts
        assert isinstance(sha, str) and re.fullmatch('[a-f0-9]{64}', sha), 'Invalid manifest checksum'
        assert digest(destination / name) == sha, 'Release file checksum mismatch: ' + name
    return manifest


def publish(unpacked, manifest, expected):
    assert not NEW.parent.exists() and not OPS.exists(), 'Release/operations path exists; inspect before rerun'
    config = VHOST.read_text()
    assert config.count('root ' + str(OLD) + ';') == 1, 'Unexpected active V1 web root'
    assert digest(OLD / 'index.html') == '46e49361252e0531d28a819e95441cbeea39ef83391f2ca17b1ac1025b76a871', 'Active V1 HTML changed'
    before = baseline()
    OPS.mkdir(mode=0o700)
    backup = OPS / 'nginx-before.conf'
    backup.write_text(config)
    (OPS / 'before.json').write_text(json.dumps(before, indent=2) + '\n')
    shutil.copytree(OLD, NEW)
    shutil.copytree(unpacked / 'web', NEW, dirs_exist_ok=True)
    for name in ('index.html', 'pilot.html', 'academia/index.html', 'academia/pilot.html'):
        target = NEW / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(unpacked / 'web/v1.html', target)
    for root, directories, files in os.walk(NEW.parent):
        os.chmod(root, 0o755)
        for name in directories:
            os.chmod(Path(root, name), 0o755)
        for name in files:
            os.chmod(Path(root, name), 0o644)
    activated = False
    try:
        VHOST.write_text(config.replace('root ' + str(OLD) + ';', 'root ' + str(NEW) + ';'))
        run('nginx', '-t')
        run('systemctl', 'reload', 'nginx')
        assert baseline() == before, 'V5 or API containers changed during publication'
        result = {
            'root': str(NEW), 'htmlSha256': digest(NEW / 'index.html'),
            'archiveSha256': expected, 'filesVerified': len(manifest),
            'v5AndContainersUnchanged': True, 'containers': before['containers'],
            'rollbackConfig': str(backup),
        }
        (OPS / 'activation.json').write_text(json.dumps(result, indent=2) + '\n')
        activated = True
        print(json.dumps(result, indent=2))
    finally:
        if not activated:
            VHOST.write_text(config)
            run('nginx', '-t')
            run('systemctl', 'reload', 'nginx')
            assert baseline() == before, 'Check the unchanged APIs/V5 after rollback'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('sha256')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    with tempfile.TemporaryDirectory(prefix='sa-responsive-unpack-') as directory:
        unpacked = Path(directory)
        manifest = unpack_verified(args.archive, args.sha256, unpacked)
        if args.verify_only:
            print(json.dumps({'archiveVerified': True, 'filesVerified': len(manifest), 'activationAttempted': False}))
        else:
            assert os.geteuid() == 0, 'Run publication as root on the V1 VPS'
            publish(unpacked, manifest, args.sha256)


if __name__ == '__main__':
    main()
