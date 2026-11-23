# CP2 · Visitas con contexto y aprendizaje

**Status:** propuesta v1; pendiente de aprobación explícita.
**Product:** Sales Academy V1 · aisalesv1.softvibes.pro
**Owner:** Product Owner
**Date:** 2026-11-22 (America/Cancun)
**Historia:** work/stories/2026-11-22-v1-tour-learning.md

## 1. Experiencia propuesta

Cuando el asesor mencione un tour o una visita en el Coach, aparecerá una pregunta breve:

> ¿Qué quieres registrar de este tour?
> **Iniciar visita** · **Programar tour** · **Registrar cómo me fue**
> Seguir conversando

La pregunta no guarda datos por sí misma. Se muestra una vez por contexto de visita no vinculado; «Seguir conversando» descarta la propuesta hasta que el usuario pida un registro nuevo. Si ya está vinculado a una visita, el Coach muestra su referencia y usa ese contexto, sin crear otra.

### Iniciar visita

Panel compacto sobre el chat: referencia opcional (p. ej. «Visita de la mañana»), fecha/hora de ahora en Cancún y contexto que el usuario acaba de compartir, editable. Acciones **Guardar e iniciar** y **Cancelar**. Tras guardar: estado «En curso», botón **Ver en Agenda** y contexto activo en el Coach.

### Programar tour

Mismo panel, con fecha y hora futuras obligatorias, referencia opcional y preparación/contexto editable. «Mañana» se convierte en una fecha visible antes de confirmar; sin hora no se inventa una. Tras guardar: estado «Programado» y botón **Ver en Agenda**. Desde el detalle se podrá **Iniciar visita** o **Cancelar visita**.

### Registrar cómo me fue · Smart Diary

Elegir una visita propia existente o «Otra visita» y confirmar su fecha/hora. Captura con tres preguntas breves: **¿Qué pasó?**, **¿Qué funcionó?**, **¿Qué mejorarías o harías después?**. La primera es obligatoria; las otras son opcionales. El relato compartido se propone en «Qué pasó», editable. Confirmar guarda el feedback y marca la visita «Finalizada»; después solicita el análisis.

Smart Diary ofrece este mismo registro vinculado y muestra los feedbacks guardados. Las notas locales anteriores siguen accesibles y no se suben automáticamente; copiar una al registro requiere selección y confirmación del usuario. Notebook personal conserva su funcionamiento.

### Agenda y Roadmap

El calendario conserva diseño, tema, navegación y botón flotante **Agregar seguimiento**. Las nuevas visitas aparecen por fecha y estado, además de los eventos existentes. El detalle muestra hora, referencia, estado, contexto guardado y feedback; el análisis se despliega dentro del panel, sin aumentar el scroll de la página.

**Aprendizaje con IA** muestra resumen, algo que funcionó, oportunidad de mejora y siguiente práctica, más hasta tres pasos reales y actualmente disponibles del Roadmap con una frase explicando su relación. Cada recomendación abre su lección; si el acceso cambia después de generar el análisis, explica el requisito y conduce al Roadmap conservando el bloqueo. No se propone una lección ya bloqueada al generar el análisis. En Roadmap aparece un bloque breve «Recomendado por tu última visita», con la misma recomendación vigente y enlace al registro de origen.

**Continuar con el Coach** abre la visita como contexto seleccionado, recuperado del servidor incluso tras recargar o entrar desde otro dispositivo. Los turnos de chat no confirmados como parte del registro mantienen la política anterior de memoria de sesión.

## 2. Requisitos funcionales

- REQ-01: un mensaje sobre tour/visita propone los tres caminos sin escribir una entidad. Una mención genérica puede recibir orientación y la propuesta; cancelar no interrumpe el chat. Se mantiene una acción manual «Registrar visita» para acceso directo o proveedor no disponible.
- REQ-02: iniciar crea una visita independiente en curso; programar crea una futura; el post-tour finaliza la elegida o crea una finalizada. Varias visitas del mismo día son válidas. No se deduplican por fecha ni texto.
- REQ-03: un UUID de solicitud repetido con el mismo contenido devuelve el mismo registro; con contenido distinto devuelve conflicto. Actualizaciones usan revisión esperada para evitar sobrescrituras entre dispositivos.
- REQ-04: guardar datos es una transacción independiente de la IA. Si Hermes falla, el registro continúa guardado y muestra «Análisis no disponible. Reintentar»; nunca se presenta texto local como análisis Hermes.
- REQ-05: el análisis usa únicamente el contexto/feedback de la visita seleccionada y material permitido. Guarda proveedor, fecha, versión de contexto y recomendaciones validadas. Una edición marca el análisis anterior como desactualizado; la respuesta tardía para una revisión antigua no reemplaza la actual.
- REQ-06: al abrir una visita desde Agenda/Diary/Roadmap, Hermes recibe el contexto guardado de esa visita. El backend comprueba propietario y permisos; el cliente no envía user_id, reglas de sistema ni una URL de proveedor.
- REQ-07: el análisis ofrece como máximo tres lecciones existentes, comprueba IDs y permisos y respeta el orden del Roadmap. No completa cursos automáticamente ni cambia progreso.
- REQ-08: Agenda combina visitas nuevas con Goal Sheet/seguimientos sin duplicar eventos ni cambiar KPIs. Una visita programada, en curso o finalizada no incrementa ventas, volumen ni QS del Goal Sheet.
- REQ-09: poder editar contexto/horario válido, cancelar una visita y eliminarla junto con su feedback/análisis. No se incorpora CRM, contactos, cobros ni mensajes externos.
- REQ-10: la retención del registro activo es de 30 días desde el instante de referencia: scheduled_at si programada, started_at si en curso (incluso si nunca se finaliza), completed_at si finalizada y cancelled_at si cancelada. Para feedback retrospectivo, completed_at es la hora de la visita confirmada, no la de captura. Borrado diario: máximo 31 días desde ese instante; lectura e inferencia dejan de servirla al cumplir 30 días. Las visitas finalizadas de hace 30 días o más no se admiten como nuevo registro vinculado; el usuario puede conservar una reflexión personal en el Diary anterior. Se puede eliminar antes. Las notas personales anteriores no cambian su retención. Es una política propuesta para V1, no una capacidad existente.

## 3. Contratos propuestos — todavía no existen

Se conserva el envelope/error de la API legacy. Rutas nuevas bajo `/api/tour-visits`; no se altera el contrato Goal Sheet. Estas definiciones son la frontera para implementar tras aprobación.

| Método/ruta | Entrada | Resultado y permisos |
|---|---|---|
| GET /api/tour-visits?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=50&cursor=… | Rango de fechas Cancún, máximo 93 días; límite 1–100; cursor opaco | Visitas propias del rango, cursor siguiente; function:goalsheet |
| POST /api/tour-visits | request_id UUID, intent: start/schedule/reflect, title opcional, scheduled_at con offset si schedule/reflect, context, feedback si reflect | 201 visita creada o 200 replay idéntico; function:goalsheet |
| GET /api/tour-visits/{id} | UUID | Detalle propio con análisis vigente/desactualizado; 404 si ajena/no existe |
| PATCH /api/tour-visits/{id} | expected_revision, request_id, acción edit/start/reflect/cancel y campos permitidos de la acción | Transición atómica, revisión nueva; 409 si conflicto, 422 si transición inválida |
| DELETE /api/tour-visits/{id} | Objeto JSON con expected_revision y request_id | Borrado coordinado de visita/feedback/análisis; no afecta Goal Sheet |
| POST /api/tour-visits/{id}/analysis | expected_revision, request_id | function:goalsheet y function:coach; análisis Hermes persistido o error recuperable; replay no repite inferencia exitosa |
| POST /api/smart-agent/chat (extensión) | tour_id UUID opcional, resto del contrato actual | Contexto propio cargado por backend; respuesta conserva campos y añade opcionalmente tour_action_prompt validado |

Acceso a visitas: sesión activa y function:goalsheet; sólo su propietario, también para líder/admin. Análisis y chat contextual requieren además function:coach. Se reutiliza la matriz actual, sin conceder permisos nuevos. La búsqueda y la lista filtran por propietario antes de serializar resultados.

### Modelo aditivo propuesto

`tour_visits`: id, user_id, title (0–120), status (scheduled/in_progress/completed/cancelled), scheduled_at, started_at, completed_at, cancelled_at, event_date (Cancún), context (0–6000), feedback_json, revision, created_at, updated_at, expires_at. Una visita tiene identidad independiente de su día. Índice owner/event_date/id. title vacío se presenta con fecha/hora, sin exigir nombre de pareja.

`tour_visit_analyses`: visit_id, context_revision, status (pending/ready/failed/stale), summary, strengths, improvement, next_practice, recommended_steps_json, provider, generated_at. Campos de texto acotados; salida máxima 6000 caracteres. Una versión vigente por visita; vínculo de borrado en cascada.

`tour_visit_requests`: user_id, request_id, operation, input_hash, visit_id, revision, estado/resultado mínimo para idempotencia. UNIQUE(user_id,request_id). Al borrar/expirar la visita, se elimina el resultado y se conserva sólo un tombstone de petición por 31 días (owner, UUID, operación, hash, estado deleted y expires_at; sin narrativa ni análisis). Repetir ese UUID durante esa ventana responde 410 y no recrea la visita; después de la ventana no se promete replay. Un pending abandonado por caída de proceso es recuperable tras el timeout, no queda bloqueado permanentemente.

Feedback: happened (1–4000), worked (0–2000), improve_next (0–2000). El total de context + feedback está limitado a 10000 caracteres y 24000 bytes UTF-8; el formulario muestra el límite y la API rechaza exceso con 422 antes de guardar. Fechas API ISO8601 con offset, almacenamiento UTC y fecha de calendario en America/Cancun. No se guardan cuerpos de chat completos, documentos ni contactos. Auditoría sólo IDs/acción/resultado, sin contexto o feedback.

### Formas JSON propuestas

Se usa `data` dentro del envelope legacy; las formas siguientes son campos del objeto data, no un envelope adicional:

- Crear, consultar y actualizar: `{ "visit": VisitDetail }`.
- Listar: `{ "visits": VisitSummary[], "next_cursor": string|null }`. Cada summary contiene id, title, status, event_date, scheduled_at, started_at, completed_at, cancelled_at, revision y analysis_status. Orden estable event_date/hora/id; next_cursor mantiene rango/owner.
- VisitDetail añade context, feedback (objeto o null), created_at, updated_at, expires_at y analysis (objeto o null). Nunca contiene user_id ni secretos de runtime.
- Eliminar: `{ "deleted": true, "id": UUID }`.
- Analizar: `{ "visit_id": UUID, "analysis": Analysis }`.
- Extensión opcional de chat: `tour_action_prompt: { "kind": "tour_registration", "question": "¿Qué quieres registrar de este tour?", "actions": ["start", "schedule", "reflect"] } | null`. Pregunta/acciones son constantes del servidor, no comandos generados libres. El frontend decide los labels aprobados y el borrador desde el mensaje del usuario.
- `Analysis`: `{ "context_revision": integer, "status": "pending"|"ready"|"failed"|"stale", "summary": string, "strengths": string, "improvement": string, "next_practice": string, "recommended_steps": [{ "step_id": string, "title": string, "reason": string }], "provider": "hermes", "generated_at": ISO8601|null }`. Máximos: summary1200, strengths1000, improvement1000, next_practice1000; recommended_steps0–3, reason300 por elemento. Texto plano, sin HTML. Estados sin resultado usan textos vacíos y lista vacía. Los títulos salen del catálogo, no de la salida libre del modelo.
- Salida de modelo de análisis: sólo summary, strengths, improvement, next_practice y recommended_steps con step_id/reason. El servidor asigna proveedor, revisión, estado, títulos y fechas. JSON inválido/esquema incorrecto → 503 recuperable, sin guardar análisis ready.

POST start no acepta horario futuro y fija started_at al confirmar en servidor. POST schedule exige scheduled_at futuro. POST reflect exige scheduled_at pasado/presente dentro de la ventana de retención y feedback; lo normaliza a completed_at. PATCH edit acepta title/context en estados no cancelados, scheduled_at sólo en scheduled y feedback sólo en completed, conservando completed_at. PATCH start no acepta hora arbitraria; PATCH reflect exige feedback y completed_at pasado/presente y posterior a started_at si existe; PATCH cancel fija cancelled_at en servidor. Campos adicionales o combinaciones inválidas → 422. revision/expected_revision son enteros positivos; request_id UUID obligatorio para mutaciones e inferencia.

Errores aditivos con `detail: {code,message}`: 403 permiso, 404 visit_not_found para ajena/inexistente/expirada, 409 visit_conflict o request_conflict, 410 request_deleted para tombstone, 422 entrada/transición inválida; análisis reutiliza coach_busy429/coach_unavailable503. Las respuestas de validación Pydantic existentes se conservan.

Transiciones: scheduled → in_progress/completed/cancelled; in_progress → completed/cancelled. completed permite editar feedback, sin reabrir automáticamente; cancelled permite consultar o eliminar. Editar no cambia la fecha de la visita por el solo paso del tiempo. Cada mutación relevante incrementa revision. event_date usa scheduled_at mientras está programada y started_at al iniciar; el post-tour nuevo usa la hora retrospectiva confirmada. Cancelar conserva el día del evento y fija cancelled_at. La caducidad se calcula según REQ-10, no según fecha de edición.

### Contexto e inferencia

Se amplía el adaptador existente y el perfil dedicado, conservando el bridge tool-free y el túnel privado a Hermes. La app es la fuente de memoria: entrega un bloque de datos delimitado con estado, fecha, relato y feedback de la visita seleccionada. No ejecuta instrucciones que estén dentro de ese contenido. El bloque conserva el registro completo dentro de los límites anteriores. Historial y fuentes mantienen sus máximos actuales; el cuerpo HTTP final tiene además un presupuesto de 96 KiB UTF-8, por debajo de los 128 KiB del bridge. Si excede, retirar primero turnos antiguos completos y después fuentes de menor relevancia; nunca cortar silenciosamente el contexto confirmado. Si aún excede, devolver error de tamaño explícito antes de inferir.

El análisis devuelve un esquema JSON validado. Los step_id se contrastan con el catálogo permitido en el servidor y su estado de progreso; títulos y enlaces se construyen desde ese catálogo. Si no hay un paso justificable y accesible, se muestra que no hay recomendación específica. El texto de análisis se identifica como IA y no como un hecho verificado de la pareja.

## 4. Diseño, accesibilidad y errores

Se reutilizan tokens light/dark, chips, diálogo y panel de detalle existentes. Controles mínimos 44px, entradas 16px, foco visible, cierre con Escape y retorno de foco. En 360×800 y 390×844, calendario y composición del chat siguen ajustados al viewport; formularios y detalle largo usan desplazamiento interno.

Estados: vacío, borrador, guardando, guardado, analizando, análisis disponible, fallo de análisis, conflicto de edición, eliminado/expirado. Una respuesta 401 del proveedor no expira la sesión de la app. Un 404 de visita ajena/expirada no revela su propietario.

## 5. Seguridad, datos y despliegue

- La propiedad se deriva de la sesión; comprobar en cada lectura, escritura e inferencia. El bridge no accede a SQLite ni tiene herramientas de escritura.
- V1 conserva su base de demostración independiente. Una cuenta compartida comparte propietario y registros; el aislamiento es entre cuentas, no entre personas que usan el mismo acceso. Esta feature no crea cuentas personales ni cambia la autenticación.
- Ante visita eliminada/expirada, el servidor rechaza el tour_id antes de inferir. La UI limpia su contexto e historial vinculado y ofrece volver a la agenda; no reconstruye automáticamente la visita desde mensajes antiguos. Un usuario siempre puede escribir texto nuevo, que se trata como una conversación nueva sin atribuirlo a un registro eliminado.
- Texto narrativo potencialmente personal: se envía a Hermes sólo al pedir análisis o conversar con la visita seleccionada. El panel hace visible qué contexto se guardará. La eliminación retira todas las copias de la visita dentro de la app y su contexto activo.
- Migración SQLite aditiva e idempotente sobre V1; respaldo consistente antes. Ningún dato real en pruebas, evidencia o repositorio.
- Publicación aislada en aisalesv1; V5 no se migra. La reversión de app no borra tablas ni restaura automáticamente una DB antigua. La tarea de expiración se conserva mientras existan registros nuevos, incluso si se revierte la interfaz.
- Retención de nuevos respaldos diarios V1: 7 días, conforme a la preferencia previa del usuario. Por ello, una copia residual puede permanecer hasta 7 días adicionales tras su eliminación de la app. Toda restauración ejecuta expiración antes de habilitar tráfico. Verificar el mecanismo real antes de declarar esa retención implementada; no aplicar el plazo al histórico ajeno a esta feature.

## 6. Aceptación y plan de pruebas

La historia contiene 10 criterios AC-01–AC-10, 10 escenarios y 5 sets sintéticos. Trazabilidad completa en `work/stories/2026-11-22-v1-tour-learning.md`; pares TDD en CP3.

Gates: registro y replay sin duplicados; visitas múltiples por día; fechas Cancún; contexto tras recargar; aislamiento entre cuentas; recomendaciones reales/autorizadas; errores Hermes con datos guardados; revisión antigua no sobrescribe; borrado/caducidad; regresión Goal Sheet/Agenda/Roleplay/V5; inferencia real con datos sintéticos.

## 7. RACI y capas

Accountable: Product Owner. Responsible: implementación frontend/backend/datos/infra y QA. Consulted: revisión de contratos, datos y seguridad. Informed: usuario solicitante.

Capas del perfil: frontend React/Vite, backend FastAPI, data SQLite, infra Docker/Nginx/systemd. No se requiere una nueva dependencia ni un servicio externo adicional.

## Gate CP2 → CP3

- [x] Historia, propuesta UX, contratos, datos y pruebas escritos antes de código.
- [x] Hechos actuales separados de contratos propuestos.
- [ ] PO aprueba esta v1, el wireframe, criterios/datos y retención propuesta.
- [ ] Historia LISTA y verify-story ejecutado con resultado satisfactorio.

La solicitud autoriza preparar el cambio; la aprobación de la feature anterior no aprueba estos contratos nuevos. No hay código productivo modificado en esta fase.
