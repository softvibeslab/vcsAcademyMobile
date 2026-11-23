"""Synthetic VPS-only smoke; prints no credentials, provider diagnostics or replies."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

PROFILE = Path('/var/lib/salesacademy-coach-v1/.hermes/profiles/sales-academy-coach-v1')
KEY_FILE = Path('/etc/salesacademy-coach-v1/client.key')
BASE = 'http://127.0.0.1:18643'


def fingerprint():
    return {str(path.relative_to(PROFILE)): hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(PROFILE.rglob('*')) if path.is_file()}


def call(path, body=None, key=None):
    headers = {'Content-Type': 'application/json'}
    if key:
        headers['Authorization'] = 'Bearer ' + key
    request = Request(BASE + path, data=json.dumps(body, ensure_ascii=False).encode() if body is not None else None, headers=headers)
    try:
        with urlopen(request, timeout=35) as response:
            return response.status, json.load(response)
    except HTTPError as response:
        return response.code, json.load(response)


def main(transport_only=False):
    before = fingerprint()
    key = KEY_FILE.read_text().strip()
    status, health = call('/health')
    checks = {'health': status == 200 and health.get('profile') == 'sales-academy-coach-v1', 'missingKeyRejected': call('/chat', {'messages': [{'role': 'user', 'content': 'Prueba sintética.'}]})[0] == 401,
              'invalidRoleRejected': call('/chat', {'messages': [{'role': 'tool', 'content': 'Prueba sintética.'}]}, key)[0] == 400,
              'notesRouteAbsent': call('/notes', {}, key)[0] == 404}
    inference = {'checked': False, 'available': False, 'reason': 'transport-only probe; authentication pending'}
    if not transport_only:
        messages = [{'role': 'system', 'content': 'Prueba sintética de entrenamiento. No hay datos personales ni agenda disponible.'}, {'role': 'user', 'content': 'Soy representante y quiero practicar la objeción necesito pensarlo. Dame una pregunta breve y útil.'}]
        started = time.monotonic()
        status, body = call('/chat', {'messages': messages}, key)
        inference = {'httpStatus': status, 'elapsedSeconds': round(time.monotonic() - started, 2), 'available': status == 200 and isinstance(body.get('reply'), str) and bool(body['reply'].strip())}
        if inference['available']:
            reply = body['reply']
            inference['replyCharacters'] = len(reply)
            messages += [{'role': 'assistant', 'content': reply}, {'role': 'user', 'content': '¿Cuál era la objeción que mencioné? Responde solo con esa objeción.'}]
            second_status, second_body = call('/chat', {'messages': messages}, key)
            inference['secondTurnHttpStatus'] = second_status
            inference['continuityVerified'] = second_status == 200 and 'pensar' in second_body.get('reply', '').lower()
        else:
            inference['errorCode'] = body.get('error', {}).get('code', 'unavailable')
    checks['permanentProfileUnchanged'] = fingerprint() == before
    checks['keyRootOnly'] = KEY_FILE.stat().st_uid == 0 and KEY_FILE.stat().st_mode & 0o777 == 0o600
    checks['nonRootService'] = subprocess.check_output(['systemctl', 'show', '-p', 'User', '--value', 'salesacademy-coach-v1.service'], text=True).strip() == 'sa-coach-v1'
    checks['advisorStillActive'] = subprocess.run(['systemctl', 'is-active', '--quiet', 'salesacademy-advisor.service']).returncode == 0
    print(json.dumps({'checks': checks, 'transportPassed': all(checks.values()), 'inference': inference, 'secretValuesPrinted': False, 'realUserDataUsed': False}, ensure_ascii=False, indent=2))
    return 0 if all(checks.values()) else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--transport-only', action='store_true')
    args = parser.parse_args()
    raise SystemExit(main(args.transport_only))
