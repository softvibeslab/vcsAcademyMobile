# Smart Agent Journey Sprint Plan

## Resumen

Este plan baja `Smart Agent Journey` a una secuencia construible para web y mobile, sin perder la logica del producto:

- instalar habito diario
- volver visible el progreso
- reducir friccion para empezar
- crear retorno diario medible

Suposicion de trabajo:

- V1 vive dentro de `Smart Agent`, no como app separada
- el usuario primario es `Rep`
- `Top Producer` configura contenido y progresion
- `CEO` consume analytics y señales de adopcion

## North Star

`% de usuarios activos que completan al menos 1 mision diaria`

## Metricas de apoyo

- D1 retention
- D7 retention
- mission completion rate
- average streak length
- next action click rate
- roadmap unlock rate
- recovery completion rate

## Principios de ejecucion

- primero valor real, luego profundidad de gamificacion
- una sola CTA principal por pantalla critica
- mobile-first desde sprint 1
- avatar util, no intrusivo
- el roadmap debe sentirse como progreso, no como menu

## Arquitectura de trabajo

- `backend`: motor de progreso, misiones, XP, streaks, unlocks, analytics
- `frontend`: pantallas web del journey y configuracion admin donde aplique
- `apps/mobile`: experiencia nativa/paralela del mismo loop
- `product/design`: reglas, copy, motion, priorizacion, medicion
- `data`: eventos, funnels, cohortes, health dashboard

## Sprint 0: Foundations and Alignment

### Objetivo

Cerrar definiciones, contratos y modelo de datos antes de construir pantallas.

### Tickets

- `PROD-001` Definir PRD V1 cerrado con alcance de pantallas incluidas y excluidas
- `PROD-002` Aprobar sistema de progreso: XP, streak, unlock y recovery
- `DES-001` Crear UI kit del journey con tokens, cards, progress strip, reward chips y avatar states
- `DES-002` Diseñar flows de `Welcome`, `Home`, `Activity`, `Result`, `Reward`, `Recovery`
- `BE-001` Diseñar schema para `journey_profiles`, `missions`, `mission_completions`, `streak_snapshots`, `journey_unlocks`
- `BE-002` Definir contrato API para bootstrap del journey y completion de misiones
- `DATA-001` Definir taxonomy de eventos analytics del core loop

### Dependencias

- definicion final de reglas de negocio
- aprobacion del modelo actor `Rep`, `Top Producer`, `CEO`

### Criterios de aceptacion

- existe un modelo de datos aprobado
- existe un contrato API versionado para V1
- existe una libreria base de componentes del journey

## Sprint 1: Activation and Daily Mission

### Objetivo

Habilitar el primer loop usable: entrar, ver mision y empezar.

### Tickets

- `BE-101` Crear endpoint `journey/bootstrap` con goal, streak, XP del dia, current mission y next unlock
- `BE-102` Crear endpoint `journey/onboarding` para guardar objetivo, meta diaria y avatar inicial
- `BE-103` Crear generador simple de `daily mission` basado en Smart Agent Core y Roadmap
- `FE-101` Implementar `Welcome` y `Onboarding`
- `FE-102` Implementar `Goal Selection`, `Daily Goal Setup` y `Avatar Setup`
- `FE-103` Implementar `Home` con CTA dominante, progress strip y bubble del avatar
- `MOB-101` Replicar onboarding y `Home` en mobile
- `QA-101` Validar first-time user flow de punta a punta

### Dependencias

- Sprint 0 cerrado
- decisiones de copy base del avatar

### Criterios de aceptacion

- un usuario nuevo puede completar onboarding y llegar a su primera mision
- `Home` responde que hacer hoy sin pasos ambiguos
- web y mobile muestran el mismo estado base del journey

## Sprint 2: Activity, Result and Reward

### Objetivo

Completar el loop principal con feedback inmediato y cierre emocional.

### Tickets

- `BE-201` Crear endpoint `journey/activity/start`
- `BE-202` Crear endpoint `journey/activity/complete` con calculo de XP, streak impact y unlock evaluation
- `BE-203` Crear servicio de progression rules para XP y niveles
- `FE-201` Implementar `Activity Screen` para activities de tipo prompt, scenario y objection drill
- `FE-202` Implementar `Result Screen` con XP, streak impact y next step
- `FE-203` Implementar `Reward Screen` con milestone o unlock
- `MOB-201` Implementar activity/result/reward en mobile
- `DATA-201` Instrumentar `daily_mission_started`, `activity_completed`, `reward_claimed`
- `QA-201` Validar completion rate y consistencia del calculo de XP entre plataformas

### Dependencias

- bootstrap del sprint 1
- reglas de progression aprobadas

### Criterios de aceptacion

- el usuario puede completar una actividad y recibir resultado consistente
- XP y streak cambian correctamente despues de una completion valida
- el sistema siempre recomienda un siguiente paso

## Sprint 3: Journey Map and Unlocks

### Objetivo

Hacer visible el avance y conectar el roadmap con el habito diario.

### Tickets

- `BE-301` Crear endpoint `journey/map` con nodos, estados y rewards asociados
- `BE-302` Crear servicio de unlocks por nodo previo, nivel y consistencia
- `BE-303` Conectar `Top Producer Roadmap` con estructuras del journey
- `FE-301` Implementar `Journey Map` con nodos `completed`, `current` y `locked`
- `FE-302` Mostrar `next unlock preview` en `Home` y en `Reward`
- `MOB-301` Implementar `Journey Map` mobile-first con CTA sticky
- `PROD-301` Definir criterios de stage y milestones V1
- `QA-301` Validar roadmap unlock rate y edge cases de nodos bloqueados

### Dependencias

- activities y rewards funcionando
- modelo del roadmap estable

### Criterios de aceptacion

- el mapa refleja progreso real del usuario
- los unlocks son trazables y consistentes
- el usuario entiende inmediatamente que sigue y que esta bloqueado

## Sprint 4: Progress, Streaks and Recovery

### Objetivo

Instalar la capa de retencion y regreso.

### Tickets

- `BE-401` Crear snapshots y calculo de `current_streak`, `longest_streak`, `streak_risk`
- `BE-402` Crear endpoint `journey/recovery` con comeback mission
- `FE-401` Implementar `Progress and Stats`
- `FE-402` Implementar `Streaks and Badges`
- `FE-403` Implementar `Habit Recovery` con copy amable y CTA `Recover today`
- `MOB-401` Replicar progress, streak y recovery en mobile
- `DATA-401` Instrumentar `streak_incremented`, `streak_broken`, `recovery_flow_started`, `recovery_flow_completed`
- `QA-401` Validar estados de riesgo y recuperacion con datos simulados y reales

### Dependencias

- XP y completion engine listos
- definicion exacta de ventana de recovery

### Criterios de aceptacion

- el usuario ve su consistencia de manera clara
- el recovery flow reduce friccion y se completa en menos de 2 minutos
- los eventos de streak son observables en analytics

## Sprint 5: Avatar Contextual and Notifications

### Objetivo

Dar personalidad al sistema sin volverlo invasivo.

### Tickets

- `BE-501` Crear motor simple de mensajes contextuales del avatar por trigger
- `BE-502` Configurar preferencias de tono, reminders y alertas
- `FE-501` Integrar avatar bubble contextual en onboarding, result, milestone y recovery
- `FE-502` Implementar pantalla de `Notifications and Reminders`
- `MOB-501` Integrar preferencias de avatar y nudges en mobile
- `DES-501` Definir biblioteca de mensajes del avatar por estado
- `QA-501` Validar frecuencia maxima de aparicion y tono correcto en escenarios criticos

### Dependencias

- recovery y result screens ya estables
- copy final aprobado

### Criterios de aceptacion

- el avatar aparece solo en momentos definidos
- reminders son configurables
- no hay ruido visual excesivo ni loops molestos

## Sprint 6: Admin, Content Ops and Executive Analytics

### Objetivo

Cerrar el sistema para que pueda operarse y medirse.

### Tickets

- `BE-601` Crear endpoints admin para configurar mission templates, unlock rules y challenges
- `BE-602` Crear resumen ejecutivo por cohortes, equipos y stages
- `FE-601` Crear vista admin de `Journey configuration` para Top Producer
- `FE-602` Crear dashboard ejecutivo con adoption, completion, streak health y unlock velocity
- `MOB-601` Exponer solo lectura de progreso y cohort insights relevantes para mobile roles
- `DATA-601` Crear dashboards para North Star y metrics de apoyo
- `QA-601` Validar permisos por actor `CEO`, `Top Producer`, `Rep`

### Dependencias

- loop principal y analytics base operando
- taxonomia de eventos estable

### Criterios de aceptacion

- `Top Producer` puede operar contenido y progresion sin tocar codigo
- `CEO` tiene visibilidad ejecutiva accionable
- permisos y datos son consistentes por rol

## Riesgos principales

- demasiada complejidad en V1
- recovery demasiado duro o demasiado irrelevante
- avatar sobreutilizado
- unlocks confusos o desconectados del valor
- divergencia entre web y mobile

## Mitigaciones

- congelar alcance de V1 al cierre de Sprint 0
- medir `time to first mission` desde Sprint 1
- limitar superficies del avatar desde el inicio
- lanzar unlocks solo cuando conecten con contenido valioso
- compartir contratos y componentes entre web y mobile

## Orden de implementacion recomendado

1. bootstrap + onboarding
2. home + daily mission
3. activity + result + reward
4. map + unlocks
5. progress + streak + recovery
6. avatar + reminders
7. admin + analytics

## Definicion de MVP listo para piloto

- onboarding funcional
- home con mission del dia
- al menos 3 tipos de activity
- XP y streak persistentes
- map basico con unlocks reales
- result y reward screens
- recovery flow
- analytics del core loop

Cuando eso exista, ya se puede correr un piloto controlado con reps reales y medir si el sistema esta creando retorno diario.
