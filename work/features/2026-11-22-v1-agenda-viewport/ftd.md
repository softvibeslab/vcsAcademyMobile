# FTD · Agenda completa en el viewport móvil

**Status:** done (publicado y verificado el 2026-11-22, America/Cancun)
**Lane:** FTD
**Branch:** feature/v1-monthly-agenda-design
**Date:** 2026-11-22

## Claridad

- **Solicitud:** «ajusta esta pestaña para que se vea full y no necesite scroll optimiza para iphone y android mayor a 720x1600».
- **Entendimiento:** la agenda ocupa el viewport disponible, distribuye sus seis semanas, detalle y navegación sin solapamientos y permite ver el mes completo sin desplazar la página ni el calendario.
- **Hecho cuando:** las 42 celdas, resumen diario y acciones están visibles y son utilizables en Android/iPhone vertical, ambos temas; no hay scroll de página/calendario en tamaños objetivo y está publicado en V1.

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| 1 | ¿Cómo interpretar 720×1600? | Resolución física de referencia; validar también 360×800 CSS a DPR2, alturas reducidas por barras de navegador y 720×1600 CSS literal. El layout se adapta al viewport, no al nombre del dispositivo. | Respondida |
| 2 | ¿Qué ocurre con contenido largo? | Mes, resumen y controles siempre visibles. Notas extensas, múltiples registros y el historial conservan un área interna de lectura; no se recortan ni descartan datos para simular ausencia de scroll. | Respondida |
| 3 | ¿Cómo cabe la actividad en las celdas? | Resumen compacto: primer evento y contador de adicionales. El panel del día conserva todos los registros. | Respondida |

## Intencion

Eliminar la necesidad de desplazar el calendario causada por filas fijas de 92px, padding de compensación y un panel superpuesto; aprovechar el ancho y alto disponibles en una interfaz real a pantalla completa.

## Alcance

- Una capa frontend; mismo contrato de datos, rutas, temas y guardado.
- `SmartAgenda.jsx`, `smart-agenda.css` y `MonthlyCalendar.jsx`: layout en flujo con encabezado, cuadrícula flexible de seis filas, panel acotado y navegación; retirar medición/padding del overlay y límites de maqueta 430×932/marco.
- FAB en la toolbar inferior, con una única acción existente y área táctil de 44px; controles principales de 44px cuando el viewport lo permite.
- Cuadrícula muestra un evento por celda y contador accesible del resto; selección abre todos en el panel existente. No añadir paginación, datos o módulos nuevos.
- Respetar safe areas y altura dinámica del navegador. Mantener zoom; ante alturas excepcionales (teclado, horizontal, ampliación) priorizar acceso al contenido sobre bloquear el desplazamiento por fuerza.
- Mantener paletas light/dark y aspecto mensual aprobado. Sin cambios en API, autenticación, base de datos o dependencias.
- Publicación aislada del frontend V1 con release nueva y rollback, sin alterar V5.

## Escalamiento

FTD: ajuste acotado en frontend, componente interno y estilos; no cambia contratos entre capas ni requiere una nueva decisión de arquitectura.

## Checklist

- [x] T01-test: baseline RED de filas ocultas/scroll/solapamiento y geometría del viewport.
- [x] T01-impl: mes y controles completos en flujo sin scroll del calendario.
- [x] T02-test: caso de varios registros y etiqueta de adicionales antes de reducir los chips visibles.
- [x] T02-impl: resumen compacto preserva conteo y acceso a todos los detalles.
- [x] T03: QA Android Chromium e iPhone WebKit emulados, ambos temas, tamaños objetivo, contenido largo y navegación/FAB.
- [x] T04: builds, regresión del perfil, gobierno, publicación y verificación pública; commit/push.

Excepcion TDD: los cambios puramente visuales de CSS se validan por geometría, hit-test y capturas antes/después. El resumen de múltiples registros se valida con un caso de navegador RED/GREEN; no se crean tests unitarios que dupliquen las reglas CSS.

## Evidencia

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01 | RED | `VIEWPORT_QA_PHASE=red node work/features/2026-11-22-v1-agenda-viewport/verify-viewport.cjs` | Calendario scrollHeight925/clientHeight683 y 14 fechas cubiertas; falla por scroll mensual; `evidence/red/results.json` |
| T02 | RED observado | Mismo baseline, fixture de cuatro seguimientos | Tres chips/+1 frente al resumen esperado de uno/+3; panel conserva cuatro registros. Medidas y captura multiple-before anteriores al cambio. |
| T01/T02/T03 | GREEN | `node work/features/2026-11-22-v1-agenda-viewport/verify-viewport.cjs` | 25 grupos y 36 capturas en 12 combinaciones; 42 celdas visibles/pulsables, cero scroll página/mes, un chip/+3 y todos los detalles accesibles; `evidence/green/results.json` |
| T03 | GREEN | Recorrido de Historial Chromium/WebKit | Último registro accesible sin mover página ni ocultar navegación; `evidence/history/results.json` |
| T03 | GREEN | `npm run build:v1` y `npm run build:web` | Builds completados; `evidence/build-v1.txt` y `build-current.txt` |
| T03 | GREEN | Regresiones del perfil y modelos de calendario | 79 pruebas backend y 37 frontend/dominio pasan; `evidence/backend.txt` y `models.txt` |
| Revisión | Observado | Revisión independiente JSX/CSS y capturas | Sin hallazgos accionables; controles principales de 44 px y mínima fila de 51 px en estado normal. |
| T04 | GREEN | `verify-governance.sh --feature esta carpeta --profile producto --strict` | Gobierno y adaptadores completos; `evidence/governance.txt` |
| T04 | GREEN | `nginx -t` y recarga con respaldo V1 | Nueva raíz agenda-viewport; API, contenedores y configuración/HTML de V5 conservados; `evidence/deployment-activation.txt` |
| T04 | GREEN | `node work/features/2026-11-22-v1-agenda-viewport/verify-live.cjs` | 12 verificaciones y 6 capturas públicas, hashes exactos, Chromium/WebKit y ambos temas; solo login/logout demo, sin guardar negocio; `evidence/live/results.json` |
| Alcance | Observado | Inspección de la agenda existente | Filas mínimas de 92 px, compensación de scroll y panel absoluto; marco limitado a 430×932. |

## Decisiones de validación

En escritorio de 1440 px la nota de prueba cabe completa; se corrigió la expectativa que exigía overflow interno incluso cuando el texto era visible. Se mantiene la comprobación de acceso a la última línea y de lectura interna cuando el contenido rebasa. Esto no cambia el alcance ni oculta datos.

Las pruebas de iPhone/Android son emulaciones de viewport/DPR con WebKit y Chromium, no hardware físico. Se conserva el desplazamiento necesario para contenido largo, historial, alturas excepcionales y zoom; el mes completo y sus controles no requieren scroll en los tamaños objetivo.

## TRUST 5

- [x] Tested: baseline RED, resumen compacto GREEN, matriz de navegadores y regresión del perfil ejecutados.
- [x] Readable: se elimina la medición del overlay y se usa distribución CSS en flujo; prop interna documentada.
- [x] Unified: rutas, datos, temas y guardado existentes; ningún contrato de backend nuevo.
- [x] Secured: fixtures únicamente locales y sin cambios de autorización o secretos.
- [x] Trackable: gobierno, evidencia local/pública y runbook versionados junto al código en la rama de la agenda.

## Siguiente

Entrega disponible en https://aisalesv1.softvibes.pro/#agenda. Sin pendientes de implementación en este alcance; servidores temporales de QA cerrados.
