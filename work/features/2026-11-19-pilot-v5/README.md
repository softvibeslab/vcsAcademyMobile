# Sales Academy · Piloto v5

**Actualización:** 2026-11-20 · America/Cancun.
**Estado:** implementado y publicado el 2026-11-20.
**Rama:** `feature/pilot-v5`.
**Destino autorizado:** `https://aisales.softvibes.pro`.

El PO autorizó: «lo apruebo y porfa crea otra rama para desarrollar e implementar esto y cuando termines publicalo». La [aprobación](approval.md) cubre SPEC v1, anexos, rama nueva y publicación tras validación. La [historia](../../stories/2026-11-19-pilot-v5.md) pasó el gate LISTA antes de implementar. La publicación fue verificada; la aceptación de negocio corresponde al PO.

## Qué se construyó

App privada con Home, Route y Resources en inglés/español, varios tours diarios, seis KPIs y meta mensual definitiva. Incluye Ruta editable por el dueño, video/PDF privado, solicitudes de acceso, notas/Diario privados, dos calculadoras, equipo por organización y marca limitada a nombre/título. Las cuentas se administran manualmente y la contraseña temporal exige cambio.

El backend del piloto está separado de las APIs demo, Coach, registro abierto y administración global anteriores. El histórico diario permanece como consulta propia y no se transforma en tours inventados. Notas y Diario no se comparten con el dueño ni con IA.

## Documentos de ejecución

1. [SPEC aprobado](cp2-spec.md), [UX](ux-spec.md) y [API/datos](contracts-backend.md).
2. [CP3: implementación y rutas reales](cp3-implementation-plan.md).
3. [CP4: pruebas, matriz de 24 criterios y pendientes](cp4-validation.md).
4. [Plan de pruebas y datos sintéticos](test-plan.md).
5. [ADR de separación](adr-001-pilot-boundary.md), [concurrencia SQLite](adr-002-sqlite-concurrency.md) y [riesgos](threat-model.md).
6. [Operación/publicación](operations-runbook.md) y [CP5](cp5-closure.md).

## Evidencia disponible

La suite integrada backend registró **77 pruebas aprobadas** y los modelos frontend **12 pruebas aprobadas**. Hay RED→GREEN de identidad, tours/KPIs, notas/Diario, learning, preferencias, permisos, correcciones y auditoría. Las pruebas usan bases, cuentas y archivos sintéticos independientes.

La revisión adversarial comprobó CSRF/origen, expiración/revocación de sesiones, legacy público cerrado, privacidad y migración repetible. El ensayo operativo local conserva conteos/hash legacy, restaura una copia SQLite y archivo sintético, y preserva una venta posterior al snapshot usando la base vigente. Su medición local no certifica latencia del VPS ni conmutación real de nginx.

El build web y cinco pruebas de regresión del dominio anterior también pasan. El navegador registra 17 recorridos aprobados y cero errores JS; se verificó layout CSS 200% en la app y zoom nativo 200% en bienvenida/login. No se realizó validación humana con lector de pantalla. HTTP sintético en el VPS pasa: Home p95 461.84 ms con 20 sesiones y 10,000 tours. Despliegue y smoke final públicos verificados. CP4 registra evidencia y límites. No hay UAT del PO registrada en esta actualización.

El resumen adjunto informa 33 CRs sin sus fichas; los IDs REQ/AC de esta feature son propios y trazan al resumen, no se presentan como los 33 originales. El objetivo de arranque del contrato es 2026-12-14; los materiales reales requieren revisión editorial del responsable.

## Publicación y acceso

https://aisales.softvibes.pro/ — código de aplicación `59210be`, release `20261120-v5`. Cuenta inicial configurada como dueño según confirmación del usuario; claves temporales fuera del sitio y del repositorio, con cambio obligatorio. Hay 11 lecciones en borrador para revisión/carga de material real. Respaldos diarios a las 09:30 UTC, retención siete días, copia privada del operador a las 04:45 locales cuando el equipo está disponible. Ver [cierre](cp5-closure.md).
