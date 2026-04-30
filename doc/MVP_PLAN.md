# VCSA MVP Planeacion

## Meta
Cerrar el MVP en 4 fases cortas con foco en estabilidad, alcance real y release.

## Fase 1: Estabilizacion Tecnica
Duracion estimada: 3 a 5 dias

### Objetivos
- quitar ambiguedades criticas de routing
- corregir permisos/auth en organizaciones
- definir entorno de ejecucion consistente
- identificar y retirar mocks de flujo critico

### Entregables
- router frontend limpio
- auth/permisos de organization routes corregidos
- variables de entorno documentadas
- lista de features in/out del MVP

### Tareas
- revisar `frontend/src/App.js`
- revisar `backend/organization_routes.py`
- revisar `backend/server.py`
- revisar `frontend/src/contexts/OrganizationContext.js`
- revisar `frontend/src/contexts/BrandingContext.js`

## Fase 2: Cierre de Alcance
Duracion estimada: 2 a 3 dias

### Objetivos
- congelar el MVP
- esconder o diferir features experimentales
- asegurar una experiencia coherente

### Entregables
- navegacion MVP simplificada
- backlog post-MVP separado
- dashboard ejecutivo actualizado

### Tareas
- decidir modulos obligatorios
- ocultar AI avanzada si no aporta al cierre
- revisar paginas admin y dashboard por rol
- validar contenido minimo demostrable

## Fase 3: Flujos End-to-End
Duracion estimada: 5 a 8 dias

### Objetivos
- cerrar recorrido real del usuario
- cerrar recorrido real del admin
- validar flujo de organizacion y branding basico

### Entregables
- flujo login -> dashboard -> contenido -> progreso funcionando
- flujo admin funcionando
- flujo organizacion/branding basico funcionando

### Tareas
- probar registro/login/logout
- probar acceso por rol
- probar cursos y detalle
- probar progreso y goal sheet
- probar admin usuarios
- probar create/get organization
- probar branding aplicado

## Fase 4: Release MVP
Duracion estimada: 3 a 4 dias

### Objetivos
- asegurar minima calidad de release
- dejar entorno demo reproducible
- alinear documentacion

### Entregables
- smoke tests minimos
- script de validacion previa
- documentacion de despliegue unificada
- demo final estable

### Tareas
- completar tests backend
- completar tests frontend
- revisar docker/deploy
- documentar seed/demo users
- preparar candidate release

## Dependencias

| Dependencia | Afecta |
|---|---|
| MongoDB configurado | Backend y seeds |
| Variables de entorno correctas | Auth, Stripe, branding |
| Rutas protegidas bien definidas | Seguridad y dashboards |
| Datos demo estables | Demo comercial y QA |

## Prioridades

### P0
- seguridad/permisos
- flujo auth
- routing principal
- quitar mocks criticos

### P1
- admin basico
- branding basico
- smoke tests
- deploy reproducible

### P2
- refinamientos UX
- AI avanzada
- analytics avanzadas
- mejoras no bloqueantes

## Cronograma sugerido

| Semana | Foco | Resultado |
|---|---|---|
| Semana 1 | Fase 1 + Fase 2 | Base estable y alcance congelado |
| Semana 2 | Fase 3 + Fase 4 | MVP demostrable y release-ready |
