# Carrera del test al cargar recomendaciones

Una corrida pública read-only en WebKit 390×844 reprodujo el fallo sin modificar la visita DEMO.

- Antes del scroll: catálogo pendiente, cero enlaces de recomendación.
- Tras `scrollIntoViewIfNeeded`: scrollTop786; botón Eliminar visita visible entre y747.75 e y791.75.
- Cien milisegundos después: catálogo listo y dos recomendaciones. El scrollTop permaneció786; el botón quedó entre y1017.94 e y1061.94, fuera de viewport844. La altura del modal seguía844 y scroll global0.
- `results.json` conserva estados, rectángulos y respuestas HTTP. `writes:[]` y la visita antes/después es idéntica.

El test anterior desplazaba el botón antes de que terminara de crecer el contenido asíncrono. Se mantuvo la exigencia `toBeInViewport`; se agregó una precondición explícita: tarjetas de recomendación correspondientes al análisis guardado presentes y texto de carga oculto. No se modificó UI, datos, API, build ni se forzó el scroll con un valor arbitrario.

La corrida fallida original completa se conserva en `../live-catalog-first-run/`. La repetición final de iPhone queda en `../live-iphone-catalog-green/`. La sesión temporal se cerró al finalizar.
