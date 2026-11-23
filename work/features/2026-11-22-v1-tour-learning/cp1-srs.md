# CP1 · Requerimiento

**Status:** propuesta para revisión.

Como asesor con acceso a Goal Sheet y Coach, quiero convertir una conversación sobre una visita en un registro consultable, para continuar la atención y aprender de lo ocurrido sin transcribirlo de nuevo.

## Problema y necesidades

El contexto se pierde al salir del Coach y las notas del Diary no alimentan la Agenda. Se necesita una identidad por visita, recuperación por propietario y una recomendación de aprendizaje vinculada al mismo registro.

## Resultado esperado

Hablar del tour → elegir propósito → revisar y guardar → consultar en Agenda → obtener aprendizaje y abrir un paso autorizado del Roadmap → retomar con el Coach conservando el contexto guardado.

## Fuentes verificadas

Repositorio vcsAcademyMobile, base 6d89e8b:

| Fuente | Hecho verificado |
|---|---|
| frontend/src/pilot/Coach.jsx y coach-model.mjs | Conversación en estado React; acciones permitidas limitadas |
| frontend/src/pilot/Learning.jsx | Notebook/Diary locales; Roadmap y #lesson/step_N |
| frontend/src/pilot/SmartAgenda.jsx y smart-agenda-model.mjs | Eventos proceden de entries/reminders; detalle con scroll interno |
| backend/app/main.py | API Goal Sheet, chat, Blueprint y permisos existentes |
| backend/app/persistence.py | UNIQUE(user_id,entry_date) en Goal Sheet; sin entidad tour |
| backend/app/coach_hermes.py | Contexto acotado, fuentes autorizadas y puente privado |
| .ecosystem360/team-bootstrap/project-profile.local.yml | React/Vite, FastAPI, SQLite, Docker/Nginx |

El acceso de web.run al enlace público no pudo recuperar la SPA en esta revisión. Los hallazgos se basan en el código publicado y la evidencia de la entrega anterior; no se afirma haber validado en vivo esta nueva funcionalidad.

## Frontera funcional

La nueva visita individual y su análisis no reemplazan ni recalculan el Goal Sheet diario. Registrar o programar una visita no constituye una venta ni un QS. El análisis corresponde a lo narrado por el asesor y se identifica como orientación de IA.

No se crea un catálogo de cursos nuevo: se recomienda material existente del Roadmap y se conservan sus restricciones. El perfil Hermes existente es el proveedor, con almacenamiento del contexto en la app y no en una memoria global del agente.
