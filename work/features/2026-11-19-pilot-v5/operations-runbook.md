# Operación y publicación del piloto v5

Rama `feature/pilot-v5`; destino aprobado `aisales.softvibes.pro`. Este procedimiento es el primer corte a la API privada; futuras releases deben alternar puertos/versiones y no repetir el script de arranque.

## Preparación

- Ejecutar pruebas, build, revisión visual, privacidad, ensayo de migración/restauración y rendimiento sintético antes del corte.
- Copiar el sitio actual a una carpeta nueva; conservar landing, medios y archivos históricos. Cambiar únicamente las entradas de app y agregar assets con hash.
- Manifest de organización/cuenta autorizado fuera del repositorio y del webroot. Asignación del dueño confirmada por el usuario en conversación; ninguna cuenta demo se incorpora automáticamente al piloto.
- Crear respaldo SQLite mediante su API online, verificar integridad y restauración aislada; respaldar archivos privados y configuración nginx. Copiar el respaldo a almacenamiento privado del operador fuera del servidor.
- Excepción TDD: scripts de infraestructura y publicación. Se validan sintaxis, migración repetible, restore real, checksums y respuestas HTTP; los módulos funcionales tienen RED/GREEN independiente.

## Corte

`deploy-pilot.sh <release_dir> <release_id> prepare` construye imagen primero, detiene la API heredada, respalda datos y aplica migración aditiva/provisión explícita. La API nueva escucha solo en loopback. Seguir inmediatamente con `activate`: nginx publica frontend/API de la misma versión en una recarga y conserva rutas de marketing existentes. No se restaura ni reemplaza la base después de escrituras.

Las claves temporales quedan en `private-ops/credentials`, fuera del sitio, con modo 600; vencen a las 48 horas y exigen cambio. No se imprimen ni se incluyen en Git. Recuperación/revocación por CLI, sin tokens públicos.

## Recuperación

Un fallo antes de iniciar la migración conserva la base y puede reiniciar la API anterior; después de empezar la migración, el servicio permanece detenido hasta corregir la API privada. No se reabre legacy sobre cuentas ya migradas; no se borran cambios ni backups. Si `nginx -t` o la recarga falla, se conserva/restituye su configuración anterior. Después de activar, una incidencia se atiende poniendo el sitio/API en mantenimiento, respaldando la base actual y corrigiendo o desplegando una versión privada compatible. Nunca habilitar otra vez endpoints heredados públicos con los datos del piloto, ni restaurar el snapshot de antes del despliegue sobre ventas nuevas.

Verificar integridad, count de tours/notas/metas y hash de contenido legacy. El ensayo `verify_operations.py` prueba una venta posterior al snapshot y confirma que se conserva al mantener la base actual durante la reversión de código.

## Conservación y monitoreo

Registros del piloto conservados para revisión posterior; notas/Diario hasta eliminación del autor. Backups diarios con retención de siete días, aprobados explícitamente por el propietario; limpieza diaria (máximo menor de ocho días). No se elimina silenciosamente el histórico. Respaldos guardados fuera del webroot, sin acceso de nginx; cuota PDF 1 GiB por organización y archivos individuales de 10 MiB. Revisar espacio, `/api/ready`, errores, fecha del último respaldo y resultado de restore. Ningún contenido de notas o contraseñas se registra en evidencia pública.

## Copia fuera del VPS

`sync_backup.py` descarga únicamente archivos diarios verificados mediante SSH a un directorio privado del operador. Conserva permisos 600/700 y antigüedad del servidor; borra solo copias diarias propias de más de siete días. La tarea local requiere que este equipo esté encendido y tenga conectividad; el respaldo diario del VPS se ejecuta independientemente.
