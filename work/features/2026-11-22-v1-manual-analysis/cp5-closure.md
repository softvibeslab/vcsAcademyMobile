# CP5 · Entrega publicada

**Status:** completed
**Fecha:** 2026-11-22 (America/Cancun)
**Rama:** feature/v1-manual-visit-analysis
**URL:** https://aisalesv1.softvibes.pro/?v=manual-analysis#agenda

## Resultado

Guardar feedback y abrir/recargar el detalle no invocan IA. El usuario puede escribir un aporte opcional y pulsar Analizar; primero se guarda mediante la edición de contexto existente y después se analiza la revisión resultante. La respuesta nueva contiene un resumen breve y tres acciones numeradas. El aporte llega a Hermes y se conserva en la visita.

El reintento mantiene UUID y cuerpo para evitar duplicados incluso cuando la respuesta de PATCH se pierde después del guardado. Un conflicto requiere actualizar/revisar el detalle. Los análisis anteriores se conservan; para producir otro de una revisión ready se añade aporte o se edita contexto.

## Evidencia

- 18 pruebas de análisis,19 de visitas,17 de Coach,79 de V5,70 de frontend/modelos y5 de dominio aprobadas.
- RED→GREEN de análisis automático, brevedad y duplicación por pérdida de respuesta.
- Builds V1/V5 aprobados. QA local y pública con3 casos cada una; adicionalmente3 casos del modal con la DEMO anterior sin mutarla.
- Candidata y flujo público verifican respuestas reales Hermes; datos sintéticos nuevos eliminados al finalizar.
- 21 archivos del paquete verificados y9 comprobaciones públicas de HTTPS/HTML/JS/CSS/API correctas.
- Esquema, cuentas, DEMO persistente, V5 y mantenimiento sin cambios; base productiva no copiada ni migrada.
- TRUST5, revisión independiente, escaneo de archivos y gate estricto documentados en CP4/evidence.

## Operación

Release `/srv/aisales-v1-release-20261122-manual-analysis/web`; contenedor `aisales-v1-manual-analysis-20261122`; imagen `sha256:ed2da844f2d1588dff0e0dcc687e6ffb1587f42f0cfba33cf43636b13817830d`.

Manifiesto y activación: `evidence/release-manifest.json`, `evidence/release-activation.json`. Reversión en README.md, sin restaurar DB y conservando el timer de caducidad. No quedan requisitos funcionales pendientes de esta solicitud.
