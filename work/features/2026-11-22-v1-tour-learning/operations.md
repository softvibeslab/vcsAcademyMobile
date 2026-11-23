# Operación · visitas y aprendizaje V1

La aprobación del PO («si hazlo !», 2026-11-22, America/Cancun) cubre implementación, QA y publicación del contrato v1. La entrega afecta exclusivamente a `aisalesv1.softvibes.pro` y a su perfil dedicado de Hermes.

## Versión activa

- Web: `/srv/aisales-v1-release-20261122-tours-r2/web`.
- API: contenedor `aisales-v1-tours-20261122`, puerto local 18824.
- Imagen: `sha256:fca7efccd615e61adde9c395893fe40125c767cb99a72936b210081ab4d66a00`.
- Base independiente: `/srv/aisales-v1/data/academy.sqlite3`.
- Perfil remoto: `sales-academy-coach-v1` en 2.25.231.154, mediante el túnel ya existente. Sin herramientas ni memoria global compartida.
- Paquete inicial: `evidence/release-manifest.json`; activación y smoke real: `evidence/release-activation.txt`.

El despliegue verificó primero una copia de la base, creando, analizando y eliminando una visita ficticia. Después repitió ese recorrido en la API activa. Las tablas legacy, los usuarios, las licencias y los permisos conservaron su huella; se añadieron exclusivamente las tres tablas de visitas. V5 conservó contenedor, imagen, configuración Nginx y HTML.

La revisión web r2 corrige el aviso de actualización que añadía altura a Agenda. `evidence/web-r2-manifest.json` y `evidence/web-r2-activation.json` identifican ese artefacto; no se reiniciaron las APIs. La evidencia pública final compara el build contra el manifest r2.

## Caducidad y respaldos

El acceso a visitas y su uso por Hermes se bloquean al vencer el plazo de 30 días establecido por CP2. La limpieza física diaria elimina registros caducados y análisis relacionados; las notas personales anteriores no cambian.

`salesacademy-v1-tours-maintenance.timer` ejecuta a las 04:15 de America/Cancun, con `Persistent=true`. Su servicio usa una imagen fijada por hash, independiente del contenedor web: purga, verifica la copia SQLite y conserva respaldos diarios por siete días en `/srv/aisales-v1/backups/tour-learning` (directorio 0700, archivos 0600). El proceso utiliza un bloqueo para evitar ejecuciones simultáneas.

La revisión posterior añadió caducidad de archivos parciales propios interrumpidos. El script operativo activo tiene SHA256 `8cbaab8ac5dd633519dc13bf0406435cbab9241e1415b75a3e4dcb9312fdcabf`; la actualización y ejecución satisfactoria están en `evidence/maintenance-activation.json`. El manifest inicial sigue describiendo el paquete original; este cambio posterior afecta sólo al script de mantenimiento, no a la imagen API ni al frontend.

Comprobaciones de operación sin mostrar registros ni secretos:

```sh
systemctl is-active salesacademy-v1-tours-maintenance.timer
systemctl show salesacademy-v1-tours-maintenance.service -p ExecMainStatus
systemctl list-timers salesacademy-v1-tours-maintenance.timer
```

Los respaldos pueden conservar datos eliminados durante un máximo adicional de siete días. Toda restauración debe ejecutar la purga vigente antes de abrir el servicio. Los nuevos snapshots operativos que contengan visitas también deben sujetarse a esa retención; el snapshot previo de esta entrega se tomó antes de crear las tablas nuevas.

## Reversión documentada

No se ejecutó una reversión en producción. El operador de despliegue incluye rollback automático de API/Nginx si falla la activación.

Para volver manualmente a la versión anterior, detener `aisales-v1-tours-20261122`, iniciar el contenedor conservado `aisales-v1-coach-20261122` y restaurar la raíz web `/srv/aisales-v1-release-20261122-coach-r2/web` mediante la configuración previa guardada en `/srv/aisales-v1/ops/20261122-tours/nginx-before.conf`. Validar `nginx -t` antes de recargar.

No restaurar la base ni eliminar las tablas nuevas durante esa reversión: podría borrar visitas guardadas después de la publicación. Mantener el timer de caducidad y su imagen fijada activos. El SOUL actualizado es compatible con el Coach anterior; sus copias previas están en `/var/backups/salesacademy-coach-v1-tour-20261122` del servidor Hermes.

## Verificación pública

Los scripts `verify-tours.cjs` y `verify-public-artifacts.py --after-activation` producen evidencia separada de QA local. El primero utiliza únicamente registros ficticios propios y los elimina al finalizar; el segundo sólo realiza GET HTTPS y compara hashes. Las capturas móviles corresponden a emulación, no a dispositivos físicos.
