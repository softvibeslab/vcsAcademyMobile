#!/usr/bin/env bash
set -euo pipefail
umask 077
release=/srv/aisales-release-20261120-role-accounts
site=/etc/nginx/sites-available/aisales.softvibes.pro.conf
ops=/srv/aisales/private-ops
python3 /srv/aisales/ops/daily_backup.py /srv/aisales/data/academy.sqlite3 /srv/aisales/private-assets "$ops/backups"
cp "$site" "$ops/backups/20261120-accounts.nginx"
docker run -d --name aisales-pilot-20261120-accounts --restart unless-stopped --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m --cap-drop ALL --security-opt no-new-privileges:true -p 127.0.0.1:18822:8001 -v /srv/aisales/data:/data -v /srv/aisales/private-assets:/private-assets -e VCSA_DB_PATH=/data/academy.sqlite3 -e PILOT_ASSET_DIR=/private-assets -e PILOT_ORIGIN=https://aisales.softvibes.pro -e PILOT_SECURE_COOKIE=true -e PILOT_TRUST_PROXY=true aisales-pilot:20261120-accounts uvicorn backend.app.pilot.app:app --host 0.0.0.0 --port 8001
curl --retry 15 --retry-delay 1 --retry-all-errors --fail --silent --show-error http://127.0.0.1:18822/api/ready
python3 - "$site" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
assert 'root /srv/aisales-release-20261120-pilot-v5/web;' in s
assert 'proxy_pass http://127.0.0.1:18821;' in s
p.write_text(s.replace('root /srv/aisales-release-20261120-pilot-v5/web;','root /srv/aisales-release-20261120-role-accounts/web;').replace('proxy_pass http://127.0.0.1:18821;','proxy_pass http://127.0.0.1:18822;'))
PY
if ! nginx -t; then cp "$ops/backups/20261120-accounts.nginx" "$site"; exit 1; fi
if ! systemctl reload nginx; then cp "$ops/backups/20261120-accounts.nginx" "$site"; exit 1; fi
ln -sfn "$release" /srv/aisales/current
curl --retry 15 --retry-delay 1 --retry-all-errors --fail --silent --show-error https://aisales.softvibes.pro/api/ready

# Final observed revision: image/container aisales-pilot:20261120-accounts-r2
# and loopback 18823 after the legacy users JSON compatibility correction.
# This script records the initial cutover; do not rerun over the active release.
