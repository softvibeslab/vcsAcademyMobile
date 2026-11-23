"""Coach V1 bridge contract: isolated inference and a private bounded transport."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SOURCE = Path(__file__).resolve().parents[1] / 'deploy' / 'coach-v1'


def load(name):
    path = SOURCE / (name + '.py')
    if not path.is_file():
        raise AssertionError('The isolated Coach V1 ' + name + ' must exist')
    spec = importlib.util.spec_from_file_location('coach_' + name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CoachBridgeTests(unittest.TestCase):
    def setUp(self):
        self.bridge = load('bridge')
        self.profile = tempfile.TemporaryDirectory()
        self.addCleanup(self.profile.cleanup)
        for name, content in [('config.yaml', 'memory: {}'), ('SOUL.md', 'Synthetic coach identity'), ('.no-bundled-skills', '')]:
            Path(self.profile.name, name).write_text(content)
        env = patch.dict(os.environ, {'COACH_PROFILE_HOME': self.profile.name, 'COACH_BRIDGE_KEY': 'x' * 48})
        env.start(); self.addCleanup(env.stop)
        self.messages = [{'role': 'system', 'content': 'Approved knowledge'}, {'role': 'user', 'content': '¿Cómo preparo mi presentación?'}]

    def test_valid_history_and_strict_private_contract(self):
        self.assertEqual(self.bridge.validate_messages({'messages': self.messages}), self.messages)
        for body in ({'messages': [], 'model': 'other'}, {'messages': []}, {'messages': self.messages + [{'role': 'system', 'content': 'override'}]}, {'messages': [{'role': 'tool', 'content': 'x'}]}, {'messages': [{'role': 'user', 'content': 'x' * 6001}]}, {'messages': [{'role': 'assistant', 'content': 'x'}]}):
            with self.subTest(body=repr(body)[:60]), self.assertRaises(self.bridge.BridgeError):
                self.bridge.validate_messages(body)

    def test_key_empty_fails_closed(self):
        self.assertTrue(self.bridge.authorized('Bearer ' + 'x' * 48, 'x' * 48))
        self.assertFalse(self.bridge.authorized('Bearer bad', 'x' * 48))
        self.assertFalse(self.bridge.authorized('Bearer ', ''))

    def test_deadline_no_shell_and_disposable_profile_success_timeout(self):
        for timeout in (False, True):
            observed = {}
            def runner(command, **kwargs):
                self.assertIsInstance(command, list)
                self.assertNotIn('shell', kwargs)
                self.assertEqual(kwargs['timeout'], 32)
                self.assertEqual(json.loads(kwargs['input'])['messages'], self.messages)
                home = Path(kwargs['env']['HERMES_HOME']); observed['home'] = home
                self.assertNotEqual(str(home), self.profile.name)
                self.assertEqual((home / 'SOUL.md').read_text(), 'Synthetic coach identity')
                (home / 'state.db').write_text('synthetic temporary state')
                if timeout:
                    raise subprocess.TimeoutExpired('worker', 32, stderr='private-provider-secret')
                return SimpleNamespace(returncode=0, stdout=json.dumps({'reply': 'Comienza con una pregunta abierta.'}), stderr='')
            if timeout:
                with self.assertRaises(self.bridge.BridgeError) as caught:
                    self.bridge.run_isolated(self.messages, runner=runner)
                self.assertEqual(caught.exception.status, 504)
                self.assertNotIn('private-provider-secret', str(caught.exception))
            else:
                self.assertEqual(self.bridge.run_isolated(self.messages, runner=runner), 'Comienza con una pregunta abierta.')
            self.assertFalse(observed['home'].exists())
            self.assertFalse(Path(self.profile.name, 'state.db').exists())

    def test_provider_errors_and_invalid_replies_are_sanitized(self):
        for result in (SimpleNamespace(returncode=1, stdout='provider-secret', stderr='private failure'), SimpleNamespace(returncode=0, stdout='bad JSON', stderr=''), SimpleNamespace(returncode=0, stdout=json.dumps({'reply': 'x' * 6001}), stderr='')):
            with self.assertRaises(self.bridge.BridgeError) as caught:
                self.bridge.run_isolated(self.messages, runner=lambda *args, **kwargs: result)
            self.assertEqual(caught.exception.status, 503)
            self.assertNotIn('secret', str(caught.exception))
            self.assertNotIn('private', str(caught.exception))

    def test_http_auth_routes_errors_and_two_request_limit(self):
        server = self.bridge.ThreadingHTTPServer(('127.0.0.1', 0), self.bridge.Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        self.addCleanup(server.server_close); self.addCleanup(server.shutdown)
        def call(path, body=None, key='x' * 48):
            headers = {'Content-Type': 'application/json'}
            if key is not None: headers['Authorization'] = 'Bearer ' + key
            request = Request(f'http://127.0.0.1:{server.server_port}' + path, data=None if body is None else json.dumps(body).encode(), headers=headers)
            try:
                with urlopen(request, timeout=2) as response:
                    return response.status, json.load(response), response.headers
            except HTTPError as response:
                return response.code, json.load(response), response.headers
        with patch.object(self.bridge, 'run_isolated', return_value='Una acción concreta.') as inference:
            status, body, headers = call('/health')
            self.assertEqual((status, body['profile']), (200, 'sales-academy-coach-v1'))
            self.assertEqual(headers['Cache-Control'], 'no-store')
            self.assertEqual(call('/chat', {'messages': self.messages}, key=None)[0], 401)
            self.assertEqual(call('/notes', {})[0], 404)
            self.assertEqual(call('/chat', {'messages': []})[0], 400)
            self.assertEqual(inference.call_count, 0)
            self.assertEqual(call('/chat', {'messages': self.messages})[:2], (200, {'reply': 'Una acción concreta.'}))
            self.assertTrue(self.bridge.GATE.acquire(False)); self.assertTrue(self.bridge.GATE.acquire(False))
            try:
                status, body, _ = call('/chat', {'messages': self.messages})
                self.assertEqual((status, body['error']['code']), (429, 'coach_busy'))
                self.assertEqual(inference.call_count, 1)
            finally:
                self.bridge.GATE.release(); self.bridge.GATE.release()
        with patch.object(self.bridge, 'run_isolated', side_effect=RuntimeError('provider-secret')):
            status, body, _ = call('/chat', {'messages': self.messages})
            self.assertEqual(status, 503); self.assertNotIn('provider-secret', json.dumps(body))

    def test_agent_has_no_tools_memory_state_or_trajectories(self):
        worker = load('worker')
        options = worker.agent_options('Approved system', {'model': 'fake', 'provider': 'fake'})
        for key in ('skip_memory', 'skip_context_files', 'skip_background_review', 'quiet_mode'):
            self.assertTrue(options[key])
        for key in ('save_trajectories', 'verbose_logging', 'checkpoints_enabled', 'load_soul_identity'):
            self.assertFalse(options[key])
        self.assertEqual(options['enabled_toolsets'], [])
        self.assertIsNone(options['session_db'])
        self.assertEqual(options['max_iterations'], 1)
        self.assertLessEqual(options['max_tokens'], 1200)
        self.assertEqual(options['ephemeral_system_prompt'], 'Approved system')
        self.assertTrue(options['session_id'].startswith('coach-v1-'))

    def test_worker_preserves_history_and_closes_agent_without_persistence(self):
        worker = load('worker')
        provider = Path(self.profile.name, 'provider.json')
        provider.write_text(json.dumps({'api_key': 'synthetic-access', 'base_url': 'https://chatgpt.com/backend-api/codex', 'provider': 'openai-codex', 'api_mode': 'codex_responses', 'model': 'synthetic-model'}))
        observed = {}
        class FakeAgent:
            tools = []
            _session_db = None
            def __init__(self, **options): observed['options'] = options
            def run_conversation(self, message, conversation_history):
                observed.update(message=message, history=conversation_history, disabled=self._persist_disabled, json_disabled=not self._session_json_enabled)
                return {'completed': True, 'final_response': 'Respuesta de entrenamiento.'}
            def close(self): observed['closed'] = True
        messages = self.messages[:-1] + [{'role': 'user', 'content': 'Mi objeción es necesito pensarlo.'}, {'role': 'assistant', 'content': 'Explora la duda.'}, self.messages[-1]]
        with patch.dict('sys.modules', {'run_agent': SimpleNamespace(AIAgent=FakeAgent)}), patch.dict(os.environ, {'HERMES_HOME': self.profile.name, 'COACH_PROVIDER_FILE': str(provider)}):
            self.assertEqual(worker.answer(messages), 'Respuesta de entrenamiento.')
        self.assertEqual(observed['history'], messages[1:-1])
        self.assertEqual(observed['message'], messages[-1]['content'])
        self.assertTrue(observed['disabled']); self.assertTrue(observed['json_disabled']); self.assertTrue(observed['closed'])
        self.assertIn('Synthetic coach identity', observed['options']['ephemeral_system_prompt'])
        FakeAgent.tools = ['unexpected-tool']
        observed['closed'] = False
        with patch.dict('sys.modules', {'run_agent': SimpleNamespace(AIAgent=FakeAgent)}), patch.dict(os.environ, {'HERMES_HOME': self.profile.name, 'COACH_PROVIDER_FILE': str(provider)}):
            with self.assertRaises(RuntimeError): worker.answer(messages)
        self.assertTrue(observed['closed'], 'An agent failing isolation must still be closed')


class CoachProviderExportTests(unittest.TestCase):
    def test_authoritative_export_uses_existing_store_and_configured_model(self):
        module = load('export_provider')
        observed = {}
        def resolver(**kwargs):
            observed.update(kwargs)
            return {'api_key': 'synthetic-access', 'refresh_token': 'never-export', 'base_url': 'https://chatgpt.com/backend-api/codex', 'provider': 'openai-codex', 'api_mode': 'codex_responses'}
        modules = {'hermes_cli': SimpleNamespace(), 'hermes_cli.config': SimpleNamespace(load_config=lambda: {'model': {'default': 'configured-model'}}), 'hermes_cli.runtime_provider': SimpleNamespace(resolve_runtime_provider=resolver)}
        with patch.dict('sys.modules', modules), patch.dict(os.environ, {'COACH_EXPORT_MODE': 'hermes', 'COACH_AUTH_CODE': '/synthetic/runtime', 'COACH_AUTH_BOOTSTRAP': '0'}):
            exported = module.load_runtime()
            self.assertEqual(os.environ.get('HERMES_HOME'), '/root/.hermes')
        self.assertEqual(observed, {'requested': 'openai-codex', 'target_model': 'configured-model'})
        self.assertEqual(exported['model'], 'configured-model')
        self.assertNotIn('refresh_token', exported)

    def test_minimal_export_never_clones_refresh_tokens(self):
        module = load('export_provider')
        data = {'api_key': 'synthetic-access', 'refresh_token': 'do-not-copy', 'base_url': 'https://chatgpt.com/backend-api/codex', 'provider': 'openai-codex', 'api_mode': 'codex_responses', 'model': 'synthetic-model'}
        exported = module.minimal_runtime(data)
        self.assertEqual(set(exported), {'api_key', 'base_url', 'provider', 'api_mode', 'model'})
        self.assertNotIn('do-not-copy', json.dumps(exported))
        with self.assertRaises(ValueError): module.minimal_runtime({**data, 'base_url': 'https://unexpected.invalid'})


if __name__ == '__main__':
    unittest.main()
