# FTD · Fidelidad al calendario mensual adjunto

**Status:** done (publicado y verificado el 2026-11-22)
**Lane:** FTD
**Branch:** feature/v1-monthly-agenda-design
**Date:** 2026-11-22

## Claridad

- **Solicitud:** «analiza bien la interfaz y respeta el diseño no te inventes nada agrega soloi un boton flotante derechja inferior con opciones para agregar seguimiento».
- **Aclaración posterior:** «solo lo de agregar seguimiento». El FAB abre directamente el flujo existente; sin menú de acciones inventadas.
- **Entendimiento:** reemplazar el calendario semanal publicado por el layout mensual del HTML/PNG entregados. Conservar blanco, rojo, tipografía DM Sans, cuadrícula, chips, panel inferior y navegación visual. Única adición visible: convertir el + negro inferior derecho en FAB de Agregar seguimiento, evitando duplicarlo.
- **Hecho cuando:** #agenda reproduce la estructura y proporciones de code.html/screen.png, las fechas son correctas, los datos provienen del Goal Sheet/reminders existentes, el FAB abre el formulario actual con foco en seguimiento y fecha seleccionada, y el resultado está verificado y publicado en V1.

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| 1 | ¿Qué diseño es autoritativo? | Archivos adjuntos code.html y screen.png de stitch_sales_academy_smart_agenda_redise_o_ux_material_3; DESIGN.md aporta tokens, no instrucciones para reescribir otros módulos. | Respondida |
| 2 | ¿Qué opciones del FAB? | Usuario: «solo lo de agregar seguimiento». Una acción directa. | Respondida |
| 3 | ¿Se copian las cifras y estados del mockup? | No: son ejemplos de diseño. La solicitud exige no inventar; se usan registros reales disponibles y guiones para campos ausentes. | Respondida |

## Intencion

Corregir la interpretación visual anterior. La referencia es mensual, blanco/rojo y con hoja inferior, no una variación del calendario semanal de V1. Priorizar fidelidad al archivo entregado y reutilizar el flujo actual de seguimiento.

## Alcance

- Una capa frontend, contrato aprobado de Goal Sheet/reminders del piloto legacy; sin API, DB, permisos ni dependencias nuevas.
- Contenedor móvil máximo 430 px/alto 932 px del HTML, centrado en escritorio sin inventar sidebar. Marco/indicadores decorativos del export no representan capacidades del dispositivo. Se conserva zoom del navegador.
- Shell exclusivo de #agenda: no mezclar topbar, footer y dock verdes anteriores con el diseño adjunto. Los demás módulos conservan su shell.
- Encabezado del año, título de mes, miniindicador, controles existentes, cuadrícula domingo–sábado, eventos compactos y selección circular roja. El HTML contiene fechas desplazadas: se generan fechas reales; noviembre 2026 empieza en domingo y 6 es viernes.
- Panel inferior con fecha, resumen y tarjeta en tonos del diseño. Ventas, volumen, notas y seguimientos vienen de data.entries/reminders. Comisión, enganche, spiffs, hora/lead y estado procesable no existen: no se inventan. Sus espacios monetarios muestran —; no se agrega un backend para llenarlos.
- Controles ya dibujados: año abre selección de mes; Cambiar vista/Historial muestra lista de registros existentes; Buscar filtra el contenido del mes; Todos/Ventas/Spiffs filtran solo los tipos disponibles. Spiffs tiene estado vacío. Hoy selecciona hoy. El + superior conserva acceso a registro Goal Sheet. No nuevas rutas inventadas.
- Navegación del layout: Hoy -> #home, GoalSheet -> #agenda, Historial -> vista de registros dentro de agenda, Coaching -> #coach. La guía general del DESIGN.md no cambia módulos ni permisos.
- FAB inferior derecho, negro y con +, sustituye el + negro existente y tiene nombre Agregar seguimiento. Abre Goal Sheet para un registro no futuro y prellena Fecha de seguimiento con el día elegido; enfoca Acción. No guarda ni crea un tour automáticamente; conserva guardado explícito actual. La fecha futura de seguimiento nunca se convierte en fecha de registro.
- Componentes/helpers reutilizables separados; estilos aislados y mismas herramientas/build V1 del despliegue anterior.

## Escalamiento

FTD: corrección visual solicitada y acción frontend existente; una capa, sin contrato entre capas, esquema, dependencias o cambios de autenticación. No se amplía funcionalidad de negocio del documento adjunto. Cualquier dato nuevo o módulo diferente requiere decisión posterior.

## Checklist

- [x] T01-test: RED de cuadrícula mensual correcta, cruces de año, adaptación de datos y ausencia de importes no disponibles.
- [x] T01-impl: helpers pasan las mismas pruebas.
- [x] T02-test: RED UI por ausencia del layout mensual y FAB directo en agenda actual.
- [x] T02-impl: estructura mensual fiel, panel inferior y FAB con fecha/foco correctos; GREEN con API real temporal.
- [x] T03: comparación visual con HTML/PNG, pruebas de navegación/filtros/foco y fechas, builds V1/existente, gobierno y publicación aislada.

Excepcion TDD: CSS/estructura visual y configuración de despliegue se validan con capturas y comparación de referencia; la lógica de fechas/datos y acción del FAB tienen RED/GREEN ejecutado.

## Evidencia

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01 | RED | `node --test frontend/src/components/calendar/month-model.test.mjs frontend/src/pilot/smart-agenda-model.test.mjs` | Ocho fallos de comportamiento, no de sintaxis; `evidence/month-model-red.txt` |
| T01 | GREEN | Mismo comando | Ocho pruebas pasan; `evidence/month-model-green.txt` |
| T02 | RED | `MONTHLY_QA_PHASE=red node work/features/2026-11-22-v1-monthly-agenda-design/verify-monthly.cjs` | API local y login funcionan; calendario mensual ausente en versión semanal; `evidence/monthly-red/results.json` |
| Perfil | GREEN | `.venv/bin/python -m unittest discover -s backend/tests/pilot -p 'test_*.py'` | 79 pruebas pasan; backend sin cambios |
| V5 | GREEN | `node --test frontend/src/pilot-v5/*.test.mjs` | 12 pruebas pasan; `evidence/v5-regression.txt` |
| T02 | GREEN | `node work/features/2026-11-22-v1-monthly-agenda-design/verify-monthly.cjs` | 25 grupos pasan a 390×884, 320×740 y 1440×1000; calendario, datos, filtros, búsqueda, mes, teclado, detalle, origen y FAB sin guardado implícito; `evidence/monthly-green/results.json` |
| T02-regresión | RED | `MONTHLY_QA_PHASE=regression-red MONTHLY_QA_FOCUS=regression node work/features/2026-11-22-v1-monthly-agenda-design/verify-monthly.cjs` | Faltaban enlace al origen y cantidad accesible; `evidence/monthly-regression-red/results.json` |
| T02-regresión | GREEN | Suite mensual completa anterior | Enlace de seguimiento abre su fecha original y botones anuncian cantidad; mismos escenarios pasan |
| T02-foco | RED | Suite mensual con selector de mes | Foco no volvía al botón al cerrar dialog; `evidence/month-dialog-focus-red/results.json` |
| T02-foco | GREEN | Suite mensual completa anterior | Cerrar diálogo antes de restaurar foco resuelve selector y Escape en tres viewports |
| Regresión | GREEN | Modelos de calendario, piloto legacy y dominio | 25 pruebas pasan; `evidence/models-domain-green.txt` |
| Build | GREEN | `npm run build:v1` y `npm run build:web` | Ambos builds completados; archivos `evidence/build-v1.txt` y `evidence/build-current.txt` |
| T03 | GREEN | `verify-governance.sh --feature esta carpeta --profile producto --strict` | Gobierno y adaptadores sincronizados; `evidence/governance.txt` |
| T03 | GREEN | `nginx -t` y recarga con respaldo del vhost | Solo root de V1 cambia a release mensual; configuración/HTML/contenedor V5 idénticos; `evidence/deployment-activation.txt` |
| T03 | GREEN | `node work/features/2026-11-22-v1-monthly-agenda-design/verify-live.cjs` | Ocho checks públicos pasan; hashes HTML/JS/CSS idénticos, DNS/TLS, navegación/FAB y logout en móvil/escritorio, sin escrituras de negocio; `evidence/live/results.json` |
| Diseño | Observado | Lectura de code.html (549 líneas), DESIGN.md (116) y screen.png | Calendario mensual blanco/rojo, hoja inferior y toolbar; cifras de ejemplo y desfase de fechas del export identificados |

## Decisiones de fidelidad

- El estado vacío de Spiffs usa el mismo mensaje del resto de filtros: «Sin registros para este día.»; no se agregan recompensas ficticias.
- Revisión independiente detectó dos regresiones a resolver dentro del alcance: acceso al Goal Sheet de origen desde un seguimiento y cantidad de registros en el nombre accesible de cada día. Ambos se resolvieron y conservan el diseño visible.
- El gris claro y los tamaños compactos proceden del diseño solicitado. Su contraste/tamaño táctil se conserva por fidelidad; no se declara cumplimiento WCAG AA completo. Se mantienen zoom, foco y controles semánticos.

## TRUST 5

- [x] Tested: RED/GREEN en fechas, adaptación de datos, interacción y regresiones. 25 pruebas de modelos/dominio, 79 de backend y 12 del piloto V5 pasan; 25 grupos de QA mensual con API local real y datos simulados.
- [x] Readable: helpers de fechas/datos separados de cuadrícula reutilizable y composición visual; documentación en español. Revisión independiente resolvió pérdida de edición y nombre accesible.
- [x] Unified: rutas, payload y guardado de Goal Sheet existentes; estilos limitados a agenda, sin dependencias nuevas.
- [x] Secured: sin secretos nuevos ni datos privados; fixtures solo locales, fechas civiles validadas, ningún guardado implícito.
- [x] Trackable: documento, rama `feature/v1-monthly-agenda-design`, capturas, pruebas y runbook de publicación versionados junto con el código. Gobierno estricto pasa.

## Siguiente

Entrega disponible en https://aisalesv1.softvibes.pro/#agenda. No quedan tareas de implementación pendientes en este alcance. Los otros módulos y campos financieros del documento adjunto no forman parte de esta solicitud.
