#!/usr/bin/env bash
set -euo pipefail
release=/srv/aisales-training-20261113
previous=$(readlink -f /srv/aisales/current)
test ! -e "$release"
mkdir -p "$release/web" "$release/bundle"
cp -a "$previous/web/." "$release/web/"
tar -xzf /srv/aisales-training-ui-20261113.tgz -C "$release/bundle"
mkdir -p "$release/web/comercial"
cp "$release/web/index.html" "$release/web/comercial/index.html"
mv "$release/web/stitch" "$release/web/comercial-stitch"
mv "$release/web/wireframe" "$release/web/wireframe-comercial"
mkdir -p "$release/web/stitch"
cp -a /srv/aisales-prototipo-20261113/. "$release/web/stitch/"
ln -s stitch "$release/web/wireframe"
# Keep commercial references separate from the training product.
python3 - "$release/web/experience/navigation.js" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text().replace("'/stitch/", "'/comercial-stitch/").replace("'/wireframe/", "'/wireframe-comercial/")
p.write_text(s)
PY
cp -a "$release/bundle/assets/." "$release/web/assets/"
cp "$release/bundle/pilot.html" "$release/web/index.html"
cp "$release/bundle/pilot.html" "$release/web/pilot.html"
cp "$release/bundle/pilot.html" "$release/web/academia/index.html"
cp "$release/bundle/pilot.html" "$release/web/academia/pilot.html"
printf '%s\n' "$previous" > "$release/previous-release.txt"
nginx -t
rollback(){ ln -sfn "$previous" /srv/aisales/current; }
trap rollback ERR
ln -sfn "$release" /srv/aisales/current
curl -fsS https://aisales.softvibes.pro/ | grep -q 'Sales Academy · Tu siguiente nivel'
curl -fsS https://aisales.softvibes.pro/api/auth/demo-users -o /dev/null
curl -fsS https://aisales.softvibes.pro/stitch/catalog.json -o /dev/null
trap - ERR
printf 'Training app active. Previous release preserved: %s\n' "$previous"
