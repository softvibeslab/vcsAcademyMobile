#!/usr/bin/env bash
set -euo pipefail
PILOT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PILOT_ROOT"
PILOT_API_PORT="${PILOT_API_PORT:-8009}"
PILOT_WEB_PORT="${PILOT_WEB_PORT:-5174}"
export VCSA_DB_PATH="${VCSA_DB_PATH:-${TMPDIR:-/tmp}/vcsa-pilot-preview.sqlite3}"
export VCSA_PILOT_API_URL="http://127.0.0.1:${PILOT_API_PORT}"
if [[ ! -x .venv/bin/python ]]; then
  echo 'Falta .venv/bin/python. Prepara el backend siguiendo el README del repositorio.' >&2
  exit 1
fi
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port "$PILOT_API_PORT" &
PILOT_BACKEND_PID=$!
trap 'kill "$PILOT_BACKEND_PID" 2>/dev/null || true' EXIT INT TERM
sleep 1
if ! kill -0 "$PILOT_BACKEND_PID" 2>/dev/null; then
  echo 'No se pudo iniciar el backend. Revisa que el puerto esté disponible.' >&2
  exit 1
fi
printf 'Nueva app: http://127.0.0.1:%s/pilot.html\n' "$PILOT_WEB_PORT"
npm --workspace frontend run dev -- --host 127.0.0.1 --port "$PILOT_WEB_PORT" --strictPort
