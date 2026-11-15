# Publicación de aisales.softvibes.pro

Autorización: usuario pidió «puedes hacer deploy en aisales.softvibes.pro» el 2026-11-13.

## Arquitectura
- DNS A `aisales` → `76.13.231.12`; se añadió únicamente este nombre.
- Release: `/srv/aisales-release-20261113`; enlace `/srv/aisales/current`.
- Frontend compilado: `web/`; `pilot.html` copiado a `index.html` para abrir la nueva app desde `/`.
- API: Docker `aisales-api`, imagen `aisales-api:20261113`, restart unless-stopped, puerto privado `127.0.0.1:18819`.
- Base nueva y persistente: `/srv/aisales/data/academy.sqlite3`. No se copió ninguna base local ni de las otras apps.
- Nginx: `/etc/nginx/sites-available/aisales.softvibes.pro.conf` con enlace en sites-enabled; configuración fuente en `nginx.conf`.
- HTTPS: certificado independiente `aisales.softvibes.pro`, ACME webroot existente; renovación mediante certbot.timer existente.

## Alcance
Versión de demostración funcional: conserva las cuentas demo sintéticas y el proveedor local de entrenamiento del backend. No usa datos comerciales reales. Notebook/Diario/meta mensual se guardan por usuario en el navegador y por origen: las notas de localhost no aparecen en este dominio.

## Operación y reversión
Actualizar mediante un nuevo directorio de release y una imagen etiquetada; verificar backend y `nginx -t` antes de mover el enlace/recargar. Preservar `/srv/aisales/data` en futuras actualizaciones.
Para retirar esta primera publicación: deshabilitar únicamente el enlace Nginx de aisales, validar y recargar Nginx, detener `aisales-api` y retirar únicamente el registro DNS `aisales` si se desea. No borrar datos ni cambiar configuraciones de otros dominios. El certificado es exclusivo de este nombre.

## Verificación ejecutada
- Build Vite de ambas entradas aprobado (`build.txt`).
- `nginx -t`: correcto antes de ambas recargas.
- Certificado emitido y HTTPS público validado sin ignorar errores TLS. La consulta inmediata durante la recarga vio transitoriamente el certificado anterior del listener; la comprobación posterior y Chromium validaron el certificado del dominio correctamente.
- DNS público: `aisales.softvibes.pro → 76.13.231.12`.
- `/api/ready`: status ready; database, seed_users y seed_resources true.
- Chromium: HTTP 200 en raíz, selector Rep, login real, destino Roadmap conservado, 11 pasos, Home conectado, móvil 390px sin desbordamiento y logout; cero errores de ejecución (`public-results.json`).
- Capturas: `public-onboarding.png` y `public-home.png`.

No se modificaron manifiestos ni servicios de otras aplicaciones. La subida incluyó solo archivos Python, requirements/Dockerfile y build web; se excluyeron bases, entornos virtuales, credenciales y archivos .env.

## Prototipo navegable publicado
Solicitud posterior: publicar el explorador que se servía en localhost:8765 y enviar los accesos por correo.
- URL: https://aisales.softvibes.pro/prototipo/
- Archivos estáticos: `/srv/aisales-prototipo-20261113`.
- Enlace: `/srv/aisales/current/web/prototipo` → directorio anterior. Conservar este enlace cuando se cambie de release web.
- 43 pantallas, ocho recorridos. Sin login ni backend; se publicaron solo archivos estáticos del explorador.
- La app funcional sigue en la raíz del dominio.
- Los siete usuarios demo del catálogo publicado se verificaron mediante login y logout; las contraseñas no se guardan en esta documentación.
