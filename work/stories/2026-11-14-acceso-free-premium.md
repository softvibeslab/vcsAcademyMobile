# Historia Enriquecida: `Registro y niveles de acceso Público / Gratis / Premium administrables`

**Readiness:** LISTA
**ID:** `HU-AISALES-ACCESO-01`
**Solicitante:** PO (Roger), chat 2026-11-14
**Product Owner (aprueba):** PO de Sales Academy
**Enriquecido por:** agente (Claude Code)
**Fecha:** `2026-11-14`
**Version:** v1

> Expediente unico de la historia: todo lo necesario para decidir **que** se va a construir
> antes de escribir codigo. Enriquecer **no autoriza implementacion**. El desarrollo solo
> inicia cuando `Readiness: LISTA` y el verificador lo confirma.
>
> Privacy by default: sin datos reales, secretos ni nombres de clientes. Los datos de prueba
> son simulados.

## 1. Resumen Ejecutivo

- **Que se va a hacer:** en aisales.softvibes.pro, un registro publico que crea una cuenta gratuita y un panel de administracion (CRUD) donde el admin decide, leccion por leccion y funcion por funcion, si es **Publica**, **Gratis** (requiere cuenta) o **Premium**. Esa decision controla lo que ve el visitante, el usuario registrado y el usuario premium.
- **Por que ahora:** hoy las cuentas solo se crean por invitacion y el invitado ve los 11 pasos completos como vista previa; no hay forma de convertir visitantes en usuarios ni de reservar contenido premium.
- **Costo de no hacerlo:** el contenido completo queda abierto o cerrado sin termino medio; no hay embudo visitante -> registrado -> premium.
- **Alternativa mas barata considerada:** fijar los niveles en el codigo. No basta: el PO pidio poder cambiarlos (CRUD) sin desplegar.

## 2. Historia

Como **administrador de Sales Academy**, quiero **marcar cada leccion y funcion como Publica, Gratis o Premium**, para **que los visitantes prueben lo publico, se registren para lo gratuito y activen premium para el resto**.

Como **visitante**, quiero **registrarme con mi correo** para **guardar mi progreso y acceder al contenido gratuito**.

- **Problema actual:** registro solo por invitacion; sin niveles de acceso; el invitado ve todo como vista previa local.
- **Metrica de exito:** % de visitantes que se registran y % de registrados que activan premium (se mide con los eventos de auditoria existentes). Meta: N/A en demo; se instrumenta para medir.

## 3. Insumos Recibidos

| Insumo | Existe | Ubicacion / referencia | Accion |
|---|---|---|---|
| Descripcion del requerimiento | Parcial | Chat del PO 2026-11-14 | completar en este expediente |
| Diseno (mockup, prototipo, wireframe) | Parcial | Stitch: C05 «Desbloquear acceso», A06 login, B06 perfil (`SalesAcademyVibes/work/features/2026-11-13-app-wireframe/INVENTORY.md`) | usar C05; proponer wireframe para registro y panel admin |
| Criterios de aceptacion | No | - | proponer (Propuesto IA) |
| Escenarios de prueba | No | - | proponer (Propuesto IA) |
| Datos de prueba | No | - | simular (Simulado IA) |
| Reglas de negocio | No | - | proponer |
| Contratos o integraciones | Si | API FastAPI existente `backend/app/main.py` | ampliar (nuevos endpoints y campos) |

### Fuentes De Contexto

**Modo de contexto:** workspace

| Fuente | Tipo | Consultada | Referencia | Aporte |
|---|---|---|---|---|
| vcsAcademyMobile | repo workspace | Si | rama `main`, commit `245573b` + 14 cambios locales sin commit | API, esquema SQLite, frontend `frontend/src/pilot/` |
| SalesAcademyVibes | repo workspace | Si | `work/features/2026-11-13-*` (sin commit) | despliegue aisales, wireframe de 43 pantallas, diseño C05 |

## 4. Hechos Y Supuestos

| Tipo | Enunciado | Fuente / base | Riesgo si es falso |
|---|---|---|---|
| Hecho | Las cuentas se crean solo por invitacion del admin; no hay registro publico. | `Auth.jsx` vista `account`; README del piloto | - |
| Hecho | El invitado ve los 11 pasos desde `blueprintSteps` local, sin pasar por la API. | `GuestWorkspace.jsx` | - |
| Hecho | Los 11 pasos y los escenarios de roleplay estan fijos en codigo; no hay CRUD de lecciones. | `main.py` (`blueprint`, `roleplay/scenarios`), `packages/domain` | - |
| Hecho | Los recursos tienen CRUD de admin con `requires_access_grant` (permiso por usuario), sin nivel free/premium. | `main.py` `/api/admin/resources`, tabla `resources` | - |
| Hecho | No hay pagos; el README dice explicitamente que no se implementan. | README piloto | - |
| Hecho | El paso del roadmap ya tiene estado `locked` por progreso (pasos secuenciales). | `blueprint_status` en `main.py` | - |
| Supuesto | Premium se activa con un codigo de licencia que genera el admin (diseño C05), sin cobro. | Diseño C05 «activar licencia con correo/codigo» | Si se quiere cobro en linea, cambia alcance (servicio externo) -> Q-02 |
| Supuesto | No hay envio de correos: el registro no verifica el correo. | No existe servicio de correo; recuperacion de contraseña es local | Cuentas con correos falsos -> Q-04 |

## 5. Alcance

**Incluye:**

- Registro publico (nombre, correo, contraseña, aceptar aviso de privacidad) que crea una cuenta **Gratis** con rol rep e inicia sesion.
- Campo **plan** por usuario: `gratis` | `premium` (con vencimiento opcional).
- Catalogo administrable de **elementos con nivel de acceso**: los 11 pasos del roadmap, los escenarios de roleplay, el AI Coach, los recursos de la Boveda, calculadoras, GoalSheet, Notebook/Diario.
- Pantalla admin **«Acceso y planes»**: listar, filtrar y cambiar nivel (Publico / Gratis / Premium) y publicado/oculto de cada elemento; crear, listar y revocar **codigos premium**; ver y cambiar el plan de un usuario.
- La API decide el acceso en el servidor: el contenido bloqueado no viaja al cliente.
- Visitante, gratis y premium ven los elementos bloqueados con candado y la accion para subir de nivel («Regístrate gratis» o «Desbloquear premium» con el diseño C05).
- Activar premium con codigo desde Perfil o desde el candado.
- Auditoria de cambios de nivel, registros y activaciones (tabla `audit_events` existente).
- Boton «Crear cuenta gratis» en la landing `/` que lleva al registro de `/academia/`.

**No incluye:**

- Cobro en linea (Stripe u otro): requiere servicio externo; historia aparte.
- Editar el contenido de las lecciones (textos, guiones): solo su nivel de acceso.
- Verificacion de correo y correos transaccionales (no hay servicio de correo).
- Inicio de sesion con Google u otros proveedores.
- La referencia `/stitch/`, el wireframe y el CMS editorial `/cms/`.

## 6. Usuarios, Roles Y Permisos

| Rol | Que puede hacer | Que no puede hacer |
|---|---|---|
| Visitante (sin cuenta) | Ver y usar elementos **Publicos**; ver titulos de los bloqueados; registrarse | Abrir contenido Gratis o Premium |
| Gratis (rep registrado) | Todo lo Publico y Gratis; activar premium con codigo | Abrir contenido Premium |
| Premium (rep) | Todo lo Publico, Gratis y Premium mientras el plan este vigente | Administrar |
| Gerente | Acceso completo al contenido (para entrenar a su equipo) | Cambiar niveles o generar codigos |
| Admin | Acceso completo; CRUD de niveles, codigos y plan de usuarios | - |

## 7. Flujos

**Flujo principal (visitante -> gratis -> premium):**

1. El visitante entra a `/` y toca «Crear cuenta gratis», o entra a `/academia/` como invitado.
2. En el Roadmap ve el paso 1 abierto (Publico) y los demas con candado y etiqueta «Gratis» o «Premium».
3. Toca un paso «Gratis» -> hoja «Crea tu cuenta gratis» -> formulario de registro.
4. Se registra -> queda con sesion iniciada, plan Gratis, y vuelve al paso que queria abrir, ya desbloqueado.
5. Toca un paso «Premium» -> hoja C05 «Desbloquear acceso» -> escribe su codigo -> «Activado» -> el paso se abre.

**Flujo admin:**

1. Admin abre «Acceso y planes» -> pestaña Contenido.
2. Cambia el nivel de «Paso 4 · Descubrimiento» de Premium a Gratis -> guardado con confirmacion; queda en auditoria.
3. Pestaña Codigos -> «Generar codigo» (vigencia, usos) -> copia el codigo para enviarlo al usuario.

**Flujos alternos y de error:**

- FA-01: correo ya registrado -> «Ese correo ya tiene cuenta. Inicia sesión.» y no se crea cuenta.
- FA-02: contraseña de menos de 8 caracteres o correo invalido -> mensaje en el campo; no se envia.
- FA-03: codigo invalido, vencido o ya usado -> «Código no válido o vencido.»; el plan no cambia.
- FA-04: el plan premium vence -> el usuario vuelve a Gratis; el progreso se conserva; lo premium se ve con candado.
- FA-05: el admin oculta un elemento -> desaparece para todos menos admin.
- FA-06: un usuario no admin llama a la API de administracion -> 403.
- FA-07: el paso esta permitido por plan pero aun no por progreso -> se muestra «Completa el paso anterior» (candado de progreso, distinto del de plan).

### Casos de uso

Pantallas: IDs del wireframe aprobado para revision (`SalesAcademyVibes/work/features/2026-11-13-app-wireframe/INVENTORY.md`: A01 bienvenida, A05 alta, A06 login, C01 roadmap, C02 leccion, C05 desbloquear, B06 perfil) y W1-W5 de la seccion 9.

```
                    ┌──────────── aisales · Acceso y planes ─────────────┐
 Visitante ─────────┤ CU-01 Explorar contenido Público                   │
   △                │ CU-02 Ver elemento bloqueado (candado) ┐           │
   │ hereda         │ CU-03 Registrarse gratis ◄─«extend»────┤           │
 Usuario Gratis ────┤ CU-04 Iniciar sesión                   │           │
   △                │ CU-05 Abrir lección o función ─«include»─► Verificar acceso
   │ hereda         │ CU-06 Canjear código premium ◄─«extend»┘           │
 Usuario Premium ───┤ CU-07 Ver mi plan y vencimiento                    │
                    │                                                    │
 Gerente ───────────┤ CU-05 (acceso completo por rol)                    │
                    │                                                    │
 Admin ─────────────┤ CU-08 Cambiar nivel y visibilidad de un elemento   │
                    │ CU-09 Generar y revocar códigos                    │
                    │ CU-10 Cambiar el plan de un usuario                │
                    │ CU-11 Consultar auditoría                          │
                    │                                                    │
 Sistema (reloj) ───┤ CU-12 Vencer plan premium                          │
                    └────────────────────────────────────────────────────┘
```

| CU | Actor | Recorrido de pantallas | Resultado | AC |
|---|---|---|---|---|
| CU-01 | Visitante | `/` → A01 → C01 → C02 (paso 1) | Abre lo Público sin cuenta | AC-02 |
| CU-02 | Visitante, Gratis | C01 → toca 🔒 → hoja «Crea tu cuenta» o C05 | Ve título y nivel, nunca el contenido | AC-02, AC-05 |
| CU-03 | Visitante | `/` «Crear cuenta gratis» o CU-02 → W1 (= A05) → C01 | Sesión iniciada, plan Gratis, regresa al paso que quería | AC-03, AC-04 |
| CU-04 | Gratis, Premium | A01 → A06 → B01 | Sesión con su plan | - |
| CU-05 | Todos | C01 → C02 | Abre si su plan o rol lo permite; si no, CU-02; si falta progreso, «Completa el paso anterior» | AC-05, AC-11, AC-12 |
| CU-06 | Gratis | C01 🔒 Premium o B06/W5 → C05 → código → «Activado» → C02 | Plan Premium con vencimiento | AC-06, AC-07 |
| CU-07 | Gratis, Premium | B06/W5 | Ve su plan, cuántos módulos abre y vencimiento | - |
| CU-08 | Admin | Admin → W3 Contenido → nivel / visible → Guardar | Nivel nuevo para todos en su siguiente carga; auditoría | AC-01, AC-10 |
| CU-09 | Admin | Admin → W4 Códigos → Generar / Revocar | Código listo para enviar; revocado deja de funcionar | AC-07 |
| CU-10 | Admin | Admin → Usuarios → plan | Plan cambiado; auditoría | AC-09 |
| CU-11 | Admin | Admin → Auditoría (existente) | Ve registros, canjes y cambios | NFR-02 |
| CU-12 | Sistema | Al cargar la sesión | Premium vencido = Gratis, conserva progreso | AC-08 |

## 8. Reglas De Negocio

| ID | Regla | Fuente | Ejemplo |
|---|---|---|---|
| BR-01 | Cada elemento tiene exactamente un nivel: `publico`, `gratis` o `premium`, y un estado `publicado`/`oculto`. | Pedido del PO | Paso 1 = publico; Paso 3 = premium |
| BR-02 | Acceso: visitante -> publico; gratis -> publico+gratis; premium vigente -> todos; gerente y admin -> todos. | Pedido del PO | Gratis abre Paso 2, no Paso 3 |
| BR-03 | El servidor decide el acceso; un elemento no permitido devuelve solo titulo, descripcion corta y nivel requerido, nunca el contenido. | Seguridad | `GET` de un paso premium como gratis -> 403 `requires: premium` |
| BR-04 | Registro crea plan `gratis`, rol `rep`, sin equipo. Correo unico, sin distinguir mayusculas. | Pedido del PO | `Ana@Demo.local` = `ana@demo.local` |
| BR-05 | Un codigo premium tiene vigencia (fecha) y numero de usos; al canjearlo, el plan queda `premium` hasta la fecha de vencimiento del plan definida en el codigo. | Diseño C05 | Codigo de 1 uso con plan de 90 dias |
| BR-06 | Cambios de nivel aplican en la siguiente carga del usuario; no cortan una leccion ya abierta. | Supuesto razonable | - |
| BR-07 | El candado de plan y el candado de progreso (pasos secuenciales) son independientes y se muestran distinto. | Hecho: `blueprint_status` | Premium en paso 5 sin completar 4 -> «Completa el paso anterior» |
| BR-08 | Valores por defecto al migrar: Paso 1, AI Coach publico (con limite actual) y calculadoras -> publico; Pasos 2 y 3, GoalSheet, Notebook/Diario -> gratis; Pasos 4-11, roleplay certificable y recursos sensibles -> premium. | Propuesto IA | Ver DS-01 |

## 9. Diseno

**Estado del diseno:** Aprobado
**Fuente del diseno:** Stitch C05 (desbloquear acceso), A06 (login), B06 (perfil); wireframes W1-W5 y casos de uso de este documento, aprobados por el PO el 2026-11-14 («date y publicalo»).

| Pantalla / componente | Existe en el diseno | Estados cubiertos (carga, vacio, error, exito) | Observaciones |
|---|---|---|---|
| Registro | No | propuesto: vacio, error de campo, correo duplicado, exito | wireframe W1 |
| Roadmap con candados | Parcial (C01 tiene estado «bloqueado») | propuesto: abierto, gratis, premium, progreso | wireframe W2 |
| Hoja «Desbloquear» | Si (C05) | verificando, codigo invalido, activado | usar C05 |
| Admin «Acceso y planes» | No | propuesto: carga, vacio, guardado, error | wireframes W3 y W4 |
| Perfil: plan y codigo | Parcial (B06 menciona «nivel de acceso») | gratis, premium vigente, vencido | wireframe W5 |

**W1 · Registro (movil)**

```
┌──────────────────────────────────┐
│ ‹ Volver                         │
│ Crea tu cuenta gratis            │
│ Guarda tu progreso y desbloquea  │
│ los pasos 2 y 3 del roadmap.     │
│                                  │
│ Nombre      [                 ]  │
│ Correo      [                 ]  │
│ Contraseña  [            ] 👁    │
│             mínimo 8 caracteres  │
│ [✓] Acepto el aviso de privacidad│
│                                  │
│ [      Crear cuenta gratis     ] │
│ ¿Ya tienes cuenta? Inicia sesión │
└──────────────────────────────────┘
```

**W2 · Roadmap con niveles**

```
┌──────────────────────────────────┐
│ Roadmap · 11 pasos     Plan GRATIS│
│ ① Meet & Greet           ✓ abierto│
│ ② Control de agenda      ● gratis │
│ ③ Rapport (FORM)         ● gratis │
│ ④ Descubrimiento   🔒 PREMIUM    │
│ ⑤ Renovar el pacto 🔒 PREMIUM    │
│ …                                │
│ ┌──────────────────────────────┐ │
│ │ 8 pasos más con Premium      │ │
│ │ [ Desbloquear premium ]      │ │  -> hoja C05
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
 Visitante: los pasos «gratis» muestran 🔒 GRATIS y abren W1.
```

**W3 · Admin › Acceso y planes › Contenido (escritorio)**

```
┌──────────────────────────────────────────────────────────────────┐
│ Acceso y planes      [Contenido] [Códigos] [Usuarios]            │
│ Tipo: (Todos ▾)  Nivel: (Todos ▾)   [Buscar…            ]        │
│ ┌────────────────────────────┬──────────┬──────────────┬────────┐│
│ │ Elemento                   │ Tipo     │ Nivel        │ Visible││
│ ├────────────────────────────┼──────────┼──────────────┼────────┤│
│ │ 1 · Meet & Greet           │ Lección  │ (Público ▾)  │ [on]   ││
│ │ 2 · Control de agenda      │ Lección  │ (Gratis  ▾)  │ [on]   ││
│ │ 4 · Descubrimiento         │ Lección  │ (Premium ▾)  │ [on]   ││
│ │ AI Sales Coach             │ Función  │ (Público ▾)  │ [on]   ││
│ │ Roleplay · Compromiso      │ Escenario│ (Premium ▾)  │ [on]   ││
│ │ Guía de objeciones         │ Recurso  │ (Gratis  ▾)  │ [off]  ││
│ └────────────────────────────┴──────────┴──────────────┴────────┘│
│ Resumen calculado del catálogo (hoy 3 públicos · 11 gratis · 14 premium)        [Guardar]     │
└──────────────────────────────────────────────────────────────────┘
```

**W4 · Admin › Códigos**

```
┌──────────────────────────────────────────────────────────────────┐
│ [Generar código]  Plan: Premium · Vigencia [2026-12-31] · Usos [1]│
│ Código        Plan días  Usos   Vence       Estado     Acción     │
│ SA-7K2M-Q9    90         0/1    2026-12-31  Activo     [Revocar]  │
│ SA-3P8D-X1    90         1/1    2026-12-31  Usado      —          │
│ SA-9F4T-L7    30         0/5    2026-11-01  Vencido    —          │
└──────────────────────────────────────────────────────────────────┘
```

**W5 · Perfil**

```
┌──────────────────────────────────┐
│ Tu plan: GRATIS                  │
│ Tienes acceso a N de M módulos (calculado del catálogo) │
│ [ Tengo un código premium ]      │  -> hoja C05
│ Premium vence: —                 │
└──────────────────────────────────┘
```

## 10. Datos, Contratos E Integraciones

| Elemento | Tipo | Cambio esperado | Responsable |
|---|---|---|---|
| Tabla `users` | cambio | + `plan` (`gratis`/`premium`), + `plan_expires_at` | backend |
| Tabla nueva `access_items` | nuevo | `id`, `kind` (leccion/escenario/funcion/recurso), `ref_id`, `title`, `level`, `visible`, `updated_at` | backend |
| Tabla nueva `license_codes` | nuevo | `code_hash`, `plan_days`, `max_uses`, `uses`, `expires_at`, `revoked`, `created_by` | backend |
| `POST /api/auth/register` | nuevo | crea cuenta gratis e inicia sesion | backend |
| `GET /api/public/catalog` | nuevo | elementos visibles con nivel y si el visitante puede abrirlos | backend |
| `POST /api/me/redeem` | nuevo | canjea codigo -> plan premium | backend |
| `GET/PATCH /api/admin/access-items` | nuevo | CRUD de niveles | backend |
| `GET/POST/DELETE /api/admin/license-codes` | nuevo | generar, listar, revocar | backend |
| `PATCH /api/admin/users/{id}/plan` | nuevo | cambiar plan manualmente | backend |
| `GET /api/blueprint/steps`, `/api/resources`, `/api/roleplay/scenarios`, `/api/mobile/me` | cambio | + `level`, `allowed`, `lock` (`plan`/`progreso`); 403 `requires` si no permitido; `me` incluye plan | backend |
| `GuestWorkspace.jsx`, `Auth.jsx`, `Learning.jsx`, `Management.jsx`, Perfil | cambio | catalogo desde la API, registro, candados, panel admin | frontend |
| Landing `/` | cambio | CTA «Crear cuenta gratis» a `/academia/#access/register` | frontend estatico |
| Migracion SQLite en `/srv/aisales/data/academy.sqlite3` | cambio | idempotente; respaldo antes de migrar | devops |

## 11. Criterios De Aceptacion

| ID | Origen | Criterio (Dado / Cuando / Entonces) | Tipo | Estado PO | Comentario PO |
|---|---|---|---|---|---|
| AC-01 | Propuesto IA | Dado un admin en «Acceso y planes», cuando cambia el nivel de «Paso 4» de Premium a Gratis y guarda, entonces la API devuelve el nivel nuevo y queda un evento `access_level_changed` en auditoria. | positivo | Aceptado | Aceptado según recomendación |
| AC-02 | Propuesto IA | Dado un visitante sin sesion, cuando abre el Roadmap, entonces ve el Paso 1 abierto y los pasos Gratis y Premium con candado y su etiqueta, y la respuesta de la API no incluye su contenido. | positivo | Aceptado | Aceptado según recomendación |
| AC-03 | Propuesto IA | Dado un visitante, cuando se registra con nombre, correo valido, contraseña de 8+ caracteres y acepta el aviso, entonces queda con sesion iniciada, plan Gratis, y los pasos Gratis se abren. | positivo | Aceptado | Aceptado según recomendación |
| AC-04 | Propuesto IA | Dado un correo ya registrado (sin importar mayusculas), cuando alguien intenta registrarlo, entonces ve «Ese correo ya tiene cuenta. Inicia sesión.» y no se crea otra cuenta. | negativo | Aceptado | Aceptado según recomendación |
| AC-05 | Propuesto IA | Dado un usuario Gratis, cuando abre un paso Premium, entonces ve la hoja C05 y la API responde 403 con `requires: premium` sin contenido. | negativo | Aceptado | Aceptado según recomendación |
| AC-06 | Propuesto IA | Dado un usuario Gratis y un codigo activo, cuando lo canjea, entonces su plan pasa a Premium por los `plan_dias` del codigo contados desde el canje (BR-05) y los pasos Premium se abren sin cerrar sesion. | positivo | Aceptado | Aceptado según recomendación |
| AC-07 | Propuesto IA | Dado un codigo invalido, vencido, revocado o sin usos, cuando se canjea, entonces ve «Código no válido o vencido.» y el plan no cambia. | negativo | Aceptado | Aceptado según recomendación |
| AC-08 | Propuesto IA | Dado un usuario Premium con plan vencido, cuando carga la app, entonces es tratado como Gratis y conserva su progreso. | borde | Aceptado | Aceptado según recomendación |
| AC-09 | Propuesto IA | Dado un rep o gerente, cuando llama a cualquier endpoint `/api/admin/access-items` o `/api/admin/license-codes`, entonces recibe 403. | negativo | Aceptado | Aceptado según recomendación |
| AC-10 | Propuesto IA | Dado un elemento oculto por el admin, cuando cualquier usuario no admin carga el catalogo, entonces el elemento no aparece. | borde | Aceptado | Aceptado según recomendación |
| AC-11 | Propuesto IA | Dado un usuario Premium, cuando abre el Paso 5 sin completar el 4, entonces ve «Completa el paso anterior» (candado de progreso), no la hoja C05. | borde | Aceptado | Aceptado según recomendación |
| AC-12 | Propuesto IA | Dado un gerente o admin, cuando abre cualquier leccion, entonces tiene acceso sin plan premium. | positivo | Aceptado | Aceptado según recomendación |

## 12. Escenarios De Prueba (Funcionales Y De Usuario)

| ID | AC cubiertos | Tipo | Precondicion | Pasos | Resultado esperado | Datos | Nivel de prueba | Origen | Estado PO |
|---|---|---|---|---|---|---|---|---|---|
| ESC-01 | AC-01, AC-09 | positivo/negativo | catalogo DS-01 | 1. admin PATCH step_3 a gratis 2. rep PATCH lo mismo | 1. 200 y auditoria 2. 403 | DS-01, DS-02 | integration | Propuesto IA | Aceptado |
| ESC-02 | AC-02, AC-10 | positivo | sin sesion | 1. GET /api/public/catalog 2. GET /api/public/blueprint/steps/step_1 y step_2 | 1. step_1 `allowed:true`; step_2 y step_4 `allowed:false`; ningún elemento trae contenido; oculto ausente 2. step_1 con contenido; step_2 403 | DS-01 | integration | Propuesto IA | Aceptado |
| ESC-03 | AC-03, AC-04 | positivo/negativo | sin cuenta | 1. registrar `nuevo@demo.local` 2. registrar `NUEVO@demo.local` | 1. sesion, plan gratis 2. error duplicado, 1 sola cuenta | DS-02 | integration | Propuesto IA | Aceptado |
| ESC-04 | AC-05, AC-06, AC-07 | positivo/negativo | usuario gratis | 1. GET step_4 2. canjear codigo vencido 3. canjear codigo activo 4. GET step_4 | 1. 403 2. error, sigue gratis 3. premium 4. 200 | DS-02, DS-03 | integration | Propuesto IA | Aceptado |
| ESC-05 | AC-08, AC-11, AC-12 | borde | DS-02 | 1. premium vencido abre step_4 2. premium abre step_5 sin step_4 3. gerente abre step_9 | 1. 403 2. candado progreso 3. 200 | DS-02 | integration | Propuesto IA | Aceptado |
| ESC-06 | AC-02, AC-03, AC-05, AC-06 | UAT | sitio desplegado | 1. entrar a `/` 2. «Crear cuenta gratis» 3. abrir paso 2 4. abrir paso 4 5. canjear codigo 6. abrir paso 4 | candados correctos y desbloqueo en cada paso | DS-01..03 | e2e + UAT manual | Propuesto IA | Aceptado |
| ESC-07 | AC-01 | UAT | admin | 1. cambiar paso 4 a gratis 2. entrar como gratis | paso 4 abierto | DS-01 | UAT manual | Propuesto IA | Aceptado |

## 13. Datos De Prueba

| ID | Descripcion | Origen | Registros | Por que aplica (regla / AC) | Validado PO | Comentario PO |
|---|---|---|---|---|---|---|
| DS-01 | Catalogo con niveles por defecto | Simulado IA | 24 | BR-01, BR-08; AC-01, AC-02, AC-10 | Si | Aceptado según recomendación |
| DS-02 | Usuarios por estado de plan | Simulado IA | 6 | BR-02, BR-04; AC-03..AC-12 | Si | Aceptado según recomendación |
| DS-03 | Codigos premium | Simulado IA | 4 | BR-05; AC-06, AC-07 | Si | Aceptado según recomendación |

### DS-01 - Catalogo (extracto)

| elemento | tipo | nivel | visible | Nota |
|---|---|---|---|---|
| Paso 1 Meet & Greet | leccion | publico | si | prueba gratuita sin cuenta |
| Paso 2 Control de agenda | leccion | gratis | si | incentivo para registrarse |
| Paso 3 Rapport (FORM) | leccion | gratis | si | se cambia a premium y de vuelta en ESC-07 |
| Pasos 4 a 11 | leccion | premium | si | 8 pasos premium |
| AI Sales Coach | funcion | publico | si | ya es publico hoy (`public-chat`) |
| Roleplay · Compromiso (paso 5) | escenario | premium | si | |
| Calculadoras | funcion | publico | si | |
| GoalSheet, Notebook/Diario | funcion | gratis | si | requieren guardar por usuario |
| Recurso «Guía de objeciones» | recurso | gratis | no | prueba de oculto (AC-10) |

Resultado esperado del resumen W3: publicos = Paso 1, AI Coach, Calculadoras (3 + recursos publicos); se recalcula al cargar el catalogo real.

### DS-02 - Usuarios

| usuario | rol | plan | vence | Nota |
|---|---|---|---|---|
| (sin sesion) | visitante | - | - | AC-02 |
| nuevo@demo.local | rep | gratis | - | se crea en ESC-03 |
| gratis@demo.local | rep | gratis | - | AC-05 |
| premium@demo.local | rep | premium | 2027-02-14 | AC-11; progreso hasta paso 3 |
| vencido@demo.local | rep | premium | 2026-11-01 | AC-08 (hoy 2026-11-14) |
| manager@vcsa.local | gerente | gratis | - | AC-12: acceso por rol |

### DS-03 - Codigos

| codigo | plan_dias | usos | vence | revocado | Resultado esperado |
|---|---|---|---|---|---|
| SA-TEST-ACT1 | 90 | 0/1 | 2026-12-31 | no | canje ok; premium hasta 2027-02-12 (14 nov + 90 dias) |
| SA-TEST-USED | 90 | 1/1 | 2026-12-31 | no | error |
| SA-TEST-EXPD | 30 | 0/5 | 2026-11-01 | no | error |
| SA-TEST-REVK | 30 | 0/5 | 2026-12-31 | si | error |

## 14. Mapa De Cobertura

| AC | Escenarios | Datos | Estado |
|---|---|---|---|
| AC-01 | ESC-01, ESC-07 | DS-01 | cubierto |
| AC-02 | ESC-02, ESC-06 | DS-01 | cubierto |
| AC-03 | ESC-03, ESC-06 | DS-02 | cubierto |
| AC-04 | ESC-03 | DS-02 | cubierto |
| AC-05 | ESC-04, ESC-06 | DS-02 | cubierto |
| AC-06 | ESC-04, ESC-06 | DS-03 | cubierto |
| AC-07 | ESC-04 | DS-03 | cubierto |
| AC-08 | ESC-05 | DS-02 | cubierto |
| AC-09 | ESC-01 | DS-02 | cubierto |
| AC-10 | ESC-02 | DS-01 | cubierto |
| AC-11 | ESC-05 | DS-02 | cubierto |
| AC-12 | ESC-05 | DS-02 | cubierto |

## 15. Requisitos No Funcionales

| ID | Atributo | Requisito medible |
|---|---|---|
| NFR-01 | seguridad | Contraseñas con el hash existente; codigos guardados como hash; registro y canje limitados a 5 intentos por minuto por IP. |
| NFR-02 | auditoria | Registro, canje, cambio de nivel y cambio de plan generan evento en `audit_events`. |
| NFR-03 | rendimiento | `GET /api/public/catalog` < 200 ms con 50 elementos en el VPS. |
| NFR-04 | accesibilidad | Candados con texto («Premium», «Gratis»), no solo icono; formularios con etiquetas. |
| NFR-05 | migracion | Migracion idempotente con respaldo previo de la base; las cuentas existentes conservan acceso. |

## 16. Seguridad, Privacidad Y Casos Borde

- **Datos sensibles involucrados:** correo y nombre del usuario registrado; codigos de licencia.
- **Permisos y abuso:** acceso decidido en el servidor; el frontend solo pinta. Registro masivo mitigado con limite por IP. Fuerza bruta de codigos mitigada con limite y codigos de 12 caracteres aleatorios guardados con HMAC-SHA256 y clave del servidor; un mismo usuario no repite un codigo.
- **Casos borde:** catalogo vacio; todos premium; elemento oculto; plan vencido; codigo usado en dos pestañas a la vez (solo uno gana); cambio de nivel con la leccion abierta.
- **Mensajes de error al usuario:** «Ese correo ya tiene cuenta. Inicia sesión.» · «Usa al menos 8 caracteres.» · «Código no válido o vencido.» · «Este paso es Premium.» · «Completa el paso anterior.»

## 17. Puntos Abiertos

| ID | Tipo | Categoria | Pregunta o supuesto | Recomendacion IA | Impacto si se decide mal | Bloquea | Para quien | Respuesta / decision | Estado |
|---|---|---|---|---|---|---|---|---|---|
| Q-01 | Pregunta | Alcance | ¿Los tres niveles son Público (sin cuenta) / Gratis (con cuenta) / Premium? | Sí: así se lee «pública, logeada y premium». | Modelo de datos distinto | Si | PO | Aceptada la recomendación IA («date y publicalo», 2026-11-14) | Respondida |
| Q-02 | Pregunta | Negocio | ¿Cómo se obtiene Premium? | Código de licencia que genera el admin (diseño C05), sin cobro. Pagos en otra historia. | Si se quiere cobro ahora: +servicio externo, +3-5 días | Si | PO | Aceptada la recomendación IA («date y publicalo», 2026-11-14) | Respondida |
| Q-03 | Pregunta | Alcance | ¿Qué entra en el CRUD? | Nivel y visibilidad de los 11 pasos, escenarios de roleplay, recursos y funciones; no editar el contenido. | Editar contenido duplica el trabajo | Si | PO | Aceptada la recomendación IA («date y publicalo», 2026-11-14) | Respondida |
| Q-04 | Pregunta | Seguridad | ¿Se verifica el correo al registrarse? | No en esta versión (no hay servicio de correo); se anota como siguiente paso. | Cuentas con correos falsos | No | PO | Aceptada la recomendación IA («date y publicalo», 2026-11-14) | Respondida |
| Q-05 | Pregunta | UX | ¿Lo bloqueado se muestra con candado o se oculta? | Con candado y la acción para subir de nivel: impulsa el registro. | Menos conversión si se oculta | Si | PO | Aceptada la recomendación IA («date y publicalo», 2026-11-14) | Respondida |
| Q-06 | Pregunta | Datos | ¿Niveles iniciales? | Los de BR-08 / DS-01 (paso 1 público, 2-3 gratis, 4-11 premium). | Contenido regalado o demasiado cerrado | No | PO | Aceptada la recomendación IA («date y publicalo», 2026-11-14) | Respondida |
| Q-07 | Supuesto | Datos | Las cuentas demo existentes (rep, manager, admin) quedan con acceso completo para no romper demos. | Rep demo = premium sin vencimiento. | Demo rota | No | PO | Aceptada la recomendación IA («date y publicalo», 2026-11-14) | Respondida |

## 18. Dependencias Y Riesgos

| Tipo | Descripcion | Mitigacion | Responsable |
|---|---|---|---|
| riesgo | vcsAcademyMobile tiene 14 cambios locales sin commit y su ultimo commit es de 2026-05-04 | Subir a una rama antes de empezar | dev |
| riesgo | Migracion de la base productiva del demo | Respaldo y migracion idempotente; prueba sobre copia | devops |
| dependencia | El invitado hoy no usa la API para el roadmap | Cambiarlo a `/api/public/catalog` | frontend |
| riesgo | Confundir candado de plan con candado de progreso | BR-07, AC-11 | frontend |

## 19. Estrategia De Pruebas TDD

| Escenario | Prueba automatizada prevista | Nivel | Datos (fixture) |
|---|---|---|---|
| ESC-01 | `test_admin_access_levels` | integration (pytest + TestClient) | DS-01, DS-02 |
| ESC-02 | `test_public_catalog_hides_locked_body` | integration | DS-01 |
| ESC-03 | `test_register_free_and_duplicate` | integration | DS-02 |
| ESC-04 | `test_redeem_codes` | integration | DS-02, DS-03 |
| ESC-05 | `test_plan_expiry_progress_lock_and_roles` | integration | DS-02 |
| ESC-06 | `access-tiers.spec` | e2e (Playwright) | DS-01..03 |

## 20. Documentacion A Producir

- [ ] Guía para el admin: «Acceso y planes» y códigos premium.
- [ ] Notas de versión y contrato de los endpoints nuevos.
- [ ] Runbook de migración y respaldo de la base de aisales.

## 21. Carril Recomendado

- **Carril:** Contrato CP0-CP5
- **Razon:** toca backend y frontend, cambia esquema y contrato de API, y toca autenticación/autorización.
- **Estimacion gruesa:** M, 3 a 4 días con IA y harness (sin pagos).
- **Siguiente paso:** aprobación del PO -> `Readiness: LISTA` -> `install/verify-story.sh` -> `/intake`.

## 22. Aprobacion Del Product Owner

**Decision del PO:** Aprobada
**Aprobado por (nombre y rol):** Roger, Product Owner
**Fecha de aprobacion:** 2026-11-14
**Evidencia de aprobacion (cita y canal):** "date y publicalo" - chat de Claude Code, en respuesta a «¿Las tomo como recomendé o quieres cambiar alguna?»
**Version aprobada:** v1

## 23. Revisiones

| Version | Fecha | Cambio | Motivo |
|---|---|---|---|
| v1 | 2026-11-14 | Creacion | Pedido del PO en chat |
| v1 | 2026-11-14 | Aprobada: puntos abiertos resueltos con la recomendación IA | «date y publicalo» |
| v1.1 | 2026-11-14 | Redacción alineada tras la revisión de código del PR #1: AC-06 dice explícitamente la regla ya aprobada en BR-05/DS-03; AC-01 y el flujo admin usan el paso 4 como ESC-07; ESC-02 separa catálogo y detalle; conteos calculados; NFR-01 con códigos de 12 caracteres y HMAC. Sin cambio de comportamiento aprobado | Revisión automática del PR |

## 24. Estimacion Para Cotizacion

No aplica en esta version: el PO pidió construirlo, no cotizarlo. Estimación gruesa en la sección 21.
