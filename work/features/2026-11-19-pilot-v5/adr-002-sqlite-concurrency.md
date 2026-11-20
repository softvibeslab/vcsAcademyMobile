# ADR-002 · Concurrencia de SQLite y cálculo de métricas

**Status:** accepted
**Date:** 2026-11-20

## Contexto

El ensayo sintético en VPS con 20 sesiones y 10 000 tours superó p95 de un segundo en métricas. SQLite usaba journal DELETE y las métricas cargaban todas las filas del periodo en Python para cada sesión.

## Decisión

Activar WAL al inicializar y mantener `synchronous=FULL` en cada conexión. Conservar las transacciones `BEGIN IMMEDIATE`, actualización de actividad por petición, validación de permisos y vencimiento por inactividad de 30 minutos. Calcular SUM/COUNT por usuario, organización y rango en SQLite con índice cubriente; mantener las fórmulas y redondeo Decimal en un helper compartido con el oráculo puro.

No se introduce caché de permisos, datos de otras organizaciones ni aproximación en porcentajes. La API conserva el mismo contrato. El runtime sigue siendo SQLite, ya aprobado por CP2; esta decisión detalla su implementación.

La medición HTTP posterior aún mostró variación por competencia entre escritores: Home p95 de 1039.6 ms, aunque las consultas agregadas eran más rápidas. Se incorpora un `threading.RLock` de proceso alrededor de `db.transaction`, antes de abrir la conexión y de `BEGIN IMMEDIATE`. El único proceso uvicorn actual encola sus escritores en memoria en vez de hacerlos competir mediante el backoff de SQLite. `db.read` no toma este lock; WAL permite consultar el estado confirmado mientras otra transacción escribe.

La cola se libera también cuando una excepción causa rollback. No se agrupan ni omiten actualizaciones de `last_seen_at`: siguen ocurriendo en cada petición autenticada. No se cambia `synchronous=FULL`, el timeout de SQLite, la caducidad de sesión, la comprobación de revocación ni el umbral de rendimiento.

El lock no coordina procesos distintos. `BEGIN IMMEDIATE` y `busy_timeout` conservan esa protección en SQLite; una ampliación a varios workers exige nueva medición y no hereda la mejora de cola observada en un proceso. Tampoco se promete un orden FIFO estricto del lock de Python.

## Verificación

`core-wal-red.txt` documenta journal DELETE antes del cambio; `core-wal-green.txt` prueba WAL y durabilidad FULL. `test_activity.py` compara agregados SQL contra los casos de referencia de tours/cancelaciones y presupuesto mensual. Los ensayos `operations-vps*.txt` conservan resultados fallidos y las mediciones posteriores, sin cambiar umbrales. La medición HTTP final usa un servidor uvicorn real y las dos peticiones concurrentes de Home.

`core-write-queue-red.txt` observa que el segundo escritor abría SQLite antes de esperar. Su GREEN comprueba espera antes de conectar, lectura simultánea del estado confirmado, rollback y liberación del siguiente escritor. La suite final registra 77 pruebas aprobadas en `backend-final.txt`.

`operations-vps-http-final.txt` registra 20 sesiones, 10 000 tours y 300 GET contra uvicorn real en el VPS: p95 Home paralelo 461.84 ms, metrics 260.12 ms, followups 336.74 ms, tours 320.00 ms, notes 235.37 ms y lessons 187.14 ms. Pasan tanto el gate de cada API como el de Home, sin elevar el límite de 1000 ms. El ensayo es sintético en HTTP del entorno y no mide la red pública del usuario ni reproducción remota de video.

## Operación

Respaldar con API SQLite, nunca copiar solo el archivo principal mientras WAL está activo. Los snapshots de `backup.py` y `daily_backup.py` usan esa API y verifican restore. No restaurar un snapshot antiguo encima de nuevas ventas al revertir código.
