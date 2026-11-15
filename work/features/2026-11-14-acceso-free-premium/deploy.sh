#!/usr/bin/env bash
# Despliegue de acceso-free-premium + instalar-app en aisales. Corre en el VPS.
# Entradas: /srv/aisales-access-20261114.tgz (dist de Vite) y /srv/aisales-backend-20261114.tgz.
set -euo pipefail
R=/srv/aisales-access-20261114
TAG=aisales-api:20261114
previous=$(readlink -f /srv/aisales/current)
test ! -e "$R"
mkdir -p "$R/bundle" "$R/src"
cp -a "$previous/web" "$R/web"
tar -xzf /srv/aisales-access-20261114.tgz -C "$R/bundle"
tar -xzf /srv/aisales-backend-20261114.tgz -C "$R/src"
cp -a "$R/bundle/assets/." "$R/web/assets/"
for target in index.html pilot.html academia/index.html academia/pilot.html; do cp "$R/bundle/pilot.html" "$R/web/$target"; done
cp -a "$R/bundle/manifest.webmanifest" "$R/bundle/sw.js" "$R/bundle/offline.html" "$R/bundle/icons" "$R/web/"
printf '%s\n' "$previous" > "$R/previous-release.txt"

# API: imagen nueva; la anterior queda como respaldo.
docker build -q -t "$TAG" -f "$R/src/backend/Dockerfile" "$R/src" >/dev/null
docker stop aisales-api >/dev/null
cp -a /srv/aisales/data/academy.sqlite3 "/srv/aisales/data/academy.sqlite3.bak-20261114"
docker rename aisales-api aisales-api-20261113
rollback_api(){
  docker rm -f aisales-api >/dev/null 2>&1 || true
  cp -a /srv/aisales/data/academy.sqlite3.bak-20261114 /srv/aisales/data/academy.sqlite3
  docker rename aisales-api-20261113 aisales-api && docker start aisales-api >/dev/null
  ln -sfn "$previous" /srv/aisales/current
  echo "ROLLBACK aplicado" >&2
}
trap rollback_api ERR
docker run -d --name aisales-api --restart unless-stopped -p 127.0.0.1:18819:8001 \
  -v /srv/aisales/data:/data -e VCSA_DB_PATH=/data/academy.sqlite3 \
  -e VCSA_CORS_ORIGINS=https://aisales.softvibes.pro "$TAG" >/dev/null
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:18819/api/ready >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:18819/api/ready | grep -q '"status":"ready"'
curl -fsS http://127.0.0.1:18819/api/public/catalog | grep -q '"tier":"visitante"'

nginx -t 2>/dev/null
ln -sfn "$R" /srv/aisales/current
systemctl reload nginx
curl -fsS https://aisales.softvibes.pro/ | grep -q 'manifest.webmanifest'
curl -fsS https://aisales.softvibes.pro/sw.js -o /dev/null
curl -fsS https://aisales.softvibes.pro/api/public/catalog | grep -q 'lesson:step_1'
trap - ERR
docker rm aisales-api-20261113 >/dev/null 2>&1 || true
printf 'OK. Release %s activa. Anterior: %s. Respaldo de base: academy.sqlite3.bak-20261114\n' "$R" "$previous"
