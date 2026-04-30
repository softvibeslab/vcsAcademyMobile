# VCSA MVP Checklist

## P0 Bloqueantes

- [ ] Corregir auth/permisos en `backend/organization_routes.py`
- [ ] Corregir duplicidad de `"/dashboard"` en `frontend/src/App.js`
- [ ] Decidir si `OrganizationContext` queda real o se saca del alcance MVP
- [ ] Revisar CORS y cookies para entorno real
- [ ] Confirmar variables de entorno minimas para local, staging y produccion

## Producto

- [ ] Login con email/password funcionando
- [ ] Logout funcionando
- [ ] Sesion persistente al recargar
- [ ] Dashboard principal usable
- [ ] Top Producer Path usable
- [ ] Cursos listan contenido correctamente
- [ ] Detalle de curso abre sin errores
- [ ] Progreso se guarda correctamente
- [ ] Goal Sheet basico visible y usable
- [ ] Admin basico permite ver usuarios
- [ ] Admin basico permite actualizar roles o membership

## Organizacion y Branding

- [ ] Crear organizacion funciona
- [ ] Obtener organizacion por slug funciona
- [ ] Branding activo se aplica al frontend
- [ ] No hay mezcla de datos mock en flujo critico
- [ ] Settings de organizacion no rompen navegacion

## Backend

- [ ] `/api/health` responde correctamente
- [ ] Auth responde correctamente
- [ ] Endpoints de courses responden correctamente
- [ ] Endpoints de development responden correctamente
- [ ] Endpoints admin responden correctamente
- [ ] Endpoints organization responden con permisos correctos
- [ ] Errores tienen mensajes utiles

## Frontend

- [ ] No hay rutas duplicadas criticas
- [ ] No hay pantallas huérfanas en navegacion principal
- [ ] No hay enlaces a features fuera de MVP
- [ ] Estados de carga visibles
- [ ] Estados vacios aceptables
- [ ] Manejo de error basico presente
- [ ] PWA no rompe el flujo normal

## Testing

- [ ] Smoke test backend auth
- [ ] Smoke test backend health
- [ ] Smoke test backend courses/development
- [ ] Smoke test frontend login
- [ ] Smoke test frontend dashboard
- [ ] Smoke test frontend rutas protegidas
- [ ] Script de validacion pre-release

## Deploy

- [ ] `docker-compose.yml` probado
- [ ] Seed/demo data reproducible
- [ ] Usuario demo documentado
- [ ] URL backend/frontend configurables
- [ ] Guia de deploy unica y actualizada

## Documentacion

- [ ] README principal actualizado
- [ ] README frontend actualizado
- [ ] Estado MVP documentado
- [ ] Checklist de release completada
- [ ] Kanban operativo actualizado

## Cierre

- [ ] Demo completa de punta a punta
- [ ] Issues P0 cerrados
- [ ] Issues P1 aceptados o movidos a post-MVP
- [ ] Version candidata etiquetada para entrega
