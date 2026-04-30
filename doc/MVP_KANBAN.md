# VCSA MVP Kanban

## Backlog

- [ ] Definir alcance final del MVP
- [ ] Unificar documentacion principal del proyecto
- [ ] Revisar pantallas no MVP y ocultarlas
- [ ] Revisar readiness comercial de demo data
- [ ] Preparar release notes MVP

## To Do

- [ ] Corregir auth/permisos en `backend/organization_routes.py`
- [ ] Corregir rutas duplicadas en `frontend/src/App.js`
- [ ] Auditar `OrganizationContext` y eliminar mock en flujo critico
- [ ] Revisar CORS y cookies en `backend/server.py`
- [ ] Confirmar modulos MVP incluidos en navegacion
- [ ] Crear smoke tests backend para auth, health y courses
- [ ] Crear smoke tests frontend para login y dashboard

## In Progress

- [ ] Analisis de cierre de MVP y alineacion de entregables

## Review

- [ ] Validar flujo completo de usuario miembro
- [ ] Validar flujo completo de admin
- [ ] Validar flujo de organizacion y branding
- [ ] Validar seed/demo data
- [ ] Validar docker-compose para demo

## Done

- [x] Analisis inicial del proyecto
- [x] Identificacion de riesgos tecnicos principales
- [x] Plan base para cierre de MVP
- [x] Creacion de dashboard, checklist, planeacion y kanban

## Regla Operativa

- mover a `In Progress` solo tareas activas
- no tener mas de 3 tareas activas a la vez
- mover a `Review` antes de marcar `Done`
- cualquier bug bloqueante vuelve a `To Do` con prioridad P0
