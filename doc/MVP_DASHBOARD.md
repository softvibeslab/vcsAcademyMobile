# VCSA MVP Dashboard

## Objetivo
Cerrar un MVP estable, demostrable y desplegable para academia/equipo comercial con:
- autenticacion real
- dashboard por rol
- contenido consumible
- progreso basico
- admin basico
- organizacion y branding basico

## Estado Ejecutivo

| Area | Estado | Semaforo | Nota |
|---|---|---|---|
| Auth y sesiones | Parcial | Amarillo | Existe, pero necesita validacion end-to-end |
| Routing frontend | Parcial | Amarillo | Hay duplicidad de rutas y transicion de vistas |
| Roles y permisos | Parcial | Rojo | Hay riesgo en dependencias de auth de organizaciones |
| Cursos y contenido | Parcial | Amarillo | La base existe, pero falta cerrar experiencia MVP |
| Progreso y gamificacion | Funcional | Verde | Base Phase 1 presente |
| Organizaciones white-label | Parcial | Rojo | Mezcla de backend real y contexto mock |
| Branding | Parcial | Amarillo | Existe config, pero falta consolidar flujo real |
| Admin basico | Parcial | Amarillo | Hay UI y endpoints, pero falta validar alcance MVP |
| AI Assistant | Experimental | Gris | No necesario para cerrar MVP |
| Testing | Debil | Rojo | Cobertura baja y sin smoke suite completa |
| Deploy y operaciones | Parcial | Amarillo | Hay Docker y guias, falta estandarizar release |
| Documentacion | Amplia pero desigual | Amarillo | Mucha documentacion, no toda alineada |

## KPIs de Cierre

| KPI | Meta MVP | Estado actual |
|---|---|---|
| Flujo login a dashboard | 100% funcionando | En validacion |
| Rutas criticas protegidas | 100% | Riesgo en org/auth |
| Flujos criticos sin mocks | 100% | Pendiente en organizacion |
| Smoke tests backend | 5-8 casos | Pendiente |
| Smoke tests frontend | 4-6 casos | Pendiente |
| Demo data reproducible | 1 script confiable | Parcial |
| Documentacion release-ready | 1 guia unificada | Pendiente |

## Alcance MVP

### Incluido
- login, logout y sesion
- dashboard principal
- cursos y detalle de curso
- top producer path
- progreso / goal sheet basico
- admin basico de usuarios
- organizaciones y branding basico

### Fuera de MVP
- AI avanzada
- automatizaciones complejas
- analytics avanzada
- simuladores de voz
- experiencia white-label completa multi-dominio
- pulido total de community/events si no bloquea demo

## Riesgos Principales

| Riesgo | Impacto | Mitigacion |
|---|---|---|
| Dependencias de auth en organization routes | Alto | Corregir antes de release |
| Contexto de organizacion en mock mode | Alto | Conectar flujo real o desactivar alcance |
| Rutas duplicadas en frontend | Medio | Unificar router y ownership por pantalla |
| Documentacion desalineada | Medio | Crear guia unica de MVP release |
| Worktree con cambios en transicion | Medio | Congelar alcance y trabajar por ramas |

## Definicion de Hecho

- app levanta localmente con instrucciones claras
- backend y frontend usan configuracion consistente
- no hay mocks en flujos criticos
- roles y permisos validan correctamente
- contenido principal puede abrirse y registrar progreso
- admin puede gestionar usuarios base
- existe checklist de release completada
- existe tablero kanban operativo
