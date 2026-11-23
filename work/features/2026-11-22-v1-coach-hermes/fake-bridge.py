"""Synthetic external Hermes transport for loopback-only browser QA, never deployed."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import threading
import time

observations = []
lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def reply(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path != '/observations':
            return self.reply(404, {})
        with lock:
            self.reply(200, {'calls': list(observations)})

    def do_POST(self):
        if self.path != '/chat':
            return self.reply(404, {})
        if self.headers.get('Authorization') != 'Bearer synthetic-local-qa-key-not-a-credential':
            return self.reply(401, {'error': {'code': 'unauthorized'}})
        payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        messages = payload['messages']
        question = messages[-1]['content']
        with lock:
            previous = sum(call['question'] == question for call in observations)
            observations.append({'question': question, 'messages': messages})
        time.sleep(1.0)
        if '[fallo]' in question and previous == 0:
            return self.reply(503, {'error': {'code': 'inference_unavailable'}})
        if '[ocupado]' in question:
            return self.reply(429, {'error': {'code': 'capacity'}})
        if '[detalle]' in question:
            answer = ('Escucha la preocupación de la pareja y confirma qué necesita aclarar antes de continuar. ' * 18) + 'FINAL DEL CONTENIDO COMPLETO.'
        else:
            answer = 'Primero reconoce su duda con calma. Pregunta: «¿Qué parte te gustaría entender mejor antes de decidir?». Escucha y responde con el material aprobado, sin presionar. Practiquemos esa pregunta con tus palabras.'
        self.reply(200, {'reply': answer})


if __name__ == '__main__':
    print('Synthetic Hermes QA bridge on loopback18927', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 18927), Handler).serve_forever()
