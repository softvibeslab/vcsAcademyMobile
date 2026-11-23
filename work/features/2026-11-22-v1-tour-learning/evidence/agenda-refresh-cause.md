# Hallazgo de QA pública: aviso de actualización en Agenda

## Causa comprobada

Una de tres repeticiones en WebKit 390×844, contra el sitio público con visitas sintéticas propias, midió documento de 868 px. Agenda medía 844 px pero comenzaba en y=24; el siguiente frame midió 844 px y y=0. No se cambió la expectativa para ocultar la diferencia. `agenda-geometry/results.json` conserva las dimensiones por frame; todos los registros creados por esa prueba se eliminaron y las sesiones se cerraron.

El origen era el aviso global **Actualizando…** insertado antes de Agenda mientras el guardado refrescaba los datos generales. El aviso ocupa 14 px más 10 px de margen; Agenda conservaba una altura fija de 100dvh. Por ello sumaban 868 px. La captura final de 844 px sólo ocurría cuando ya había finalizado la respuesta pendiente.

## RED → GREEN

`verify-agenda-refresh.cjs` demora una respuesta real de `/api/dashboard/rep` después de guardar; no sustituye datos ni respuesta. Se ejecutó en API local con datos sintéticos, ambos temas WebKit 390×844.

| Estado | Evidencia | Resultado |
|---|---|---|
| RED | agenda-refresh-red.json | 2/2 fallan: documento868, navegación bottom868. Aviso visible. |
| RED intermedio | agenda-refresh-specificity-red.json | El contenedor estaba corregido, pero una regla posterior aún fijaba el dispositivo en844. |
| GREEN | agenda-refresh-green.json | 2/2 pasan: documento844 y navegación bottom844 durante y después de actualizar. Aviso sigue visible; Agenda recibe820 durante la carga y844 al terminar. |

Cambio de producto limitado a reglas de contenedor en `frontend/src/pilot/smart-agenda.css`. El contenedor comparte 100dvh entre el aviso y la agenda mediante flex; no se oculta el aviso ni se superpone sobre controles. La altura del dispositivo se adapta al espacio asignado. No cambia APIs, contratos, datos ni otros módulos.

La captura de aprendizaje en `verify-tours.cjs` desplaza únicamente el panel interno hasta la recomendación y comprueba que el enlace y el FAB sean visibles, sin cambiar scrollY global. Sirve para documentar visualmente el análisis; no altera UI.
