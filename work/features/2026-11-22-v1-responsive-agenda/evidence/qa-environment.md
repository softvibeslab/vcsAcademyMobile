# Interrupción del entorno de QA

La primera matriz se detuvo por `ENOSPC: no space left on device` al escribir results.json, tras iniciar Chromium y WebKit a la vez. No se clasifica como regresión de la UI. Al cerrar los navegadores, df reportó878MiB disponibles. Se borraron únicamente paquetes temporales de releases propios identificados por sus manifiestos (ya publicados), sin tocar archivos del usuario.

La matriz se ajustó para ejecutar un navegador a la vez, cerrarlo tras cada caso y conservar las mismas expectativas. La ejecución final se registra aparte; environment-interrupted contiene la captura que alcanzó a escribir la ejecución interrumpida.

La matriz secuencial principal pasó9casos. Un intento adicional de bordes de breakpoint volvió a fallar por ENOSPC. `npm cache verify` y después `npm cache clean --force` encontraron archivos de caché propiedad de root (EACCES); la limpieza parcial liberó espacio suficiente: df2.6GiB disponibles. No se ejecutó sudo ni chown. Se limpiaron descargas regenerables de npm, sin modificar las dependencias instaladas. Los casos de borde se repitieron con ese espacio disponible.
