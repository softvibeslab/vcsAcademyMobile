# CP0 · Tour, agenda y aprendizaje desde el Coach

**Status:** contrato en revisión; sin implementación.
**Fecha:** 2026-11-22 (America/Cancun)
**Carril:** Contrato CP0–CP5; frontend, backend, datos e infraestructura.
**Historia:** work/stories/2026-11-22-v1-tour-learning.md
**Rama:** feature/v1-tour-learning
**Base:** 6d89e8b; Coach compacto y Hermes remoto publicados, árbol limpio al iniciar.

## Solicitud

El usuario pide que al hablar de un tour el Coach pregunte cómo registrarlo, conserve contexto para Hermes y muestre en la agenda el detalle, análisis de aprendizaje y una recomendación de curso del Roadmap.

Interpretación propuesta para aprobación: tres caminos, «Iniciar visita», «Programar tour» y «Registrar cómo me fue (Smart Diary)». El segundo corresponde a una visita futura; el tercero al registro posterior a la visita.

## Evidencia del problema

- Smart Diary V1 usa localStorage por cuenta; no existe persistencia servidor de sus notas.
- Goal Sheet tiene una sola fila por usuario/día. No representa varias visitas individuales.
- Agenda muestra Goal Sheet y seguimientos; el detalle no tiene análisis Hermes.
- Coach mantiene conversación en memoria de React; se pierde al desmontar la pantalla.
- Roadmap tiene 11 pasos y restricciones de plan/progreso. Las recomendaciones deben usar esos contenidos existentes.

La aprobación del Coach anterior excluía expresamente nuevas tablas, datos de tours y persistencia. Esta petición requiere un nuevo contrato CP2. La historia y el diseño están propuestos, no aprobados.
