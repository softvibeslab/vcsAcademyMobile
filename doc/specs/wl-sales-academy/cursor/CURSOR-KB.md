# Cursor Knowledge Base Instructions

Version: 1.0  
Date: 2026-04-29

## 1. How To Use This Folder In Cursor

When building WL | White Label Sales Academy, add this folder to Cursor context first:

```text
docs/specs/wl-sales-academy/
```

Recommended reading order:

1. `README.md`
2. `01-SRS.md`
3. `03-BUSINESS-RULES.md`
4. `08-UX-DESIGN-SPEC.md`
5. `09-SMART-AGENT-SPEC.md`
6. `10-SECURITY-COMPLIANCE.md`
7. Relevant feature file for the task.

## 2. Cursor System Context

Use this as the product context:

```text
You are developing WL | White Label Sales Academy, a premium mobile-first AI sales training platform for resort/vacation club sales teams. It is not a generic LMS. The product is built around the official 11-step Blueprint of the Sale and must preserve the canonical order. The app includes Smart Agent AI coaching, Blueprint roadmap, step detail training, Roleplay Live, Smart GoalSheet, resources, manager/trainer review, certification, and admin controls.

Prioritize the existing repo architecture. Keep changes small, typed, permission-aware, and testable. Follow the black-and-gold premium mobile design direction. Protect sensitive pricing, fee, incentive, program, internal worksheet, and rep performance data. Smart Agent must not invent pricing or misleading language and must reinforce clear fee disclosure.
```

## 3. Non-Negotiable Product Rules For Cursor

- Do not reorder the Blueprint.
- Do not create 3-Way Pitch, Home Away from Home Program, First Visit Incentives, or Fee Disclosure as top-level Blueprint steps.
- Do not hardcode real pricing or incentives.
- Do not expose sensitive content without server-side authorization.
- Do not rely only on client-side roles.
- Do not make Smart Agent produce manipulative or misleading language.
- Do not build generic LMS pages when the request is for the sales academy experience.

## 4. Implementation Prompts

### Build A Mobile Screen

```text
Read docs/specs/wl-sales-academy/08-UX-DESIGN-SPEC.md and implement the requested mobile screen in apps/mobile. Reuse existing components where possible. Match the premium black-and-gold Aurelian Elite style. Keep text readable and touch targets accessible. Run typecheck after changes.
```

### Build A Business Rule

```text
Read docs/specs/wl-sales-academy/03-BUSINESS-RULES.md and implement the rule server-side first. Add focused tests. Do not duplicate sensitive authorization logic only in UI.
```

### Build Smart Agent Behavior

```text
Read docs/specs/wl-sales-academy/09-SMART-AGENT-SPEC.md. Implement permission-aware AI behavior. The agent must preserve Blueprint order, avoid invented pricing/incentives, and refuse hidden-fee or misleading requests.
```

### Build GoalSheet

```text
Read docs/specs/wl-sales-academy/03-BUSINESS-RULES.md, 06-DATA-MODEL.md, 07-API-SPEC.md, and 11-QA-TEST-MATRICES.md. Implement GoalSheet validation, persistence, metrics, follow-ups, and Smart Agent insight. Avoid divide-by-zero. Use sample values only as sample data.
```

### Build Permissions

```text
Read docs/specs/wl-sales-academy/10-SECURITY-COMPLIANCE.md. Add server-side auth, role, and team/org scope checks. Add tests for unauthenticated, wrong role, wrong scope, and authorized success.
```

## 5. Definition of Done For Cursor Tasks

- Feature matches relevant SPEC.
- Blueprint order remains correct.
- Permissions are enforced server-side.
- Sensitive content is protected.
- UI matches premium mobile design direction.
- Loading, error, empty, and success states are handled where relevant.
- Typecheck passes.
- Tests are added or updated for business logic and permissions.
- No secrets or credentials are committed.

## 6. Design References

Stitch project:

```text
WL | White Label Sales Academy - Premium Mobile App
Project ID: 7650035529271313866
Style: Aurelian Elite black-and-gold luxury mobile app
```

Implemented mobile design files currently live around:

```text
apps/mobile/src/components/luxury/
apps/mobile/src/screens/
apps/mobile/src/navigation/AppNavigator.tsx
```

