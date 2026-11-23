"""Final contrast-only frontend overlay; API and private pilot remain unchanged."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import tarfile


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT, text=True).strip()


def baseline():
    return {
        'v5html': digest('/srv/aisales-release-20261120-role-accounts/web/index.html'),
        'v5nginx': digest('/etc/nginx/sites-available/aisales.softvibes.pro.conf'),
        'containers': {name: json.loads(run('docker', 'inspect', name))[0]['Id'] for name in ('aisales-v1-coach-20261122', 'aisales-pilot-20261120-accounts-r2')},
    }


def main():
    ops = Path('/srv/aisales-v1/ops/20261122-coach')
    archive = ops/'web-r2.tar.gz'
    assert digest(archive) == '7a949c4bdec54b6a63fee67313870269b7201a8ccba16b1ac35e7fa811602ddf'
    old = Path('/srv/aisales-v1-release-20261122-coach/web')
    new = Path('/srv/aisales-v1-release-20261122-coach-r2/web')
    assert not new.parent.exists()
    config_path = Path('/etc/nginx/sites-available/aisalesv1.softvibes.pro.conf')
    config = config_path.read_text()
    assert config.count('root '+str(old)+';') == 1
    before = baseline()
    backup = ops/'nginx-before-r2.conf'
    assert not backup.exists()
    backup.write_text(config)
    shutil.copytree(old, new)
    unpacked = ops/'web-r2'
    with tarfile.open(archive) as bundle:
        bundle.extractall(unpacked, filter='data')
    shutil.copytree(unpacked/'assets', new/'assets', dirs_exist_ok=True)
    for name in ('index.html', 'pilot.html', 'academia/index.html', 'academia/pilot.html'):
        shutil.copyfile(unpacked/'v1.html', new/name)
    activated = False
    try:
        config_path.write_text(config.replace('root '+str(old)+';', 'root '+str(new)+';'))
        run('nginx', '-t')
        run('systemctl', 'reload', 'nginx')
        assert baseline() == before
        activated = True
        print(json.dumps({'root':str(new),'htmlSha256':digest(new/'index.html'),'v5AndContainersUnchanged':True,'rollbackConfig':str(backup)},indent=2))
    finally:
        if not activated:
            config_path.write_text(config)
            run('nginx','-t')
            run('systemctl','reload','nginx')


if __name__ == '__main__':
    main()
