#!/usr/bin/env bash
# API de aisales tal como corre en producción (imagen construida desde backend/Dockerfile).
# La base y la clave de códigos viven en /srv/aisales/data (volumen /data), fuera del repo.
set -euo pipefail
TAG=${1:?uso: docker-run.sh <tag>, p. ej. aisales-api:20261114c}
docker run -d --name aisales-api --restart unless-stopped \
  -p 127.0.0.1:18819:8001 \
  -v /srv/aisales/data:/data \
  -e VCSA_DB_PATH=/data/academy.sqlite3 \
  -e VCSA_CORS_ORIGINS=https://aisales.softvibes.pro \
  "$TAG"
