# CP2 · Ajuste solicitado: análisis manual, aporte y pasos breves

**Status:** alcance autorizado por petición directa del PO; reutiliza contrato v1 aprobado.
**Date:** 2026-11-22 (America/Cancun)
**Contrato base:** ../2026-11-22-v1-tour-learning/cp2-spec.md
**Historia:** work/stories/2026-11-22-v1-tour-learning.md (LISTA)

## Autorización y frontera

El PO ordena: «cambia la funcionalidad para que el aprendizaje con ia solo lo haga si el usuario le da click en analizar y que igual haya un campo de texto para que agregue algo que aportar y que la respuesta sea mas breve y concisa en pasos a seguir».

Este documento registra ese ajuste antes del código. Reutiliza íntegros los contratos PATCH edit/context y POST analysis aprobados; no introduce un campo adicional de API o de base de datos. No se atribuye al PO la aprobación de nuevos datos, permisos o retención. Se mantienen los límites y garantías aprobados.

## Criterios de aceptacion y requisitos

1. **REQ-M01:** guardar una visita/feedback, abrirla o recargarla no llama al análisis. El guardado termina inmediatamente y ofrece el detalle.
2. **REQ-M02:** Aprendizaje con IA incluye el campo opcional «¿Algo más que quieras aportar?» y botón **Analizar**. El texto explica que el aporte se guardará en el contexto de la visita al pulsarlo. Sin aporte se usa el contexto existente.
3. **REQ-M03:** con aporte, anexarlo como bloque `Aporte para el análisis:` al contexto mediante PATCH `action:edit` y después analizar la revisión devuelta. No truncar: validar los límites existentes context6000 y contexto+feedback10000 caracteres/24000 bytes antes de escribir. El contador muestra el espacio disponible; el borrador no se corta silenciosamente y un exceso se rechaza antes de guardar. El aporte permanece tras recargar y el Coach lo recibe como parte del contexto de esa visita.
4. **REQ-M04:** PATCH y análisis llevan UUID independientes y estables en sus reintentos. Un fallo al guardar impide inferir. Si el aporte ya se guardó y falla IA, mostrarlo como guardado y permitir reintentar sin anexarlo otra vez. Doble clic produce una sola operación. Conflicto de revisión exige actualizar el detalle antes de continuar.
5. **REQ-M05:** la nueva respuesta usa resumen de una frase (máximo240 caracteres) y tres acciones breves (máximo180 caracteres cada una), representadas por los campos existentes strengths, improvement y next_practice. Son, respectivamente, qué seguir haciendo, qué mejorar y qué practicar a continuación, expresados como instrucciones concretas. Si faltan datos, pedir el dato útil sin inventar una fortaleza. La UI muestra esos campos como lista numerada «Pasos a seguir». Recomendaciones conservan catálogo, acceso y estructura actuales; motivos breves.
6. **REQ-M06:** no regenerar un resultado ready de la misma revisión si no hay aporte/cambio. Los resultados guardados antes del despliegue no se alteran ni truncan; se conservan visibles. Un aporte genera una revisión nueva y el anterior queda desactualizado según el contrato vigente.
7. **REQ-M07:** conservar modal completo, scroll interno, teclado/foco, light/dark y enlaces Roadmap. No cambiar Goal Sheet, KPIs, cursos, permisos, retención ni V5.

## Contratos y datos

Sin cambios de ruta, esquema JSON público, SQLite ni autenticación. La nueva exigencia de brevedad se aplica a respuestas nuevas del proveedor, dentro de los máximos del contrato público existente. El aporte se guarda en `tour_visits.context`, con la misma propiedad, caducidad y borrado. No modifica la fecha de expiración.

Guardar feedback ya no pide inferencia. Sólo el botón Analizar invoca `/analysis`. El chat explícito «Continuar con el Coach» conserva su función conversacional y no crea análisis de aprendizaje por sí mismo.

## Pruebas y datos

Datos ficticios: visita «QA manual · bienvenida», contexto «Escenario ficticio: expliqué la propuesta antes de confirmar prioridades», aporte «Quiero practicar una pregunta abierta sobre sus vacaciones», feedback de práctica sin personas reales.

- REQ-M01/02: navegador con API propia real y bridge externo simulado; contar llamadas al guardar, abrir, escribir, pulsar y recargar.
- REQ-M03/04: límites Unicode/bytes, replay de PATCH tras respuesta perdida, error de IA y reintento, conflicto y doble clic.
- REQ-M05: prueba roja/verde del validador de brevedad y prompt; salida real sintética Hermes en candidata.
- REQ-M06/07: lectura de la DEMO existente sin mutaciones, comparación antes/después, recomendaciones y regresiones móviles/temas.
- Gates: suites visitas/Coach, modelos frontend, builds V1/V5, aislamiento y hashes públicos, TRUST5 y governance estricto.

## Requisitos no funcionales y seguridad

NFR-01: conservar tokens light/dark, input16px y controles44px. NFR-02: UUID/revisión y retención vigentes. NFR-03: propietario validado por las rutas existentes; ningún secreto ni dato real en QA.
