# FTD · Calendario reutilizable en la agenda V1

**Status:** done (publicado y verificado el 2026-11-22)
**Lane:** FTD
**Branch:** feature/v1-agenda-calendar
**Date:** 2026-11-22

## Claridad

- **Solicitud:** «analiza este layout y crea un modulo reutilizable para mostrar el calendario en la seccion de https://aisalesv1.softvibes.pro/#agenda y sustituir l actual».
- **Entendimiento:** sustituir la lista plana por un calendario semanal como la referencia de Stitch, integrado con los mismos seguimientos y enlaces actuales. Esta petición autoriza el cambio visual y su publicación en V1.
- **Hecho cuando:** un componente React reutilizable sin acoplamiento a la API muestra siete días, permite cambiar de semana, seleccionar una fecha, volver a hoy y consultar los seguimientos de ese día; marca días con actividad y conserva agregar/editar en Goal Sheet. Es usable con teclado, móvil y escritorio y ambos temas. Se publica en V1 con la API/base existentes.
- **Contrato ya aprobado:** ../2026-11-13-pilot-webapp/cp2-spec.md, apartados Contratos reutilizados y Funciones locales adicionales: reminders/upcoming y agenda sobre seguimientos existentes. No se modifica ningún contrato, esquema ni permiso.

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| 1 | ¿Qué referencia corresponde? | Stitch 16859674583431881734, pantalla app__02-calendar-mobile.png, screen 16288772509092746905; única pantalla calendario del proyecto consultado. | Respondida |
| 2 | ¿Qué datos hay? | id, entry_date, follow_up_date, note y status scheduled, obtenidos del endpoint actual. No hay horario ni estados de tour. | Respondida |
| 3 | ¿Qué diseño conservar? | Jerarquía de fecha, tira semanal, indicadores y tarjetas de la referencia; tipografía, colores y navegación existentes en V1. | Respondida |

## Intencion

Facilitar la consulta de seguimientos por fecha, aplicando el layout solicitado sin introducir datos simulados en la agenda real ni sustituir la app por el piloto privado V5.

## Alcance

- Solo frontend: componente compartido Calendar, helpers de fecha sin timezone-shift, estilos acotados, adaptador de Agenda y build explícito V1.
- Referencia: siete días de lunes a domingo, fecha seleccionada, anterior/siguiente semana, Hoy, contador de seguimientos y tarjetas por día. Un acceso a la fecha del próximo seguimiento permite encontrar actividad fuera de la semana visible. Las fechas pasadas siguen accesibles.
- Mantener `#agenda`, `#goalsheet` y `#goalsheet/{entry_date}`. El componente recibe eventos normalizados y callbacks/renderers; no conoce endpoints, usuarios ni autenticación.
- La selección inicial es hoy. Si no hay eventos en ese día, mostrar estado vacío del día y acceso al siguiente seguimiento disponible (si existe); distinguir agenda totalmente vacía. No ocultar todos los datos sin una forma de encontrarlos.
- Reutilización: Calendar recibe events [{id,date,title}], selectedDate, onSelectDate, today y renderEvent/emptyState opcionales. Semana derivada de selectedDate; onSelectDate controla navegación. Fecha civil ISO válida; aritmética UTC interna sin interpretar fechas como timestamps locales.
- Agenda mantiene su encabezado y acción Agregar seguimiento; añade contexto «Mi agenda» y conteo. Tarjetas muestran nota, fecha del registro de origen, etiqueta derivada Hoy/Programado/Fecha pasada y enlace de edición. No muestra horas, confirmaciones, otros asesores ni tablero de sala que la API no aporta.
- Nuevo `frontend/v1.html` y `frontend/vite.v1.config.js`, comando `build:v1`, salida dist-v1. El entrypoint V5 permanece intacto. Publicar en una raíz web V1 nueva y conservar release histórica para rollback; mismo contenedor/API/base V1.
- No dependencias nuevas ni API, DB, autenticación, permisos, notificaciones, sincronización externa, edición drag/drop o vista mensual. Son decisiones de producto futuras, no requisitos de este reemplazo.

## Escalamiento

La revisión inicial usó carril Contrato hasta verificar los contratos existentes. Se concreta como FTD: una capa frontend, menos de dos días, sin contrato nuevo entre capas, sin esquema, sin autenticación ni dependencias. El build explícito es configuración del frontend y la publicación reutiliza el despliegue V1 ya autorizado. No hay una decisión arquitectónica nueva que amerite ADR.

## Checklist

- [x] T01-test: pruebas de fechas ISO, semanas lunes/domingo y cruces mes/año/bisiesto, selección y agrupación de múltiples eventos, ignorar fechas inválidas sin mutar entrada; fallo funcional esperado.
- [x] T01-impl: helpers del calendario pasan las mismas pruebas.
- [x] T02-test: E2E con backend legacy real y base temporal: actividad con varios seguimientos, vacío, navegación, pasado/futuro, acciones de edición, teclado y cambios de tema; falla al no existir calendario.
- [x] T02-impl: componente Calendar + Agenda, CSS acotado y build V1, pasa E2E sin mocks de API.
- [x] T03: build V1 y build existente, regresión modelos/frontend y dominio, revisión visual móvil/escritorio, contraste del componente, gobierno y publicación verificadas.

Excepcion TDD: HTML de entrada, configuración de build y estilos declarativos se validan con compilación, navegador y contraste; la lógica de fechas y comportamiento sí tiene RED → GREEN ejecutado.

## Evidencia

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| Inventario | Observado | Stitch get_screen/download_file; lectura Agenda/App/API/CP2 | Referencia semanal 390x844; API por fecha sin horario; entrypoint actual apunta a V5 |
| T01 | RED | node --test frontend/src/components/calendar/calendar-model.test.mjs | Siete fallos de assertions contra stubs válidos; sin errores de importación/sintaxis (calendar-model-red.txt) |
| T01 | GREEN | Mismo comando | Siete pruebas pasan: fechas válidas, bisiestos, semanas, agrupación, búsqueda y cuatro zonas horarias |
| T02 | RED | CALENDAR_QA_PHASE=red node work/features/2026-11-22-v1-agenda-calendar/verify-calendar.cjs | API temporal sembró cinco seguimientos y abrió agenda; falla por ausencia de región Calendario de seguimientos |
| T02 foco | RED | CALENDAR_QA_PHASE=focus-red node work/features/2026-11-22-v1-agenda-calendar/verify-calendar.cjs | Enter en salto seleccionaba fecha pero no conservaba el foco en el día elegido |
| T02 | GREEN | CALENDAR_QA_PHASE=green node work/features/2026-11-22-v1-agenda-calendar/verify-calendar.cjs | 14 grupos pasan, 7 capturas, 390/320/1440, claro/oscuro, Cancún/Honolulu, teclado y foco, cero errores JS |
| T03 | GREEN | node --test frontend/src/components/calendar/calendar-model.test.mjs frontend/src/pilot/*.test.mjs; npm test | 24 pruebas frontend y 5 de dominio pasan |
| T03 | GREEN | npm run build:v1; npm run build:web | Compilan V1 independiente y las entradas existentes; bundle V1 contiene calendario legacy |
| T03 | GREEN | contrast_checker.py con cuatro pares | AA texto pasa: seleccionados 9.31:1/11.50:1, secundarios 5.49:1/6.51:1 |
| T03 | GREEN | verify-governance.sh --feature esta carpeta --profile producto --strict | Gobierno completo; adaptadores sincronizados |
| T03 | GREEN | nginx -t; curl HTTPS; comparación deployment-before/after | Únicamente cambia root de V1; histórico/V5/API/contenedor/volumen conservados; ready |
| T03 | GREEN | node work/features/2026-11-22-v1-agenda-calendar/verify-live.cjs | 8 checks y 2 capturas públicas; DNS/TLS normales; HTML/JS/CSS coinciden por SHA256; login/agenda/logout 390/1440; cero errores JS; V5 idéntica |

Pruebas públicas sin datos sintéticos insertados: únicos POST login/logout. Fixtures permanecieron en base temporal local. Servidores QA de puertos 18926/4198 cerrados al finalizar. Escaneo de secretos de artefactos: cero hallazgos.

La revisión visual encontró conflicto del reset global button:not(.button) con el componente. Se aumentó especificidad solo dentro de .sv-calendar; capturas finales confirman bordes y fondos. El salto de seguimiento ahora restaura foco en el día elegido tras desaparecer su botón.

El escáner estático a11y-scan.json reporta siete avisos de landmarks/encabezados al tratar JSX y CSS como páginas completas. Calendar es una región dentro de la página; main, h1 y nav existen en App/Header. Se verificaron nombres, estado seleccionado, contraste, foco y teclado del módulo; no se declara una certificación WCAG integral de la app.

## Decisiones pendientes fuera del alcance

- A 320px, la cabecera global preexistente llega a 331px por top-actions. Reproducido también en Home sin calendario (home320-baseline.*). El calendario y sus tarjetas caben dentro de 320px; a 390/1440 el documento no desborda. Recomendación: ajustar la cabecera en otra tarea, sin ocultar controles por decisión unilateral.
- Horarios, asesores, estados Confirmado/En curso y tablero de sala del screenshot no existen en este contrato. No se inventan. Si se requieren, definir su fuente/API como otra iniciativa.

## TRUST 5

- Tested: RED/GREEN de lógica y UI; pruebas de regresión, builds, evidencia visual y smoke público citados.
- Readable: módulo separado con README y funciones puras; Agenda adapta datos de negocio.
- Unified: sin dependencia nueva, mantiene tokens y rutas existentes; build V1 explícito.
- Secured: no modifica identidad, permisos, API o datos; pruebas con base efímera sintética, sin copiar datos privados.
- Trackable: solicitud citada, contrato base referenciado, rama y carpeta con evidencia.

## Siguiente

Publicado en https://aisalesv1.softvibes.pro/#agenda. Componente y contrato de props en frontend/src/components/calendar/README.md. Reversión y raíz nueva en deployment.md. Cualquier ampliación de datos o funciones fuera del contrato se registra para decisión del usuario.
