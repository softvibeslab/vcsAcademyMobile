# Contratos backend aprobados · piloto v5

**Fecha:** 2026-11-19 · America/Cancun
**Carril:** Contrato · insumo de CP2
**Estado:** aprobado en CP2 v1 por el PO el 2026-11-20.
**Alcance:** contrato de implementación; resultados y evidencia observada en CP4/CP5.

## 1. Fuente y frontera de aprobación

Fuente de producto: `resumen-completo-proyecto.html`, corte del 18 de noviembre, 7:25 PM de Cancún, proporcionado por el usuario. Su resumen describe CRs v5; no se dispone aquí del texto completo de los 33 CRs ni de sus evidencias originales. No se declara aprobada esta especificación por la aprobación histórica de pantallas.

Este contrato concreta decisiones técnicas y reglas no detalladas por el resumen. Las decisiones denominadas **Propuesto IA** identifican su origen; fueron aceptadas mediante CP2 v1. La aprobación del 2026-11-20 autoriza nueva rama, implementación y publicación. La asignación del dueño fue confirmada separadamente por el usuario.

El piloto incluye acceso privado, Inicio/Mi día, Ruta, Recursos y acceso del dueño. Excluye Coach/IA, roleplay, exámenes, objeciones como módulo, operación de sala, planes comerciales, cobro y nuevas integraciones de correo. El dominio principal propuesto es `aisales.softvibes.pro`, sujeto al gate y al preflight de publicación de CP2 D-01; no se modifica automáticamente el dominio alternativo.

Este anexo está subordinado a [cp2-spec.md](cp2-spec.md) y a la [historia](../../stories/2026-11-19-pilot-v5.md). La revisión de consistencia incorpora las reglas D-01..12; no conserva variantes contradictorias sobre No Tour, metas ni marca antes del login.

## 2. Compatibilidad con el repositorio

Se conserva FastAPI/Pydantic y SQLite; no se propone un servicio externo nuevo. El código existente permite login, roles, progreso y recursos, pero:

- `backend/app/persistence.py`: `goalsheet_entries` tiene `UNIQUE(user_id, entry_date)`; no representa varios tours diarios.
- `backend/app/main.py`: `calculate_metrics` considera `close_today` como Q sin verificar venta; los 11 pasos están fijos en `BLUEPRINT_STEPS`.
- `backend/app/access.py`: Público/Gratis/Premium y códigos son globales; no equivalen al acceso por organización/lección.
- `backend/app/main.py`: alta pública y recuperación demo con token en la respuesta no cumplen el piloto privado.
- `backend/app/main.py` y `persistence.init_db()` siembran datos demo al iniciar/importar. El modo piloto debe separar migración de esquema y sembrado explícito de demostración.
- `frontend/src/pilot/App.jsx`: conserva bearer token en `localStorage`; las nuevas sesiones no lo harán.
- `frontend/src/pilot/model.mjs` y `Workspace.jsx`: notas y metas del navegador no constituyen almacenamiento compartido con el servidor.

**Propuesto IA:** namespace funcional nuevo `/api/pilot`, evitando reinterpretar silenciosamente contratos previos. Los endpoints existentes de login/cambio de contraseña/logout se adaptan de forma coordinada con el frontend; no se promete compatibilidad con clientes antiguos autenticados. La publicación web/API debe ser atómica a nivel de versión y cerrar sesiones anteriores. El cliente móvil anterior no queda habilitado para los datos del piloto hasta adaptar su contrato.

## 3. Reglas comunes de API

### 3.1 Tipos y respuestas

- Identificadores opacos UUID; no se derivan de correo ni de datos personales.
- Timestamps ISO 8601 UTC; días `YYYY-MM-DD` y meses `YYYY-MM` interpretados en `America/Cancun`.
- Moneda única `USD`. Los importes de entrada/almacenamiento son enteros en centavos, sin floats monetarios. Límites propuestos: neto por venta de 1 a `100000000` centavos (USD 1 millón), presupuesto mensual de 1 a `10000000000` centavos (USD 100 millones). Cero corresponde a no venta/No Tour; una cancelación conserva el importe original en histórico pero aporta cero al neto activo. Se rechazan importes negativos, fraccionarios en centavos, booleanos, NaN e infinitos. Estos límites de registros no sustituyen los límites independientes de las calculadoras de CP2.
- Porcentajes objetivo: puntos base enteros, `0..10000`; 2000 equivale a 20.00%.
- Cada recurso mutable tiene `version` entero desde 1. `PATCH`/acciones sobre recursos existentes reciben `expected_version`; conflicto devuelve 409 sin sobrescribir.
- Mutaciones de negocio se ejecutan con transacción y auditoría. No se considera guardado hasta commit confirmado.
- Listas privadas usan cursor opaco, `limit` predeterminado 25 y máximo 100. Filtros validados; no se concatenan valores en SQL.
- Respuesta exitosa mantiene el envelope actual: `{ "success": true, "data": {}, "message": null }`.
- Error normalizado: `{ "success": false, "data": null, "error": { "code": "...", "field_errors": {}, "request_id": "..." }, "message": "..." }`. El frontend traduce `code`; nunca presenta SQL, rutas del servidor o excepciones.
- Verificación de fuente: `backend/app/main.py:248` devuelve exactamente `success/data/message` para éxito y puede reutilizarse para ese caso. Las excepciones HTTP actuales no garantizan el envelope de error propuesto; su normalización para `/api/pilot` y acceso privado es trabajo explícito de implementación/QA, no comportamiento existente supuesto.
- 400 solicitud inválida; 401 sin sesión/revocada; 403 función no permitida; 404 recurso inexistente o de otra organización/propietario; 409 versión/estado/duplicado incompatible; 413 archivo grande; 415 formato no admitido; 422 validación de campos; 429 límite.
- Respuestas privadas y archivos: `Cache-Control: private, no-store`; el service worker no cachea datos privados ni peticiones de mutación.

### 3.2 Organización y permisos

**Propuesto IA:** una cuenta de piloto pertenece a una sola organización y tiene un rol `representative` o `owner`. Ambos usan el mismo login. El operador de plataforma actúa mediante CLI autorizada, no mediante una cuenta de dueño con privilegios globales en la app.

`organization_id` se obtiene de la sesión en todas las operaciones web. El cliente no puede asignarlo ni cambiarlo enviando JSON, headers, query o un ID ajeno. Las claves foráneas compuestas y consultas verifican organización y propietario del registro. Un dueño tiene permisos de su organización, nunca de todas.

| Recurso | Representante | Dueño |
|---|---|---|
| Tours/seguimientos propios | Crear, leer, corregir y anular según contrato | Solo si tiene actividad propia; no altera tours de vendedores |
| KPIs y meta propios | Consultar; confirmar una meta definitiva por mes | Consultar los de su equipo, sin editar metas ajenas |
| Notas/Diario | Solo los propios | Solo los propios; no puede leer los privados de su equipo |
| Lecciones publicadas | Leer si tiene acceso; marcar completada | Leer, crear, editar borrador, publicar/archivar y ordenar |
| Acceso a lecciones | Solicitar y consultar estado propio | Abrir/cerrar a su equipo; resolver solicitudes individuales |
| Mi equipo | Sin acceso | Métricas y progreso de su organización |
| Marca blanca | Ver | Editar nombre y títulos de su organización |
| Cuentas/lista permitida | Sin administración | Sin alta desde la app en v1; pide al operador el alta/baja |

La redirección visual del representante al Home no sustituye el 403 del servidor en endpoints de dueño. Los campos `roles`, `permissions`, `organization_id`, `user_id` y `status` enviados fuera de los contratos se rechazan, no se aceptan por asignación masiva.

## 4. Acceso privado y operación de cuentas

### 4.1 Modelo de identidad propuesto

| Entidad | Campos y restricciones |
|---|---|
| `pilot_organizations` | `id`, `slug` interno único, `status` active/suspended, `name`, `timezone=America/Cancun`, `currency=USD`, `app_name` (1..60), `welcome_title_en` (1..140), `welcome_title_es` opcional (1..140), `roadmap_seed_version` nullable, `version`, timestamps; el slug no se publica para enumeración |
| Extensión de `users` | `organization_id`, `pilot_role` representative/owner, `locale` en/es (en por defecto), `must_change_password`, `password_expires_at` para clave temporal, `session_version`; correo normalizado único, estado active/inactive |
| `pilot_allowed_emails` | `id`, `organization_id`, `email_normalized` único, `role`, `status` active/revoked, `user_id` único nullable hasta provisión, timestamps, `version`; no es una lista pública |
| `pilot_sessions` | `id`, hash del token, `user_id`, `organization_id`, versión de sesión, `created_at`, `last_seen_at`, `expires_at`, `revoked_at`; token original solo en cookie del cliente |

La pertenencia activa, lista permitida activa, cuenta activa y organización activa se verifican en **cada** petición autenticada, también descargas. Revocar cualquiera de ellas o rotar `session_version` invalida acceso inmediatamente en la siguiente petición. No se espera al vencimiento del token.

### 4.2 Alta y recuperación manual

**Propuesto IA:** ampliar `backend/app/cli.py` con operaciones planificadas `pilot-org-create`, `pilot-account-create`, `pilot-account-revoke`, `pilot-account-reset-password` y `pilot-account-list`. Estos comandos todavía no existen. Requieren el acceso operativo al backend; no son una API pública ni controles visibles del vendedor.

- El operador recibe de forma autorizada organización, nombre, correo y rol. Alta de lista y cuenta es una transacción; el correo ya asociado a otra organización produce conflicto y no se reasigna automáticamente.
- Se genera una contraseña temporal aleatoria de al menos 128 bits de entropía; vence a las 48 horas. Solo se almacena su hash mediante el mecanismo de contraseñas del backend.
- La entrega operativa usa un archivo privado solicitado por el operador, fuera del document root/repositorio, con permisos 0600. No se imprime la clave en stdout, logs, auditoría, URL, HTML, endpoints de catálogo ni reporte de despliegue. El canal de entrega al usuario requiere instrucción separada; esta especificación no envía credenciales.
- La contraseña temporal permite una sesión limitada para cambiarla. Hasta hacerlo, solo están disponibles `me`, `change-password` y `logout`; el resto responde `password_change_required`.
- Nueva contraseña propuesta: 12..128 caracteres; confirmación solo en frontend. Al cambiarla se cierran todas las sesiones anteriores y se crea una sesión nueva; la temporal deja de funcionar.
- Recuperación manual: `forgot-password` siempre muestra instrucciones genéricas para contactar al responsable. **No devuelve token, enlace de reset ni confirma existencia del correo.** El operador verifica identidad por el canal acordado y rota a otra contraseña temporal, invalidando sesiones.
- Se deshabilitan alta abierta, recuperación por token demo, selección de cuentas demo y canje de códigos en el modo piloto. Crear cuentas, revisar listas y restablecer claves son operaciones auditadas sin secretos.
- Límite propuesto de login: 5 intentos fallidos por cuenta/15 minutos y 30 por IP/15 minutos, con contadores persistentes y mensaje traducible; IP únicamente de proxy de confianza o conexión directa. No se confía en `X-Forwarded-For` recibido del público.

### 4.3 Sesiones y API de acceso

**Propuesto IA:** cookie host-only `__Host-aisales_session`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, sin atributo Domain. TTL absoluto 8 horas e inactividad máxima 30 minutos. No se devuelve bearer token ni se almacena identidad sensible en `localStorage`.

Mutaciones autenticadas requieren `Origin` del host oficial y `X-CSRF-Token` asociado a la sesión; el token CSRF se entrega en `me`/login y vive en memoria del cliente. Login también valida Origin. CORS se limita a orígenes explícitos de cada entorno; el piloto es same-origin. Las pruebas locales tienen configuración separada y no relajan producción.

| Método/ruta | Entrada | Salida/reglas |
|---|---|---|
| `POST /api/auth/login` | `email`, `password` | Cookie + `user:{id,display_name,role,locale}`, `organization:{id,app_name,welcome_title}`, `must_change_password`, `csrf_token`; no secretos de sesión en JSON |
| `GET /api/mobile/me` | Cookie | Adaptación compatible de ruta; contrato nuevo de sesión/organización/permisos y CSRF; no `tier` ni planes comerciales |
| `POST /api/auth/change-password` | `current_password`, `new_password` | Sesión renovada; auditoría; puede usarse con sesión limitada |
| `POST /api/auth/forgot-password` | `email` | Mismo resultado genérico para todos; instrucciones de recuperación manual, sin token |
| `POST /api/auth/logout` | Cookie+CSRF | Revoca sesión y expira cookie, idempotente |
| `PATCH /api/pilot/me/preferences` | `locale:en|es` | Preferencia persistente y textos actualizados |

El copy de la lista indicado por producto se presenta al intentar un acceso no autorizado: «Este correo no tiene acceso todavía. Pídele a tu gerente que te dé de alta.» / «This email does not have access yet. Ask your manager to add you.» Se usará también para estados suspendidos/inactivos sin exponer el motivo. Errores de contraseña no revelan credenciales. La existencia de un correo en la lista no concede una sesión sin contraseña válida.

## 5. Mi día: un registro por tour

### 5.1 Datos

| Entidad | Campos y restricciones |
|---|---|
| `pilot_tours` | `id`, `organization_id`, `user_id`, `occurred_on`, `tour_kind:q|ct|nq|no_tour`, `channel:agency|member|null`, `sale_status:no_sale|sold|cancelled|null`, `net_volume_cents`, `sale_recorded_at` nullable, `cancelled_at` nullable, `cancellation_reason_code` nullable, `record_status:active|voided`, `void_reason_code`, `version`, timestamps |
| `pilot_followups` | `id`, `organization_id`, `user_id`, `tour_id`, `due_at` UTC, `status:pending|done|cancelled`, `action_text` hasta 500 caracteres, `version`, timestamps |

No se capturan nombres de parejas/prospectos, correo, teléfono, fotos, survey, documentos de identidad ni composición familiar. El texto de seguimiento es una acción de trabajo, no una ficha de cliente. La UI indica esto junto al campo; no se incorpora análisis de IA.

Reglas **Propuesto IA**:

1. Un tour real tiene canal obligatorio y un único resultado; `sold` representa exactamente una venta. No se acepta `number_of_sales` ni cantidades arbitrarias por tour.
2. `sold` exige `net_volume_cents > 0`. Es volumen neto capturado directamente por el vendedor, en USD; no se calcula desde bruto, impuestos, enganche o comisiones.
3. `no_sale` exige importe 0; no se solicita motivo de objeción. El tipo `ct` se conserva como etiqueta literal «CT» del requerimiento, sin expandirlo a «Cierra hoy» por inferencia del código anterior ni asumir que siempre produjo venta.
4. `no_tour` es un registro individual de actividad: **puede convivir con otros tours del mismo vendedor/día**, como en DS-02. No representa el estado de todo el día ni anula otros registros. Canal opcional: `null`, `agency` o `member`; no se exige elegirlo cuando no hubo tour y no se rechaza un canal válido aportado. No pide resultado, monto ni seguimiento: la API acepta resultado/importe omitidos y los normaliza a `sale_status=null`, importe 0; rechaza venta, importe distinto de 0 o intento de seguimiento. No hay unicidad por usuario/fecha/tipo: la deduplicación usa `client_request_id`, también para No Tour.
5. Fechas hasta el día actual de Cancún. Correcciones retroactivas permitidas sin crear otro tour y siempre auditadas. No se cambia fecha implícitamente según timezone del servidor.
6. Seguir un tour requiere `sale_status=sold` y `record_status=active`. Cancelar/anular la venta, corregirla a no venta o cambiar el registro a No Tour cancela sus seguimientos pendientes en la misma transacción; no borra los completados ni el histórico. La UI presenta esta consecuencia antes de confirmar el cambio. Reactivar la venta no reactiva recordatorios automáticamente. Consultar históricos no envía notificaciones externas.
7. Para eliminar un error de captura se anula el registro; no se borra físicamente la evidencia. Restaurar requiere versión vigente y revalidar reglas. Un registro anulado no entra en métricas.
8. La edición del vendedor se limita a sus registros. El dueño consulta agregados y los campos operativos de tours del equipo que este contrato admite; no edita en nombre del vendedor.
9. Los conteos distinguen registros de actividad y tours reales. Distribución Agencia/Socios usa solo Q/CT/NQ activos; No Tour no se suma a esa base aunque conserve canal opcional. Los contadores de No Tour se muestran por separado y no afectan los seis KPIs.

### 5.2 Cancelación y ventas: decisión propuesta

**Propuesto IA, decisión de negocio pendiente de CP2:** cancelar es transición `sold → cancelled`, conservando importe original e historial. No representa una segunda venta ni un importe negativo. Restaurar `cancelled → sold` reutiliza el importe guardado y exige confirmación/versión; ninguna de las dos acciones crea otro tour.

La fórmula considera el **estado vigente**: un CT/NQ cancelado deja de aportar Q efectivo; un Q cancelado sigue siendo Q. Venta y volumen cancelados se excluyen. La corrección recalcula el periodo original de `occurred_on`, no el día de cancelación. Si producto quiere mantener como Q a un CT/NQ que vendió alguna vez, debe sustituir explícitamente esta regla antes de aprobar el SPEC; no se soportarán ambas interpretaciones a la vez.

### 5.3 API de tours y seguimientos

Todas las rutas de esta tabla son privadas y propias; el servidor asigna usuario/organización.

| Método/ruta | Entrada/salida |
|---|---|
| `GET /api/pilot/tours?from=&to=&cursor=&limit=` | Registros propios con tipo original, resultado, `effective_q`, estado, importe y versión; rango máximo propuesto 366 días |
| `POST /api/pilot/tours` | `{client_request_id,occurred_on,tour_kind,channel,sale_status,net_volume_cents}`; canal/resultado/importe pueden omitirse en No Tour según normalización; 201 recurso; repetición de mismo ID/payload devuelve original, 409 si payload difiere |
| `PATCH /api/pilot/tours/{id}` | Campos editables + `expected_version`; no permite forjar cancelación/restore mediante asignación de estado. Cambiar venta a no venta/No Tour requiere confirmación de UI y normaliza importe/seguimientos atómicamente; rechaza payloads incompatibles, sin silenciosamente aceptar una venta en No Tour |
| `POST /api/pilot/tours/{id}/cancel-sale` | `expected_version`, `reason_code:customer_cancelled|entry_correction|other`; transición auditada |
| `POST /api/pilot/tours/{id}/restore-sale` | `expected_version`; solo desde cancelled |
| `POST /api/pilot/tours/{id}/void` | `expected_version`, `reason_code:duplicate|entry_error|other` |
| `POST /api/pilot/tours/{id}/restore` | `expected_version`; revalida fecha, No Tour y estado de venta |
| `GET/POST /api/pilot/tours/{id}/followups` | Listar o crear `{client_request_id,due_at,action_text}`; solo venta vigente para crear |
| `PATCH /api/pilot/followups/{id}` | `expected_version`, `due_at`, `action_text`, `status`; modificar fecha/texto o pasar pending→done requiere venta activa; pending→cancelled conserva histórico. No se reabre cancelled/done en v1: se crea otro seguimiento solo con venta activa |
| `GET /api/pilot/followups?status=pending` | Pendientes propios ordenados; nunca recordatorios de otros usuarios |

`client_request_id` UUID es único por organización/usuario/operación; la deduplicación se guarda con la mutación. No se usa para inferir que dos tours con los mismos valores son el mismo tour. Reintentar una solicitud tras fallo de red no duplica una venta ni un seguimiento: en POST de tours, seguimientos, notas y Diario, misma clave/payload normalizado devuelve el original; misma clave y contenido distinto devuelve 409. Las transiciones sobre registros existentes requieren versión, por lo que repetir una acción obsoleta no crea otro evento ni revierte estados. La meta mensual usa su restricción única y devuelve 409 en una segunda creación; el cliente consulta la meta ya confirmada.

Ejemplo sintético de creación:

```json
{
  "client_request_id": "00000000-0000-4000-8000-000000000101",
  "occurred_on": "2026-11-19",
  "tour_kind": "ct",
  "channel": "agency",
  "sale_status": "sold",
  "net_volume_cents": 280000
}
```

## 6. Metas mensuales y seis KPIs

### 6.1 Goal Sheet separado

`pilot_monthly_goals(id, organization_id, user_id, month, budget_volume_cents, target_close_bps nullable, confirmed_at, created_at)`; único `(organization_id,user_id,month)`. No hay campos editables ni endpoint de actualización/borrado después de confirmar.

Conforme a CP2 D-07, la meta se previsualiza y **se confirma una sola vez por usuario/mes, quedando inmutable en v1**; no se vuelve a capturar por tour. Presupuesto >0; cierre objetivo opcional `0..10000`. Ni vendedor, dueño ni una ruta administrativa heredada pueden actualizar o borrar la meta confirmada. Una segunda creación, incluso concurrente, devuelve 409; el cliente carga el registro existente. La siguiente meta se confirma cuando comienza el mes siguiente. Correcciones excepcionales requerirán un nuevo acuerdo explícito y procedimiento trazado; no existe una puerta administrativa implícita en esta versión. No se prorratea ni extrapola una meta parcial automáticamente.

| Método/ruta | Contrato |
|---|---|
| `GET /api/pilot/monthly-goals/{YYYY-MM}` | Meta propia o `data.goal=null` |
| `POST /api/pilot/monthly-goals` | `month`, `budget_volume_cents`, `target_close_bps`; solo mes actual de Cancún; 409 si ya existe; confirmación definitiva tras vista previa. El escenario de diciembre avanza el reloj de prueba a diciembre |
| `PATCH/PUT/DELETE /api/pilot/monthly-goals[/{id}]` | Operaciones no admitidas, 405 sin modificación; tampoco se ofrece actualización desde CLI/administración en v1 |
| `GET /api/pilot/metrics?period=today\|week\|month&anchor_date=YYYY-MM-DD` | Actividad propia en periodo elegido, más referencias y comparaciones del mes de `anchor_date`; predeterminados today y día actual de Cancún; fecha ancla no futura |

Para `week`, la semana comienza lunes y llega hasta `anchor_date`; `month` comienza el día 1. `today` usa el propio día ancla. El servidor devuelve explícitamente `activity_period:{from,to}`, `budget_month`, `activity_totals`, `monthly_totals` y `goal`. Cierre/VPG/ticket usan `activity_totals`; cumplimiento/diferencia presupuesto/diferencia de cierre usan siempre `monthly_totals` y la meta mensual, aunque el filtro sea diario o semanal. La comparación de cierre usa el cierre mensual no redondeado antes de restar el objetivo. Nunca se divide actividad semanal entre presupuesto mensual ni se prorratea sin indicarlo.

### 6.2 Definiciones canónicas

Para tours activos del vendedor y rango de actividad o mes de comparación correspondiente:

- `effective_q = tour_kind == q OR (tour_kind IN [ct,nq] AND sale_status == sold)`.
- `sales = count(sale_status == sold)`; una venta por tour. No Tour está excluido por validación.
- `net_volume_cents = sum(net_volume_cents WHERE sale_status == sold)`.
- `qualified_tours = count(effective_q)`; cada tour aporta como máximo 1.

| KPI | Fórmula | Unidad y caso sin denominador |
|---|---|---|
| Cierre | `sales / qualified_tours * 100` | %; null si Q=0 |
| VPG | `net_volume_cents / qualified_tours` | Centavos; dividir entre 100 para presentar USD; null si Q=0 |
| Ticket promedio | `net_volume_cents / sales` | Centavos; dividir entre 100 para presentar USD; null si ventas=0 |
| Cumplimiento del presupuesto | `monthly_net_volume_cents / budget_volume_cents * 100` | %; null sin meta válida |
| Diferencia contra presupuesto | `monthly_net_volume_cents - budget_volume_cents` | Centavos con signo; dividir entre 100 para presentar USD; null sin meta |
| Diferencia de cierre | `monthly_closing_percent - target_close_bps / 100` | puntos porcentuales, con signo; null sin Q mensual o cierre objetivo |

Con Q>0 y cero ventas, cierre y VPG son 0, ticket promedio es null. Con meta y cero volumen, cumplimiento es 0 y diferencia es negativa. Sin registros se distingue `no_records` de un cero calculable. Nunca `NaN`, infinito ni cero ficticio para una razón no calculable.

El servidor devuelve valores redondeados una sola vez: porcentajes a 2 decimales y razones monetarias al centavo, usando decimal y redondeo half-up. Conserva numeradores enteros en la respuesta para trazabilidad; no suma ratios por vendedor. Los totales de equipo se calculan sobre numeradores/denominadores agregados. La UI muestra unidad explícita y «—» con explicación accesible para null.

Respuesta propuesta para periodo mensual (en periodo diario/semanal los dos bloques de totales pueden diferir):

```json
{
  "success": true,
  "data": {
    "activity_period": {"from": "2026-11-01", "to": "2026-11-19"},
    "budget_month": "2026-11", "timezone": "America/Cancun", "currency": "USD",
    "activity_totals": {"qualified_tours": 3, "sales": 2, "net_volume_cents": 300000},
    "monthly_totals": {"qualified_tours": 3, "sales": 2, "net_volume_cents": 300000},
    "goal": {"budget_volume_cents": 600000, "target_close_bps": 5000},
    "kpis": {
      "closing_percent": "66.67", "vpg_cents": 100000,
      "average_ticket_cents": 150000, "budget_attainment_percent": "50.00",
      "budget_difference_cents": -300000, "closing_difference_pp": "16.67"
    },
    "availability": {"has_records": true, "has_goal": true, "has_closing_target": true}
  },
  "message": null
}
```

## 7. Ruta, contenido y permisos por lección

### 7.1 Modelo propuesto

| Entidad | Campos/garantías |
|---|---|
| `pilot_lessons` | `id`, `organization_id`, `position`, `status:draft|published|archived`, `current_published_revision_id` nullable, `team_access:open|closed`, `version`, timestamps |
| `pilot_lesson_revisions` | `id`, `organization_id`, `lesson_id`, `revision_number`, `state:draft|published`, `title_en`, `title_es` opcional, `description_en`, `description_es` opcional, `video_provider:youtube|vimeo`, `video_id`, `video_privacy_hash` opcional para Vimeo, `pdf_asset_id`, `approved_by`, `published_at`, timestamps |
| `pilot_assets` | `id`, `organization_id`, `uploaded_by`, tipo pdf, storage key aleatoria, nombre seguro, MIME verificado, bytes, SHA-256, `status:ready|deleted`, timestamps; ruta física nunca en respuesta |
| `pilot_lesson_access` | `organization_id`, `lesson_id`, `user_id`, `decision:allow|deny`, `updated_by`, timestamps; único lección/usuario |
| `pilot_lesson_completions` | `organization_id`, `lesson_id`, `user_id`, `published_revision_id`, `completed_at`; único lección/usuario |
| `pilot_access_requests` | `id`, organización/lección/usuario, `status:pending|approved|rejected|resolved_by_team_access`, timestamps, `decided_by`; máximo una pendiente por lección/usuario |

No hay máximo fijo de 11 lecciones ni dependencia de `step_1..11`. La plantilla inicial de 11 lecciones aplica **una sola vez por organización**, mediante marcador persistente `roadmap_seed_version`; posiciones 1–3 empiezan abiertas y 4–11 cerradas. Es una semilla de estructura/acceso, no una publicación de video/PDF ficticio: cada lección comienza en borrador hasta cargar y aprobar material real. La política queda guardada y no se recalcula por posición al reordenar, al reiniciar ni al volver a migrar. Crear otra lección después usa cerrado por defecto, aunque ocupe una de las tres primeras posiciones. Si el dueño archiva lecciones, la siguiente ejecución no las recrea.

Acceso representante = cuenta/lista/organización activas + lección publicada + decisión individual si existe, o `team_access` como respaldo. `deny` individual prevalece sobre equipo abierto; `allow` abre una lección del equipo cerrado. La publicación y el permiso son requisitos distintos. El dueño puede previsualizar borradores de su organización, nunca otra.

**No hay bloqueo secuencial ni planes comerciales en el piloto.** Completar otra lección no concede acceso; todas las lecciones publicadas y permitidas pueden abrirse en cualquier orden. Una lección cerrada devuelve únicamente título, descripción breve y permiso; no viajan URLs de video ni PDF al cliente.

### 7.2 Borrador, publicación y completado

- El dueño crea/edita borrador. Publicar requiere título inglés, video válido y un PDF listo de la misma organización; aprobación/publicación es una acción del dueño, sin un rol aprobador adicional.
- Editar contenido publicado crea una revisión borrador; el vendedor conserva la revisión publicada hasta nueva aprobación. No se cambia contenido visible al guardar un formulario de edición.
- Publicar nueva revisión no borra completados anteriores; se conserva qué revisión completó cada vendedor. El dueño puede ver que hay una revisión posterior, sin reiniciar automáticamente el porcentaje de aprendizaje.
- Archivar quita la lección del catálogo activo y bloquea sus archivos para el representante; preserva las referencias, solicitudes y completados históricos. Restaurar vuelve a borrador y exige publicación explícita.
- La acción «Lección completada» es idempotente y guarda revisión/fecha. No exige examen, roleplay ni telemetría de reproducción de proveedores.
- El progreso actual del equipo usa lecciones publicadas y accesibles a ese vendedor; con cero lecciones accesibles devuelve null. El dueño también recibe número total de lecciones publicadas para interpretar denominadores diferentes por permisos.

### 7.3 Videos y PDF

**Propuesto IA:** solo enlaces HTTPS de YouTube (`youtube.com/watch`, `youtu.be`, formatos embed/shorts normalizables) o Vimeo (`vimeo.com`, `player.vimeo.com`) con IDs validados; se guarda proveedor/ID y se genera embed seguro. No se acepta HTML/iframe arbitrario, `javascript:`, hosts similares ni URL de archivos. No se realizan fetch del servidor a URLs aportadas por usuario; evita una superficie SSRF nueva.

Los videos siguen las políticas de privacidad/embebido de YouTube/Vimeo. La app controla la entrega de la referencia, pero no promete DRM ni impedir compartir una URL que el alumno ya vio. El dueño debe usar un video embebible; la publicación exige previsualización humana y no declara validado un proveedor remoto sin comprobarlo.

PDF propuesto: un archivo por revisión, máximo **10 MiB**. Ingreso como cuerpo binario `application/pdf` mediante streaming con límite real; evita dependencia de multipart. Validar cabecera PDF, MIME, tamaño y nombre; rechazo de archivos vacíos/no PDF. Nombre de storage generado en servidor fuera del document root, sin rutas del cliente. No se ejecuta ni transforma el documento en el backend; no se afirma análisis antivirus si no existe.

Descarga autenticada en cada petición, por autorización de una revisión publicada/accesible o dueño de la organización. No basta conocer `asset_id`. `Content-Disposition: attachment`, nombre sanitizado y `nosniff`; no se publica como contenido activo dentro del origen de la app. El botón de producto es «Abrir guion / Open script», sin exponer storage keys ni controles técnicos.

Un reemplazo conserva archivos usados por revisiones históricas hasta aplicar la retención aprobada. Archivos temporales/orfanados se eliminan mediante operación de mantenimiento documentada; no se crean tareas del VPS en esta fase. El cupo total y estrategia de respaldo deben confirmarse antes de publicación.

### 7.4 API de aprendizaje y dueño

| Método/ruta | Actor / contrato |
|---|---|
| `GET /api/pilot/lessons` | Usuario: catálogo publicado, orden, `allowed`, estado completado, solicitud propia; dueño puede pedir `include_drafts=true` |
| `GET /api/pilot/lessons/{id}` | Usuario autorizado; revision publicada con video normalizado y descriptor del PDF; cerrado devuelve 403 `lesson_access_required` sin contenido |
| `POST /api/pilot/lessons/{id}/complete` | Usuario; idempotente, exige acceso vigente |
| `POST /api/pilot/lessons/{id}/access-requests` | Usuario sin acceso; crea una pendiente o devuelve la existente; no necesita texto libre ni envío externo |
| `GET /api/pilot/access-requests/mine` | Usuario: estado propio |
| `GET/POST /api/pilot/owner/lessons` | Dueño: listar todo / crear borrador con `client_request_id`, título/descripción y acceso inicial cerrado por defecto; misma clave/payload devuelve el original y conflicto de payload da 409 |
| `GET /api/pilot/owner/lessons/{id}/draft` | Dueño: revisión borrador y revisión publicada de su organización para edición/previsualización |
| `PATCH /api/pilot/owner/lessons/{id}/draft` | Dueño: contenido, video y PDF de misma organización + versión |
| `POST /api/pilot/owner/lessons/reorder` | Dueño: IDs de catálogo propio sin duplicados + `expected_catalog_version`; transacción, sin alterar permisos |
| `POST /api/pilot/owner/lessons/{id}/publish` | Dueño: revisión y versión esperadas; valida requisitos y aprueba/publica atómicamente |
| `POST /api/pilot/owner/lessons/{id}/archive` | Dueño: versión; preserva histórico |
| `POST /api/pilot/owner/lessons/{id}/restore` | Dueño: versión; vuelve a borrador |
| `PATCH /api/pilot/owner/lessons/{id}/access` | Dueño: `{team_access,expected_version}` |
| `PUT /api/pilot/owner/lessons/{id}/access/{user_id}` | Dueño: `{decision:allow|deny,expected_version}`; usuario debe ser representante propio |
| `DELETE /api/pilot/owner/lessons/{id}/access/{user_id}` | Dueño: elimina excepción individual, vuelve a regla de equipo; versión en `If-Match` |
| `POST /api/pilot/owner/assets/pdf` | Dueño: cuerpo binario, `Content-Type: application/pdf`, `X-Client-Request-ID` UUID y nombre opcional en `X-File-Name` sanitizado; reintento con mismo ID/bytes retorna descriptor original, ID con bytes distintos da 409; no acepta URI externa ni ruta filesystem |
| `GET /api/pilot/owner/assets/{id}/download` | Dueño de la organización: previsualizar/abrir PDF de borrador; misma política de descarga privada y cabeceras que lección publicada |
| `GET /api/pilot/lessons/{id}/pdf` | Usuario permitido o dueño; resuelve PDF de revisión autorizada, sin URL pública permanente |
| `GET /api/pilot/owner/access-requests?status=pending` | Dueño: pendientes y contador por lección/equipo |
| `POST /api/pilot/owner/access-requests/{id}/resolve` | Dueño: `{decision:approved|rejected,expected_version}`; aprobar crea excepción allow en misma transacción |

Solicitudes son avisos dentro de Mi roadmap/Mi equipo. No se envía correo, WhatsApp o push. Abrir acceso de equipo resuelve pendientes aplicables como `resolved_by_team_access` sin fabricar acciones de aprobación individual. Una denegación explícita no se vence automáticamente; puede volver a solicitarse tras 24 horas, propuesta para evitar duplicados repetidos. Las métricas muestran solicitantes únicos y pendientes; no suman reintentos técnicos como interés nuevo.

## 8. Notas y Diario privados en servidor

| Entidad | Campos/reglas |
|---|---|
| `pilot_notes` | `id`, organización/usuario, `title` 1..120, `body` texto plano 1..10000, `pinned` bool, `version`, timestamps; no HTML ejecutable ni referencias a prospectos |
| `pilot_diary_entries` | `id`, organización/usuario, `entry_date`, `tour_id` propio opcional, tres respuestas `answer_1..3` de 1..2000 cada una, `version`, timestamps; varias reflexiones diarias permitidas |

**Propuesto IA:** texto privado persistente hasta que el propietario lo elimine. No se comparte con dueño/equipo ni se utiliza para entrenar/consultar IA. Las tres preguntas y sus textos English/Español pertenecen al contrato UX; el backend guarda respuestas, no feedback generado.

| Método/ruta | Contrato |
|---|---|
| `GET/POST /api/pilot/notes` | Listar/buscar propios o crear con `client_request_id`; buscar limita término a 100 caracteres y usa consultas parametrizadas |
| `GET/PATCH/DELETE /api/pilot/notes/{id}` | Solo propietario; edición con versión; eliminar contenido activo, no guardar texto en auditoría |
| `GET/POST /api/pilot/diary` | Listar por rango o crear con `client_request_id`, respuestas, fecha y tour opcional propio; reintento idempotente |
| `GET/PATCH/DELETE /api/pilot/diary/{id}` | Solo propietario; contrato de versiones equivalente |

Sin red o sin confirmación de guardado: el cliente conserva el borrador únicamente en memoria y muestra «Sin conexión, no se guardó / Offline, not saved». No marca guardado, no crea cola offline ni guarda contenido privado en `localStorage`/service worker. El guardado offline queda fuera de Must. Al volver la red puede reenviarse con el mismo `client_request_id`.

Los datos existentes del navegador se importan solo con acción del usuario y revisión; no pueden asignarse automáticamente por el mero origen/nombre de una clave de localStorage. La propuesta de importación se implementará solo si CP2 la incluye; por defecto los históricos locales permanecen disponibles en exportación del cliente anterior y no se mezclan silenciosamente.

## 9. Mi equipo y marca blanca

| Método/ruta | Salida/regla |
|---|---|
| `GET /api/pilot/owner/team?period=today\|week\|month&anchor_date=YYYY-MM-DD` | Representantes de organización; tours por tipo/canal, Q efectivos, ventas activas, volumen neto, seis KPIs, meta y progreso; mismo contrato de periodos/mes de referencia que Home |
| `GET /api/pilot/owner/team/{user_id}?period=today\|week\|month&anchor_date=YYYY-MM-DD` | Detalle del vendedor propio: agregados, registros operativos, lecciones completadas y solicitudes; nunca notas/Diario privados; mismos límites temporales |
| `GET/PATCH /api/pilot/owner/settings` | App name y título de bienvenida en/es con `expected_version`; no logo, color, dominio ni secretos |

Antes del login y sin contexto autenticado se muestra el nombre/título de plataforma configurado para la instalación. No se deduce organización del correo introducido ni se acepta un `organization_id`, slug o query como identidad confiable. **No hay endpoint público de búsqueda, listado ni resolución de marcas de organizaciones.** Tras el login, `me`/login entregan la marca de la organización autenticada; A01 puede mostrar su título al reabrir bienvenida cuando ese contexto ya es válido. Tras logout/revocación se limpia el contexto de organización y vuelve la marca de plataforma. No se publica una nueva ruta de enumeración de organizaciones para personalizar la bienvenida.

English es idioma por defecto y el primero del selector. Se persiste `locale`; la traducción de interfaz es independiente del idioma de video/PDF. Contenido sin traducción española se presenta en inglés con etiqueta de idioma; no se inventa una traducción. Texto de marca como texto plano, longitud limitada y escapado.

## 10. Migración, aislamiento y retirada de flujos anteriores

### 10.1 Estrategia propuesta

1. Inventariar versión, esquema y conteos en copia de la base. **No ejecutar `backend:reset`** ni copiar bases de otra app. Preparar respaldo consistente SQLite y de assets, con checksum y prueba de restauración en entorno aislado.
2. Crear migraciones versionadas con `schema_migrations`, transaccionales e idempotentes. Tablas nuevas no modifican los importes/payload históricos. Separar `init_schema` de `seed_demo_data`; modo piloto falla si intenta depender de cuentas demo o seeds de contenido ficticio.
3. Crear organización y correspondencia de cuentas mediante manifiesto operativo revisado, fuera del repo, sin claves. Nunca asignar todas las cuentas a una organización por tener `team_demo`. Cuentas sin mapeo quedan sin acceso a piloto.
4. Copiar/referenciar `goalsheet_entries` como **histórico legacy de solo consulta** manteniendo ID, fechas y payload. No generar tours a partir de un resumen diario; no inferir cantidad Q, canal ni neto. El historial informa que no entra en métricas nuevas.
5. Crear metas mensuales nuevas sin convertir metas locales automáticamente. Ofrecer exportación/importación explícita si se aprueba; no fingir que el navegador anterior sincronizó datos.
6. Conservar progreso legado separado. Para un progreso trasladado debe existir una correspondencia explícita entre paso legado y lección real de una organización, aprobada por contenido; no casar por orden/título solamente.
7. Conservar tablas de planes/códigos, roleplay/certificaciones y recursos previos para reversión/consulta autorizada; no usarlas para autorizar piloto ni exponerlas en UI nueva.
8. Revocar sesiones antiguas y retirar tokens bearer del cliente. La nueva versión exige sesión privada, pertenencia/lista activa y cambio de temporal cuando corresponda.
9. Validar conteos, claves foráneas, aislamiento, idempotencia de migración y lectura legacy antes de habilitar escritura del piloto.

Ruta privada de histórico: `GET /api/pilot/legacy/goalsheets?from=&to=` solo del propietario mapeado. Responde `{source:"legacy_daily_summary",included_in_pilot_metrics:false,entries:[...]}`. No tiene POST/PATCH. El dueño no obtiene notas heredadas por esta ruta.

### 10.2 Endpoints fuera del piloto

En configuración `pilot`, deben quedar deshabilitados en servidor, aunque alguien conozca la ruta: registro abierto, catálogo/demo users, reset por token demo, catálogo/contenido público de lecciones, coach público/privado, insights IA, roleplay, certificaciones, canje/licencias/planes, antiguos permisos globales y CRUD global de administración. Los endpoints antiguos de Goal Sheet no aceptan nuevas escrituras. No basta ocultar botones.

Propuesta: responder 404 genérico a superficies fuera del piloto; mantener únicamente acceso, operaciones `/api/pilot`, health/ready mínimos y histórico permitido. Las versiones comerciales se conservan mediante release/branch anteriores, sin acceso compartido automático a las nuevas tablas privadas.

### 10.3 Reversión y conservación

Un rollback no elimina datos nuevos ni reabre el registro público a la misma base privada. Se prepara release compatible con el esquema expandido; si no existe, el servicio entra en mantenimiento de solo lectura hasta aplicar una corrección, preservando escrituras nuevas. Restaurar un respaldo anterior tras recibir datos nuevos requiere reconciliación explícita, no reemplazo automático.

**Propuesto IA:** notas/Diario conservados hasta eliminación del usuario; tours, metas y auditoría operativa se conservan durante el piloto y revisión de cierre, sin heredar el límite de 30 días del antiguo registro de prospectos. Decisión operativa confirmada el 2026-11-20: actividad conservada después del piloto; copias diarias con retención de siete días y limpieza diaria. Borrar una nota elimina contenido activo y no lo copia al log; la retención de copias debe ser explícita.

Respaldo propuesto: copia cifrada diaria fuera del VPS, verificación y ensayo de restauración; destino, responsable y retención requieren elección operativa. No se configura un proveedor ni se transfieren datos con esta especificación.

## 11. Auditoría y controles concretos

- Auditoría append-only con actor, organización, operación, entidad, ID, versión previa/nueva, timestamp UTC y request ID. Guarda cambios monetarios/estados requeridos para explicar KPIs; nunca contraseñas, cookies, tokens, PDF, texto de notas/Diario ni datos de prospectos.
- Eventos mínimos: alta/revocación/reset, login/logout/cambio de contraseña, meta confirmada e intentos de duplicación/mutación rechazados, tour creado/corregido/cancelado/restaurado/anulado, seguimiento, publicación/archivo, permiso individual/equipo, solicitud/resolución y cambio de marca. No existe evento exitoso de meta corregida en v1.
- Operaciones de datos+auditoría se confirman juntas; fallo del log transaccional impide declarar éxito. Accesos rechazados no revelan registros ajenos.
- SQLite `foreign_keys=ON`, transacciones para operaciones múltiples, índices `(organization_id,user_id,occurred_on)` y análogos; parámetros SQL, no strings del usuario interpolados.
- IDs de archivo opacos, path fuera de webroot, límites en proxy y aplicación, sin ejecución de contenido subido. El dueño y vendedor no ven controles de storage, claves, migración ni infraestructura en flujos de producto.
- Hash de sesión en DB; cookie nunca legible por JS; expiración y revocación verificadas en cada acceso. Los logs HTTP no incluyen cuerpos sensibles.
- Persistencia de lista permitida y de límites de acceso por organización: una caída/reinicio no habilita automáticamente a usuarios ni reinicia permisos a valores demo.

## 12. Evidencia requerida en CP4 (plan; no ejecutada)

| ID | Escenario mínimo y resultado esperado |
|---|---|
| BE-01 | Correo fuera de lista no puede iniciar sesión ni crear cuenta mediante rutas antiguas; intentar rol dueño en JSON no eleva permisos |
| BE-02 | Temporal permite solo cambio/logout/me; vence; reset manual no expone token público; clave anterior y sesiones revocadas fallan |
| BE-03 | Dueño A no consulta/edita organización B con IDs directos, PDF, solicitudes, usuarios o rutas antiguas; vendedor no administra |
| BE-04 | Dos tours del mismo usuario/día persisten como dos registros; reintento con mismo request ID no duplica |
| BE-05 | Seis registros DS-02 el mismo día, incluido No Tour: todos persisten y no se reemplazan; canal No Tour omitido/null o válido no causa error, sin resultado/monto/seguimiento; No Tour manipulado se rechaza |
| BE-06 | DS-02: Q sin venta + CT sin venta + CT vendido USD1000 + NQ vendido USD2000 + NQ sin venta + No Tour; 3 Q, 2 ventas, USD3000; meta USD6000/cierre50%: cierre66.67%, VPG1000, ticket1500, cumplimiento50%, diferencia−3000 y +16.67pp |
| BE-07 | Q=0, ventas=0, sin meta, objetivo 0, neto decimal, dos meses y frontera UTC/Cancún: null/0/redondeos según contrato |
| BE-08 | Cancelar/restaurar CT/NQ recalcula mes original conforme a regla aprobada; auditoría conserva importes; no reactiva seguimiento solo |
| BE-09 | Dos escrituras con misma versión: una gana y la otra 409; reintentos de tour/seguimiento/nota/Diario no duplican; No Tour coexiste con actividad real sin borrarla; cancelar/corregir venta cancela pendientes atómicamente |
| BE-10 | Lección 7 abierta puede completarse sin 1..6; cerrada no entrega video/PDF; repetir completar no duplica progreso |
| BE-11 | Borrador no cambia publicado, PDF ajeno rechazado, archivo >10 MiB/no PDF/host de video no permitido rechazados |
| BE-12 | Dos clics de «Quiero acceso» crean una pendiente; aprobar excepción abre solo al solicitante; acceso equipo y deny individual respetan precedencia |
| BE-13 | Notas/Diario de A no se leen como B ni como dueño; tras logout no queda contenido privado en cache/localStorage; error de red no simula guardado |
| BE-14 | Meta definitiva única usuario/mes; segundo POST y dos POST concurrentes dejan una sola fila y devuelven 409 al duplicado; PATCH/PUT/DELETE no la cambian; al avanzar reloj al siguiente mes se crea su propia meta. Home/equipo coinciden y comparaciones de presupuesto permanecen mensuales con filtros diario/semanal |
| BE-15 | Migración dos veces en copia produce mismo esquema/conteos; histórico inmutable no se convierte en tours; no aparecen cuentas demo. Plantilla 11 lecciones se siembra una sola vez, mantiene cambios de acceso/orden/archivo y no publica materiales ficticios |
| BE-16 | Restauración de copia aislada conserva activos/DB; rollback no pierde escrituras ni reabre endpoints públicos |

Las pruebas productivas deben planificarse en pares RED→GREEN antes de implementar. Este documento no afirma pruebas ejecutadas, seguridad del VPS revisada ni disponibilidad de los proveedores de video.

## 13. Repo Paths propuestos

| Contrato | Código existente a adaptar / nuevo archivo previsto |
|---|---|
| Sesión/cuentas/allowlist | `backend/app/main.py`, `backend/app/persistence.py`, `backend/app/cli.py`; módulos nuevos `backend/app/pilot/auth.py`, `identity.py` dentro del paquete pilot |
| Tours/metas/KPIs | Módulos nuevos `backend/app/pilot/activity.py`, `metrics.py`; adaptar dominio sin cambiar interpretación legacy silenciosamente |
| Ruta/assets/solicitudes | Módulos nuevos `backend/app/pilot/learning.py`, `assets.py`; separar de `access.py` comercial |
| Notas/Diario/equipo/marca | Módulos nuevos `backend/app/pilot/workspace.py`, `management.py` |
| Esquema/auditoría/migración | `backend/app/persistence.py`; módulo nuevo `backend/app/pilot/migrations.py`; helpers de autorización comunes |
| Integración web | `frontend/src/pilot/App.jsx`, `Auth.jsx`, `Workspace.jsx`, `Learning.jsx`, `Management.jsx`, `model.mjs`, `access-model.mjs` |
| Verificación prevista | `backend/tests/` y pruebas de dominio/frontend existentes; casos de piloto separados con DB temporal sintética |

Son rutas de implementación propuestas, no archivos existentes ni permiso para crearlos antes del gate.

## 14. Dependencias y decisiones a cerrar en CP2

1. Aceptar/revisar cuenta única por organización y separación dueño/operador; corresponde un ADR de aislamiento y autorización.
2. Aceptar regla de cancelación de CT/NQ, captura neta directa, una venta por tour y No Tour individual compatible con otros registros de ese día; sin venta/monto/seguimiento.
3. Aceptar meta mensual definitiva e inmutable en v1; presupuesto volumen y cierre objetivo opcional para los seis KPIs. Cualquier corrección excepcional requiere otro acuerdo, no un bypass administrativo.
4. Aceptar acceso por equipo/excepción individual, sin secuencia; contenido de arranque y correspondencias legacy requieren responsable editorial.
5. Aceptar reemplazo coordinado de bearer por cookie/CSRF y recuperación manual; determinar responsables y canal de entrega operativo sin SMTP.
6. Aceptar dominio principal propuesto en CP2 y su preflight; asignar responsable de contenido inglés antes del piloto. Mantener las etiquetas Q/CT/NQ literalmente, sin inventar expansión de las siglas. Marca prelogin de plataforma; organización únicamente después de contexto autenticado.
7. PDF 10 MiB queda definido en CP2. Capacidad total, retención posterior y destino de respaldos son dependencias operativas diferidas Q-05 de la historia: se deben resolver antes de cargar datos reales/publicar, sin impedir construir con fixtures y límites configurables.
8. Validar contratos con UX/QA y aprobación explícita del CP2 consolidado. Hasta ese punto no se crean cuentas reales ni se modifica producción.

## Aprobación registrada · 2026-11-20

El PO aprobó el contrato v1 y sus anexos: «lo apruebo y porfa crea otra rama para desarrollar e implementar esto y cuando termines publicalo». Las marcas de propuesta anteriores conservan el origen de las decisiones; su estado vigente es aprobado. Rama de ejecución: `feature/pilot-v5`.
