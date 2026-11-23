"""Package only the completed V1 frontend build; never copy runtime data."""
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
    for path in build.rglob('*'):
        assert not path.is_symlink() and (path.is_file() or path.is_dir()), 'Build must contain only regular files/directories'
    root = Path(tempfile.mkdtemp(prefix='sa-responsive-agenda-release-'))
    bundle = root / 'bundle'
    shutil.copytree(build, bundle / 'web')
    manifest = {str(path.relative_to(bundle)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in sorted(bundle.rglob('*')) if path.is_file()}
    (bundle / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    archive = root / 'v1-responsive-agenda.tar.gz'
    with tarfile.open(archive, 'w:gz') as output:
        output.add(bundle / 'web', arcname='web')
        output.add(bundle / 'manifest.json', arcname='manifest.json')
    result = {'archive': str(archive), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'files': manifest}
    (FEATURE / 'evidence').mkdir(exist_ok=True)
    (FEATURE / 'evidence/release-manifest.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'archive': result['archive'], 'sha256': result['sha256'], 'fileCount': len(manifest)}))


if __name__ == '__main__':
    main()
