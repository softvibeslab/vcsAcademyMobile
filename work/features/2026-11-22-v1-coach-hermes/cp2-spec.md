# CP2 · Coach V1 compacto conectado a Hermes

**Status:** approved. Aprobado por Roger mediante «si» en conversación, tras presentar esta SPEC, antes de código.
**Fecha:** 2026-11-22
**Producto:** aisalesv1.softvibes.pro
**Accountable:** Roger, Product Owner
**Capas:** frontend, backend, infra. Sin migración de datos.

## 1. Experiencia propuesta

Una cabecera pequeña, Conversar / Roleplay, conversación que ocupa el espacio disponible y campo de mensaje visible sobre la navegación. Se conserva el selector de tema y el enlace a Evaluaciones.

```text
Sales Academy                   agenda · tema
AI Coach                         Evaluaciones
[ Conversar ] [ Roleplay ]

¿Qué quieres preparar hoy?
[Presentación] [Objeción] [Mi pitch]

                  Mensaje del representante
Respuesta breve del Coach
[Siguiente acción]                Fuentes ▾

[Escribe tu mensaje…                  Enviar]
Home · Roadmap · AI Coach · Bóveda · Perfil
```

REQ-01: eliminar el encabezado promocional y la duplicación de cabeceras en Coach. Avatar pequeño, saludo de una línea y tres sugerencias iniciales. No agregar decoración grande.

REQ-02: layout flexible con unidades dinámicas de viewport. La conversación tiene desplazamiento interno y el compositor permanece accesible. Sin scroll horizontal a 360 px. Validar 360×800, 390×844 y 1440×900, light/dark. Texto de entrada de 16 px y controles principales de al menos 44 px; safe areas. Al reducir la altura por teclado, el historial cede espacio; no ocultar el campo por alturas mínimas rígidas.

REQ-03: mostrar inmediatamente el mensaje enviado y un estado «Coach está respondiendo». Un solo envío en curso. Error recuperable sin perder el mensaje ni duplicar turnos; conservar borradores por modo. Al llegar respuesta, mostrar el último turno sin impedir leer mensajes anteriores. Pestañas, foco y avisos accesibles.

Si la persona cambió de modo durante la espera, la respuesta pertenece al hilo original y no borra otro borrador. El autoscroll ocurre solo si sigue cerca del final; quien está leyendo atrás conserva su posición y puede ir al último mensaje con un control. Reintentar reutiliza el turno pendiente, no agrega otro mensaje optimista.

REQ-04: conservar inicio, conversación, finalización, puntuación y envío a evaluación de Roleplay, escenarios restringidos y permisos. El cambio de proveedor aplica a Conversar; no se promete IA nueva en Roleplay.

## 2. Identidad y respuestas

REQ-05: configurar `sales-academy-coach-v1`, perfil aislado de entrenamiento basado en la identidad del Copiloto de Sales Academy existente. Español claro, coach de representantes y líderes, venta consultiva, preparación de presentación, objeciones y siguiente paso. No es el asesor comercial ni un perfil administrativo.

REQ-06: respuesta normalmente de 30–90 palabras, una recomendación concreta y como máximo una pregunta. Si hace falta mayor profundidad, permitir leer el texto completo sin truncar negaciones ni cambiar su significado. Renderizar texto, no HTML del modelo.

REQ-07: el backend envía el rol permitido de la cuenta y contenido que `smart_agent_knowledge(user)` ya expone: descripciones visibles del Blueprint (incluidos avances de lecciones bloqueadas que la UI muestra) y recursos abiertos según `has_resource_access`. No ampliar ese acceso ni alterar la función compartida del chat público. El contexto recuperado se acota a 12 000 caracteres y se identifica como extractos. No consultar/adjuntar automáticamente correo, contraseña, tokens, notas personales, datos de pareja/tour ni información de otra cuenta. El texto que la persona escriba voluntariamente en el chat sí se envía al proveedor; no se promete una redacción semántica automática. Las políticas y cifras no respaldadas no se inventan.

REQ-08: usar el historial explícito de la conversación actual. Roles permitidos user/assistant; mensaje nuevo no vacío de hasta 1 200 caracteres. Cada contenido de historial es texto no vacío de hasta 6 000 caracteres. La entrada admite hasta 40 mensajes estándar o 20 pares legacy. Al preparar la inferencia, conservar los últimos 12 mensajes dentro de un total de 12 000 caracteres, retirando turnos antiguos completos, nunca truncando el mensaje actual. El frontend ya limita lo que envía. El cliente no puede elegir perfil, instrucciones de sistema, herramientas ni proveedor.

Compatibilidad: la app nativa actual envía pares `{user,assistant}` en orden más reciente primero; el servidor los normaliza al orden cronológico antes de aplicar límites. La web usa `{role,content}` en orden cronológico. Rechazar formatos mezclados, roles system y campos/valores inválidos con422; normalizar no habilita instrucciones de sistema. No modificar la app nativa en este alcance.

## 3. Contrato público y transporte

Se conserva `POST /api/smart-agent/chat`, su sesión y permiso `function:coach`, y el sobre `{success,data}` existente.

Entrada existente: `{message, mode, conversation_history, module_area?}`. Los modos actuales se conservan; esta UI usa `general_coach`. Las validaciones/límites anteriores se aplican en servidor. Un mensaje/historial mal formado se rechaza con422 sin llamar al proveedor. El historial vacío es válido y no cambia el significado del modo.

Salida conserva `response`, `citations`, `recommended_actions`, `risk_flags`. Añade `provider: "hermes" | "local"` para identificar el motor que realmente respondió; nunca se devuelve `hermes` si falló la inferencia. `confidence` conserva el valor numérico histórico para local y se omite para Hermes: es opcional en el cliente nativo y no hay una puntuación de certeza respaldada para inferencia. La UI no muestra ese porcentaje.

`POST /api/smart-agent/public-chat` mantiene su proveedor local: este cambio no activa inferencias anónimas. El audit de chat autenticado registra el proveedor efectivo sin guardar mensajes ni credenciales.

REQ-09: sugerencias y acciones de navegación proceden de un catálogo permitido por la aplicación. Reutilizar `recommended_actions`; descartar rutas desconocidas. Las fuentes se muestran en un desplegable compacto y provienen del conocimiento autorizado, sin fabricar citas ni URLs.

Conservar objetos `{label,route,params}`. Mapeo permitido de esta UI: Roadmap → #roadmap; RoleplayLive → #roleplay; GoalSheet → #goalsheet; Resources → #resources. Los parámetros no se concatenan como URL. Otros destinos no se ejecutan; no se añaden nuevas rutas de producto. Las fuentes corresponden al material seleccionado y adjuntado para ese turno, etiquetadas como «Material consultado», sin afirmar que todo el catálogo respalda la respuesta. El modelo no puede crear acciones ejecutables.

REQ-10: un fallo de Hermes produce un error recuperable en español y «Reintentar». Respuesta503 con `detail:{code:"coach_unavailable",message}` para fallo/timeout y429 con `detail:{code:"coach_busy",message}` para capacidad ocupada. La credencial inválida del proveedor nunca se transmite como401 al navegador, porque ese código está reservado a la sesión de la app. No disfrazar la respuesta local como inferencia activa ni mostrar una insignia permanente de conexión por un health-check. Si la configuración mantiene proveedor local, declararlo como orientación local.

Transporte interno: reutilizar el patrón de bridge privado de Hermes con `{messages:[{role,content}]}` → `{reply}`. Instancia y perfil propios para V1, sin cambiar el servicio del asesor. Token solo en servidor, destino fijo configurado, inferencia aislada por petición, herramientas/memoria compartida deshabilitadas, timeout acotado y máximo dos inferencias concurrentes conforme al bridge existente. El navegador solo habla con su API same-origin. Red/aislamiento y timeouts base en [ADR-001](adr-001-isolated-coach.md), con destino actualizado por instrucción explícita del PO en [ADR-002](adr-002-remote-hermes.md).

**Ajuste de alcance aprobado durante implementación:** el PO eligió «Conectar Coach a Hermes en 2.25.231.154» tras confirmar que la web se sirve desde76.13.231.12. Por tanto, el perfil y la inferencia residen en2.25.231.154. La API V1 conserva su endpoint local mediante túnel SSH privado, llave exclusiva restringida y hostkey fijada; no se abre un endpoint Hermes a Internet. No se migra la web ni su base.

## 4. Publicación, datos y seguridad

REQ-11: publicar frontend V1 y adaptación mínima de su API sobre la versión legacy comprobada; no usar el backend V5 como sustituto. Conservar la base demo independiente, cuentas y permisos. Releases versionadas con reversión de web/API/configuración; comprobar que V5 mantiene su HTML, configuración y contenedor.

NFR-01: no persistir nuevas conversaciones, no migraciones ni tablas de negocio. Credenciales y diagnósticos sensibles no aparecen en frontend, repo ni evidencia.

NFR-02: aplicar el control de acceso existente antes de obtener conocimiento o llamar a Hermes. Identidad/permisos solo del servidor. Pruebas sintéticas de aislamiento, inyección de roles, fallo y timeout.

NFR-03: no se considera completada la conexión hasta una respuesta real sintética de Hermes y un segundo turno que demuestre continuidad. No enviar datos reales para QA. La reautenticación la realiza el titular sin compartir claves en el chat.

NFR-04: no añadir dependencias frontend; contraste de texto normal ≥4.5:1, foco visible y contenido largo accesible. Emulación móvil registrada como tal, sin afirmar prueba en hardware físico.

## 5. Criterios de aceptacion y pruebas

| ID | Dado / cuando / entonces | Prueba prevista |
|---|---|---|
| AC-01 | Al abrir Coach en los tamaños definidos, campo y navegación son visibles; el chat aprovecha el alto y respeta light/dark | coach_viewport |
| AC-02 | Al enviar, retrasar, fallar y reintentar, se conserva el texto y existe una sola solicitud/turno | coach_send_states |
| AC-03 | Al usar Conversar y Roleplay, se mantienen borradores y todas las acciones de práctica/evaluación | coach_roleplay_regression |
| AC-04 | Al preguntar con historial válido, Hermes recibe solo rol, fuentes autorizadas y turnos acotados | test_hermes_context |
| AC-05 | Sin permiso, con roles/entrada inválidos o proveedor caído, no se fuga contexto ni se finge éxito | test_hermes_boundaries |
| AC-06 | Una inferencia sintética real seguida de otra usa la identidad de coach y mantiene contexto | live_coach_smoke |
| AC-07 | Al publicar, V1 sirve el build esperado y V5 mantiene su baseline | isolated_release_smoke |

## 6. Gate y dependencia conocida

- [x] Alcance, interfaz, contrato y pruebas propuestos antes de código.
- [x] Aprobación explícita de esta SPEC y del perfil aislado de entrenamiento: «si», conversación del 2026-11-22.
- [x] Verificación real del proveedor de Hermes en el servidor elegido: dos turnos HTTP200 con continuidad; no hizo falta reautenticar2.25.231.154.

El diagnóstico inicial401 correspondía a76.13.231.12. Tras el cambio de destino pedido por el PO, el exportador del runtime actual de2.25.231.154 produjo una credencial válida. Se verificaron dos turnos reales con continuidad y se canceló el intento OAuth innecesario. La publicación requiere además una inferencia real a través del túnel y la API V1.
