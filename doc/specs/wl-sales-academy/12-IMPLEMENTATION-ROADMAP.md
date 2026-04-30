# Implementation Roadmap and Backlog

Version: 1.0  
Date: 2026-04-29

## Phase 0: Foundation

Goal: Align app architecture, specs, and design system.

Deliverables:

- SPEC pack committed.
- Mobile design system components.
- Route map for mobile app.
- Canonical Blueprint seed data.
- Permission model defined.

Exit criteria:

- Cursor can use this folder as knowledge base.
- App can render core mobile screens using shared components.

## Phase 1: Rep Mobile MVP

Goal: Build core rep experience.

Features:

- Welcome / onboarding.
- Smart Agent intro.
- Home Dashboard.
- Top Producer Roadmap.
- Blueprint Step Detail.
- Roleplay Live UI.
- Smart GoalSheet.
- Bottom navigation.

Exit criteria:

- Typecheck passes.
- Main screens match approved design direction.
- Blueprint order is correct.

## Phase 2: Backend Persistence

Goal: Persist core data.

Features:

- User/profile endpoint.
- Blueprint steps endpoint.
- Training progress.
- GoalSheet save/history/metrics.
- Roleplay session/submission.
- Resource list.

Exit criteria:

- Mobile screens can use real API responses.
- Validation and permissions exist.
- GoalSheet data persists.

## Phase 3: Smart Agent Integration

Goal: Make Smart Agent useful and safe.

Features:

- Chat endpoint.
- Knowledge retrieval.
- GoalSheet insight endpoint.
- Roleplay feedback endpoint.
- Compliance guardrails.
- Citation/recommendation support.

Exit criteria:

- Smart Agent answers Blueprint questions.
- AI tests pass unsafe prompts.
- Sensitive content respects permissions.

## Phase 4: Trainer and Manager Workflows

Goal: Support review and readiness.

Features:

- Pending roleplay reviews.
- Rubric scoring.
- Written feedback.
- Team progress dashboard.
- Certification readiness.
- Approval/denial flow.

Exit criteria:

- Manager can certify reps.
- Rep sees feedback.
- Team scope enforced.

## Phase 5: Admin and Content Management

Goal: Manage academy content safely.

Features:

- Course/module/lesson CRUD.
- Resource management.
- Content classification.
- Sensitive access grants.
- Audit log viewer.

Exit criteria:

- Admin can publish content.
- Sensitive content has access controls.
- Audit logs record critical actions.

## Phase 6: QA, Hardening, and Launch

Goal: Prepare for production release.

Features:

- Automated tests for business rules.
- API permission tests.
- Mobile QA on iPhone sizes.
- Performance pass.
- Error/loading/empty state pass.
- Documentation update.

Exit criteria:

- Typecheck/build pass.
- Critical tests pass.
- Compliance checklist complete.
- Release notes ready.

## Backlog by Priority

### P0

- Canonical Blueprint seed.
- Mobile shared luxury UI components.
- Home, Roadmap, GoalSheet, Roleplay, Step Detail screens.
- Auth/session restoration.
- Server-side role checks.

### P1

- GoalSheet persistence.
- Smart Agent chat.
- Roleplay submission and review.
- Certification readiness.
- Resource library permissions.

### P2

- Push/email reminders.
- Advanced analytics.
- Admin content CMS.
- AI transcript scoring.
- Offline-friendly mobile caching.

### P3

- Real-time video roleplay.
- Multi-tenant white-label branding.
- Advanced manager reporting.
- External CRM integrations.

