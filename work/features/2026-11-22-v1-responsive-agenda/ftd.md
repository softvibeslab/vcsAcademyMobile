# FTD · Agenda responsiva

**Status:** completado y publicado
**Lane:** FTD
**Date:** 2026-11-22 (America/Cancun)
**Branch:** fix/v1-responsive-agenda

## Claridad

- **Solicitud:** «hazlo responsivo», con captura de Agenda a 1512×840 donde el calendario y las tarjetas se estiran a todo el ancho.
- **Entendimiento:** adaptar proporciones a móvil/tablet/escritorio, conservando calendario, acciones, detalle completo, temas y datos. Escritorio: calendario y detalle diario lado a lado, con ancho máximo centrado. Móvil: disposición vertical de pantalla completa. Tablet: proporciones intermedias legibles. En alturas cortas, contenido desplazable dentro de la app para alcanzar controles sin recortes.
- **Hecho cuando:** sin overflow horizontal a 320–1920px; a 1024px o más el calendario y detalle comparten fila; fechas y acciones tienen tamaño legible, móvil 360×800/390×844 sigue sin scroll de página; alturas cortas permiten alcanzar registros/acciones; modal y análisis manual funcionan; publicado y verificado en V1.

| Pregunta | Respuesta | Estado |
|---|---|---|
| Ninguna | Ajuste visual acotado, autorizado por el mensaje actual | Respondida |

## Intencion

Adaptar el diseño aprobado de Agenda al ancho y alto disponibles, haciendo legibles el calendario y las tarjetas sin estirarlas a toda la pantalla de escritorio.

## Alcance

Frontend únicamente: `frontend/src/pilot/smart-agenda.css`; modificar markup de `SmartAgenda.jsx` sólo si fuera necesario, sin cambiar comportamiento. Se reutilizan todos los controles y tokens del diseño aprobado. No hay API, esquema, datos, métricas, permisos ni dependencias nuevas.

La publicación estática reutiliza el procedimiento existente sin reiniciar APIs, modificar Hermes ni bases. La autorización de publicación sigue vigente.

## Checklist

- [x] T01-test: reproducir el calendario de escritorio a todo ancho y el detalle apilado/estirado mediante geometría del navegador.
- [x] T01-impl: breakpoint de escritorio con Grid, ancho acotado y panel diario independiente.
- [x] T02-test: móvil, tablet, orientación/altura corta, textos largos, búsqueda/lista, controles y modal.
- [x] T02-impl: proporciones legibles y overflow interno según viewport; preservar dark/light.
- [x] T03: builds V1/V5, regresión de modelos, publicación estática, QA pública, TRUST5 y commit/push.

## Escalamiento

Una capa, cambio visual menor a dos días, sin contrato, datos, autenticación, integración externa o decisión arquitectónica nueva. Se mantiene FTD.

## Evidencia

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01 | RED | `RESPONSIVE_QA_PHASE=red ... verify-responsive.cjs` | A 1512×840 el detalle estaba debajo del calendario y el lienzo medía 1512px. evidence/red/results.json |
| T02 | RED | `RESPONSIVE_QA_PHASE=short-height-red ... verify-responsive.cjs` | A 320×568 el área de registros tenía menos de 64px. evidence/short-height-red/results.json |
| T01/T02 | GREEN inicial | `RESPONSIVE_QA_PHASE=green ... verify-responsive.cjs` | Nueve tamaños pasan, con temas, lista, búsqueda filtrada, modal/foco y cero mutaciones. evidence/green/results.json |
| Bordes | RED | `RESPONSIVE_QA_PHASE=breakpoint-review ... verify-responsive.cjs` | A 1920×500 la regla landscape quitaba el ancho máximo. Se conservó 1440px. evidence/breakpoint-review/results.json |
| Búsqueda | RED | `RESPONSIVE_QA_PHASE=search-height-review ... verify-responsive.cjs` | A 600×601 abrir búsqueda sin filtrar desplazaba la navegación hasta 621.5px. Se permitió que el panel diario cediera altura. evidence/search-height-review/results.json |

| T01/T02 | GREEN | `RESPONSIVE_QA_PHASE=final ... verify-responsive.cjs` | 12/12 tamaños y ambas apariencias: sin overflow, búsqueda vacía/filtrada, lista, controles, modal/foco y DEMO intacta. evidence/final/results.json |
| Regresión | GREEN | `node --test frontend/src/pilot/*.test.mjs frontend/src/components/calendar/*.test.mjs frontend/src/pilot-v5/model.test.mjs` | 70/70. evidence/frontend-regression.txt |
| Build | GREEN | `npm run build:v1` y `npm run build:web` | Ambos builds pasan. evidence/build-v1.txt y build-v5.txt |
| Publicación | GREEN | `publish-web.py ARCHIVE SHA256` | 17 archivos; APIs V1/V5 conservan id, imagen y StartedAt. evidence/release-activation.json |
| Artefactos | GREEN | `verify-public-artifacts.py --after-activation ...` | 9/9 comprobaciones HTTPS/HTML/JS/CSS/API/V5. evidence/public-artifacts.json |

| QA pública | GREEN | `TOUR_QA_URL=https://aisalesv1.softvibes.pro/ RESPONSIVE_QA_PHASE=live RESPONSIVE_QA_CASES=desktop-dark,tablet-portrait,iphone-light,landscape node work/features/2026-11-22-v1-responsive-agenda/verify-responsive.cjs` | 4/4: escritorio, tablet, iPhone y horizontal; DEMO sin cambios. evidence/live/results.json |

Excepcion TDD: ajuste puramente visual y configuración de empaquetado. Se añade además evidencia geométrica RED→GREEN para el defecto de escritorio y QA funcional del diseño existente. No se crean pruebas que repliquen reglas CSS.

La verificación usa Chromium y WebKit con viewports emulados; no constituye una prueba en dispositivos físicos.

## TRUST 5

- **Tested:** defectos reproducidos antes de ajustar CSS; matriz final 12/12, QA pública 4/4, modelos 70/70 y builds V1/V5 aprobados. Capturas inspeccionadas en escritorio y tamaños cortos. Gate estricto registrado en `evidence/governance.txt`.
- **Readable:** CSS agrupado por tamaños con comentarios; README y este expediente explican comportamiento, validación y reversión.
- **Unified:** sólo cambia CSS de Agenda y reutiliza markup, controles y tokens de tema. Sin contratos, dependencias ni migraciones nuevas. Revisión CSS independiente realizada.
- **Secured:** QA de sólo lectura con datos de demostración; cero mutaciones de tours y comparación de la DEMO antes/después. Escaneo de firmas de secretos sin coincidencias. No se consultan credenciales privadas.
- **Trackable:** expediente y evidencias versionados en `fix/v1-responsive-agenda`; manifiesto y hashes vinculan build y publicación. Activación verifica que APIs V1/V5 y sitio V5 permanecen iguales.

## Implementación

- CSS Grid a 1024px o más y en horizontal desde 760px con altura hasta 600px; calendario y detalle lado a lado. Ancho máximo 1440px, panel 320–420px.
- Tablet vertical mantiene la composición apilada con lienzo máximo 840px y márgenes; móvil usa el ancho disponible.
- Calendario desplazable cuando la altura no permite ver todas las filas. Se conserva el tamaño de sus días; el panel diario tiene su propio desplazamiento, y búsqueda/navegación comparten el alto disponible.
- Tipografía y tarjetas crecen en pantallas grandes. Sin cambios de JSX, datos, APIs, análisis manual ni modal.

## Entorno

Las interrupciones ENOSPC y la limpieza de temporales/caché regenerable se documentan en `evidence/qa-environment.md`. No se atribuyen a fallos del producto ni se cuentan como pruebas aprobadas.

## Siguiente

Implementación, publicación y QA terminadas. El cambio y su evidencia se entregan en la rama `fix/v1-responsive-agenda`.

## Publicación

- URL: https://aisalesv1.softvibes.pro/?v=responsive-agenda#agenda
- Raíz: `/srv/aisales-v1-release-20261122-responsive-agenda/web`.
- Archivo SHA256: `3f815aac5d3fb6e263444d693fa44db67c635bd2c32d322881cfb1eed34e2209`.
- HTML SHA256: `75300bd536ce2905cceee4a38fda9df63f0237cc8eee2ad9c52b19d52194ad01`.
- La entrega es estática. No se reiniciaron contenedores ni se copiaron/modificaron bases. Reversión en README.md.
