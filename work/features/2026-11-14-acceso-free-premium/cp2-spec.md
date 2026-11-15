# Spec (CP2) · acceso-free-premium

**Status:** approved
**Feature:** `acceso-free-premium`
**Product:** Sales Academy · aisales.softvibes.pro
**Owner:** Roger (PO)
**Date:** 2026-11-14

## 1. Problem

Ver cp1-srs.md.

## 2. Users And Areas

Visitante, rep gratis, rep premium, gerente/staff (acceso completo por rol), admin.

## 3. Goal

Registro público + niveles Público/Gratis/Premium administrables y aplicados en el servidor.

## 4. Scope

Historia, sección 5 (incluye / no incluye).

## 5. Requirements (Functional)

**Modelo**
- `users.plan` (`gratis`|`premium`), `users.plan_expires_at` (fecha o nulo = sin vencimiento).
- `license_redemptions(code_id, user_id, redeemed_at)`: un canje por usuario y código.
- `access_items(id, kind, ref_id, title, level, visible, sort, updated_at)`; id `lesson:step_N`, `scenario:<id>`, `function:<coach|calculators|goalsheet|notebook>`, `resource:<id>`.
- `license_codes(id, code_hash HMAC-SHA256 con clave del servidor, hint, plan_days, max_uses, uses, expires_at, revoked, created_by, created_at)`.

**Regla de acceso:** visitante → publico; gratis → publico+gratis; premium vigente → todos; roles admin/manager/to_manager/trainer/coach → todos. Elemento oculto: 404 salvo admin. Bloqueado: 403 `{"code":"requires_plan","requires":"gratis|premium","message":...}` sin contenido.

**API nueva**
| Método y ruta | Auth | Resultado |
|---|---|---|
| POST /api/auth/register | pública, 5/min por IP | cuenta gratis + sesión; 409 duplicado; 422 validación; 429 límite |
| GET /api/public/catalog | opcional | `{tier, items[], steps[]}` con `level`, `allowed` |
| GET /api/public/blueprint/steps/{id} | opcional | lección si el nivel lo permite |
| POST /api/me/redeem | usuario, 5/min | plan premium hasta hoy(o vencimiento vigente)+plan_days; 400 «Código no válido o vencido.» |
| GET/PATCH /api/admin/access-items[/{id}] | admin | listar con resumen / cambiar `level`, `visible` |
| GET/POST/DELETE /api/admin/license-codes[/{id}] | admin | listar (sin código), generar (código una sola vez), revocar |
| PATCH /api/admin/users/{id}/plan | admin | cambiar plan |

**API cambiada:** `/api/blueprint/steps` y detalle (+`level`, `allowed`, `lock` plan|progress; roadmap en orden), `/api/resources` (+`level`), escenarios (+`level`, `allowed`), goalsheet y chat protegidos por su función, `public-chat` respeta el nivel del coach, `/api/mobile/me` y login incluyen `plan`, `plan_expires_at`, `tier`.

**Requisitos trazables**

| ID | Requisito | AC |
|---|---|---|
| REQ-001 | Registro público crea cuenta Gratis con sesión; correo único sin distinguir mayúsculas | AC-03, AC-04 |
| REQ-002 | Catálogo público con nivel y `allowed`; sin contenido de lo bloqueado | AC-02, AC-10 |
| REQ-003 | 403 `requires_plan` en lección, escenario, función o recurso no permitido | AC-05 |
| REQ-004 | Canje de código activo → Premium con vencimiento; inválido/vencido/usado/revocado → 400 | AC-06, AC-07 |
| REQ-005 | Premium vencido se trata como Gratis | AC-08 |
| REQ-006 | CRUD admin de niveles/visibilidad, códigos y planes; 403 a no admin; auditoría | AC-01, AC-09 |
| REQ-007 | Candado de progreso distinto al de plan; roadmap secuencial | AC-11 |
| REQ-008 | Staff con acceso completo por rol | AC-12 |

## Acceptance Criteria

AC-01..AC-12 de la historia (sección 11), todos `Aceptado` por el PO y cubiertos por ESC-01..ESC-07.

## 6. Requirements (Non-Functional)

NFR-01..05 de la historia. Migración idempotente al arrancar (ALTER + INSERT OR IGNORE): no pisa lo que el admin cambió.

## 7. Security Considerations

Contraseñas PBKDF2 existentes; códigos de 12 caracteres guardados con HMAC-SHA256 (clave `VCSA_CODE_SECRET` o archivo `.license-secret` 0600 junto a la base, fuera de la tabla); un usuario no repite un código; límite 5/min por IP en registro y canje, con la IP tomada de `X-Real-IP` (nginx, `$remote_addr`) y nunca de `X-Forwarded-For`; orden del roadmap exigido al completar un paso (409); el conocimiento del coach solo incluye lo que el usuario puede abrir; canje con UPDATE condicional (sin doble uso concurrente); auditoría de registro, canje, cambios de nivel y plan.

## 8. RACI

PO (Roger): A. Agente: R (implementación, pruebas, despliegue). Equipo comercial: I.
