#!/usr/bin/env bash
# Run on the authorized VPS after uploading a reviewed release directory.
# First private pilot cutover only. Does not restore an old database or remove previous releases.
set -euo pipefail
umask 077
release_dir=${1:?release directory required}
release_id=${2:?release id required}
[[ "$release_dir" == /srv/aisales-release-* && "$release_id" =~ ^[a-zA-Z0-9-]+$ ]] || exit 2
mode=${3:-prepare}
image="aisales-pilot:${release_id}"
container="aisales-pilot-${release_id}"
site=/etc/nginx/sites-available/aisales.softvibes.pro.conf
ops=/srv/aisales/private-ops
mkdir -p "$ops/backups" /srv/aisales/private-assets
chmod 700 "$ops" "$ops/backups" /srv/aisales/private-assets
if [[ "$mode" == prepare ]]; then
  test -f "$release_dir/web/pilot.html"
  test -f "$ops/provision.json"
  test ! -e "$ops/backups/${release_id}.sqlite"
  docker build -f "$release_dir/backend/Dockerfile" -t "$image" "$release_dir"
  docker stop aisales-api
  db_touched=false
  trap 'echo "Prepare failed; database retained. Inspect before retrying." >&2; if [[ "$db_touched" == false ]]; then docker start aisales-api >/dev/null; else echo "Private migration started; legacy API stays stopped." >&2; fi' ERR
  python3 "$release_dir/tools/pilot/backup.py" /srv/aisales/data/academy.sqlite3 "$ops/backups/${release_id}.sqlite" > "$ops/backups/${release_id}.json"
  cp "$site" "$ops/backups/${release_id}.nginx"
  tar -C /srv/aisales -czf "$ops/backups/${release_id}-assets.tar.gz" private-assets
  tar -tzf "$ops/backups/${release_id}-assets.tar.gz" >/dev/null
  db_touched=true
  docker run --rm --network none -v /srv/aisales/data:/data -v /srv/aisales/private-assets:/private-assets -v "$ops":/ops -v "$release_dir/tools":/tools:ro -e PYTHONPATH=/app -e VCSA_DB_PATH=/data/academy.sqlite3 -e PILOT_ASSET_DIR=/private-assets "$image" python /tools/pilot/provision.py /ops/provision.json /ops/credentials
  docker run -d --name "$container" --restart unless-stopped --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m --cap-drop ALL --security-opt no-new-privileges:true -p 127.0.0.1:18821:8001 -v /srv/aisales/data:/data -v /srv/aisales/private-assets:/private-assets -e VCSA_DB_PATH=/data/academy.sqlite3 -e PILOT_ASSET_DIR=/private-assets -e PILOT_ORIGIN=https://aisales.softvibes.pro -e PILOT_SECURE_COOKIE=true -e PILOT_TRUST_PROXY=true "$image" uvicorn backend.app.pilot.app:app --host 0.0.0.0 --port 8001
  for attempt in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:18821/api/ready > "$ops/${release_id}-ready.json"; then break; fi
    sleep 1
  done
  curl -fsS http://127.0.0.1:18821/api/ready >/dev/null
  test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18821/api/pilot/tours)" == 401
  test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18821/api/auth/demo-users)" == 404
  trap - ERR
  echo 'Prepared private API. Previous API stopped for coordinated cutover; activate immediately.'
elif [[ "$mode" == activate ]]; then
  curl -fsS http://127.0.0.1:18821/api/ready >/dev/null
  python3 - "$site" "$release_dir" <<'PY'
from pathlib import Path
import sys
site,release=Path(sys.argv[1]),sys.argv[2]
text=site.read_text()
assert 'root /srv/aisales/current/web;' in text and 'proxy_pass http://127.0.0.1:18819;' in text
text=text.replace('root /srv/aisales/current/web;',f'root {release}/web;').replace('proxy_pass http://127.0.0.1:18819;','proxy_pass http://127.0.0.1:18821;')
text=text.replace('proxy_cookie_flags vcsa_session secure httponly samesite=lax;','proxy_cookie_flags __Host-aisales_session secure httponly samesite=lax;')
site.write_text(text)
PY
  if ! nginx -t; then cp "$ops/backups/${release_id}.nginx" "$site"; exit 1; fi
  if ! systemctl reload nginx; then cp "$ops/backups/${release_id}.nginx" "$site"; exit 1; fi
  ln -sfn "$release_dir" /srv/aisales/current
  curl -fsS https://aisales.softvibes.pro/api/ready
  echo 'Activated matching web/API release. Database and previous release retained.'
else
  echo 'Mode must be prepare or activate' >&2; exit 2
fi
