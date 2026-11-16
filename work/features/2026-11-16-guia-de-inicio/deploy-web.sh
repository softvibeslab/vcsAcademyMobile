#!/usr/bin/env bash
# Despliegue solo de frontend en aisales (la API no cambia). Corre en el VPS.
# Uso: bash deploy-web.sh <sufijo>   con /srv/aisales-web-<sufijo>.tgz (frontend/dist).
set -euo pipefail
SUFFIX=${1:?sufijo requerido}
[[ "$SUFFIX" =~ ^[0-9]{8}[a-z0-9]{0,4}$ ]] || { echo "Sufijo inválido: $SUFFIX" >&2; exit 2; }
R=/srv/aisales-release-$SUFFIX
previous=$(readlink -f /srv/aisales/current)
test ! -e "$R"
mkdir -p "$R/bundle"
cp -a "$previous/web" "$R/web"
tar -xzf "/srv/aisales-web-$SUFFIX.tgz" -C "$R/bundle" --warning=no-unknown-keyword
cp -a "$R/bundle/assets/." "$R/web/assets/"
for target in index.html pilot.html academia/index.html academia/pilot.html; do cp "$R/bundle/pilot.html" "$R/web/$target"; done
cp -a "$R/bundle/manifest.webmanifest" "$R/bundle/sw.js" "$R/bundle/offline.html" "$R/bundle/icons" "$R/web/"
printf '%s\n' "$previous" > "$R/previous-release.txt"
rollback(){ trap - ERR INT TERM HUP; ln -sfn "$previous" /srv/aisales/current; systemctl reload nginx || true; echo "ROLLBACK a $previous" >&2; exit 1; }
trap rollback ERR INT TERM HUP
nginx -t 2>/dev/null
ln -sfn "$R" /srv/aisales/current
systemctl reload nginx
bundle=$(grep -o 'assets/pilot-[A-Za-z0-9_-]*\.js' "$R/bundle/pilot.html")
curl -fsS https://aisales.softvibes.pro/ | grep -q "$bundle"
curl -fsS "https://aisales.softvibes.pro/$bundle" -o /dev/null
curl -fsS https://aisales.softvibes.pro/api/ready | grep -q '"status":"ready"'
trap - ERR INT TERM HUP
printf 'OK. Web %s activa (%s). Anterior: %s\n' "$R" "$bundle" "$previous"
