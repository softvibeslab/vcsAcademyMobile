"""One private Hermes inference, with no tools or persistent conversation state."""
import contextlib
import io
import json
import logging
import os
from pathlib import Path
import sys
import uuid


def agent_options(system_prompt, runtime):
    return {
        **runtime,
        'enabled_toolsets': [],
        'skip_memory': True,
        'skip_context_files': True,
        'skip_background_review': True,
        'load_soul_identity': False,
        'session_db': None,
        'session_id': 'coach-v1-'+uuid.uuid4().hex,
        'save_trajectories': False,
        'verbose_logging': False,
        'quiet_mode': True,
        'checkpoints_enabled': False,
        'max_iterations': 1,
        'max_tokens': 1200,
        'reasoning_config': {'enabled': True, 'effort': 'low'},
        'ephemeral_system_prompt': system_prompt,
        'platform': 'api_server',
    }


def answer(messages):
    hermes_code = os.environ.get('COACH_HERMES_CODE', '/usr/local/lib/hermes-agent')
    sys.path.insert(0, hermes_code)
    from run_agent import AIAgent
    runtime_path = Path(os.environ.get('COACH_PROVIDER_FILE', '/etc/salesacademy-coach-v1/provider.json'))
    runtime_args = json.loads(runtime_path.read_text())
    if set(runtime_args) != {'api_key', 'base_url', 'provider', 'api_mode', 'model'}:
        raise RuntimeError('Unexpected provider credential shape')
    if runtime_args['provider'] != 'openai-codex' or runtime_args['api_mode'] != 'codex_responses' or runtime_args['base_url'].rstrip('/') != 'https://chatgpt.com/backend-api/codex':
        raise RuntimeError('Unexpected inference destination')
    profile_dir = Path(os.environ['HERMES_HOME'])
    identity = (profile_dir/'SOUL.md').read_text()
    system = identity + '\n\n' + '\n\n'.join(m['content'] for m in messages if m['role']=='system')
    history = [m for m in messages[:-1] if m['role'] in ('user','assistant')]
    agent = AIAgent(**agent_options(system, runtime_args))
    try:
        agent._persist_disabled = True
        agent._session_json_enabled = False
        # Defense in depth: reject unexpected tools and prohibit any lazy DB opening.
        if agent.tools or agent._session_db is not None:
            raise RuntimeError('Profile isolation check failed')
        result = agent.run_conversation(messages[-1]['content'], conversation_history=history)
        reply = result.get('final_response')
        if not result.get('completed') or not isinstance(reply, str) or not reply.strip() or len(reply) > 6000:
            raise RuntimeError('Inference incomplete')
        return reply.strip()
    finally:
        agent.close()


def main():
    logging.disable(logging.CRITICAL)
    try:
        payload = json.loads(sys.stdin.read(128*1024+1))
        # Provider/library diagnostics stay private; never return them to visitors.
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            reply = answer(payload['messages'])
        sys.stdout.write(json.dumps({'reply': reply}, ensure_ascii=False))
    except Exception:
        sys.stdout.write(json.dumps({'error':'inference_unavailable'}))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
