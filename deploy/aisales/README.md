# Despliegue de aisales.softvibes.pro

Copia de lo que está publicado en https://aisales.softvibes.pro al 2026-11-16: release web
`aisales-release-20261114c`, API `aisales-api:20261114c` y servicio editorial `release-20261113`.
Sirve para tener en git todo lo que corre en producción y poder reconstruirlo.

## Qué hay aquí

| Carpeta | Qué es | Cómo se genera |
|---|---|---|
| `web/` | Raíz web que sirve nginx (`/srv/aisales/current/web`) | Ver la tabla de abajo |
| `editorial/release/` | Servicio editorial (MediaHub, CMS, diagnóstico): módulo `growth` + `wsgi.py`, gunicorn en `127.0.0.1:18820` | Código del módulo `growth` de SalesAcademyVibes |
| `nginx/aisales.softvibes.pro.conf` | Sitio nginx: HTTPS, `/api/` → API, rutas editoriales → 18820, estáticos | Copia del servidor |
| `systemd/aisales-editorial.service` | Unidad del servicio editorial | Copia del servidor |
| `api/docker-run.sh` | Cómo corre el contenedor de la API | La imagen sale de `backend/Dockerfile` |
| `pull-snapshot.sh` | Vuelve a copiar aquí lo publicado | — |

### Contenido de `web/`

| Ruta pública | Carpeta | Origen |
|---|---|---|
| `/`, `/pilot.html`, `/academia/` | `index.html`, `pilot.html`, `academia/`, `assets/` | Build de `frontend/` (`npm run build:web`, entrada `pilot.html`) |
| `/manifest.webmanifest`, `/sw.js`, `/offline.html`, `/icons/` | mismos nombres | `frontend/public/` (app instalable) |
| `/stitch/`, `/wireframe/`, `/prototipo/` | `stitch/` (`wireframe` y `prototipo` son enlaces a `stitch`) | Prototipo navegable de 43 pantallas (wireframe) |
| `/stitch-assets/` | `stitch-assets/` | Imágenes y fuentes exportadas de Stitch |
| `/comercial/` | `comercial/` | Landing comercial «Agentes de IA» adaptada de Stitch |
| `/comercial-stitch/01/` … `/25/` | `comercial-stitch/` | Referencia con los 25 diseños originales de Stitch (landing, MediaHub, etc.) |
| `/inicio-movil/` | `inicio-movil/` | Landing comercial en su versión móvil |
| `/wireframe-comercial/` | `wireframe-comercial/` | Wireframe integral de la versión comercial |
| `/experience/` | `experience/` | Navegación y catálogo compartidos por las páginas comerciales (`navigation.js`, `catalog.json`) |

`assets/` conserva también bundles de releases anteriores: nginx los sirve y una pestaña abierta
de una versión vieja todavía puede pedirlos.

## Qué NO está aquí (a propósito)

Este repo es público. No se copian datos ni secretos:

- Base de la API `/srv/aisales/data/academy.sqlite3` y sus respaldos `academy.sqlite3.bak-*`.
- Clave HMAC de códigos Premium `/srv/aisales/data/.license-secret`. Se respalda junto con la base; sin ella, los códigos sin usar dejan de servir.
- Datos del CMS editorial `/var/lib/aisales-editorial` (cuentas, contenido publicado, medios subidos).
- Certificados TLS (`/etc/letsencrypt`) y cualquier `.env`.

## Desplegar

- **App y API:** `work/features/2026-11-14-acceso-free-premium/deploy.sh <sufijo>` en el VPS, con
  `/srv/aisales-web-<sufijo>.tgz` (`frontend/dist`) y `/srv/aisales-backend-<sufijo>.tgz` (`backend/`).
  Respalda la base y la clave, y revierte solo si algo falla.
- **Estáticos de `web/` que no salen del build:** el script copia la release web anterior, así que
  se conservan entre despliegues. Para restaurarlos desde aquí: `rsync -a deploy/aisales/web/ <host>:<release>/web/`.
- **Editorial:** nueva carpeta `/srv/aisales-editorial/release-<fecha>` con `editorial/release/`,
  cambiar el enlace `current` y `systemctl restart aisales-editorial`.

## Actualizar esta copia

```bash
SSH_KEY=~/.ssh/<llave> bash deploy/aisales/pull-snapshot.sh root@<host>
git add deploy/aisales && git commit -m "Update aisales deploy snapshot"
```
