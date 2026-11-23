"""Root-only minimal inference export; authoritative refresh without OAuth-store clones."""
import contextlib
import grp
import importlib
import io
import logging
import json
import os
from pathlib import Path
import tempfile
import sys

SOURCE = Path('/etc/salesacademy-advisor/provider.json')
TARGET = Path('/etc/salesacademy-coach-v1/provider.json')


def minimal_runtime(data):
    if not isinstance(data, dict):
        raise ValueError('Unexpected provider export')
    if data.get('provider') != 'openai-codex' or data.get('api_mode') != 'codex_responses' or data.get('base_url', '').rstrip('/') != 'https://chatgpt.com/backend-api/codex':
        raise ValueError('Unexpected inference destination')
    if not all(isinstance(data.get(name), str) and data[name] for name in ('api_key', 'model')):
        raise ValueError('Provider credential is unavailable')
    return {name: data[name] for name in ('api_key', 'base_url', 'provider', 'api_mode', 'model')}


def load_runtime():
    """Use the existing export locally or the authoritative resolver on the AI host."""
    mode = os.environ.get('COACH_EXPORT_MODE', 'copy')
    if mode == 'copy':
        return minimal_runtime(json.loads(SOURCE.read_text()))
    if mode != 'hermes':
        raise ValueError('Unexpected credential export mode')
    # The official resolver owns refresh and locking. Never clone auth.json or
    # expose its refresh token to the non-root inference service.
    os.environ['HERMES_HOME'] = '/root/.hermes'
    sys.path.insert(0, os.environ.get('COACH_AUTH_CODE', '/usr/local/lib/hermes-agent'))
    if os.environ.get('COACH_AUTH_BOOTSTRAP') == '1':
        importlib.import_module('hermes_bootstrap')
    from hermes_cli.config import load_config
    from hermes_cli.runtime_provider import resolve_runtime_provider
    model = load_config()['model']['default']
    runtime = resolve_runtime_provider(requested='openai-codex', target_model=model)
    return minimal_runtime({**runtime, 'model': model})


def main():
    if os.geteuid() != 0:
        return 1
    temporary = None
    try:
        logging.disable(logging.CRITICAL)
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            data = load_runtime()
        descriptor, temporary = tempfile.mkstemp(prefix='.provider-', dir=TARGET.parent)
        with os.fdopen(descriptor, 'w') as output:
            json.dump(data, output)
            output.flush(); os.fsync(output.fileno())
        os.chown(temporary, 0, grp.getgrnam('sa-coach-v1').gr_gid)
        os.chmod(temporary, 0o640)
        os.replace(temporary, TARGET)
        print('Coach inference export updated; values omitted.')
        return 0
    except Exception:
        print('Coach inference export unavailable; values omitted.')
        return 1
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


if __name__ == '__main__':
    raise SystemExit(main())
