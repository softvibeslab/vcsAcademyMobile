# Historia · Coach V1 compacto con Hermes

**Readiness:** LISTA
**ID:** HU-V1-COACH-HERMES
**Solicitante:** Roger
**Product Owner (aprueba):** Roger
**Fecha:** 2026-11-22
**Version:** v1

## Resumen y problema

Como representante o líder con acceso a AI Coach, quiero conversar en una pantalla compacta con contexto y orientación de entrenamiento, para preparar mi siguiente interacción sin perder tiempo en espacios vacíos o respuestas locales genéricas.

Solicitud textual del usuario: «mejora el modulo de https://aisalesv1.softvibes.pro/#coach para que sea mas intuituvi sin tnto espeacio optimizando el chat con el couch y conectalo al hermes con el perfil».

## Fuentes de contexto

**Modo de contexto:** workspace y auditoría técnica de VPS, sin consultar contenido privado con el modelo.

| Fuente | Consultada | Aporte |
|---|---|---|
| frontend/src/pilot/Coach.jsx y CSS; captura legacy mobile-coach.png | Sí | Duplicación de cabeceras, compositor fuera de primer viewport y contraste del mensaje user |
| backend/app/main.py y smart_agent.py | Sí | Proveedor local, historial ignorado y conocimiento filtrado por acceso |
| VPS V1 y bridge asesor | Sí, solo lectura e inferencia sintética | Archivos legacy coinciden; health200 e inferencia fallida por401 |
| Contratos históricos advisor y hermes-contexto | Sí | Patrón aislado y personalidad del Copiloto |

## Alcance y usuarios

Interfaz de Conversar/Roleplay y conexión de Conversar con Hermes. Cuentas/roles ya autorizados por function:coach; biblioteca y Blueprint solo según permisos existentes. Fuente de personalidad: Copiloto existente; se propone perfil aislado sales-academy-coach-v1.

No se añaden acceso a datos de pareja/tour, persistencia del chat, voz, modelo nuevo para Roleplay ni cambios en V5. Publicación V1 reversible.

## Flujos y reglas

1. Abrir AI Coach con tema actual; ver saludo breve y tres accesos de preparación.
2. Escribir o elegir sugerencia; mensaje visible al enviar, indicador de respuesta y prevención de doble envío.
3. Recibir orientación breve con historial; acciones/fuentes autorizadas cuando correspondan.
4. Ante fallo: error claro, texto recuperable y reintento explícito.
5. Alternar Roleplay conservando el borrador; terminar práctica y enviarla a evaluación como hoy.

Hermes no confirma precios, datos, resultados ni acciones que no estén respaldados. No hay inferencia al cargar la página. La reautenticación pendiente no se confunde con conexión exitosa.

## Diseno

**Estado del diseno:** Aprobado
**Fuente del diseno:** wireframe de work/features/2026-11-22-v1-coach-hermes/cp2-spec.md, sección1.

Cabecera compacta + pestañas + transcript flexible + compositor visible + navegación existente. Colores de tema, 16px en entrada, targets44px. Estados vacío/enviando/respuesta/error y Roleplay incluidos.

## Datos, contratos e integraciones

Endpoint existente /api/smart-agent/chat con historial validado y proveedor real en metadatos. Transporte privado /chat con instancia/perfil propios. El navegador no proporciona system prompt, secretos ni identidad del proveedor. Datos de QA exclusivamente simulados.

## Criterios de aceptacion

| ID | Origen | Criterio | Tipo | Estado PO | Comentario PO |
|---|---|---|---|---|---|
| AC-01 | Propuesto IA | Compositor/navegación visibles en viewport móvil y desktop; light/dark legibles | positivo | Aceptado | CP2 REQ01–02 |
| AC-02 | Propuesto IA | Envío y reintento conservan texto sin duplicados | negativo | Aceptado | CP2 REQ03 |
| AC-03 | Propuesto IA | Roleplay/evaluaciones/permisos y borradores conservados | regresion | Aceptado | CP2 REQ04 |
| AC-04 | Propuesto IA | Hermes recibe identidad coach, historial acotado y conocimiento permitido | positivo | Aceptado | CP2 REQ05–08 |
| AC-05 | Propuesto IA | Permisos/entrada inválida/fallo no exponen datos ni fingen inferencia | negativo | Aceptado | CP2 REQ09–10 |
| AC-06 | Propuesto IA | Dos turnos reales sintéticos prueban identidad y continuidad | positivo | Aceptado | CP2 NFR03 |
| AC-07 | Propuesto IA | Publicación V1 corresponde al build y V5 permanece intacto | regresion | Aceptado | CP2 REQ11 |

## Escenarios de prueba

| ID | AC cubiertos | Tipo | Precondicion | Pasos | Resultado esperado | Datos | Nivel de prueba | Origen | Estado PO |
|---|---|---|---|---|---|---|---|---|---|
| ESC-01 | AC-01 | positivo | Sesión demo local | Abrir light/dark, medir y escribir con viewport reducido | Campo visible, contraste y lectura accesible | DS-01 | e2e | Propuesto IA | Aceptado |
| ESC-02 | AC-02 | negativo | Proveedor fake con demora/error | Enviar dos veces, fallar, reintentar | Un envío y texto conservado | DS-01 | e2e | Propuesto IA | Aceptado |
| ESC-03 | AC-03 | regresion | API demo temporal | Cambiar modo, iniciar, terminar y enviar práctica | Flujos y restricciones previas intactos | DS-01 | e2e | Propuesto IA | Aceptado |
| ESC-04 | AC-04, AC-05 | borde | Fake bridge y cuentas de distinto acceso | Pregunta/historial válidos e inválidos, fallo/timeout | Contexto permitido, límites y error sanitizado | DS-02 | integration | Propuesto IA | Aceptado |
| ESC-05 | AC-06 | positivo | Proveedor reautenticado | Dos turnos sin datos reales | Respuesta de coach con continuidad | DS-02 | UAT manual | Propuesto IA | Aceptado |
| ESC-06 | AC-07 | regresion | Release candidata V1 | Comparar artefactos/salud y baselineV5 | Release correcta y aislamiento mantenido | DS-01 | integration | Propuesto IA | Aceptado |

## Datos de prueba

| ID | Descripcion | Origen | Valores | Uso | Validado PO |
|---|---|---|---|---|---|
| DS-01 | Usuario y práctica sintéticos locales | Simulado IA | Cuenta demo, objeción inventada y veinte turnos ficticios | UI/Roleplay | Si |
| DS-02 | Historial/contexto sintéticos | Simulado IA | «Quiero practicar la objeción necesito pensarlo»; siguiente «Dame una pregunta para ese caso»; roles prohibidos y contenido largo ficticio | Hermes y errores | Si |

## Puntos abiertos

| ID | Tipo | Tema | Punto | Propuesta | Responsable | Bloquea | Estado |
|---|---|---|---|---|---|---|---|---|
| Q-01 | Pregunta | CP2 | Aprobar alcance/perfil/diseño propuestos | Perfil aislado de coach, sin modificar asesor comercial | PO | Si | Respondida |
| Q-02 | Pregunta | Operación | El proveedor de76 devolvía401 | Resuelto al elegir2.25: credencial actual válida, dos turnos reales correctos; intento OAuth cancelado | Titular | No | Respondida |
| Q-03 | Pregunta | Destino Hermes | Dos instalaciones distintas detectadas | El PO eligió «Conectar Coach a Hermes en 2.25.231.154»; túnel privado manteniendo web en76 | PO | Si | Respondida |

## Aprobacion

**Decision del PO:** Aprobada
**Aprobado por:** Roger, Product Owner
**Fecha de aprobacion:** 2026-11-22
**Evidencia de aprobacion:** «si», conversación, respuesta directa a la solicitud de aprobación de esta SPEC y su perfil aislado.

La SPEC, diseño, criterios y datos propuestos se presentaron al PO antes de su respuesta «si». Esa aprobación autoriza la implementación y publicación del alcance descrito; no confirma que la reautenticación haya ocurrido.
