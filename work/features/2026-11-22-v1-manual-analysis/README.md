# Aprendizaje con IA bajo demanda

En **Agenda**, abre una visita y baja a **Aprendizaje con IA**.

1. Escribe un aporte opcional: una duda, detalle o algo que quieras practicar.
2. Pulsa **Analizar**. Si escribiste un aporte, primero se guarda en el contexto de esa visita.
3. Lee el resumen y los tres pasos a seguir; las recomendaciones abren las lecciones existentes del Roadmap.

Guardar feedback o abrir el detalle ya no genera análisis. Si Hermes falla, la visita y el aporte guardado permanecen; **Reintentar análisis** retoma la solicitud. Para actualizar un resultado disponible, añade un aporte o edita el contexto.

Contrato: [cp2-spec.md](cp2-spec.md). Validación: [cp4-validation.md](cp4-validation.md). Se conservan el modal completo, los temas claro/oscuro y los análisis guardados antes de esta actualización.

## Operación y reversión

Sólo V1 (`aisalesv1.softvibes.pro`). Se deriva la imagen API activa y se reemplaza únicamente `coach_hermes.py`; no hay migración de datos. La candidata usa una base nueva con datos ficticios y la elimina al terminar. El operador verifica archivos, cuentas/esquema, DEMO persistente, V5 y mantenimiento antes/después.

Si se revierte después de activar, detener `aisales-v1-manual-analysis-20261122`, iniciar `aisales-v1-tours-20261122` y restaurar `/srv/aisales-v1/ops/20261122-manual-analysis/nginx-before.conf` en el vhost V1; validar `nginx -t` y recargar Nginx. No restaurar la base de datos ni detener el timer de caducidad. La reversión devuelve también el disparo automático del análisis del flujo anterior.
