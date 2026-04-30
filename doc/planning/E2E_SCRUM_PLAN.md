# VCSA E2E Scrum Planning

Version: 0.1  
Date: 2026-04-29  
Source specs: `doc/specs/wl-sales-academy`

## 1. Objective

Build WL | White Label Sales Academy end to end as a mobile-first React product for iOS, Android, and webapp, with a secure backend, shared business logic, premium black-and-gold design system, Smart Agent coaching, Blueprint training, GoalSheet performance logging, manager review, admin content management, and production release readiness.

## 2. Delivery Model

Methodology: Scrum

Recommended cadence:

- Sprint length: 2 weeks.
- Ceremonies: sprint planning, daily async standup, backlog refinement, sprint review, retrospective.
- Release rhythm: internal demo every sprint; release candidate after Sprint 8.
- Definition of Ready: task has owner area, source spec link, acceptance criteria, dependency state, and test expectation.
- Definition of Done: implementation merged, tests added or documented, typecheck/build passes, acceptance criteria met, docs updated when behavior changes.

## 3. Areas

| Area | Responsibility |
|---|---|
| Product | Scope, acceptance criteria, sprint priority, stakeholder review |
| UX/UI | Mobile and web flows, visual system, responsive behavior, accessibility |
| Mobile | Expo / React Native app for iOS, Android, and Expo web preview |
| Webapp | React web admin, manager dashboards, content management surfaces |
| Backend | FastAPI routes, auth, persistence, permission enforcement, API contracts |
| Domain | Shared business rules, types, validation, Blueprint seed, metrics |
| AI | Smart Agent behavior, retrieval, prompts, safety evaluation |
| Data | MongoDB models, indexes, seed data, migrations/scripts |
| QA | Test plans, regression, E2E validation, device/browser coverage |
| DevOps | CI/CD, environments, builds, deploy, monitoring |
| Security/Compliance | RBAC, sensitive content, audit logs, fee/pricing guardrails |

## 4. Product Increments

### Release 0: Foundation

Goal: create the technical base and product contract.

Includes:

- Monorepo/workspace.
- `apps/mobile`, `frontend`, `backend`, shared packages.
- Design tokens and base UI components.
- Canonical Blueprint seed.
- Auth/session contract.
- CI checks.

Exit criteria:

- Repo builds from clean install.
- Mobile app renders shell and key screens with mock data.
- Backend exposes health and initial auth/mobile contract.
- Blueprint order is locked by tested domain logic.

### Release 1: Rep MVP

Goal: deliver the daily sales rep experience.

Includes:

- Onboarding.
- Smart Agent intro.
- Home Dashboard.
- Top Producer Roadmap.
- Blueprint Step Detail.
- Roleplay Live UI.
- Smart GoalSheet.
- Resource Library basic.
- Bottom navigation.

Exit criteria:

- Rep can log in, see dashboard, train steps, run roleplay UI, save GoalSheet entry, and view resources.
- Core flows work with real API responses or documented mock fallback.

### Release 2: Persistence and Smart Agent

Goal: make the product useful and auditable.

Includes:

- GoalSheet persistence/history/metrics.
- Training progress.
- Roleplay sessions/submissions.
- Smart Agent chat and GoalSheet insight.
- Knowledge retrieval with permission checks.
- AI safety tests.

Exit criteria:

- Data persists.
- Smart Agent answers safe Blueprint questions.
- Sensitive material is filtered server-side.

### Release 3: Manager/Admin and Launch

Goal: support review, certification, operations, and launch readiness.

Includes:

- Trainer/manager review.
- Rubric scoring.
- Certification readiness.
- Admin content management.
- Sensitive access grants.
- Audit logs.
- QA hardening and release.

Exit criteria:

- Managers can review and certify reps.
- Admins can manage users/content/access.
- Critical tests and launch checklist pass.

## 5. Epic Map

| Epic ID | Epic | Primary Areas | Priority |
|---|---|---|---|
| E00 | Project Foundation and Git Hygiene | DevOps, Product | P0 |
| E01 | Monorepo and App Architecture | DevOps, Mobile, Webapp, Backend | P0 |
| E02 | Shared Domain and Business Rules | Domain, Backend, QA | P0 |
| E03 | Design System and Shared UI | UX/UI, Mobile, Webapp | P0 |
| E04 | Authentication, Session, and RBAC | Backend, Mobile, Webapp, Security/Compliance | P0 |
| E05 | Rep Mobile MVP Experience | Mobile, UX/UI, Product | P0 |
| E06 | Backend APIs and Persistence | Backend, Data, QA | P0 |
| E07 | Smart Agent and AI Guardrails | AI, Backend, Security/Compliance, QA | P1 |
| E08 | Trainer and Manager Workflows | Webapp, Backend, Mobile, Product | P1 |
| E09 | Admin and Content Management | Webapp, Backend, Security/Compliance | P1 |
| E10 | QA, Observability, and Release | QA, DevOps, Security/Compliance | P0 |
| E11 | Post-MVP Growth | Product, Mobile, Webapp, AI | P2/P3 |

## 6. Feature Breakdown

### E00 - Project Foundation and Git Hygiene

- F00.1 Initial repository setup.
- F00.2 Branch strategy and PR workflow.
- F00.3 Documentation source of truth.
- F00.4 ClickUp backlog import structure.

### E01 - Monorepo and App Architecture

- F01.1 Workspace setup.
- F01.2 Mobile Expo app.
- F01.3 React webapp.
- F01.4 FastAPI backend.
- F01.5 Shared packages.
- F01.6 Environment config.

### E02 - Shared Domain and Business Rules

- F02.1 Canonical Blueprint model.
- F02.2 Roles and permissions model.
- F02.3 Content classification.
- F02.4 GoalSheet validation and metrics.
- F02.5 Training progress rules.
- F02.6 Certification readiness rules.

### E03 - Design System and Shared UI

- F03.1 Design tokens.
- F03.2 Mobile app shell.
- F03.3 Core UI components.
- F03.4 Smart Agent eye motif.
- F03.5 Loading/empty/error/unauthorized states.
- F03.6 Accessibility baseline.

### E04 - Authentication, Session, and RBAC

- F04.1 Login and session restore.
- F04.2 Current user endpoint.
- F04.3 Role-aware navigation.
- F04.4 Server-side authorization helpers.
- F04.5 Team/org scope enforcement.
- F04.6 Sensitive material access checks.

### E05 - Rep Mobile MVP Experience

- F05.1 Welcome / Onboarding.
- F05.2 Smart Agent Introduction.
- F05.3 Home Dashboard.
- F05.4 Top Producer Roadmap.
- F05.5 Blueprint Step Detail.
- F05.6 Roleplay Live.
- F05.7 Smart GoalSheet.
- F05.8 Resource Library.
- F05.9 Support route.

### E06 - Backend APIs and Persistence

- F06.1 Mobile dashboard API.
- F06.2 Blueprint APIs.
- F06.3 GoalSheet APIs.
- F06.4 Roleplay APIs.
- F06.5 Resource APIs.
- F06.6 Course/content APIs.
- F06.7 Audit logging.
- F06.8 Seed data and indexes.

### E07 - Smart Agent and AI Guardrails

- F07.1 Smart Agent chat endpoint.
- F07.2 Prompt and mode system.
- F07.3 Knowledge retrieval.
- F07.4 GoalSheet insight endpoint.
- F07.5 Roleplay feedback support.
- F07.6 Compliance refusals and redirects.
- F07.7 AI audit events.
- F07.8 Evaluation tests.

### E08 - Trainer and Manager Workflows

- F08.1 Pending roleplay reviews.
- F08.2 Rubric scoring.
- F08.3 Written feedback.
- F08.4 Team dashboard.
- F08.5 Certification readiness.
- F08.6 Certification approve/deny.
- F08.7 Rep feedback visibility.

### E09 - Admin and Content Management

- F09.1 User and role management.
- F09.2 Course/module/lesson CRUD.
- F09.3 Resource management.
- F09.4 Content classification controls.
- F09.5 Sensitive access grants.
- F09.6 Audit log viewer.
- F09.7 Admin dashboard.

### E10 - QA, Observability, and Release

- F10.1 Unit tests for domain logic.
- F10.2 API permission tests.
- F10.3 Mobile screen tests.
- F10.4 Webapp smoke tests.
- F10.5 E2E critical paths.
- F10.6 CI pipeline.
- F10.7 Monitoring and error tracking.
- F10.8 Mobile and web release checklist.

### E11 - Post-MVP Growth

- F11.1 Push/email reminders.
- F11.2 Offline-friendly caching.
- F11.3 Advanced analytics.
- F11.4 AI transcript scoring.
- F11.5 Multi-tenant white-label branding.
- F11.6 CRM integrations.
- F11.7 Real-time video roleplay.

## 7. Sprint Plan

### Sprint 0 - Planning and Repo Readiness

Goal: prepare the project to start implementation.

- Create initial docs commit and branch workflow.
- Create Scrum/ClickUp planning.
- Confirm source specs and MVP boundaries.
- Agree on target stack and environments.
- Create technical decision log.

Demo:

- Walk through plan, backlog, and first sprint.

### Sprint 1 - Architecture Foundation

Goal: create runnable skeleton.

- Create monorepo/workspace.
- Scaffold mobile app.
- Scaffold webapp.
- Scaffold backend.
- Add shared domain package.
- Add CI base checks.
- Add health endpoint and app shell.

Demo:

- Mobile, webapp, and backend start locally.

### Sprint 2 - Design System and Domain Rules

Goal: lock product primitives.

- Add design tokens.
- Build core shared UI.
- Implement canonical Blueprint seed.
- Implement GoalSheet metrics.
- Implement roles/content classification types.
- Add unit tests.

Demo:

- App shell renders premium UI and Blueprint data in order.

### Sprint 3 - Auth and Rep Navigation

Goal: enter the app securely.

- Implement auth/session routes.
- Implement `/api/mobile/me`.
- Add role-aware mobile navigation.
- Add onboarding and Smart Agent intro.
- Add protected-route behavior.
- Add unauthorized state.

Demo:

- Rep can authenticate and reach app shell.

### Sprint 4 - Rep Training MVP

Goal: deliver core training screens.

- Home Dashboard.
- Top Producer Roadmap.
- Blueprint Step Detail.
- Step completion.
- Dashboard API integration.
- Loading/error/empty states.

Demo:

- Rep can view daily hub and train a Blueprint step.

### Sprint 5 - GoalSheet and Roleplay MVP

Goal: deliver daily performance and practice.

- Smart GoalSheet UI.
- GoalSheet save/history/metrics APIs.
- Roleplay Live UI.
- Roleplay scenarios/session APIs.
- Follow-up reminders basic.
- Tests for metrics and validation.

Demo:

- Rep can save a daily GoalSheet entry and start a roleplay session.

### Sprint 6 - Smart Agent Integration

Goal: make coaching useful and safe.

- Smart Agent chat endpoint.
- Mode/context payload.
- GoalSheet insight endpoint.
- Retrieval stub or approved knowledge source.
- Compliance guardrails.
- AI evaluation tests.

Demo:

- Rep asks Blueprint questions and receives safe recommended actions.

### Sprint 7 - Manager/Trainer Review

Goal: support feedback and readiness.

- Pending submissions view.
- Rubric scoring.
- Feedback submission.
- Team dashboard.
- Certification readiness API.
- Rep feedback visibility.

Demo:

- Manager reviews a roleplay and rep sees feedback.

### Sprint 8 - Admin, Security, and Launch Candidate

Goal: complete operational controls and hardening.

- Admin users/roles.
- Content/resource management.
- Sensitive access grants.
- Audit log viewer.
- API permission test matrix.
- Mobile/web release QA.
- Deployment checklist.

Demo:

- Admin manages content/access and release candidate passes critical QA.

## 8. First Review Agenda

Use this agenda before Sprint 1 starts:

1. Confirm MVP scope: P0 only, plus selected P1 if capacity allows.
2. Confirm technical stack: Expo, React web, FastAPI, MongoDB.
3. Confirm product owner and approval flow.
4. Confirm role hierarchy and team scope rules.
5. Confirm Smart Agent provider decision.
6. Confirm design direction and required screens.
7. Confirm ClickUp hierarchy and import columns.
8. Confirm Sprint 1 commitment.

## 9. Open Decisions

| Decision | Owner Area | Needed By |
|---|---|---|
| Production auth provider | Product, Backend, Security/Compliance | Sprint 1 |
| Database final choice | Backend, Data | Sprint 1 |
| Smart Agent provider | Product, AI, Backend | Sprint 5 |
| Mobile build profiles | DevOps, Mobile | Sprint 6 |
| Manager hierarchy/team scope | Product, Backend | Sprint 3 |
| Official scripts/content approval workflow | Product, Admin, Compliance | Sprint 4 |
| Sensitive material access policy | Security/Compliance, Product | Sprint 4 |

## 10. ClickUp Mapping Recommendation

Suggested ClickUp hierarchy:

- Space: `VCSA Product`
- Folder: `WL Sales Academy E2E`
- Lists:
  - `00 Planning`
  - `01 Sprint Backlog`
  - `02 Product Backlog`
  - `03 Release QA`
  - `04 Post MVP`

Suggested custom fields:

- `Epic ID`
- `Feature ID`
- `Area`
- `Sprint`
- `Release`
- `Priority`
- `Story Points`
- `Dependency`
- `Spec Source`
- `Acceptance Criteria`
- `Risk`

Status workflow:

- Backlog
- Ready
- In Progress
- In Review
- QA
- Blocked
- Done

