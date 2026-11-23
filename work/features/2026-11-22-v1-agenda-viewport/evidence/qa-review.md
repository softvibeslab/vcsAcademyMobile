# QA de agenda en viewport completo

## Entorno y baseline

API legacy temporal en 127.0.0.1:18926, SQLite fuera del repositorio y frontend Vite en 127.0.0.1:4198/v1.html. Solo datos sintéticos locales: un día normal, una nota extensa y cuatro seguimientos para un mismo día. Reloj al 6 de noviembre de 2026 y zona America/Cancun.

RED antes de la implementación: `red/results.json`. En 360×800 CSS/DPR2, calendario clientHeight 683 y scrollHeight 925; catorce fechas no recibían interacción en su centro por estar cubiertas. El día con cuatro seguimientos mostraba tres chips y «+1 más», mientras el panel conservaba los cuatro registros. Capturas normal y multiple-before acompañan las medidas.

## Matriz GREEN

`green/results.json` y `green/run.txt`: 25 grupos pasan, 36 capturas, doce combinaciones:

- Chromium Android emulado: 360×800/DPR2 (equivalente a 720×1600 físicos), y 360×720/DPR2 para menor altura disponible.
- WebKit iPhone emulado: 390×844/DPR3 y 375×740/DPR3.
- Chromium: 720×1600 CSS literal y escritorio 1440×900.
- Todos en light y dark, usando el selector existente desde HOME y comprobando persistencia tras recarga.

Las 42 fechas quedan completamente dentro del área del mes y encima del detalle, con hit-test exitoso en cada centro. No hay scroll de página ni de calendario. El día normal no necesita lectura interna. Todos los controles principales medidos, incluidos filtros y FAB, alcanzan al menos 44×44 CSS; el mínimo alto de las fechas en el estado normal fue 51px.

La nota extensa conserva su última línea accesible mediante la zona de lectura. Cuatro seguimientos producen un chip y «+3» en la celda y cuatro registros completos en el panel; alcanzar el último no desplaza el mes ni la página. En 1440px la nota cabe completa sin scroll: se corrigió la expectativa del test que exigía overflow aun cuando todo el texto era visible. No se modificó la implementación para esa corrección de expectativa.

Regresiones verificadas: selección, mes/año, Hoy, búsqueda, enlace de origen y FAB con fecha futura, fecha del registro no futura y foco en Acción. Sin errores JavaScript ni escrituras de negocio de UI. Revisión adicional de Historial en Chromium Android y WebKit iPhone: `history/results.json`; el último registro permanece accesible, con encabezado y navegación visibles y scroll de página cero.

## Revisión visual y límites

Capturas inspeccionadas en móvil reducido, WebKit iPhone y escritorio. Las seis semanas aparecen completas; panel y barra de acciones fluyen debajo, sin cubrir celdas. El contenido extenso usa el panel interno y no desaparece. El escritorio llena el ancho disponible, sin marco de teléfono.

Las emulaciones verifican viewport, DPR, motores y alturas reducidas, no hardware físico ni barras reales de Safari/Chrome. Los controles se mantienen dentro del viewport útil; los insets nativos de safe-area son cero en estos navegadores de prueba. No se afirma haber validado un notch físico. El alcance no impone ausencia de scroll con teclado abierto o zoom extremo y no declara cumplimiento WCAG completo.

## Smoke público

`verify-live.cjs` pasó después de publicación: doce verificaciones y seis capturas. Chromium Android 360×800/DPR2, Chromium escritorio 1440×900 y WebKit iPhone 390×844/DPR3, ambos temas. Las 42 fechas pasan geometría y hit-test, sin scroll de página ni calendario; tema persistido, navegación y FAB con prellenado sin guardar funcionan. HTML, pilot-B99LA0O0.js y pilot-z1WX0d_C.css coinciden por SHA-256 con dist-v1. HTTPS y DNS normales; solo POST de login/logout de demostración, cero errores JavaScript y ningún fixture público. V5 conserva HTML SHA, modo y versión antes/después. Evidencia: `live/results.json`, `live/run.txt` y seis capturas.

## Cierre del entorno

API temporal sesión 49107/PID 79069 terminó limpiamente con código 0; Vite sesión 19186 terminó por SIGINT (130). `lsof -nP -iTCP:18926 -iTCP:4198 -sTCP:LISTEN` devolvió código 1 sin salida, confirmando ambos puertos libres. Solo se cerraron los procesos QA propios.
