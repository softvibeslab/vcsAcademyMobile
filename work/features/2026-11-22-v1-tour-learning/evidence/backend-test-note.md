# Nota de fixture y secuencia

El RED inicial del contrato registró siete fallos HTTP404 por rutas inexistentes y tres errores por módulo todavía inexistente. Los CRUD pasaron después de implementar el repositorio y las rutas.

La comprobación adicional de análisis registró un fallo real: una lección ocultada mientras Hermes respondía seguía persistida como recomendación. Se añadió una validación del catálogo vigente después de la inferencia.

En esa misma ejecución, una expectativa de fixture era incorrecta: se esperaba sólo step_1 accesible, pero el seed legacy declara step_1 completado y step_2 actual (persistence.py). Se corrigió la expectativa a esos dos pasos, sin modificar el seed ni el acceso de producción. Las pruebas de lease, reintento y respuesta tardía se agregaron como cobertura posterior al primer CRUD, no se presentan como RED previo de esos comportamientos.
