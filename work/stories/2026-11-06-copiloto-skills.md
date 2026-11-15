# Historia Enriquecida: Copiloto del Rep — agente como inicio y catálogo de skills por sala

**Readiness:** EN REVISION
**ID:** `COPILOTO-001`
**Solicitante:** Fundador de Softvibes (Roger)
**Product Owner (aprueba):** Fundador de Softvibes (Roger)
**Enriquecido por:** Claude Code (skill /enrich) con contexto workspace + Hermes
**Fecha:** 2026-11-06
**Version:** v1

> Expediente único de la historia. Enriquecer **no autoriza implementación**. Depende de PILOTO-3S-001
> (`work/stories/2026-11-06-piloto-3-salas.md`): las salas S1–S3 son instancias aisladas.
> Privacidad: alias de sala S1–S3; datos de prueba simulados.

## 1. Resumen Ejecutivo

- **Qué se va a hacer:** Convertir el Smart Agent en la pantalla principal del rep y exponer cada capacidad como una skill de un catálogo que el admin activa por sala. MVP con 9 skills: cotizar, comparar enganches (modo cliente), upgrade, cuánto puede pagar, convertir a MXN, registrar tour, mi mes, meta del mes y biblioteca.
- **Por qué ahora:** El piloto necesita que la app sea la herramienta diaria del rep, no un material de entrenamiento ocasional. La referencia competitiva (Timeshark Pro) muestra que los reps usan a diario calculadoras, agenda y KPIs; Sales Academy suma coaching, certificación y privacidad.
- **Costo de no hacerlo:** Baja adopción en el piloto; los reps siguen usando calculadoras y hojas aparte y el manager no ve datos para coaching.
- **Alternativa más barata considerada:** Agregar pantallas sueltas de calculadora sin agente ni catálogo. Se descarta: no cumple el objetivo conversacional y obliga a rehacer la navegación al crecer el número de capacidades.

## 2. Historia

Como **representante de ventas de una sala**, quiero pedirle a mi copiloto en lenguaje natural una cotización, registrar mis tours y ver cómo voy contra mi meta, para trabajar toda mi jornada desde una sola herramienta y mostrarle al cliente una propuesta clara.

- **Problema actual:** La app actual navega por módulos (GoalSheet, roleplay, recursos); no cotiza ni registra tours, y el agente solo responde con recursos.
- **Métrica de éxito:** Propuesta (Q-06): en S1, ≥ 70 % de los reps usan el copiloto 4 de 5 días durante 2 semanas; ≥ 80 % de las frases se resuelven sin caer a la biblioteca; registrar un tour toma ≤ 30 s.

## 3. Insumos Recibidos

| Insumo | Existe | Ubicación / referencia | Accion |
|---|---|---|---|
| Descripción del requerimiento | Sí | `brain-hub/research/timeshark-pro/PLAN-MVP.md` | usar |
| Diseño (mockup, prototipo, wireframe) | Parcial | Prototipo `SalesAcademyVibes/prototypes/copiloto-rep` (commit `51b0b00`, capturas en `docs/capturas/`); `WIREFRAMES.md` W01–W09; design system `doc/design/vcsa_sovereign_dark/DESIGN.md` | usar; pantallas Stitch pendientes |
| Criterios de aceptación | Parcial | `prototypes/copiloto-rep/docs/SPEC.md` §8 | completar (Propuesto IA) |
| Escenarios de prueba | Sí | `prototypes/copiloto-rep/tests/` (30 unit + 8 e2e) | usar y portar al backend |
| Datos de prueba | Sí | `brain-hub/research/timeshark-pro/verify_formulas.py` (34 vectores) | usar |
| Reglas de negocio | Sí | `brain-hub/research/timeshark-pro/SPEC.md` §3 (BR-01…BR-27) | usar |
| Contratos o integraciones | Parcial | `doc/adr/ADR-001-agente-router-y-skills.md` (propuesto) | aprobar ADR (Q-07) |

### Fuentes De Contexto

**Modo de contexto:** workspace+hermes

| Fuente | Tipo | Consultada | Referencia | Aporte |
|---|---|---|---|---|
| vcsAcademyMobile | repo workspace | Sí | rama `main`, commit `245573b` | `smart_agent.py` (interfaz de proveedor, guardrails), acciones del agente en `apps/mobile/App.tsx`, API de GoalSheet y manager |
| prototipos/copiloto-rep | repo workspace | Sí | rama `main`, commit `51b0b00` | Router, skills, catálogo, modo cliente y pruebas validadas |
| brain-hub (investigación y grafo) | documento | Sí | `research/timeshark-pro/*`, `graphify-out/graph.json` | Reglas verificadas, plan, wireframes |
| Hermes | Hermes | Parcial | request_id `harness-20261106051437-60638`; respuesta en `2026-11-06-copiloto-skills.hermes.json` (confianza: low) | Hermes declara haber consultado la entrada, su esquema de respuesta, Codebase Memory, GBrain, su memoria Graphify y búsquedas locales de su servidor; **no localizó el repo ni el prototipo**. Aportes adoptados como Propuesto Hermes: AC-13 (sin escrituras por intención ambigua; reintentos sin duplicar), AC-14 (fuente y vigencia del tipo de cambio), Q-12 y Q-13. El aporte de AC-13 ya corrigió un defecto real del prototipo (commit `3deea48`). |

## 4. Hechos Y Supuestos

| Tipo | Enunciado | Fuente / base | Riesgo si es falso |
|---|---|---|---|
| Hecho | El backend tiene una interfaz de proveedor del agente con guardrails de precio, cuotas y finanzas | `backend/app/smart_agent.py` | - |
| Hecho | La app móvil ya ejecuta acciones del agente que abren GoalSheet, Roleplay, Recursos y pasos del Blueprint | `apps/mobile/App.tsx` | - |
| Hecho | Las 34 fórmulas de cotización y KPIs reproducen al centavo los valores observados en la referencia | `verify_formulas.py` 34/34 | - |
| Hecho | El prototipo resuelve las frases del guion con un router por reglas | `tests/router.test.mjs` 11/11 | - |
| Supuesto | Upgrade suma volumen y cuenta como venta; exit y pendiente son tours sin venta | Prototipo; no verificado en la referencia | KPIs distintos a como los mide la sala (Q-10) |
| Supuesto | La "meta del mes" se guarda en el GoalSheet existente | Plan §2 | Doble fuente de verdad (Q-08) |
| Supuesto | No hay modelo de lenguaje externo en el MVP | ADR-001 | Menor cobertura de frases |

## 5. Alcance

**Incluye:**

- Pantalla Hoy (agente) en la app Expo con tarjetas de resultado y chips de skills favoritas.
- `POST /api/agent/chat` (router por reglas) y `POST /api/skills/{id}/run` según ADR-001.
- Manifiesto de 19 skills; 9 ejecutables en el MVP; el resto "próximamente".
- Catálogo por sala: el admin activa/desactiva; el rep fija favoritas.
- Registro de tours (venta, no venta, upgrade, exit, pendiente, días sin tour) y KPIs del mes.
- Modo cliente construido en el servidor sin datos internos.
- Auditoría de cada ejecución de skill.
- Pruebas: 34 vectores, frases del router, API y e2e del guion.

**No incluye:**

- Modelo de lenguaje externo y memoria de largo plazo (ADR propio, F3).
- Skills de fase 2 (enganche diferido, comisión, ahorro vacacional, mantenimiento, práctica de objeción, pre/post tour, sala del manager, briefing).
- Datos personales del cliente y seguimiento (F3, con consentimiento).
- Cobro de skills Pro.

## 6. Usuarios, Roles Y Permisos

| Rol | Que puede hacer | Que no puede hacer |
|---|---|---|
| Representante | Usar skills activas, fijar favoritas, registrar sus tours, ver su mes, abrir modo cliente | Activar/desactivar skills; ver tours de otros reps |
| Manager | Lo del rep + ver KPIs de su sala (fase 2) | Cambiar el catálogo |
| Admin de sala | Activar/desactivar skills, fijar valores por defecto de la sala (tasa, plazo, enganche, tipo de cambio) | Ver otras salas |

## 7. Flujos

**Flujo principal:**

1. El rep abre la app y llega a Hoy (briefing de meta y KPIs).
2. Escribe o toca un chip: "cotiza 20 mil con 30% a 120 meses al 14.9".
3. El servidor enruta a SK-01, valida activación y rol, calcula y audita.
4. La app muestra la tarjeta con $225.01 y los botones "Mostrar al cliente" y "En pesos".
5. El rep muestra la hoja al cliente con 3 escenarios de enganche.
6. Al terminar el tour: "vendí 25 mil, objeción dinero"; los KPIs se actualizan.

**Flujos alternos y de error:**

- FA-01: Skill inactiva en la sala → "X no está activa en tu sala. Pídele al admin que la active en el Catálogo."
- FA-02: Faltan datos → la skill usa los valores de la sala y lo declara ("Supuse plazo de 120 meses…").
- FA-03: Entrada inválida (tasa > 40 %) → mensaje que dice el rango válido.
- FA-04: Frase no reconocida → respuesta de la biblioteca con cita o "no encontré eso".
- FA-05: Sin conexión → la app muestra el error de red y conserva lo escrito.

## 8. Reglas De Negocio

| ID | Regla | Fuente | Ejemplo |
|---|---|---|---|
| BR-01 | Toda cifra la calcula una skill determinista; el agente no genera números | ADR-001 | El texto del agente cita la tarjeta, no inventa |
| BR-02 | Mensualidad con amortización francesa; tasa 0 % divide el saldo | SPEC BR-04 | 14,000 · 14.9 % · 120 → $225.01 |
| BR-03 | El costo de cierre se paga hoy y no se financia | SPEC BR-02/03 | Inversión = enganche + cierre |
| BR-04 | Upgrade: % inicial sobre el costo del upgrade; cuota de procesamiento hoy | SPEC BR-05…08 | → $355.91 |
| BR-05 | Inverso: valor = PV(mensualidad)/(1 − enganche) | SPEC BR-09…10 | 300/mes · 7 % · 48 → $17,897.23 |
| BR-06 | VPG = volumen/tours; cierre = ventas/tours; promedio = volumen/ventas | SPEC BR-18…20 | 25,000 y 2 tours → VPG 12,500 |
| BR-07 | Solo el admin cambia el catálogo; una skill inactiva no se ejecuta | Plan §3 | Rep → 403 |
| BR-08 | El modo cliente excluye comisión, notas y SPIFF | Plan §3, SPEC H-01 | — |
| BR-09 | Cada ejecución queda auditada con sala, usuario, skill y versión | ADR-001 | `skill_run` |
| BR-10 | Rangos válidos: precio > 0; enganche 0–99 %; plazo 1–360; tasa 0–40 % | Prototipo `finance.js` | Tasa 80 → error |

## 9. Diseno

**Estado del diseno:** Borrador
**Fuente del diseno:** Prototipo navegable `SalesAcademyVibes/prototypes/copiloto-rep` y `WIREFRAMES.md` W01, W02, W05, W06; prompts de Stitch en `STITCH.md`.

| Pantalla / componente | Existe en el diseno | Estados cubiertos (carga, vacio, error, exito) | Observaciones |
|---|---|---|---|
| Hoy (agente + briefing) | Sí (prototipo) | vacío, éxito, error de entrada | Falta estado de carga y sin red |
| Tarjeta de resultado | Sí | éxito | — |
| Modo cliente (hoja) | Sí | éxito | — |
| Catálogo por sala | Sí | vista rep y admin | — |
| Mi mes | Sí | vacío, éxito | — |

El PO debe aprobar el prototipo como diseño o pedir las pantallas Stitch (Q-11).

## 10. Datos, Contratos E Integraciones

| Elemento | Tipo | Cambio esperado | Responsable |
|---|---|---|---|
| `POST /api/agent/chat` | nuevo | `{ message }` → `{ skill, params, messages[] }` | Backend |
| `POST /api/skills/{id}/run` | nuevo | `{ params }` → tarjeta JSON; 403 si inactiva/sin rol | Backend |
| `GET/PATCH /api/skills/catalog` | nuevo | lista con estado; PATCH solo admin | Backend |
| Tabla `skill_catalog` | nuevo | sala, skill_id, activa, favoritas por usuario | Datos |
| Tabla `tour_event` | nuevo | usuario, fecha, tipo, monto, objeción | Datos |
| Tabla `skill_run` | nuevo | auditoría de ejecuciones | Datos |
| GoalSheet | lectura/escritura | meta del mes (Q-08) | Backend |
| Smart Agent provider | cambio | router delante del proveedor actual | Backend |

## 11. Criterios De Aceptacion

| ID | Origen | Criterio (Dado / Cuando / Entonces) | Tipo | Estado PO | Comentario PO |
|---|---|---|---|---|---|
| AC-01 | Propuesto IA | Dado un rep de S1, cuando envía "cotiza 20 mil con 30% a 120 meses al 14.9", entonces ve una tarjeta con mensualidad $225.01, inversión $6,000.00 y saldo $14,000.00 en menos de 2 s | positivo | Pendiente | |
| AC-02 | Propuesto IA | Dado una cotización, cuando toca "Mostrar al cliente", entonces ve 3 escenarios de enganche y ningún dato de comisión, notas ni SPIFF | positivo | Pendiente | |
| AC-03 | Propuesto IA | Dado que el rep envía "upgrade de 20 mil, costo 10 mil, 20% inicial, cuota 300, saldo 8 mil, 60 meses al 12", entonces la mensualidad es $355.91 | positivo | Pendiente | |
| AC-04 | Propuesto IA | Dado "puede pagar 300 al mes a 48 meses al 7", entonces el valor sugerido es $17,897.23 con enganche de la sala (30 %) declarado | positivo | Pendiente | |
| AC-05 | Propuesto IA | Dado una venta de 25,000 y una no venta en el mes, cuando pide "¿cómo voy?", entonces ve VPG $12,500, cierre 50 % y promedio $25,000 | positivo | Pendiente | |
| AC-06 | Propuesto IA | Dado que el admin desactiva SK-03 en S1, cuando un rep de S1 pide un upgrade, entonces recibe el mensaje de skill inactiva y no se ejecuta ni audita como éxito | negativo | Pendiente | |
| AC-07 | Propuesto IA | Dado un rep, cuando llama `PATCH /api/skills/catalog`, entonces recibe 403 | negativo | Pendiente | |
| AC-08 | Propuesto IA | Dado una tasa de 80 %, cuando se cotiza, entonces el mensaje indica el rango 0–40 % y no hay tarjeta | borde | Pendiente | |
| AC-09 | Propuesto IA | Dado "cotiza 20 mil" sin más datos, entonces la tarjeta usa los valores de la sala y lista lo que supuso | borde | Pendiente | |
| AC-10 | Propuesto IA | Dado cualquier ejecución de skill, entonces existe un registro en `skill_run` con sala, usuario, skill y versión | positivo | Pendiente | |
| AC-11 | Propuesto IA | Dado una frase no reconocida, entonces el agente responde desde la biblioteca con cita o indica que no encontró contenido | borde | Pendiente | |
| AC-12 | Propuesto IA | Dado los 34 vectores de `verify_formulas.py`, cuando corre la suite del backend, entonces todos pasan | positivo | Pendiente | |
| AC-13 | Propuesto Hermes | Dado una frase ambigua ("cerré la presentación con 30% de 20 mil") o incompleta, cuando la procesa el agente, entonces no registra tours ni cambia la meta; y un reintento del mismo registro no crea duplicados | negativo | Pendiente | |
| AC-14 | Propuesto Hermes | Dado una conversión a MXN, entonces la tarjeta muestra la fuente y la fecha del tipo de cambio; sin tipo válido, indica que falta y no inventa uno | borde | Pendiente | |

## 12. Escenarios De Prueba (Funcionales Y De Usuario)

| ID | AC cubiertos | Tipo | Precondicion | Pasos | Resultado esperado | Datos | Nivel de prueba | Origen | Estado PO |
|---|---|---|---|---|---|---|---|---|---|
| ESC-01 | AC-01, AC-02 | positivo | S1 con DS-01 | 1. Login rep1.s1. 2. Enviar la frase de cotización. 3. Mostrar al cliente | $225.01; 3 escenarios; sin datos internos | DS-01, DS-02 | e2e | Propuesto IA | Pendiente |
| ESC-02 | AC-03, AC-04 | positivo | S1 | 1. Enviar frase de upgrade. 2. Enviar frase de mensualidad | $355.91; $17,897.23 | DS-02 | integration | Propuesto IA | Pendiente |
| ESC-03 | AC-05 | positivo | S1 sin tours | 1. "vendí 25 mil, objeción dinero". 2. "no venta, objeción tiempo". 3. "¿cómo voy?" | VPG $12,500 · 50 % · $25,000 | DS-03 | e2e | Propuesto IA | Pendiente |
| ESC-04 | AC-06, AC-07 | negativo | S1 | 1. Admin desactiva SK-03. 2. Rep pide upgrade. 3. Rep llama PATCH | Mensaje de inactiva; 403 | DS-01 | integration | Propuesto IA | Pendiente |
| ESC-05 | AC-08, AC-09 | borde | S1 | 1. Cotizar con tasa 80. 2. "cotiza 20 mil" | Error de rango; supuestos declarados | DS-02 | unit | Propuesto IA | Pendiente |
| ESC-06 | AC-10 | positivo | S1 | 1. Ejecutar 3 skills. 2. Consultar `skill_run` | 3 registros correctos | DS-01 | integration | Propuesto IA | Pendiente |
| ESC-07 | AC-11 | borde | Biblioteca con DS-04 | 1. "¿qué le digo si no tiene tiempo?". 2. "receta de pastel" | Respuesta con cita; "no encontré eso" | DS-04 | integration | Propuesto IA | Pendiente |
| ESC-08 | AC-12 | positivo | — | Correr la suite de fórmulas | 34/34 PASS | DS-02 | unit | Propuesto IA | Pendiente |
| ESC-10 | AC-13 | negativo | S1 | 1. Enviar "cerré la presentación con 30% de 20 mil". 2. Enviar dos veces el mismo registro con la misma clave de idempotencia | 0 tours por el paso 1; 1 solo tour por el paso 2 | DS-03 | integration | Propuesto Hermes | Pendiente |
| ESC-11 | AC-14 | borde | S1 sin tipo de cambio configurado | 1. Cotizar. 2. "en pesos" | Mensaje de tipo faltante; con tipo configurado muestra fuente y fecha | DS-02 | integration | Propuesto Hermes | Pendiente |
| ESC-09 | AC-01, AC-05 | positivo | S1 con 3 reps | UAT: cada rep usa el guion del prototipo durante un turno | Sin errores; tiempo de registro ≤ 30 s | DS-01, DS-03 | UAT manual | Propuesto IA | Pendiente |

## 13. Datos De Prueba

| ID | Descripcion | Origen | Registros | Por que aplica (regla / AC) | Validado PO | Comentario PO |
|---|---|---|---|---|---|---|
| DS-01 | Usuarios simulados por sala (rep1–3, mgr1, admin) en `example.test` | Simulado IA | 15 | BR-07 / AC-06, AC-07, AC-10 | Pendiente | |
| DS-02 | 34 vectores de fórmulas observados en la referencia | Proporcionado (investigación) | 34 | BR-02…BR-05, BR-10 / AC-01…AC-04, AC-08, AC-12 | Pendiente | |
| DS-03 | Tours simulados: 1 venta 25,000 (dinero) + 1 no venta (tiempo), meta 60,000 | Simulado IA | 2 | BR-06 / AC-05 | Pendiente | |
| DS-04 | Biblioteca de ejemplo (5 textos) | Simulado IA | 5 | AC-11 | Pendiente | |

### DS-03 - Tours del mes

| tipo | monto | objeción | Nota |
|---|---|---|---|
| venta | 25,000 | dinero | Suma volumen y venta |
| no_venta | — | tiempo | Cuenta como tour sin venta |

Resultados esperados (verificados): VPG 25,000/2 = 12,500; cierre 1/2 = 50 %; promedio 25,000/1 = 25,000; faltan 60,000 − 25,000 = 35,000.

## 14. Mapa De Cobertura

| AC | Escenarios | Datos | Estado |
|---|---|---|---|
| AC-01 | ESC-01, ESC-09 | DS-01, DS-02 | cubierto |
| AC-02 | ESC-01 | DS-02 | cubierto |
| AC-03 | ESC-02 | DS-02 | cubierto |
| AC-04 | ESC-02 | DS-02 | cubierto |
| AC-05 | ESC-03, ESC-09 | DS-03 | cubierto |
| AC-06 | ESC-04 | DS-01 | cubierto |
| AC-07 | ESC-04 | DS-01 | cubierto |
| AC-08 | ESC-05 | DS-02 | cubierto |
| AC-09 | ESC-05 | DS-02 | cubierto |
| AC-10 | ESC-06 | DS-01 | cubierto |
| AC-11 | ESC-07 | DS-04 | cubierto |
| AC-12 | ESC-08 | DS-02 | cubierto |
| AC-13 | ESC-10 | DS-03 | cubierto |
| AC-14 | ESC-11 | DS-02 | cubierto |

## 15. Requisitos No Funcionales

| ID | Atributo | Requisito medible |
|---|---|---|
| NFR-01 | rendimiento | Respuesta del agente p95 < 2 s con 30 usuarios concurrentes por sala |
| NFR-02 | exactitud | 34/34 vectores en la suite de CI; ningún cambio de fórmula sin prueba |
| NFR-03 | auditoría | 100 % de ejecuciones con registro en `skill_run` |
| NFR-04 | móvil | Pantallas usables de 360 a 430 px |
| NFR-05 | accesibilidad | Foco visible y navegación por teclado en la versión web |

## 16. Seguridad, Privacidad Y Casos Borde

- **Datos sensibles involucrados:** desempeño del rep (tours, montos). Sin datos personales del cliente en el MVP.
- **Permisos y abuso:** el catálogo solo lo cambia el admin; las skills validan rol y activación en el servidor, no en la app.
- **Casos borde:** sin tours (KPIs en 0, sin dividir entre cero); tasa 0 %; montos con formato "20 mil", "25k", "$18,500"; skill inactiva; frase ambigua.
- **Mensajes de error al usuario:** "La tasa debe estar entre 0 y 40 %."; "X no está activa en tu sala…"; "No encontré eso en la biblioteca de tu sala."

## 17. Puntos Abiertos

| ID | Tipo | Categoria | Pregunta o supuesto | Recomendacion IA | Impacto si se decide mal | Bloquea | Para quien | Respuesta / decision | Estado |
|---|---|---|---|---|---|---|---|---|---|
| Q-01 | Pregunta | Producto | ¿"Agente tipo Dot" implica memoria personal del rep? | Sin memoria de largo plazo en el MVP; contexto solo de la sesión | Riesgo de privacidad y alcance | No | PO | | Abierta |
| Q-02 | Pregunta | Permisos | ¿El catálogo lo activa el admin de la sala? | Sí; rep fija favoritas | Rediseño de permisos | Si | PO | | Abierta |
| Q-03 | Pregunta | Datos | ¿Moneda principal USD con MXN? | Sí, tipo manual por sala | Cifras confusas | No | PO | | Abierta |
| Q-04 | Diferida | Comercial | Precio de skills Pro | Resolver tras el piloto | Ninguno técnico | No | PO | | Diferida |
| Q-05 | Diferida | Arquitectura | Modelo de lenguaje externo | ADR propio tras medir el MVP | — | No | PO | | Diferida |
| Q-06 | Pregunta | Planeación | ¿Entra al piloto de 30 días o después de estabilizar S1? | Después: S1 estable → MVP con bandera por sala | Riesgo en el arranque del piloto | No | PO | | Abierta |
| Q-07 | Pregunta | Arquitectura | ¿Se aprueba ADR-001 (router por reglas, skills deterministas, manifiesto)? | Aprobar | Re-trabajo del backend | Si | PO | | Abierta |
| Q-08 | Pregunta | Integración | ¿La meta del mes vive en el GoalSheet existente? | Sí, una sola fuente | Doble fuente de verdad | Si | PO | | Abierta |
| Q-09 | Pregunta | Contenido | ¿Quién aprueba la biblioteca de cada sala? | El líder comercial del club (igual que Q-05 del piloto) | Respuestas no autorizadas | Si | PO / club | | Abierta |
| Q-10 | Pregunta | Reglas | ¿Upgrade, exit y pendiente cuentan como tour/venta como propone el prototipo? | Confirmar con el manager de la sala | KPIs distintos a la práctica de la sala | Si | Manager | | Abierta |
| Q-12 | Pregunta | Seguridad | ¿Desactivar una skill debe bloquear de inmediato sesiones abiertas y llamadas directas? (Hermes Q18) | Sí: la validación vive en el servidor en cada ejecución | Una skill desactivada sigue usable | No | PO | | Abierta |
| Q-13 | Pregunta | Datos | ¿Cuál es la fuente autorizada del tipo de cambio, su vigencia y quién la actualiza? (Hermes Q13) | Tipo manual diario por admin de sala, con fecha visible | Cotizaciones en pesos desactualizadas | No | PO | | Abierta |
| Q-11 | Pregunta | Diseño | ¿Se aprueba el prototipo como diseño o se piden pantallas Stitch? | Aprobar el prototipo con ajustes; Stitch solo para modo cliente | Retraso de diseño | No | PO | | Abierta |

## 18. Dependencias Y Riesgos

| Tipo | Descripcion | Mitigacion | Responsable |
|---|---|---|---|
| dependencia | PILOTO-3S-001 en producción (S1) | No liberar antes de S1 estable | PO |
| riesgo | El router no entiende frases reales de la sala | Medir % resuelto; ampliar gramática con frases reales | Backend |
| riesgo | KPIs no coinciden con cómo mide la sala | Q-10 antes de construir | PO |
| dependencia | Contenido de biblioteca aprobado | Q-09 | PO / club |

## 19. Estrategia De Pruebas TDD

| Escenario | Prueba automatizada prevista | Nivel | Datos (fixture) |
|---|---|---|---|
| ESC-08 | `test_finance_vectors` (34 casos parametrizados) | unit | DS-02 |
| ESC-05 | `test_quote_validation`, `test_router_defaults` | unit | DS-02 |
| ESC-02 | `test_skill_upgrade_api`, `test_skill_reverse_api` | integration | DS-02 |
| ESC-04 | `test_catalog_permissions`, `test_inactive_skill_blocked` | integration | DS-01 |
| ESC-06 | `test_skill_run_audit` | integration | DS-01 |
| ESC-07 | `test_library_fallback` | integration | DS-04 |
| ESC-10 | `test_ambiguous_no_write`, `test_tour_idempotency` | integration | DS-03 |
| ESC-11 | `test_fx_source_and_missing` | integration | DS-02 |
| ESC-01, ESC-03 | `copiloto.spec` (Playwright) | e2e | DS-01, DS-03 |

## 20. Documentacion A Producir

- [ ] Guía de uso del copiloto para reps (1 página, basada en el guion del prototipo).
- [ ] Guía del admin: activar skills y valores por defecto de la sala.
- [ ] Documentación de API de `/api/agent/chat` y `/api/skills`.
- [ ] Notas de versión.

## 21. Carril Recomendado

- **Carril:** Contrato CP0-CP5
- **Razon:** Multi-capa (backend, datos, app móvil, web admin), contratos de API nuevos, esquema de datos nuevo, permisos por rol y estimación > 2 días.
- **Estimacion gruesa:** L (~18 días-persona con IA y harness; ver sección 24)
- **Siguiente paso:** Aprobación del PO y de ADR-001 → `/intake` citando esta historia

## 22. Aprobacion Del Product Owner

**Decision del PO:** Pendiente
**Aprobado por (nombre y rol):** `<nombre y rol>`
**Fecha de aprobacion:** `<yyyy-mm-dd>`
**Evidencia de aprobacion (cita y canal):** `<"texto exacto" - canal>`
**Version aprobada:** `<v1>`

## 23. Revisiones

| Version | Fecha | Cambio | Motivo |
|---|---|---|---|
| v1 | 2026-11-06 | Creación | Ejecución del plan Copiloto del Rep; prototipo validado (commit 51b0b00) |
| v1 | 2026-11-06 | Aportes de Hermes: AC-13, AC-14, ESC-10, ESC-11, Q-12, Q-13 | Revisión de Hermes (confianza baja; sin acceso al repo) |

## 24. Estimacion Para Cotizacion

**Modo de estimacion:** con IA y harness

### Inventario de cambios (base de la estimacion)

| Componente | Cambio concreto | Evidencia |
|---|---|---|
| Backend | Módulo `skills/` (finance, kpis, cards) portado del prototipo; router; endpoints chat/run/catalog; auditoría | ADR-001; `prototypes/copiloto-rep/src/` |
| Datos | Tablas `skill_catalog`, `tour_event`, `skill_run`; integración con GoalSheet | Sección 10; Q-08 |
| App móvil | Pantallas Hoy, tarjetas, modo cliente, catálogo, Mi mes en `apps/mobile` | Prototipo; W01, W02, W05, W06 |
| Web admin | Catálogo por sala y valores por defecto | Sección 6 |
| Pruebas | 34 vectores, router, API, e2e | Sección 19 |

- **Version de la historia estimada:** v1
- **Readiness al estimar:** EN REVISION
- **Puntos abiertos bloqueantes al estimar:** 5 (Q-02, Q-07, Q-08, Q-09, Q-10)

| Actividad | Rol | Optimista (h) | Probable (h) | Pesimista (h) | PERT (h) | Nota / supuesto |
|---|---|---|---|---|---|---|
| Refinamiento y analisis | PO + agente | 4 | 6 | 10 | 6.3 | Cerrar Q bloqueantes |
| Diseno UX/UI | Diseño | 6 | 10 | 16 | 10.3 | Ajustes al prototipo; modo cliente en Stitch |
| Desarrollo backend | Backend | 16 | 24 | 36 | 24.7 | Skills, router, endpoints, auditoría |
| Desarrollo datos | Backend | 4 | 6 | 10 | 6.3 | Tablas y migración SQLite |
| Desarrollo app movil | Frontend | 20 | 30 | 44 | 30.7 | Expo: Hoy, tarjetas, modo cliente, catálogo, Mi mes |
| Desarrollo web admin | Frontend | 4 | 6 | 10 | 6.3 | Catálogo por sala |
| Pruebas automatizadas (TDD) | QA + dev | 10 | 14 | 22 | 14.7 | ESC-01…ESC-08 |
| QA funcional | QA | 4 | 6 | 10 | 6.3 | — |
| Prueba de usuario (UAT) con PO | PO | 3 | 4 | 8 | 4.5 | ESC-09 en S1 |
| Documentacion | Tech writer | 3 | 4 | 6 | 4.2 | Sección 20 |
| Despliegue y release | DevOps | 3 | 5 | 8 | 5.2 | 3 instancias, bandera por sala |
| Gestion y coordinacion | PM | 4 | 6 | 10 | 6.3 | — |

- **Total PERT:** 125.8 h
- **Contingencia:** 15 % (10 % base + 1 % × 5 puntos bloqueantes)
- **Total con contingencia:** 144.7 h - **Rango:** 81 a 190 h (sin contingencia)
- **Duracion estimada y equipo:** ~18 días-persona; con 1 dev full-stack + QA parcial con IA y harness, 3–4 semanas calendario.
- **Supuestos de la cotizacion:** PILOTO-3S-001 ya en producción; sin modelo de lenguaje externo; prototipo aceptado como base de diseño; meta en GoalSheet.
- **Exclusiones:** skills de fase 2 y 3, datos personales del cliente, cobro de skills Pro, apps en tiendas.
- **Riesgos que cambian el precio:** Q-10 cambia reglas de KPIs (+4–8 h); diseño completo en Stitch (+8–16 h); modelo de lenguaje (ADR propio, fuera de esta estimación).
- **Re-estimar si:** se responde Q-02, Q-07, Q-08 o Q-10 distinto a la recomendación, o cambia el alcance de skills del MVP.
- **Validez de la estimacion:** 30 días o hasta la siguiente versión de la historia.
