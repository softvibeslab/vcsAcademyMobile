"""Package only the approved V1 code/build, never environment files or databases."""
from pathlib import Path
import hashlib
import json
import shutil
import tarfile
import tempfile

FEATURE = Path(__file__).resolve().parent
ROOT = FEATURE.parents[2]


def main():
    root = Path(tempfile.mkdtemp(prefix='sa-tour-release-'))
    bundle = root/'bundle'
    (bundle/'api').mkdir(parents=True)
    for name in ('main.py','tour_visits.py','coach_hermes.py'):
        shutil.copyfile(ROOT/'backend/app'/name,bundle/'api'/name)
    shutil.copytree(ROOT/'frontend/dist-v1',bundle/'web')
    assert (bundle/'web/v1.html').is_file()
    for name in ('deploy-release.py','Dockerfile.api'):
        shutil.copyfile(FEATURE/name,bundle/name)
    shutil.copyfile(FEATURE.parent/'2026-11-22-v1-coach-hermes/deploy-release.py',bundle/'legacy_deploy.py')
    shutil.copyfile(ROOT/'backend/deploy/tour-learning/maintenance.py',bundle/'maintenance.py')
    manifest={str(p.relative_to(bundle)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(bundle.rglob('*')) if p.is_file()}
    (bundle/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    archive=root/'v1-tours.tar.gz'
    with tarfile.open(archive,'w:gz') as output:
        output.add(bundle,arcname='bundle')
    result={'archive':str(archive),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':manifest}
    (FEATURE/'evidence/release-manifest.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'archive':result['archive'],'sha256':result['sha256'],'fileCount':len(manifest)}))


if __name__=='__main__':
    main()
