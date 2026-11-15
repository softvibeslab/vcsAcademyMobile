#!/usr/bin/env bash
# Despliegue de aisales (acceso-free-premium). Corre en el VPS.
# Uso: bash deploy.sh <sufijo>   p. ej. 20261114b
# Entradas: /srv/aisales-web-<sufijo>.tgz (dist de Vite) y /srv/aisales-backend-<sufijo>.tgz.
# Reversión automática ante error o señal (SIGINT/SIGTERM/SIGHUP) desde el primer paso destructivo.
set -euo pipefail
SUFFIX=${1:?sufijo requerido}
[[ "$SUFFIX" =~ ^[0-9]{8}[a-z0-9]{0,4}$ ]] || { echo "Sufijo inválido: $SUFFIX" >&2; exit 2; }
R=/srv/aisales-release-$SUFFIX
TAG=aisales-api:$SUFFIX
DATA=/srv/aisales/data
previous=$(readlink -f /srv/aisales/current)
old_image=$(docker inspect aisales-api --format '{{.Config.Image}}')
test ! -e "$R"

# 1) Preparación sin tocar producción.
mkdir -p "$R/bundle" "$R/src"
cp -a "$previous/web" "$R/web"
tar -xzf "/srv/aisales-web-$SUFFIX.tgz" -C "$R/bundle" --warning=no-unknown-keyword
tar -xzf "/srv/aisales-backend-$SUFFIX.tgz" -C "$R/src" --warning=no-unknown-keyword
cp -a "$R/bundle/assets/." "$R/web/assets/"
for target in index.html pilot.html academia/index.html academia/pilot.html; do cp "$R/bundle/pilot.html" "$R/web/$target"; done
cp -a "$R/bundle/manifest.webmanifest" "$R/bundle/sw.js" "$R/bundle/offline.html" "$R/bundle/icons" "$R/web/"
printf '%s\n%s\n' "$previous" "$old_image" > "$R/previous-release.txt"
docker build -q -t "$TAG" -f "$R/src/backend/Dockerfile" "$R/src" >/dev/null

# 2) Cambio con reversión instalada ANTES del primer paso destructivo.
stage=none
rollback(){
  trap - ERR INT TERM HUP
  echo "ROLLBACK (etapa: $stage)" >&2
  if [ "$stage" = running ] || [ "$stage" = web ]; then
    docker rm -f aisales-api >/dev/null 2>&1 || true
    cp -a "$DATA/academy.sqlite3.bak-$SUFFIX" "$DATA/academy.sqlite3"   # solo si el respaldo terminó
  fi
  if [ "$stage" != none ]; then
    docker inspect aisales-api-prev >/dev/null 2>&1 && docker rename aisales-api-prev aisales-api
    docker start aisales-api >/dev/null
    for i in $(seq 1 20); do curl -fsS http://127.0.0.1:18819/api/ready >/dev/null 2>&1 && break; sleep 1; done
    curl -fsS http://127.0.0.1:18819/api/ready >/dev/null || echo "ALERTA: la API anterior no respondió tras la reversión; revisar a mano" >&2
  fi
  ln -sfn "$previous" /srv/aisales/current
  systemctl reload nginx || echo "ALERTA: nginx no recargó tras la reversión" >&2
  exit 1
}
trap rollback ERR INT TERM HUP
stage=stopping
docker stop aisales-api >/dev/null
cp -a "$DATA/academy.sqlite3" "$DATA/academy.sqlite3.bak-$SUFFIX"
# La clave de códigos va con el respaldo: sin ella, los códigos vigentes dejan de servir.
[ -f "$DATA/.license-secret" ] && cp -a "$DATA/.license-secret" "$DATA/.license-secret.bak-$SUFFIX"
docker rm -f aisales-api-prev >/dev/null 2>&1 || true
docker rename aisales-api aisales-api-prev
stage=running
docker run -d --name aisales-api --restart unless-stopped -p 127.0.0.1:18819:8001 \
  -v "$DATA:/data" -e VCSA_DB_PATH=/data/academy.sqlite3 \
  -e VCSA_CORS_ORIGINS=https://aisales.softvibes.pro "$TAG" >/dev/null
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:18819/api/ready >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:18819/api/ready | grep -q '"status":"ready"'
curl -fsS http://127.0.0.1:18819/api/public/catalog | grep -q '"tier":"visitante"'
stage=web
nginx -t 2>/dev/null
ln -sfn "$R" /srv/aisales/current
systemctl reload nginx
curl -fsS https://aisales.softvibes.pro/ | grep -q 'manifest.webmanifest'
curl -fsS https://aisales.softvibes.pro/api/public/catalog | grep -q 'lesson:step_1'
trap - ERR INT TERM HUP
docker rm aisales-api-prev >/dev/null 2>&1 || true
printf 'OK. Release %s activa (%s). Anterior: %s (%s). Respaldo: academy.sqlite3.bak-%s\n' "$R" "$TAG" "$previous" "$old_image" "$SUFFIX"
