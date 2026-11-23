# Revisión de la prueba de altura reducida

`viewport-first-run/results.json` conserva la matriz: seis combinaciones completas de navegador/tema pasan. El séptimo caso usaba 390×460 durante todo el recorrido.

En ese caso el modal y el editor funcionaron: diálogo de 460 px, cuerpo de 395 px, desplazamiento interno, cierre visible, Escape anidado y devolución de foco. El fallo ocurrió después de cerrar el modal, al intentar reabrirlo desde la tarjeta de Agenda: el calendario existente mantiene un mínimo de 264 px y deja el panel diario sin espacio a esa altura.

La prueba de 460 px se había añadido para aproximar la presencia del teclado, pero no restauraba la altura cuando se cerraba el editor. Se corrigió esa premisa: conserva todas las comprobaciones del modal y edición a 460 px; luego restaura 390×844 antes de regresar al calendario y registra `restoredViewport`.

No se modificó la implementación para este ajuste ni se relajaron las comprobaciones del modal. `keyboard-green/results.json` registra la nueva ejecución.

**Decisión pendiente, fuera de alcance:** adaptar todo el calendario a ventanas de 460 px de altura si se requiere uso permanente en horizontal o ventanas bajas. El arreglo actual cubre el modal y los tamaños móviles solicitados; no declara esa compatibilidad adicional.
