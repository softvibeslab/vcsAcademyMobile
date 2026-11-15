# Validation Report (CP4) · acceso-free-premium

**Status:** approved
**Feature:** `acceso-free-premium`
**Owner:** Roger (PO)
**Date:** 2026-11-14
**Plan:** cp3-implementation-plan.md

## 1. Test Results

| Suite | Comando | Resultado |
|---|---|---|
| API existente (regresión) | `VCSA_DB_PATH=<tmp> .venv/bin/python backend/tests/e2e_smoke.py` | `E2E API smoke passed` |
| Acceso (historia + revisión PR #1) | `.venv/bin/python backend/tests/access_tiers.py` | `Ran 15 tests … OK` |
| Dominio | `npm test` | `pass 5 fail 0` |
| Modelo UI (acceso + instalar + piloto) | `node --test frontend/src/pilot/*.test.mjs` | `pass 13 fail 0` |
| Build | `npm run build:web` | `✓ built` |
| Migración desde esquema anterior | worktree de HEAD crea base → código nuevo arranca 2 veces | columnas `plan`, `plan_expires_at`; 28 elementos sin duplicar; rep demo premium, visitor gratis |
| Navegador (ESC-06 + instalar) | Playwright `flow.mjs` (390×844 y 1440×900, backend en base temporal + `vite preview`) | 13 checks OK, 0 errores JS (abajo) |

Resultado del navegador: invitado ve `Comenzar · Crear cuenta gratis ×2 · Desbloquear premium…`; hoja «Crea tu cuenta gratis»; registro → plan Gratis (`Comenzar · Completa el paso anterior ×2 · Desbloquear premium…`); canje → Premium (`Comenzar · Completa el paso anterior…`, CTA premium desaparece); Perfil «Premium · 28 de 28 módulos · vence el 2027-02-12»; admin cambia «4 · Discovery / Survey» a Gratis con confirmación; botón «Instalar app» visible y oculto en modo instalada.

### Evidencia TDD (RED -> GREEN)

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01-T06 | RED | `.venv/bin/python backend/tests/access_tiers.py` (con `access.py` mínimo) | 7 fallan: `{"detail":"Not Found"}` / `404 != 200` (rutas inexistentes) |
| T01-T06 | GREEN | `.venv/bin/python backend/tests/access_tiers.py` | `Ran 7 tests in 0.522s OK` |
| Regresión | GREEN | `backend/tests/e2e_smoke.py` | `E2E API smoke passed` |
| T07 | RED | `node --test access-model.test.mjs` (módulo vacío) | `pass 0 fail 3` |
| T07 | GREEN | `node --test frontend/src/pilot/*.test.mjs` | `pass 8 fail 0` (luego 11 con instalar) |
| T09 | RED | `access_tiers.py` `test_rate_limit_ignores_spoofed_forwarded_for` | `[200, 200, 200] != [200, 200, 429]`: el límite tomaba el primer `X-Forwarded-For` (falsificable) |
| T09 | GREEN | `access_tiers.py` | `Ran 8 tests … OK` (usa `X-Real-IP` que fija nginx) |
| T10 | RED | `access_tiers.py` (7 pruebas `test_review_*`) | 7 FAIL: conocimiento del visitante incluía `agenda-control-guide` y `step-5-script`; `200 != 409` al completar el paso 11 sin el 1; código de 8 caracteres; recordatorios sin guarda; hash sin clave; reinicio devolvía Premium al rep demo; limitador sin purga |
| T10 | GREEN | `access_tiers.py` + `e2e_smoke.py` | `Ran 15 tests … OK`; `E2E API smoke passed` |
| T11 | RED | `node --test access-model.test.mjs` | `pass 3 fail 2` (`itemAccess`, `premiumLockedCount` inexistentes) |
| T11 | GREEN | `node --test frontend/src/pilot/*.test.mjs` | `pass 13 fail 0`; Playwright 15 checks (aviso «8 pasos más con Premium», calculadoras Premium bloqueadas al invitado) |
| T08 | RED | Playwright `flow.mjs` | fallo de la prueba (selector «Nombre» ambiguo; espera de avatar oculto en móvil): corregida la prueba, no el producto |
| T08 | GREEN | Playwright `flow.mjs` | 13 checks OK, 0 errores |

## 2. Findings

| # | Hallazgo | Acción |
|---|---|---|
| F1 | Pasos con candado de progreso se veían rotos: la clase `progress` chocaba con la barra de progreso existente | Renombrada a `lock-progress`; captura 05 corregida |
| F2 | Capturas de la hoja salían vacías | Era la animación de entrada (0,2 s); medida la hoja (opaca, 298 px) y esperas añadidas a la prueba |
| F4 | Límite por IP evadible con `X-Forwarded-For` falso | Clave por `X-Real-IP` (nginx); prueba T09 |
| F5 | Revisión automática PR #1 (P1): fuga de recursos al chat público, orden del roadmap no exigido, Goal Sheet oculto rompía la carga, nivel de calculadoras sin efecto | Corregidas con pruebas T10/T11 |
| F6 | Revisión PR #1 (P2): repetición de código por usuario, códigos de 8 caracteres, hash sin clave, canjes concurrentes, rep demo reseteado al reiniciar, limitador sin purga, aviso Premium contaba pasos gratis, error de red mostrado como paywall, botón sin nombre accesible, plan sin vencimiento en admin, script de despliegue sin reversión temprana, httpx sin fijar | Corregidas |
| F7 | Revisión PR #1 en código previo (notas, edición de usuarios, código muerto en Auth, título de feedback, verificadores viejos) | Fuera de alcance; backlog en cp5 |
| F3 | El roadmap marcaba siempre el paso 2 como actual (fijo en código) | Ahora es secuencial (primer paso sin completar), necesario para AC-11 |

## 3. Security Review

Acceso decidido en el servidor; contenido bloqueado no viaja (ESC-02). Admin-only verificado (ESC-01). Códigos como SHA-256, mostrados una sola vez, listados con `hint`. Límite 5/min por IP en registro y canje (prueba 429). Canje con UPDATE condicional. Sin secretos nuevos.

## 4. TRUST 5

- [x] **Tested:** suites arriba, RED → GREEN.
- [x] **Readable:** reglas en `access.py` y `access-model.mjs`, separadas de la UI.
- [x] **Unified:** tokens del tema; componentes y clases existentes (`card`, `button`, `segmented`).
- [x] **Secured:** sección 3.
- [x] **Trackable:** historia → CP0-CP5 → commits en `feature/acceso-free-premium`.

## 5. Waivers

Calculadoras y Notebook/Diario guardan datos solo en el navegador: su nivel se aplica en la UI (no hay datos en el servidor que proteger).

## 6. Advance Decision

Avanza a CP5 y despliegue (aprobación del PO: «date y publicalo»).

## Gate CP4 -> CP5

- [x] Evidencia ejecutada
- [x] Sin hallazgos abiertos
