"""Package the V1 build and one approved backend file, without runtime data."""
from pathlib import Path
import hashlib
import json
import shutil
import tarfile
import tempfile

FEATURE = Path(__file__).resolve().parent
ROOT = FEATURE.parents[2]


def main():
    build = ROOT / 'frontend/dist-v1'
    assert (build / 'v1.html').is_file(), 'Run the final V1 build before packaging'
    assert not any(path.is_symlink() for path in build.rglob('*')), 'Build must contain regular files'
    root = Path(tempfile.mkdtemp(prefix='sa-manual-analysis-release-'))
    bundle = root / 'bundle'
    (bundle / 'api').mkdir(parents=True)
    shutil.copyfile(ROOT / 'backend/app/coach_hermes.py', bundle / 'api/coach_hermes.py')
    shutil.copytree(build, bundle / 'web')
    for name in ('deploy-release.py', 'Dockerfile.api'):
        shutil.copyfile(FEATURE / name, bundle / name)
    shutil.copyfile(FEATURE.parent / '2026-11-22-v1-coach-hermes/deploy-release.py', bundle / 'legacy_deploy.py')
    manifest = {str(path.relative_to(bundle)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in sorted(bundle.rglob('*')) if path.is_file()}
    (bundle / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    archive = root / 'v1-manual-analysis.tar.gz'
    with tarfile.open(archive, 'w:gz') as output:
        output.add(bundle, arcname='bundle')
    result = {'archive': str(archive), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'files': manifest}
    (FEATURE / 'evidence').mkdir(exist_ok=True)
    (FEATURE / 'evidence/release-manifest.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'archive': result['archive'], 'sha256': result['sha256'], 'fileCount': len(manifest)}))


if __name__ == '__main__':
    main()
