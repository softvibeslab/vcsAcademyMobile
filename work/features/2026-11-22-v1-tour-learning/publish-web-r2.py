"""Publish the verified Agenda loading-layout fix without restarting any API."""
from pathlib import Path
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile


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
    for name in ('aisales-v1-tours-20261122', 'aisales-pilot-20261120-accounts-r2'):
        value = json.loads(run('docker', 'inspect', name))[0]
        assert value['State']['Running']
        result['containers'][name] = {'id': value['Id'], 'image': value['Image']}
    return result


def main():
    os.umask(0o077)
    archive, expected = Path(sys.argv[1]), sys.argv[2]
    assert re.fullmatch('[a-f0-9]{64}', expected) and digest(archive) == expected
    ops = Path('/srv/aisales-v1/ops/20261122-tours')
    old = Path('/srv/aisales-v1-release-20261122-tours/web')
    new = Path('/srv/aisales-v1-release-20261122-tours-r2/web')
    unpacked = ops/'web-r2'
    backup = ops/'nginx-before-r2.conf'
    assert not new.parent.exists() and not unpacked.exists() and not backup.exists()
    config_path = Path('/etc/nginx/sites-available/aisalesv1.softvibes.pro.conf')
    config = config_path.read_text()
    assert config.count('root '+str(old)+';') == 1
    before = baseline()
    with tarfile.open(archive) as bundle:
        for member in bundle.getmembers():
            assert not member.issym() and not member.islnk()
            assert not member.name.startswith('/') and '..' not in Path(member.name).parts
        bundle.extractall(unpacked, filter='data')
    manifest = json.loads((unpacked/'manifest.json').read_text())
    for name, sha in manifest.items():
        assert name.startswith('web/') and '..' not in Path(name).parts
        assert digest(unpacked/name) == sha
    assert 'web/v1.html' in manifest
    shutil.copytree(old, new)
    shutil.copytree(unpacked/'web/assets', new/'assets', dirs_exist_ok=True)
    for name in ('index.html', 'pilot.html', 'academia/index.html', 'academia/pilot.html'):
        shutil.copyfile(unpacked/'web/v1.html', new/name)
    for root, dirs, files in os.walk(new.parent):
        os.chmod(root, 0o755)
        for name in dirs:
            os.chmod(Path(root, name), 0o755)
        for name in files:
            os.chmod(Path(root, name), 0o644)
    backup.write_text(config)
    activated = False
    try:
        config_path.write_text(config.replace('root '+str(old)+';', 'root '+str(new)+';'))
        run('nginx', '-t')
        run('systemctl', 'reload', 'nginx')
        assert baseline() == before
        activated = True
        result = {'root': str(new), 'htmlSha256': digest(new/'index.html'),
                  'archiveSha256': expected, 'filesVerified': len(manifest),
                  'v5AndContainersUnchanged': True, 'rollbackConfig': str(backup)}
        (ops/'web-r2-activation.json').write_text(json.dumps(result, indent=2))
        print(json.dumps(result, indent=2))
    finally:
        if not activated:
            config_path.write_text(config)
            run('nginx', '-t')
            run('systemctl', 'reload', 'nginx')


if __name__ == '__main__':
    main()
