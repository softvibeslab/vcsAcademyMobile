# Historia Enriquecida: Piloto de Sales Academy en 3 salas de un club vacacional

**Readiness:** EN REVISION
**ID:** `PILOTO-3S-001`
**Solicitante:** Fundador de Softvibes (Roger)
**Product Owner (aprueba):** Fundador de Softvibes (Roger)
**Enriquecido por:** Claude Code (skill /enrich) con contexto workspace + Hermes
**Fecha:** 2026-11-06
**Version:** v1

> Expediente único de la historia. Enriquecer **no autoriza implementación**. El desarrollo
> solo inicia con `Readiness: LISTA` y el verificador `install/verify-story.sh`.
>
> Privacidad: el club y los hoteles se nombran con alias. **CLUB-A** = club vacacional del
> piloto; **S1** = sala del hotel H1 (primera sala); **S2**, **S3** = salas de CLUB-A en otros
> hoteles por definir. La tabla de alias reales vive fuera del repositorio. Los datos de prueba
> son simulados.

## 1. Resumen Ejecutivo

- **Qué se va a hacer:** Poner WL Sales Academy en producción para un piloto en 3 salas de ventas de CLUB-A: una instancia aislada por sala, usada desde el celular de cada representante, con cuentas reales y contenido de la sala.
- **Por qué ahora:** Es el primer piloto con salas reales. Hoy solo existe la demo local (cuentas `demo123`) y el sitio estático para inversionistas (`salesacademy.softvibes.pro/start/`), que no tiene backend ni datos reales.
- **Costo de no hacerlo:** No hay evidencia de uso real para el cliente ni para la ronda semilla. La demo actual no puede abrirse a salas reales por los huecos de seguridad de la sección 4.
- **Alternativa más barata considerada:** (a) Una sola instancia que separe salas por `team_id`. Se descarta para el piloto porque el backend no aísla datos por equipo en permisos ni en reportes, y el PO eligió una instancia por sala. (b) Seguir con la demo compartida. Se descarta porque mezcla cuentas y expone contraseñas demo.

## 2. Historia

Como **gerente de sala de CLUB-A**, quiero que mis representantes usen Sales Academy desde su celular con su propia cuenta y el contenido de mi sala, para medir su avance (roadmap, GoalSheet, roleplay y certificación) durante el piloto sin mezclar datos con otras salas.

- **Problema actual:** El entrenamiento y el seguimiento de los representantes no tienen una herramienta común ni medible por sala. La app existe, pero solo en modo demo.
- **Métrica de éxito:** Propuesta (Q-10): en la semana 1, al menos el 70 % de los representantes invitados de cada sala inicia sesión; en la semana 4, al menos el 50 % registra GoalSheet 3 o más días por semana. Pendiente de aceptación del PO.

## 3. Insumos Recibidos

| Insumo | Existe | Ubicación / referencia | Acción |
|---|---|---|---|
| Descripción del requerimiento | Parcial | Conversación con el PO, 2026-11-06 (3 salas, una instancia por sala, web en celular, VPS de Hermes) | completar |
| Diseño (mockup, prototipo, wireframe) | Sí | `doc/planning/SPRINT_17_MOBILE_DESIGN_FIDELITY.md`, `doc/design/` | usar; solo se agrega el cambio obligatorio de contraseña (Q-07) |
| Criterios de aceptación | No | - | proponer (Propuesto IA) |
| Escenarios de prueba | Parcial | `backend/tests/e2e_smoke.py`, `e2e/` (Playwright) | usar como regresión y proponer los nuevos (Propuesto IA) |
| Datos de prueba | No | - | simular (Simulado IA) |
| Reglas de negocio | Parcial | `doc/specs/wl-sales-academy/03-*`, `10-SECURITY-COMPLIANCE.md` | usar y proponer las del piloto |
| Contratos o integraciones | Sí | API FastAPI (`backend/app/main.py`), `doc/release/production.env.example` | usar; cambia la respuesta de `forgot-password` en producción |

### Fuentes De Contexto

**Modo de contexto:** workspace+hermes

| Fuente | Tipo | Consultada | Referencia | Aporte |
|---|---|---|---|---|
| vcsAcademyMobile | repo workspace | Sí | rama `main`, commit `245573b` (con cambios locales sin commit en `package.json`, `.gitignore` y el workflow de Playwright) | Endpoints, persistencia SQLite, Dockerfile, chequeo de variables de producción, hallazgos de seguridad |
| SalesAcademyVibes/chrissalesacademy | documento | Sí | `knowledge-base/00`–`07` | Producto, Blueprint, oferta por sala, piloto de 30 días, reglas de contenido del club |
| brain-hub (grafo del workspace) | documento | Sí | `SoftvibesLab/brain-hub/graphify-out/graph.json` | Relaciones entre el piloto, Hermes, el hosting y el squad |
| Hermes | Hermes | Parcial | request_id `harness-20261106015017-18205`; respuesta en `2026-11-06-piloto-3-salas.hermes.json` (confianza: low) | Hermes declara haber consultado la entrada del usuario, Codebase Memory, GBrain, su memoria Graphify y búsquedas locales en su servidor; **no localizó vcsAcademyMobile ni inspeccionó código**. Sus aportes son propuestas sin evidencia de implementación: cookie de sesión por host (AC-16), respaldos fuera del VPS (BR-06, Q-14) y pertenencia a varias salas (Q-13) |

## 4. Hechos Y Supuestos

| Tipo | Enunciado | Fuente / base | Riesgo si es falso |
|---|---|---|---|
| Hecho | El backend es FastAPI con SQLite y la ruta de la base se define con `VCSA_DB_PATH`; hay un Dockerfile del backend | `backend/app/persistence.py:14`, `backend/Dockerfile` | - |
| Hecho | `POST /api/auth/forgot-password` devuelve `reset_token` en la respuesta, lo que permite tomar cualquier cuenta conociendo su correo | `backend/app/main.py:493-507` | - |
| Hecho | `GET /api/auth/demo-users` es público y expone las contraseñas demo | `backend/app/main.py:478`, `:231` | - |
| Hecho | `save_user` usa `demo123` cuando no recibe contraseña | `backend/app/persistence.py:455` | - |
| Hecho | La cookie de sesión se emite con `secure=False` | `backend/app/main.py:470` | - |
| Hecho | `POST /api/smart-agent/public-chat` responde sin autenticación | `backend/app/main.py:685` | - |
| Hecho | No hay concepto de sala ni de organización en el backend | búsqueda en `backend/` | - |
| Hecho | No hay servicio de correo; la invitación devuelve una contraseña temporal al admin | `backend/app/main.py:914-927` | - |
| Hecho | Existe un chequeo de entorno de producción (HTTPS, sin localhost, sin CORS `*`) | `tools/release/validate-production-env.mjs` | - |
| Supuesto | El VPS de Hermes tiene Docker, CPU, RAM y disco suficientes para 3 backends y un proxy con TLS | El PO eligió ese VPS | Hermes y el piloto se degradan juntos; requiere VPS nuevo (Q-03) |
| Supuesto | Unos 20 representantes por sala | Oferta base "$25,000 con 20 reps" | Cambian NFR y capacidad (Q-04) |
| Supuesto | El proveedor `local` del Smart Agent basta para el piloto (sin LLM externo) | `VCSA_SMART_AGENT_PROVIDER=local` | Respuestas pobres si el contenido de la sala es escaso (Q-05) |
| Supuesto | Los representantes usan su propio celular con navegador moderno | Canal elegido: web en celular | Fricción de acceso y soporte |

## 5. Alcance

**Incluye:**

- Modo producción en el backend: sin tokens en `forgot-password`, sin `demo-users`, sin seed demo, sin contraseña por defecto, cookie `Secure`, `public-chat` deshabilitado.
- Receta de despliegue con 3 instancias (S1, S2, S3) en Docker en el VPS: un backend y un volumen SQLite por sala, y un subdominio por sala con HTTPS.
- Build web por sala con su URL de API, en la interfaz definida en Q-06.
- Alta de usuarios reales por sala (admin, managers y representantes) con contraseña temporal aleatoria entregada en persona.
- Carga del contenido de cada sala (recursos, Blueprint y escenarios de roleplay) con la API de admin.
- Respaldo diario por sala y prueba de restauración.
- Verificación de salud por sala y runbook de despliegue y reversión.

**No incluye:**

- Aislamiento por sala dentro de una sola instancia (multi-tenant): se decidirá después del piloto.
- Apps en App Store o Play Store.
- Integración con sistemas del hotel o del club (tours, CRM, nómina) ni el receptor de tours del piloto Presente.
- Correo transaccional (recuperación de contraseña por email).
- Proveedor LLM externo para el Smart Agent.
- Reporte consolidado entre salas (se hace a mano con exportes si se necesita).
- Facturación y contrato comercial (Q-11).

## 6. Usuarios, Roles Y Permisos

| Rol | Qué puede hacer | Qué no puede hacer |
|---|---|---|
| Representante (sales_rep) | Roadmap, GoalSheet, roleplay, recursos y Smart Agent de su sala; cambiar su contraseña | Ver datos de otros representantes o de otras salas; administrar usuarios |
| Manager / Trainer | Dashboard de su equipo, revisar roleplays, decidir certificaciones en su sala | Administrar usuarios o recursos; ver otras salas |
| Admin de sala (operador Softvibes) | Alta, baja y permisos de usuarios, recursos y auditoría de su instancia | Acceder a otra instancia con la misma cuenta |
| Operador del VPS (Softvibes) | Desplegar, respaldar, restaurar y revisar la salud de las instancias | Leer contenido de usuarios fuera de soporte o restauración |
| Visitante | Sin acceso en producción | Usar `public-chat` o ver catálogos demo |

## 7. Flujos

**Flujo principal:**

1. El operador despliega la instancia de la sala con su archivo de variables y corre `release:env:check`.
2. El admin de la sala da de alta al manager y a los representantes; el sistema genera contraseñas temporales aleatorias.
3. El admin entrega a cada persona su usuario y contraseña temporal en persona.
4. El representante abre el subdominio de su sala en el celular e inicia sesión.
5. El sistema exige cambiar la contraseña en el primer ingreso (si Q-07 se acepta).
6. El representante usa roadmap, GoalSheet, roleplay y Smart Agent con el contenido de su sala.
7. El manager revisa roleplays y certificaciones de su sala.
8. Cada noche corre el respaldo de cada sala por separado.

**Flujos alternos y de error:**

- FA-01: El representante olvida su contraseña. El admin le genera una temporal nueva; no hay autoservicio que exponga tokens.
- FA-02: Un usuario de S1 intenta entrar en el subdominio de S2. Recibe "Correo o contraseña incorrectos" y no se crea sesión.
- FA-03: Falla el backend de una sala. Las otras salas siguen operando; el operador restaura con el runbook.
- FA-04: Se corrompe la base de una sala. Se restaura el último respaldo de esa sala y se pierden como máximo 24 h.
- FA-05: Un usuario deshabilitado intenta iniciar sesión. Recibe 401 y sus sesiones previas ya están invalidadas.

## 8. Reglas De Negocio

| ID | Regla | Fuente | Ejemplo |
|---|---|---|---|
| BR-01 | Cada sala tiene su propia instancia, base de datos y subdominio; ningún dato de una sala es accesible desde otra | Decisión del PO: una instancia por sala | La cuenta del rep de S1 no existe en S2 |
| BR-02 | En producción ninguna respuesta incluye tokens de restablecimiento ni contraseñas | Hallazgo en `main.py:493` | `forgot-password` responde igual para correos existentes e inexistentes |
| BR-03 | En producción no hay cuentas demo ni contraseña por defecto; toda contraseña inicial es aleatoria de al menos 12 caracteres | Hallazgo en `persistence.py:455` | Crear usuario sin contraseña genera `Temp…` aleatoria, nunca `demo123` |
| BR-04 | Solo HTTPS; cookie de sesión `Secure` y `HttpOnly`; CORS limitado al origen web de la sala | `10-SECURITY-COMPLIANCE.md`, chequeo de producción | Un origen ajeno no recibe `Access-Control-Allow-Origin` |
| BR-05 | El Smart Agent responde solo con recursos publicados de la sala y bloquea temas de precios, cuotas y descuentos | Guardrails existentes, regla de contenido del club | Pregunta "¿qué descuento doy?" → respuesta de bloqueo con derivación al manager |
| BR-06 | Respaldo diario consistente (`sqlite3 .backup`) por sala con retención de 14 días, con copia fuera del VPS (destino en Q-14) | Propuesto IA + Propuesto Hermes (copia fuera del VPS) | El respaldo de S1 del día 3 restaura los datos de S1 de ese día aunque el VPS se pierda |
| BR-08 | La cookie de sesión es de host (sin atributo `Domain`); una sesión de un subdominio nunca se envía a otro | Propuesto Hermes | La cookie emitida por `s1.piloto…` no viaja a `s2.piloto…` |
| BR-07 | El manager solo ve a los representantes de su sala | Consecuencia de BR-01 | El dashboard de S1 lista solo usuarios de S1 |

## 9. Diseño

**Estado del diseno:** Aprobado
**Fuente del diseno:** Diseño móvil dark/gold de Sprint 17 (`doc/planning/SPRINT_17_MOBILE_DESIGN_FIDELITY.md`, `doc/design/`) y pantallas existentes de la web.

| Pantalla / componente | Existe en el diseño | Estados cubiertos (carga, vacío, error, éxito) | Observaciones |
|---|---|---|---|
| Login | Sí | carga, error, éxito | Quitar el selector de cuentas demo en producción |
| Cambio obligatorio de contraseña | No | - | Wireframe propuesto abajo; requiere aceptación (Q-07) |
| Home, Roadmap, GoalSheet, Roleplay, Smart Agent, Biblioteca, Perfil | Sí | carga, vacío, error, éxito | Sin cambios; el nombre de la sala aparece en el encabezado (Q-12) |
| Dashboard de manager y admin (web) | Sí | carga, vacío, error, éxito | Sin cambios |

Wireframe propuesto, cambio obligatorio de contraseña:

- Título "Crea tu contraseña". Texto: "Por seguridad, cambia la contraseña temporal antes de continuar."
- Campos: contraseña temporal, nueva contraseña, confirmar contraseña. Regla visible: mínimo 10 caracteres.
- Acción: "Guardar y entrar". Errores: "La contraseña temporal no es correcta", "Las contraseñas no coinciden", "Mínimo 10 caracteres".
- No se puede navegar a otra pantalla hasta completar el cambio.

## 10. Datos, Contratos E Integraciones

| Elemento | Tipo | Cambio esperado | Responsable |
|---|---|---|---|
| Variable `VCSA_ENV` (`production` / `development`) | nuevo | Activa el modo producción de BR-02, BR-03 y BR-04 y deshabilita `demo-users`, `public-chat` y el seed demo | Backend |
| `POST /api/auth/forgot-password` | cambio | En producción no devuelve `reset_token` ni `expires_at` | Backend |
| `GET /api/auth/demo-users`, `POST /api/smart-agent/public-chat` | cambio | 404 en producción | Backend |
| Usuarios: marca `must_change_password` | nuevo (si Q-07) | Columna en `users` y verificación en `require_user` | Backend + web/móvil |
| `docker-compose.pilot.yml` y archivo de variables por sala | nuevo | 3 servicios backend, 3 volúmenes y web estática por sala | DevOps |
| Proxy inverso con TLS en el VPS | nuevo o cambio | 3 subdominios hacia sus backends y webs | DevOps (Q-02, Q-03) |
| Script de respaldo y restauración SQLite | nuevo | Copia diaria consistente (`.backup`) por sala con retención de 14 días | DevOps |
| DNS de los subdominios | nuevo | Registros A hacia el VPS | Operador (Q-02) |

## 11. Criterios De Aceptacion

| ID | Origen | Criterio (Dado / Cuando / Entonces) | Tipo | Estado PO | Comentario PO |
|---|---|---|---|---|---|
| AC-01 | Propuesto IA | Dado S1 desplegada en producción y un rep invitado, cuando inicia sesión en el subdominio de S1 desde el celular, entonces ve su Home con los recursos de S1 | positivo | Pendiente | |
| AC-02 | Propuesto IA | Dado un usuario que existe solo en S1, cuando inicia sesión en el subdominio de S2 con las mismas credenciales, entonces recibe 401 y no se crea sesión | negativo | Pendiente | |
| AC-03 | Propuesto IA | Dado `VCSA_ENV=production`, cuando se llama `forgot-password` con un correo existente y con uno inexistente, entonces ambas respuestas son idénticas y ninguna contiene `reset_token` | negativo | Pendiente | |
| AC-04 | Propuesto IA | Dado `VCSA_ENV=production`, cuando se llama `GET /api/auth/demo-users` o `POST /api/smart-agent/public-chat`, entonces la respuesta es 404 | negativo | Pendiente | |
| AC-05 | Propuesto IA | Dado una instancia de producción recién creada, cuando se intenta iniciar sesión con `rep@vcsa.local` y `demo123`, entonces la respuesta es 401 y la base no tiene usuarios `@vcsa.local` | negativo | Pendiente | |
| AC-06 | Propuesto IA | Dado un admin que crea o invita un usuario sin contraseña, cuando se guarda, entonces la contraseña inicial es aleatoria (12 o más caracteres) y nunca `demo123` | borde | Pendiente | |
| AC-07 | Propuesto IA | Dado un usuario con contraseña temporal, cuando inicia sesión, entonces solo puede acceder a la pantalla de cambio de contraseña y las demás APIs responden 403 hasta que la cambie | borde | Pendiente | Depende de Q-07 |
| AC-08 | Propuesto IA | Dado un login exitoso sobre HTTPS, cuando se inspecciona la cookie `vcsa_session`, entonces tiene los atributos `Secure` y `HttpOnly` | positivo | Pendiente | |
| AC-09 | Propuesto IA | Dado una petición con `Origin` distinto al de la sala, cuando llega al backend, entonces la respuesta no incluye `Access-Control-Allow-Origin` | negativo | Pendiente | |
| AC-10 | Propuesto IA | Dado S1 con datos, cuando corre el respaldo diario y se restaura en un entorno de prueba, entonces los conteos de usuarios, GoalSheets y roleplays coinciden con el original y el respaldo no contiene datos de S2 ni S3 | positivo | Pendiente | |
| AC-11 | Propuesto IA | Dado que el contenedor de S1 se detiene, cuando se consulta `/api/health` de S2 y S3, entonces ambas responden `ok`; y al reiniciar S1 sus datos siguen ahí | borde | Pendiente | |
| AC-12 | Propuesto IA | Dado un rep en un celular de 360 a 430 px, cuando recorre login, roadmap, GoalSheet, roleplay y Smart Agent, entonces completa cada paso sin errores visibles ni desbordes | positivo | Pendiente | UAT |
| AC-13 | Propuesto IA | Dado el archivo de variables de cada sala, cuando se ejecuta `npm run release:env:check`, entonces termina con código 0 | positivo | Pendiente | |
| AC-14 | Propuesto IA | Dado un manager de S1, cuando abre el dashboard de equipo, entonces ve solo a los representantes de S1 | positivo | Pendiente | |
| AC-15 | Propuesto IA | Dado un rep que pregunta al Smart Agent por un descuento o una cuota, cuando envía la pregunta, entonces recibe la respuesta de bloqueo con derivación al manager y sin cifras | negativo | Pendiente | |
| AC-16 | Propuesto Hermes | Dado un login exitoso en S1, cuando se inspecciona `Set-Cookie`, entonces la cookie no tiene atributo `Domain`; y una petición a S2 con el token de sesión de S1 recibe 401 | negativo | Pendiente | |

## 12. Escenarios De Prueba (Funcionales Y De Usuario)

| ID | AC cubiertos | Tipo | Precondición | Pasos | Resultado esperado | Datos | Nivel de prueba | Origen | Estado PO |
|---|---|---|---|---|---|---|---|---|---|
| ESC-01 | AC-01, AC-12 | positivo | S1 desplegada con DS-01 y DS-02 | 1. Abrir el subdominio de S1 en un celular de 390 px. 2. Iniciar sesión como `rep1.s1`. 3. Recorrer roadmap, GoalSheet, roleplay y Smart Agent | Home con recursos "S1 –"; cada pantalla carga sin errores | DS-01, DS-02 | UAT manual | Propuesto IA | Pendiente |
| ESC-02 | AC-02 | negativo | S1 y S2 desplegadas con DS-01 | 1. Login en S2 con las credenciales de `rep1.s1` | 401 "Correo o contraseña incorrectos"; sin cookie | DS-01 | e2e | Propuesto IA | Pendiente |
| ESC-03 | AC-03 | negativo | `VCSA_ENV=production` | 1. POST `forgot-password` con `rep1.s1@example.test`. 2. Lo mismo con `noexiste@example.test`. 3. Comparar | Cuerpos idénticos, sin `reset_token` | DS-03 | integration | Propuesto IA | Pendiente |
| ESC-04 | AC-04 | negativo | `VCSA_ENV=production` | 1. GET `demo-users`. 2. POST `public-chat` | 404 en ambos | DS-03 | integration | Propuesto IA | Pendiente |
| ESC-05 | AC-05 | negativo | Base nueva en producción | 1. Arrancar la instancia. 2. Login `rep@vcsa.local` / `demo123`. 3. Consultar usuarios | 401; 0 usuarios `@vcsa.local` | DS-03 | integration | Propuesto IA | Pendiente |
| ESC-06 | AC-06 | borde | Admin de S1 autenticado | 1. Invitar a `rep4.s1@example.test` sin contraseña. 2. Intentar login con `demo123` | Contraseña temporal de 12 o más caracteres; login con `demo123` da 401 | DS-01 | integration | Propuesto IA | Pendiente |
| ESC-07 | AC-07 | borde | `rep4.s1` con contraseña temporal | 1. Login. 2. GET `/api/dashboard/rep`. 3. Cambiar contraseña. 4. Repetir paso 2 | Paso 2: 403; paso 4: 200 | DS-01 | e2e | Propuesto IA | Pendiente |
| ESC-08 | AC-08 | positivo | S1 detrás de HTTPS | 1. Login. 2. Inspeccionar `Set-Cookie` | Contiene `Secure` y `HttpOnly` | DS-01 | integration | Propuesto IA | Pendiente |
| ESC-09 | AC-09 | negativo | S1 en producción | 1. Enviar una petición con `Origin: https://ajeno.example.test` | Sin `Access-Control-Allow-Origin` | DS-03 | integration | Propuesto IA | Pendiente |
| ESC-10 | AC-10 | positivo | S1 con DS-01, DS-02 y DS-05 | 1. Ejecutar el respaldo. 2. Restaurar en un entorno de prueba. 3. Comparar conteos. 4. Buscar cadenas "S2 –" y "S3 –" | Conteos iguales; 0 coincidencias | DS-05 | integration | Propuesto IA | Pendiente |
| ESC-11 | AC-11 | borde | S1, S2 y S3 arriba | 1. `docker stop` de S1. 2. Health de S2 y S3. 3. `docker start` de S1. 4. Login `rep1.s1` | S2 y S3 `ok`; S1 conserva sus datos | DS-01 | e2e | Propuesto IA | Pendiente |
| ESC-12 | AC-13 | positivo | Archivos de variables de S1, S2 y S3 | 1. `release:env:check` con cada archivo | Código 0 en los tres | DS-04 | unit | Propuesto IA | Pendiente |
| ESC-13 | AC-14 | positivo | S1 con DS-01 | 1. Login `mgr1.s1`. 2. Abrir el dashboard de equipo | Lista solo a `rep1`–`rep3.s1` | DS-01 | UAT manual | Propuesto IA | Pendiente |
| ESC-14 | AC-15 | negativo | S1 con DS-02 | 1. Login `rep1.s1`. 2. Preguntar "¿Cuánto descuento puedo ofrecer?" | Mensaje de bloqueo con derivación al manager; sin cifras | DS-02 | integration | Propuesto IA | Pendiente |
| ESC-15 | AC-16 | negativo | S1 y S2 desplegadas con DS-01 | 1. Login `rep1.s1` en S1. 2. Revisar `Set-Cookie`. 3. Llamar `/api/mobile/me` en S2 con el token de S1 como Bearer | Sin `Domain` en la cookie; S2 responde 401 | DS-01 | e2e | Propuesto Hermes | Pendiente |

## 13. Datos De Prueba

| ID | Descripción | Origen | Registros | Por qué aplica (regla / AC) | Validado PO | Comentario PO |
|---|---|---|---|---|---|---|
| DS-01 | Usuarios simulados por sala | Simulado IA | 15 (5 por sala) | BR-01, BR-03, BR-07 / AC-01, 02, 05, 06, 07, 08, 11, 14 | Pendiente | |
| DS-02 | Recursos de contenido marcados por sala | Simulado IA | 9 (3 por sala) | BR-01, BR-05 / AC-01, AC-10, AC-15 | Pendiente | |
| DS-03 | Entradas de seguridad | Simulado IA | 5 | BR-02, BR-04 / AC-03, 04, 05, 09 | Pendiente | |
| DS-04 | Variables de entorno por sala | Simulado IA | 3 | BR-04 / AC-13 | Pendiente | |
| DS-05 | Actividad simulada para respaldo | Simulado IA | 1 sala | BR-06 / AC-10 | Pendiente | |

### DS-01 - Usuarios simulados por sala

| email | rol | sala | Nota |
|---|---|---|---|
| admin.s1@example.test | admin | S1 | Alta de usuarios (AC-06) |
| mgr1.s1@example.test | manager | S1 | Dashboard de equipo (AC-14) |
| rep1.s1@example.test | sales_rep | S1 | Flujo principal y aislamiento (AC-01, AC-02) |
| rep2.s1@example.test | sales_rep | S1 | Segundo rep visible para el manager |
| rep3.s1@example.test | sales_rep | S1 | Tercer rep; `rep4.s1` se crea en ESC-06 |
| (mismo patrón) admin.s2, mgr1.s2, rep1–3.s2 | varios | S2 | Existe solo en S2; ESC-02 verifica que `rep1.s1` no entra en S2 |
| (mismo patrón) admin.s3, mgr1.s3, rep1–3.s3 | varios | S3 | Control para AC-11 |

Dominio `example.test` reservado para pruebas; ninguna dirección es real.

### DS-02 - Recursos por sala

| título | sala | tipo | Nota |
|---|---|---|---|
| S1 – Bienvenida al tour | S1 | guion | El prefijo "S1 –" permite detectar fugas entre salas |
| S1 – Objeción "no tenemos tiempo" | S1 | objeción | Contenido para el Smart Agent |
| S1 – Política de descuentos (bloqueado) | S1 | sensible | Activa el guardrail de BR-05 / AC-15 |
| S2 – … y S3 – … (3 cada una, mismo patrón) | S2, S3 | varios | Deben estar ausentes en el respaldo de S1 (AC-10) |

### DS-03 - Entradas de seguridad

| entrada | valor | resultado esperado | Nota |
|---|---|---|---|
| correo existente | rep1.s1@example.test | respuesta genérica sin token | AC-03 |
| correo inexistente | noexiste@example.test | misma respuesta genérica | AC-03 |
| credencial demo | rep@vcsa.local / demo123 | 401 | AC-05 |
| origen ajeno | https://ajeno.example.test | sin cabecera CORS | AC-09 |
| endpoints demo | /api/auth/demo-users, /api/smart-agent/public-chat | 404 | AC-04 |

### DS-04 - Variables por sala

| sala | VITE_API_BASE_URL | VCSA_CORS_ORIGINS | VCSA_DB_PATH |
|---|---|---|---|
| S1 | https://s1.piloto.DOMINIO/ | https://s1.piloto.DOMINIO | /var/lib/vcsa/s1/vcsa.sqlite3 |
| S2 | https://s2.piloto.DOMINIO/ | https://s2.piloto.DOMINIO | /var/lib/vcsa/s2/vcsa.sqlite3 |
| S3 | https://s3.piloto.DOMINIO/ | https://s3.piloto.DOMINIO | /var/lib/vcsa/s3/vcsa.sqlite3 |

`DOMINIO` es el dominio que se define en Q-02. Con `DOMINIO` sin definir, AC-13 debe fallar (control negativo del chequeo).

### DS-05 - Actividad para respaldo (S1)

| entidad | registros esperados | Nota |
|---|---|---|
| usuarios | 5 | DS-01 de S1 |
| GoalSheets | 9 (3 reps × 3 días) | Conteo a comparar tras restaurar |
| roleplays enviados | 3 (1 por rep) | Conteo a comparar tras restaurar |
| recursos | 3 | Solo con prefijo "S1 –" |

## 14. Mapa De Cobertura

| AC | Escenarios | Datos | Estado |
|---|---|---|---|
| AC-01 | ESC-01 | DS-01, DS-02 | cubierto |
| AC-02 | ESC-02 | DS-01 | cubierto |
| AC-03 | ESC-03 | DS-03 | cubierto |
| AC-04 | ESC-04 | DS-03 | cubierto |
| AC-05 | ESC-05 | DS-03 | cubierto |
| AC-06 | ESC-06 | DS-01 | cubierto |
| AC-07 | ESC-07 | DS-01 | cubierto |
| AC-08 | ESC-08 | DS-01 | cubierto |
| AC-09 | ESC-09 | DS-03 | cubierto |
| AC-10 | ESC-10 | DS-05 | cubierto |
| AC-11 | ESC-11 | DS-01 | cubierto |
| AC-12 | ESC-01 | DS-01, DS-02 | cubierto |
| AC-13 | ESC-12 | DS-04 | cubierto |
| AC-14 | ESC-13 | DS-01 | cubierto |
| AC-15 | ESC-14 | DS-02 | cubierto |
| AC-16 | ESC-15 | DS-01 | cubierto |

## 15. Requisitos No Funcionales

| ID | Atributo | Requisito medible |
|---|---|---|
| NFR-01 | rendimiento | p95 menor a 800 ms en las APIs de rep con 30 usuarios concurrentes por sala |
| NFR-02 | disponibilidad | Las 3 instancias responden `/api/health` cada 5 minutos en el horario de sala; alerta al operador si fallan 2 veces seguidas |
| NFR-03 | recuperación | RPO 24 h y RTO 2 h por sala |
| NFR-04 | aislamiento de recursos | Cada backend con límite de 512 MB de RAM; la caída de una sala no afecta a las otras ni a Hermes |
| NFR-05 | móvil | Pantallas de rep usables de 360 a 430 px de ancho |
| NFR-06 | auditoría | Login, invitación, cambio de contraseña y decisiones de certificación quedan en `audit-events` |

## 16. Seguridad, Privacidad Y Casos Borde

- **Datos sensibles involucrados:** nombre y correo de los representantes, y su desempeño (GoalSheet, roleplays, certificación). Son datos personales; requieren aviso de privacidad (Q-09).
- **Permisos y abuso:** un rep que llama APIs de manager o admin recibe 403 (RBAC existente, cubierto por `e2e_smoke.py`). Sin endpoints públicos en producción. Las contraseñas temporales solo se entregan en persona.
- **Casos borde:** sala sin recursos (el Smart Agent dice que no hay contenido y deriva al manager); correo duplicado al invitar (se actualiza el usuario existente, comportamiento actual que se debe revisar); sesión expirada a los 7 días (pide login otra vez); usuario deshabilitado con sesión abierta (se invalida); sin red en el celular (mensaje de error de conexión, sin modo offline).
- **Mensajes de error al usuario:** "Correo o contraseña incorrectos" (sin revelar si la cuenta existe); "Tu sesión expiró, vuelve a iniciar sesión"; "No tienes permiso para esta sección".

## 17. Puntos Abiertos

| ID | Tipo | Categoría | Pregunta o supuesto | Recomendación IA | Impacto si se decide mal | Bloquea | Para quién | Respuesta / decisión | Estado |
|---|---|---|---|---|---|---|---|---|---|
| Q-01 | Pregunta | Alcance | ¿Qué hoteles son S2 y S3 y en qué fecha arranca cada sala? | Arrancar S1 primero y replicar S2 y S3 con la misma receta una semana después | Calendario y capacidad mal planeados | No | PO | | Abierta |
| Q-02 | Pregunta | Integraciones | ¿Qué dominio usan las salas? | Subdominios `s1.piloto.softvibes.pro` (y s2, s3), con web y API en el mismo host y la API bajo `/api` para evitar CORS entre dominios | DNS, TLS y CORS mal configurados | Si | PO / operador | | Abierta |
| Q-03 | Pregunta | Infraestructura | ¿Cuánta CPU, RAM y disco libres tiene el VPS de Hermes? ¿Ya tiene Docker y proxy con TLS (Caddy, Nginx o Traefik)? ¿Quién tiene acceso SSH? | Usarlo solo si quedan 2 GB de RAM y 10 GB de disco libres; si no, un VPS pequeño aparte | Hermes y el piloto se caen juntos | Si | Operador | | Abierta |
| Q-04 | Pregunta | Usuarios | ¿Cuántos representantes y managers hay por sala y quién será el admin de cada una? | Asumir 20 reps y 1-2 managers por sala; admin = operador Softvibes | Capacidad y altas incorrectas | Si | PO / gerente de sala | | Abierta |
| Q-05 | Pregunta | Contenido | ¿Quién entrega y aprueba el contenido de cada sala (Blueprint, guiones, objeciones) y es el mismo en las 3? | Paquete base del club aprobado por su líder comercial, más ajustes por sala | Smart Agent con respuestas vacías o no autorizadas | Si | PO / líder comercial del club | | Abierta |
| Q-06 | Pregunta | Diseño | ¿Qué interfaz usan los reps: el export web de la app Expo (diseño móvil dark/gold) o la web React? | Export web de Expo para reps y web React para manager y admin | Experiencia móvil pobre o doble despliegue innecesario | Si | PO | | Abierta |
| Q-07 | Pregunta | Seguridad | ¿Se exige cambiar la contraseña en el primer ingreso? | Sí; agrega 1 pantalla y 1 bandera | Contraseñas temporales compartidas que siguen vigentes | No | PO | | Abierta |
| Q-08 | Supuesto | Seguridad | La recuperación de contraseña es asistida por el admin (sin correo) | Aceptar para el piloto; correo transaccional después | Carga operativa para el admin | No | PO | | Abierta |
| Q-09 | Pregunta | Legal / privacidad | ¿El club autoriza guardar datos de desempeño de sus reps en un servidor de Softvibes? ¿Hay aviso de privacidad? | Aviso de privacidad simple y aceptación del club por escrito antes de cargar usuarios reales | Riesgo legal y de confianza con el cliente | Si | PO / club | | Abierta |
| Q-10 | Pregunta | Métrica | ¿La métrica de éxito y la duración del piloto (30 días) son las de la sección 2? | Aceptar la métrica propuesta y 30 días por sala | No hay criterio de éxito ni cierre del piloto | No | PO | | Abierta |
| Q-11 | Diferida | Comercial | Precio y contrato del piloto (oferta base por sala) | Resolver fuera de esta historia | Ninguno técnico | No | PO | | Diferida |
| Q-13 | Pregunta | Usuarios | ¿Una persona (p. ej. un manager o trainer) puede pertenecer a varias salas? | Sí, con una cuenta independiente por sala; sin cuenta transversal en el piloto | Si se requiere acceso transversal, la decisión de una instancia por sala cambia | No | PO | | Abierta |
| Q-14 | Pregunta | Infraestructura | ¿Dónde se guarda la copia de respaldos fuera del VPS? | Almacenamiento cifrado en otro proveedor o en la cuenta de hosting existente, con acceso solo del operador | Sin copia externa, perder el VPS es perder los datos del piloto | Si | Operador | | Abierta |
| Q-12 | Pregunta | Diseño | ¿La app muestra el nombre o logo del club o se queda como "Sales Academy" más el nombre de la sala? | "Sales Academy · S1" sin logo del club salvo autorización escrita | Uso de marca sin permiso | No | PO | | Abierta |

## 18. Dependencias Y Riesgos

| Tipo | Descripción | Mitigación | Responsable |
|---|---|---|---|
| riesgo | VPS compartido con Hermes: competencia por recursos e impacto mutuo si algo falla | Límites de memoria por contenedor (NFR-04) y verificación de capacidad (Q-03) | Operador |
| riesgo | SQLite con escrituras concurrentes | Bajo con unos 20 usuarios por sala; usar modo WAL y vigilar NFR-01 | Backend |
| dependencia | Cambios sin commit en `main` (`package.json`, workflow de Playwright) | Resolverlos o aislarlos en una rama antes de crear la rama del piloto | Dev |
| dependencia | DNS y certificados de 3 subdominios | Crearlos al inicio; la propagación puede tardar | Operador |
| dependencia | Contenido de las salas a tiempo (Q-05) | Arrancar S1 con el paquete base | PO |
| riesgo | Contraseñas temporales filtradas en mensajes | Entrega en persona y cambio obligatorio (Q-07) | Admin |

## 19. Estrategia De Pruebas TDD

| Escenario | Prueba automatizada prevista | Nivel | Datos (fixture) |
|---|---|---|---|
| ESC-03 | `test_forgot_password_production_hides_token` | integration | DS-03 |
| ESC-04 | `test_demo_endpoints_404_in_production` | integration | DS-03 |
| ESC-05 | `test_production_has_no_demo_users` | integration | DS-03 |
| ESC-06 | `test_invite_without_password_is_random` | integration | DS-01 |
| ESC-07 | `test_must_change_password_blocks_api` | e2e | DS-01 |
| ESC-08 | `test_session_cookie_secure_httponly` | integration | DS-01 |
| ESC-09 | `test_cors_rejects_foreign_origin` | integration | DS-03 |
| ESC-02, ESC-11 | `pilot-isolation.spec` (Playwright contra compose local de 3 salas) | e2e | DS-01 |
| ESC-10 | `test_backup_restore_counts` | integration | DS-05 |
| ESC-12 | `release:env:check` con los fixtures de DS-04 | unit | DS-04 |
| ESC-14 | `test_smart_agent_blocks_pricing` | integration | DS-02 |
| ESC-15 | `pilot-isolation.spec` (caso cookie de host y token cruzado) | e2e | DS-01 |
| ESC-01, ESC-13 | UAT manual con el PO | UAT manual | DS-01, DS-02 |

## 20. Documentacion A Producir

- [ ] Runbook del piloto: despliegue por sala, respaldo, restauración y reversión.
- [ ] Guía del admin de sala: alta de usuarios, entrega de contraseña temporal y restablecimiento.
- [ ] Guía rápida del representante (1 página): acceso desde el celular y primer ingreso.
- [ ] Notas de versión del modo producción (cambio en `forgot-password` y endpoints deshabilitados).

## 21. Carril Recomendado

- **Carril:** Contrato CP0-CP5
- **Razón:** Toca más de una capa (backend, web e infraestructura), cambia un contrato de API (`forgot-password` y endpoints demo), afecta autenticación y datos personales, abre superficie externa y se estima en más de 2 días. Cualquiera de estos criterios basta para escalar.
- **Estimación gruesa:** M (6 a 9 días de trabajo, sin contar las esperas por Q-02, Q-03, Q-05 y Q-09)
- **Siguiente paso:** Aprobación del PO → `/intake` (CP0) citando esta historia → `/spec`

## 22. Aprobacion Del Product Owner

**Decision del PO:** Pendiente
**Aprobado por (nombre y rol):** `<nombre y rol>`
**Fecha de aprobacion:** `<yyyy-mm-dd>`
**Evidencia de aprobacion (cita y canal):** `<"texto exacto" - canal>`
**Version aprobada:** `<v1>`

## 23. Revisiones

| Version | Fecha | Cambio | Motivo |
|---|---|---|---|
| v1 | 2026-11-06 | Creación | Solicitud del PO en conversación; contexto del workspace; aportes de Hermes (AC-16, BR-06, BR-08, Q-13, Q-14) con confianza baja |

## 24. Estimacion Para Cotizacion

No solicitada en esta versión (carril Contrato, no Descubrimiento). Si se requiere cotizar, correr `/estimate` sobre la versión aprobada.

**Modo de estimacion:** con IA y harness
