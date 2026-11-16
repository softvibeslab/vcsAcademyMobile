#!/usr/bin/env bash
# Vuelve a copiar a deploy/aisales lo que está publicado en aisales.softvibes.pro.
# Uso: SSH_KEY=~/.ssh/<llave> bash deploy/aisales/pull-snapshot.sh root@<host>
# Nunca trae datos: base SQLite, respaldos, .license-secret, /var/lib/aisales-editorial ni .env.
set -euo pipefail
HOST=${1:?uso: pull-snapshot.sh usuario@host}
SSH="ssh -i ${SSH_KEY:?define SSH_KEY}"
D=$(cd "$(dirname "$0")" && pwd)
REL=$($SSH "$HOST" 'readlink -f /srv/aisales/current')
EDI=$($SSH "$HOST" 'readlink -f /srv/aisales-editorial/current')
rsync -a --delete --no-links --exclude='.DS_Store' -e "$SSH" "$HOST:$REL/web/" "$D/web/"
(cd "$D/web" && ln -sfn stitch prototipo && ln -sfn stitch wireframe)
rsync -a --delete --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' -e "$SSH" "$HOST:$EDI/" "$D/editorial/release/"
$SSH "$HOST" 'cat /etc/nginx/sites-available/aisales.softvibes.pro.conf' > "$D/nginx/aisales.softvibes.pro.conf"
$SSH "$HOST" 'systemctl cat aisales-editorial.service' > "$D/systemd/aisales-editorial.service"
printf 'Snapshot de %s y %s\n' "$REL" "$EDI"
