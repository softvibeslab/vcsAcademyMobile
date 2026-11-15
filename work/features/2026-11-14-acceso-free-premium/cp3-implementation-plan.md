# Implementation Plan (CP3) · acceso-free-premium

**Status:** done
**Feature:** `acceso-free-premium`
**Owner:** Roger (PO)
**Date:** 2026-11-14
**Spec:** cp2-spec.md

## 1. Tasks By Team

Backend (access.py, main.py, persistence.py), frontend (Access.jsx, access-model.mjs, App/Auth/Onboarding/Learning/Coach/Management/Workspace/GuestWorkspace), despliegue aisales.

## 1b. Test-First Pairs (TDD)

| Par | Prueba | Escenario |
|---|---|---|
| T01 | `test_esc01_admin_changes_level_and_non_admin_gets_403` | ESC-01 |
| T02 | `test_esc02_public_catalog_hides_locked_content_and_hidden_items` | ESC-02 |
| T03 | `test_esc03_register_free_and_duplicate` | ESC-03 |
| T04 | `test_esc04_redeem_codes` | ESC-04 |
| T05 | `test_esc05_expiry_progress_lock_and_staff` | ESC-05 |
| T06 | `test_functions_and_resources_follow_levels`, `test_rate_limit_on_register` | AC-02/05, NFR-01 |
| T07 | `access-model.test.mjs` (stepAction, planSummary, planError) | UI |
| T08 | Playwright `flow.mjs` (ESC-06) | UAT automatizado |

## 2. Contracts

cp2-spec.md, sección 5.

## 3. Repo Paths (spec <-> codigo)

| Spec | Código |
|---|---|
| Modelo, reglas, códigos | backend/app/access.py |
| Rutas | backend/app/main.py (final del archivo y guardas) |
| Plan en usuario | backend/app/persistence.py `row_to_user` |
| UI | frontend/src/pilot/Access.jsx, access-model.mjs, access.css |
| Pruebas | backend/tests/access_tiers.py, frontend/src/pilot/access-model.test.mjs |

## 4. Branch Strategy

`feature/acceso-free-premium` (incluye el commit previo que versiona el piloto sin commit).

## 5. Expected Evidence

cp4-validation.md + capturas en evidence/.

## 6. Gates (from LAYER_PROFILE)

API smoke existente + access_tiers + pruebas de modelo + build Vite + flujo en navegador.

## 7. Observability

Eventos de auditoría: auth_register, license_redeem, access_level_changed, license_code_created/revoked, user_plan_changed.
