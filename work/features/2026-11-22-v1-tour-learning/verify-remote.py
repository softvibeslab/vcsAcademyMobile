"""Read-only post-deploy checks on the app VPS; emits metadata, no records."""
from pathlib import Path
import hashlib
import json
import sqlite3
import subprocess


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT, text=True).strip()


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


result = {'containers': {}}
for name in ('aisales-v1-tours-20261122', 'aisales-pilot-20261120-accounts-r2'):
    value = json.loads(run('docker', 'inspect', name))[0]
    assert value['State']['Running']
    result['containers'][name] = {'id': value['Id'], 'image': value['Image'], 'running': True}
result['v5'] = {
    'nginxSha256': digest('/etc/nginx/sites-available/aisales.softvibes.pro.conf'),
    'htmlSha256': digest('/srv/aisales-release-20261120-role-accounts/web/index.html'),
}
assert result['v5']['nginxSha256'] == '2f0759d85abb98ec544c2dccbed1593206d61f78707beaf6c2a922786171da9d'
assert result['v5']['htmlSha256'] == '8295063c1ea548f99000a5004c32c60e300e6bab6cce43aba0018d116df18be4'
timer = 'salesacademy-v1-tours-maintenance.timer'
service = 'salesacademy-v1-tours-maintenance.service'
result['maintenance'] = {
    'timerActive': run('systemctl', 'is-active', timer),
    'lastExitStatus': int(run('systemctl', 'show', service, '-p', 'ExecMainStatus', '--value')),
    'nextRun': run('systemctl', 'show', timer, '-p', 'NextElapseUSecRealtime', '--value'),
    'scriptSha256': digest('/opt/salesacademy-v1-tours/maintenance.py'),
}
assert result['maintenance']['timerActive'] == 'active' and result['maintenance']['lastExitStatus'] == 0
directory = Path('/srv/aisales-v1/backups/tour-learning')
backups = sorted(directory.glob('v1-tours-*.sqlite3'))
assert backups and directory.stat().st_mode & 0o777 == 0o700
assert all(path.stat().st_mode & 0o777 == 0o600 for path in backups)
with sqlite3.connect(backups[-1].as_uri()+'?mode=ro', uri=True) as connection:
    assert connection.execute('PRAGMA quick_check').fetchone()[0] == 'ok'
result['backups'] = {'count': len(backups), 'directoryMode': '0700', 'fileMode': '0600', 'latestQuickCheck': 'ok'}
titles = ['QA sintética · eliminar', 'QA aprendizaje android-dark']
titles += ['QA '+device+'-'+theme+' futura' for theme in ('dark', 'light') for device in ('android', 'iphone', 'desktop')]
with sqlite3.connect('file:/srv/aisales-v1/data/academy.sqlite3?mode=ro', uri=True) as connection:
    assert connection.execute('PRAGMA quick_check').fetchone()[0] == 'ok'
    remaining = connection.execute('SELECT count(*) FROM tour_visits WHERE title IN ('+','.join('?' for _ in titles)+')', titles).fetchone()[0]
    orphans = connection.execute('SELECT count(*) FROM tour_visit_analyses a LEFT JOIN tour_visits v ON a.visit_id=v.id WHERE v.id IS NULL').fetchone()[0]
    assert remaining == 0 and orphans == 0
    result['database'] = {'quickCheck': 'ok', 'qaRecordsRemaining': remaining, 'orphanAnalyses': orphans}
print(json.dumps(result, indent=2))
