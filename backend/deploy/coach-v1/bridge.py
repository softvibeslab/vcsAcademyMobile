"""Private loopback transport for the tool-free Sales Academy Coach Hermes profile."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import hmac
import json
import os
import subprocess
import shutil
import tempfile
import sys
import threading

MAX_BODY = 128 * 1024
MAX_REPLY = 6000
TIMEOUT = 32
GATE = threading.BoundedSemaphore(2)


class BridgeError(Exception):
    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code, self.status = code, status


def authorized(header, key):
    return bool(key and len(key) >= 32 and hmac.compare_digest(header.encode(), ('Bearer '+key).encode()))


def validate_messages(body):
    if not isinstance(body, dict) or set(body) != {'messages'}:
        raise BridgeError('invalid_request', 'Solicitud de conversación inválida.')
    messages = body['messages']
    if not isinstance(messages, list) or not 1 <= len(messages) <= 41:
        raise BridgeError('invalid_messages', 'Historial fuera del límite permitido.')
    for index, message in enumerate(messages):
        if not isinstance(message, dict) or set(message) != {'role', 'content'}:
            raise BridgeError('invalid_message', 'Mensaje inválido.')
        role, content = message['role'], message['content']
        if role not in ('system', 'user', 'assistant') or (role == 'system' and index != 0):
            raise BridgeError('invalid_role', 'Rol de mensaje inválido.')
        limit = 100000 if role == 'system' else 6000
        if not isinstance(content, str) or not content.strip() or len(content) > limit:
            raise BridgeError('invalid_content', 'Contenido fuera del límite permitido.')
    if messages[-1]['role'] != 'user':
        raise BridgeError('missing_question', 'Falta la pregunta del representante.')
    return messages


def run_isolated(messages, runner=subprocess.run):
    """A fresh subprocess bounds execution and prevents shared agent state."""
    profile = Path(os.environ['COACH_PROFILE_HOME'])
    # Hermes may create internal state/cache while importing. The transport
    # owns this disposable home, so even a hard-killed worker leaves no state.
    with tempfile.TemporaryDirectory(prefix='sa-coach-v1-request-') as temporary:
        names = ('config.yaml', 'SOUL.md', '.no-bundled-skills')
        for name in names:
            shutil.copyfile(profile/name, Path(temporary)/name)
        environment = dict(os.environ, HERMES_HOME=temporary)
        environment.pop('COACH_BRIDGE_KEY', None)
        try:
            result = runner([sys.executable, str(Path(__file__).with_name('worker.py'))],
                            input=json.dumps({'messages': messages}, ensure_ascii=False),
                            text=True, capture_output=True, timeout=TIMEOUT, check=False,
                            env=environment)
        except subprocess.TimeoutExpired:
            raise BridgeError('coach_timeout', 'El coach tardó demasiado. Puedes intentar de nuevo.', 504) from None
    if result.returncode != 0:
        raise BridgeError('coach_unavailable', 'El coach no está disponible en este momento.', 503)
    try:
        data = json.loads(result.stdout)
        reply = data['reply']
        if not isinstance(reply, str) or not reply.strip() or len(reply) > MAX_REPLY:
            raise ValueError('invalid reply')
    except (ValueError, KeyError, TypeError):
        raise BridgeError('coach_unavailable', 'El coach no pudo completar la respuesta.', 503) from None
    return reply.strip()



class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def log_message(self, *_args):
        pass  # Request bodies, credentials and responses never enter logs.

    def respond(self, status, body):
        payload = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Connection', 'close')
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        self.respond(200 if self.path == '/health' else 404,
                     {'ok': True, 'profile': 'sales-academy-coach-v1'} if self.path == '/health' else {'error': {'code': 'not_found', 'message': 'Ruta no disponible.'}})

    def do_POST(self):
        if self.path != '/chat':
            return self.respond(404, {'error': {'code': 'not_found', 'message': 'Ruta no disponible.'}})
        if not authorized(self.headers.get('Authorization', ''), os.environ.get('COACH_BRIDGE_KEY', '')):
            return self.respond(401, {'error': {'code': 'unauthorized', 'message': 'Acceso no autorizado.'}})
        acquired = False
        try:
            if self.headers.get('Transfer-Encoding') or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                raise BridgeError('invalid_content_type', 'Se requiere JSON.', 415)
            try:
                length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                raise BridgeError('invalid_length', 'Longitud inválida.') from None
            limit = MAX_BODY
            if not 0 < length <= limit:
                raise BridgeError('body_too_large', 'Solicitud fuera del límite permitido.', 413)
            body = json.loads(self.rfile.read(length))
            messages = validate_messages(body)
            acquired = GATE.acquire(blocking=False)
            if not acquired:
                raise BridgeError('coach_busy', 'El coach está atendiendo otra conversación. Intenta de nuevo.', 429)
            reply = run_isolated(messages)
            self.respond(200, {'reply': reply})
        except BridgeError as error:
            self.respond(error.status, {'error': {'code': error.code, 'message': str(error)}})
        except (ValueError, UnicodeError, TimeoutError):
            self.respond(400, {'error': {'code': 'invalid_json', 'message': 'Solicitud inválida.'}})
        except Exception:
            self.respond(503, {'error': {'code': 'coach_unavailable', 'message': 'El coach no está disponible en este momento.'}})
        finally:
            if acquired:
                GATE.release()


if __name__ == '__main__':
    if len(os.environ.get('COACH_BRIDGE_KEY', '')) < 32:
        raise SystemExit('A private bridge key is required')
    ThreadingHTTPServer(('127.0.0.1', 18643), Handler).serve_forever()
