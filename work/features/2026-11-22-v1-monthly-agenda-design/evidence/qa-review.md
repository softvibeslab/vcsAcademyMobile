# QA del calendario mensual

## Ejecución local

- API legacy real temporal en 127.0.0.1:18926; SQLite fuera del repositorio. Frontend Vite en 127.0.0.1:4198/v1.html. Chromium aislado, zona America/Cancun y reloj fijado al 6 de noviembre de 2026.
- Fixture sintético: una venta USD 8,000 el 6 de noviembre, una nota y un seguimiento para el 23 de noviembre. No se usaron datos privados ni la API pública para sembrar.
- RED inicial: `monthly-red/results.json`, ausencia esperada de Calendario mensual en la agenda semanal.
- RED de regresión: `monthly-regression-red/results.json`, faltaban enlace al registro de origen y conteo en nombres accesibles.
- RED de foco: `month-dialog-focus-red/results.json`, elegir diciembre no devolvía foco al control de mes después del diálogo.
- GREEN final: `monthly-green/results.json` y `run.txt`, 25 grupos verificados, nueve capturas; sin errores JavaScript ni escrituras de negocio iniciadas por la UI.

## Comportamientos verificados

En 390×884, 320×740 y 1440×1000: 42 días civiles de domingo a sábado, selección correcta del viernes 6, conteos accesibles; selector de mes, cierre Escape y restauración de foco; flechas, Home/End y PageUp/PageDown; búsqueda, historial, cambio de vista y panel contraíble; filtros Todos/Ventas/Spiffs; últimas fechas accesibles mediante scroll; Hoy; seguimiento existente enlazado al Goal Sheet de origen.

El único FAB Agregar seguimiento abre directamente el formulario existente. Al elegir el 23 de noviembre mantiene el registro en el 6, prellena Fecha de seguimiento al 23 y enfoca Acción. No guarda automáticamente ni abre menú.

## Revisión visual ejecutada

Se inspeccionaron las capturas de 320, 390 y 1440 junto al screen.png adjunto. Se conservan la estructura blanca/roja, encabezado, cuadrícula, hoja inferior, tarjeta de borde dorado, toolbar, FAB negro y navegación de cuatro destinos. El contenedor de escritorio mide 430×932 y está centrado (x=505 en ancho 1440). No hay desbordamiento horizontal a ninguna de las tres anchuras; el shell verde previo está oculto solo en agenda.

Las diferencias de contenido son deliberadas: calendario civil correcto (el export tenía fechas desplazadas), solo datos del fixture y guiones para comisión/enganche/spiffs no disponibles. No se copiaron cifras, lead, hora ni estados ficticios del diseño.

Los tonos grises y tamaños compactos son los de la referencia. Esta revisión no declara conformidad WCAG AA completa.

## Smoke público ejecutado

`verify-live.cjs` pasó tras la señal de publicación: ocho verificaciones y dos capturas, `live/results.json` y `live/run.txt`. HTML y assets pilot-D349lf_J.js/pilot-0JMcyTXr.css coinciden por SHA-256 con dist-v1. HTTPS y DNS normales; API lista. Login/logout de demostración, navegación mensual y prellenado sin guardar pasan en 390 y 1440. Solo hubo POST de login/logout, sin fixtures ni guardado de registros. V5 conserva SHA del HTML, modo private_pilot y versión antes/después.

## Cierre del entorno

Servidores temporales detenidos al terminar: API sesión 8852/PID 67507 salió con código 0; Vite sesión 27878 salió con 130 por SIGINT. `lsof -nP -iTCP:18926 -iTCP:4198 -sTCP:LISTEN` devolvió código 1 sin salida: ambos puertos quedaron libres.
