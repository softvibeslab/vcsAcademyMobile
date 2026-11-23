# QA de tema y barra decorativa

## Entorno aislado

API legacy temporal en 127.0.0.1:18926, SQLite fuera del repositorio y Vite en 127.0.0.1:4198. Chromium aislado con zona America/Cancun. Solo fixtures sintéticos creados en la API local; ninguna escritura de negocio pública.

## RED observado antes del cambio

`red/results.json` y `red/mobile390-dark-before.png`: la preferencia existente era dark, pero Calendario mensual tenía fondo rgb(255,255,255), texto rgb(23,23,23) y color-scheme light. La barra 9:41/isla/señal/batería seguía presente. La prueba falló por esa presencia (1 en lugar de 0), después de login y API exitosos.

## GREEN ejecutado

`green/results.json` y `green/run.txt`: diez grupos pasan con 18 capturas en 390×884, 320×740 y 1440×1000, ambos temas. El selector real Cambiar tema se usa en HOME antes de entrar a Agenda; después de recargar se conserva html[data-theme] y sa.pilot.theme.

Se verificó ausencia de la barra y del espacio reservado; superficies de calendario, hoja, tarjeta y navegación; búsqueda; selector de mes y control nativo; cambio de mes/Hoy, filtros, enlace al seguimiento original y FAB con fecha futura/foco sin guardado. Cero errores JavaScript, desbordamiento horizontal o escrituras de negocio iniciadas por UI.

## Inspección visual

Las capturas muestran la cabecera real comenzando arriba sin franja decorativa. Claro conserva la paleta original. Oscuro usa fondo rgb(16,19,25), panel/tarjeta rgb(26,31,38) y texto rgb(241,243,245); búsqueda y diálogo no tienen fondos blancos forzados. El FAB es claro con signo oscuro y sigue destacando; monto/estado mantienen acentos verdes, rojos y dorados. La geometría móvil permanece contenida y el marco de escritorio mide 430×932, centrado.

Revisión visual de legibilidad de texto, tarjetas, monto, FAB, búsqueda y diálogo realizada; no constituye auditoría WCAG completa.

## Smoke público

`verify-live.cjs` ejecutado tras señal de publicación: diez verificaciones y cuatro capturas pasan. HTML y assets pilot-BHk_pdBB.js/pilot-lrl43DIl.css coinciden por SHA-256 con dist-v1. HTTPS y DNS normales; API lista. Ambos temas elegidos desde HOME y persistidos al recargar, sin barra decorativa, con navegación mensual/FAB sin guardar en 390 y escritorio. Solo POST de login/logout de demostración, sin fixtures públicos ni guardado de registros. V5 conserva el mismo SHA del HTML, modo private_pilot y versión antes/después. Evidencia: `live/results.json`, `live/run.txt` y capturas light/dark.

## Cierre

API temporal sesión 81943/PID 74707 terminó limpiamente (código 0); Vite sesión 15220 terminó con SIGINT (130). `lsof -nP -iTCP:18926 -iTCP:4198 -sTCP:LISTEN` devolvió código 1 sin salida: ambos puertos libres. Solo se detuvieron los procesos QA creados para esta feature.
