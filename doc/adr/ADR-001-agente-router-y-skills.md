# ADR-001: Agente con router por reglas y skills deterministas con manifiesto

**Status:** proposed
**Date:** `2026-11-06`
**Owner:** Arquitectura de Sales Academy (propuesto por Claude Code; decide el PO)

## Context

El plan "Copiloto del Rep" (`brain-hub/research/timeshark-pro/PLAN-MVP.md`) convierte al Smart Agent en la
pantalla principal del rep y expone cada capacidad como una skill de un catálogo por sala. Hay que decidir:

1. Cómo entiende el agente la petición del rep (reglas, modelo de lenguaje o ambos).
2. Quién produce las cifras (mensualidades, KPIs) que el rep le muestra al cliente.
3. Cómo se describe una skill para que el catálogo, el agente y la interfaz la traten igual.

Restricciones: las cifras se muestran a prospectos en la mesa de ventas, así que un error es un riesgo comercial y
legal; el piloto corre una instancia por sala (PILOTO-3S-001, BR-01) sin proveedor externo de modelo aprobado;
el backend actual ya tiene una interfaz de proveedor `answer(message, mode, user, knowledge)` en
`backend/app/smart_agent.py` y la app móvil ya ejecuta acciones del agente (`apps/mobile/App.tsx`).

Evidencia previa: prototipo `SalesAcademyVibes/prototypes/copiloto-rep` (commit `51b0b00`) con router por reglas
en español, 9 skills y 34 vectores de fórmulas verificados contra la referencia; `npm test` 30/30, `npm run e2e` 8/8.

## Decision

1. **Router de intención por reglas** en el backend (`/api/agent/chat`) para el MVP. Devuelve `{ skill, params }`;
   si no reconoce la intención, la petición va a la skill de biblioteca (búsqueda con cita). Un modelo de lenguaje
   podrá agregarse después **solo como clasificador de intención y redactor de la explicación**, detrás de la misma
   interfaz de proveedor y con un ADR propio.
2. **Las skills calculan; el agente nunca genera cifras.** Cada skill es código determinista con pruebas que usan
   los vectores verificados (`brain-hub/research/timeshark-pro/verify_formulas.py`).
3. **Manifiesto por skill**: `id`, `slug`, `version`, `name`, `category`, `plan` (base/pro), `phase`, `inputs`
   (tipados), `output` (tipo de tarjeta), `intents`, `roles`, `client_safe`, `status`. El catálogo por sala guarda
   solo activación y favoritas; el admin de la sala activa, el rep fija favoritas.
4. **Ejecución uniforme**: `POST /api/skills/{id}/run` valida rol, plan y activación en la sala, ejecuta, audita
   (`skill_run`: usuario, sala, skill, versión, entradas resumidas, resultado ok/error) y devuelve una tarjeta JSON.
5. **Modo cliente** se construye en el servidor a partir de las entradas (no de la tarjeta interna) y excluye
   comisión, notas y SPIFF.

## Consequences

### Positive

- Cifras reproducibles y auditables; cada skill se prueba con vectores conocidos antes de liberarse.
- Sin dependencia de un proveedor de modelo para el piloto; costo variable cero y sin envío de datos a terceros.
- Agregar una skill = manifiesto + función + pruebas; el catálogo y la interfaz no cambian.
- Reutiliza la interfaz de proveedor existente y las acciones del agente en la app.

### Negative

- El router por reglas entiende un vocabulario acotado; frases muy distintas caen en la biblioteca.
- Mantener la gramática del router requiere pruebas por cada frase nueva.
- El manifiesto agrega un formato que el equipo debe aprender.

### Neutral

- Un modelo de lenguaje puede incorporarse después sin cambiar el contrato de skills.
- El formato de tarjeta queda compartido entre web y móvil.

## Alternatives

| Alternative | Reason Accepted / Rejected |
|---|---|
| Modelo de lenguaje que interpreta y calcula | Rechazada: riesgo de cifras incorrectas frente al cliente, costo variable, datos a terceros y sin proveedor aprobado para el piloto |
| Modelo de lenguaje solo para intención desde el MVP | Diferida: requiere ADR de proveedor, privacidad y presupuesto; se evalúa con datos de uso del MVP |
| Pantallas fijas sin agente (como la referencia) | Rechazada: no cumple el objetivo de "herramienta del día a día" conversacional del plan |
| Calcular en el cliente (como el prototipo) | Rechazada para el producto: no audita, duplica lógica entre web y móvil y no respeta la activación por sala del lado del servidor |

## Validation

- Pruebas unitarias del backend con los 34 vectores (`verify_formulas.py`) y las frases del router del prototipo (`tests/router.test.mjs`).
- Pruebas de API: skill inactiva → 403 con mensaje; rol sin permiso → 403; skill Pro sin plan → 403; ejecución exitosa → registro en `skill_run`.
- Prueba e2e del flujo del guion del prototipo contra el backend real.
- Medición en S1 durante 2 semanas: % de frases resueltas por el router sin caer a biblioteca (meta propuesta ≥ 80 %).
