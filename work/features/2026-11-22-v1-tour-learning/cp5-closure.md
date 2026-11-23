# CP5 · Entrega publicada

**Status:** implementada, publicada y verificada.

Rama `feature/v1-tour-learning`. Aprobación del PO: «si hazlo !», conversación del 2026-11-22 (America/Cancun). Historia LISTA y contrato CP2 v1 cumplidos.

## Resultado

- Coach propone **Iniciar visita**, **Programar tour** o **Registrar cómo me fue** al hablar de un tour, con revisión y confirmación antes de guardar.
- Cada visita tiene contexto persistido, fecha/hora de Cancún, estado y feedback. Hermes recibe únicamente el registro seleccionado y autorizado, incluso después de recargar.
- Agenda y Smart Diary muestran detalle y aprendizaje; Roadmap enlaza lecciones existentes y permitidas. El fallo de análisis permite reintentar sin perder lo registrado.
- Los registros son independientes del Goal Sheet y no modifican los KPIs. Las notas locales anteriores sólo se copian tras una acción explícita.
- Se conserva light/dark y el layout móvil; el aviso de actualización comparte el viewport con Agenda.

Acceso: [Coach](https://aisalesv1.softvibes.pro/#coach), [Agenda](https://aisalesv1.softvibes.pro/#agenda), [Roadmap](https://aisalesv1.softvibes.pro/#roadmap).

## Evidencia de cierre

CP4 enlaza pruebas RED → GREEN, regresiones de V1/V5, builds separados, QA móvil emulada y recorridos públicos. `live/results.json` registra 13 verificaciones y 14 capturas; `public-artifacts.json` verifica HTTPS, hashes y disponibilidad. El análisis y la recuperación de contexto se probaron contra Hermes real. Todos los registros ficticios propios se eliminan al terminar.

La publicación está identificada por `release-activation.txt` y `web-r2-activation.json`. [Operación y reversión](operations.md) documenta versiones, caducidad, respaldo, mantenimiento y retorno a la versión previa. V5 conserva sus artefactos y contenedor.

## Límites conocidos

La validación móvil usa emulación Chromium/WebKit, no dispositivos físicos. La cuenta demo compartida comparte propietario; el aislamiento se verifica entre cuentas distintas. La IA puede no recomendar una lección si ninguna disponible se justifica. Se guarda el contexto confirmado de la visita; el chat completo sigue siendo transitorio.

La caducidad de visitas es de 30 días según estado/fecha del contrato; la purga diaria puede tardar hasta un día adicional. Los respaldos privados se conservan siete días adicionales. Las notas personales anteriores no cambian su retención.
