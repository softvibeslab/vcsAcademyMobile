# CP3 · Plan de implementación

**Status:** implementado y publicado; T01–T06 y ajuste final de contraste verificados.

## Repo Paths

| Área | SPEC → código / evidencia |
|---|---|
| Interfaz | frontend/src/pilot/Coach.jsx, App.jsx y CSS acotado al Coach |
| Proveedor | backend/app/smart_agent.py y adaptador Hermes separado |
| API legacy | backend/app/main.py: ChatIn y smart_agent_chat |
| Operación | backend/deploy/coach-v1 y backend/deploy/coach-tunnel; ADR-001/002; deploy-release.py de esta feature |
| Pruebas | backend/tests, navegador aislado y evidence de esta feature |

## Tareas en pares

| Tarea | Test primero | Implementación después de RED |
|---|---|---|
| T01 | Reproducir compositor fuera de viewport, contraste y geometría inicial | Compactar cabeceras, transcript flexible, compositor y temas |
| T02 | Envío demorado, fallo, reintento, doble toque, cambio de modo | Estados de chat, borradores y continuidad visual |
| T03 | Proveedor fake: historial permitido, límites, fuentes por rol, fallos y timeout | Adaptador Hermes y uso del historial en endpoint existente |
| T04 | Bridge aislado: perfil correcto, ausencia de herramientas/memoria y credenciales en respuestas | Instancia privada con identidad coach sin tocar asesor comercial |
| T05 | Flujo Roleplay/evaluación y regresión de módulos | Ajustes mínimos si aparecen regresiones |
| T06 | Build hash, health, inferencia real sintética y baseline V5 | Release V1 reversible y verificación pública |

Excepcion TDD prevista: estilos puramente visuales se validarán con geometría, capturas y contraste antes/después. Los comportamientos nuevos mantienen RED → GREEN.

## Gates previstos

- verify-story tras aprobación real del PO, nunca inventar la cita.
- Backend legacy + suite del perfil; frontend/modelos y builds V1/V5.
- Chromium Android 360×800 y WebKit iPhone 390×844; desktop 1440×900; light/dark y viewport reducido.
- TRUST 5 y verify-governance --strict antes del cierre.
- Commit/push y publicación solo tras validaciones del alcance autorizado.

## Ejecución

T01–T06 ejecutadas con evidencia en CP4. Cambio de destino autorizado durante el desarrollo: perfil Hermes en2.25.231.154 y túnel privado desde76.13.231.12. El intento OAuth se canceló al verificar que las credenciales actuales del servidor elegido eran válidas; consulta fresca después del aviso del usuario e inferencia pública confirmaron disponibilidad.
