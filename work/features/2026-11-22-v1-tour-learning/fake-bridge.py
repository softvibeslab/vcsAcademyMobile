"""Loopback-only external inference fixture. No production credentials or data."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import threading
import time

calls = []
control = {'fail_analysis': False, 'delay': 0.15}
lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def reply(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/observations':
            return self.reply(200, {'calls': calls})
        self.reply(404, {})

    def do_POST(self):
        data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        if self.path == '/control':
            with lock:
                control.update({k:v for k,v in data.items() if k in control})
            return self.reply(200, {'ok': True})
        if self.path != '/chat':
            return self.reply(404, {})
        if self.headers.get('Authorization') != 'Bearer synthetic-tour-qa-only-not-a-credential':
            return self.reply(401, {})
        serialized = json.dumps(data, ensure_ascii=False)
        analysis = 'SERVER_MODE: TOUR_VISIT_ANALYSIS_V1' in serialized
        with lock:
            calls.append({'analysis': analysis, 'messages': data.get('messages', [])})
            fail = analysis and control['fail_analysis']
            if fail:
                control['fail_analysis'] = False
            delay = control['delay']
        time.sleep(delay)
        if fail:
            return self.reply(503, {'error': {'code': 'inference_unavailable'}})
        if analysis:
            answer = json.dumps({'summary': 'Practicaron una bienvenida con escucha activa.',
                'strengths': 'Preguntaste antes de explicar.',
                'improvement': 'Confirma la prioridad antes de pasar a la propuesta.',
                'next_practice': 'Practica una pregunta abierta de bienvenida.',
                'recommended_steps': [{'step_id':'step_1','reason':'Refuerza una apertura con escucha activa.'}]}, ensure_ascii=False)
        else:
            answer = 'En el contexto guardado prefieren vacaciones en montaña. Abre con una pregunta sobre qué disfrutan de ese viaje y escucha antes de presentar.'
        self.reply(200, {'reply': answer})


if __name__ == '__main__':
    print('Synthetic tour inference fixture on 127.0.0.1:18937', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 18937), Handler).serve_forever()
