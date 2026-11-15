# Nueva webapp Sales Academy · diseño piloto

Solicitud: crear una nueva app con diseño y funciones nuevos, reutilizando vcsAcademyMobile. Plataforma confirmada por el usuario: «Webapp adaptable a móvil y escritorio (recomendado para revisar y usar de inmediato)».

## Alcance
Nueva entrada frontend/pilot.html; mantiene index.html y Expo. React/Vite existentes, sin nuevas dependencias de producción. Navegación Home/Roadmap/AI Coach/Bóveda/Perfil; espacios de equipo y administración según roles existentes. Paleta oscura con acento verde y variante clara; layout adaptable.

## Contratos reutilizados
Se reutiliza doc/specs/wl-sales-academy/07-API-SPEC.md contrastado con backend/app/main.py. No se crean APIs ni esquemas. Sesiones y permisos corresponden al servidor.
- Auth: login/logout, me, demo-users, forgot/reset/change-password.
- Roadmap: steps, detail, complete; IDs y orden canónicos del servidor.
- Goal Sheet: today/history/save/metrics, reminders/upcoming. Un registro por usuario y fecha (upsert). No añadir canal Agencia/Socios al payload: no existe en este contrato.
- Coach: smart-agent/chat y public-chat; proveedor local existente, sin prometer un LLM externo.
- Roleplay: scenarios, sessions/create/turn/complete, submissions/create/mine/pending/review.
- Recursos: catálogo y detalle con has_access.
- Equipo: team-dashboard, certification readiness/decisions.
- Administración: usuarios/estado/permisos/invitación, recursos y auditoría.

## Funciones locales adicionales
Notebook y Diary guardan texto por usuario en este navegador. No compartir ni sincronizar ni enviar automáticamente a IA. Exportar JSON; eliminar con confirmación. Meta mensual local; Home calcula avance con el historial real. Calculadoras de cierre y VPG reutilizan las métricas del dominio, sin fórmulas financieras nuevas. Agenda muestra seguimientos existentes; no inventa tours de otro backend.

## Criterios de aceptación
1. Acceder, recuperar y cerrar sesión; aislar datos al cambiar de usuario.
2. Home con métricas reales filtradas por día/semana/mes y estado vacío; guardar Goal Sheet cambia Home y persiste tras recarga.
3. Roadmap 11 pasos, detalle y progreso guardado.
4. Coach con respuesta, escenarios y roleplay con intercambio, finalización y envío a revisión; sin grabación ficticia.
5. Bóveda y recursos con restricciones del servidor; Notebook/Diary con persistencia local declarada.
6. Gerente revisa entregas y decisiones de certificación; admin administra contenido y usuarios según contratos existentes.
7. Estados cargando/error/reintento y controles deshabilitados durante mutaciones.
8. 390px y escritorio sin recortes del documento; navegación teclado y etiquetas de formularios.
9. Compilación de ambas entradas, pruebas dominio y navegador con backend real y DB efímera.

## Límites explícitos
Sin pagos, OAuth, registro público, licencias nuevas, audio real, notificaciones push ni despliegue productivo. Los flujos de estos servicios no tienen contrato operativo en este repo. El editor de recursos es admin; el rol gerente no recibe permisos nuevos. Las lecciones no simulan video si el backend solo devuelve metadatos. Los datos demo son sintéticos y no son estadísticas reales de la organización.

## Repo Paths
frontend/pilot.html; frontend/vite.config.js; frontend/src/pilot/; work/features/2026-11-13-pilot-webapp/.
