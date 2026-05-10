# WL Sales Academy - Stitch Project Status

Date: 2026-05-05

## Stitch Project

- Project: `WL Sales Academy - Mobile App Screens`
- Project ID: `16477932586564802010`
- Project resource: `projects/16477932586564802010`
- Design system asset: `assets/a356634aae084f90b561ea1df71c26b7`
- Design system name: `Executive Sales Intelligence`

## Design Direction Applied

Source files reviewed:

- `doc/design/vcsa_sovereign_dark/DESIGN.md`
- `doc/design/STITCH_FEATURE_SCREEN_PROMPTS.md`
- Existing `doc/design/*/screen.png` and `code.html` references

Core visual rules:

- High-Performance Vault / executive sales cockpit.
- Deep obsidian and navy tonal surfaces.
- Gold as primary action and intelligence accent.
- Smart Agent represented as a glowing Shazam-like AI eye, not a robot mascot.
- Tonal layering and ghost borders instead of heavy section dividers.
- Premium mobile-first iOS spacing, compact operational screens, no generic LMS look.

## Generated Screens

| Module | Stitch Screen ID | Resource |
|---|---|---|
| Smart Agent Intro | `8809500bce894028ac9a12ff5dd14d4d` | `projects/16477932586564802010/screens/8809500bce894028ac9a12ff5dd14d4d` |
| Login / Demo Access | `cf27defd29634223951c1ac937edc55e` | `projects/16477932586564802010/screens/cf27defd29634223951c1ac937edc55e` |
| Home Dashboard - Sales Rep | `53a02e79544e4b669e4a4bf3955b3a57` | `projects/16477932586564802010/screens/53a02e79544e4b669e4a4bf3955b3a57` |
| Top Producer Roadmap | `5e7a9891b22e44eda7ec4928c987334f` | `projects/16477932586564802010/screens/5e7a9891b22e44eda7ec4928c987334f` |
| Smart GoalSheet | `9e208c0d383943db98811be3ab0158f1` | `projects/16477932586564802010/screens/9e208c0d383943db98811be3ab0158f1` |
| Roleplay Live Session | `66b8586f6bae49dda606475e4ac67965` | `projects/16477932586564802010/screens/66b8586f6bae49dda606475e4ac67965` |
| Blueprint Step Detail - Step 5 | `2800ed1ac69a481b9446bd35b6c9092a` | `projects/16477932586564802010/screens/2800ed1ac69a481b9446bd35b6c9092a` |
| Resources Vault | `03e851ed66c24245bf1e930a17d7d9bf` | `projects/16477932586564802010/screens/03e851ed66c24245bf1e930a17d7d9bf` |
| Support & Profile Hub | `ea5d6e4813264200aaef7ad2c9430d3e` | `projects/16477932586564802010/screens/ea5d6e4813264200aaef7ad2c9430d3e` |
| Leadership Workspace | `6918cb9fcb184d0fab42093915c512e8` | `projects/16477932586564802010/screens/6918cb9fcb184d0fab42093915c512e8` |
| Admin Workspace | `72b2ff7d96544e71901461e799054c2d` | `projects/16477932586564802010/screens/72b2ff7d96544e71901461e799054c2d` |
| Reminders & Notifications Center | `264d6c6ccc384d3f99e2169779798cfa` | `projects/16477932586564802010/screens/264d6c6ccc384d3f99e2169779798cfa` |
| Smart Agent Coaching Workspace | `71b5fc5230fa4abeb2249e11eeb54103` | `projects/16477932586564802010/screens/71b5fc5230fa4abeb2249e11eeb54103` |

## Next Stitch Screens

Recommended next generation order:

1. State variants: loading/restoring session, API error notice, restricted resource, certification blocked/ready, empty GoalSheet history, empty Roleplay submissions.
2. Optional variants for Smart Agent: listening, thinking, coaching, guardrail, manager escalation.
3. Optional deep-detail screens: request access modal, resource edit view, scoring rubric expanded view, certification requirements modal.

## Implementation Notes For App UI

- Keep the Home Smart Agent as the primary actionable surface: eye button, prompt input, mic/tap-to-speak, quick chips, and answer/action area.
- Login must include demo role selection for Visitor, Sales Rep, Trainer, Coach, Manager, T.O. Manager, and Admin.
- Roadmap must preserve the official 11-step Blueprint order from the specs.
- GoalSheet should remain dense and operational, with sticky Save CTA and Smart Agent Insight.
- Roleplay should feel like a live AI practice session with controls, transcript/feedback, and scenario status.
- Leadership and Admin should use mobile cards and action rows instead of desktop-style tables.
- Reminders should connect GoalSheet follow-ups, roleplay reviews, training assignments, and certification requirements.
- Smart Agent expanded workspace should support voice/text instructions, citations, recommended actions, and compliance guardrails.

## Applied To App

Source file updated:

- `apps/mobile/App.tsx`

Applied module mapping:

| Stitch Screen | App Module / Function |
|---|---|
| Smart Agent Intro Updated | `renderWelcome()` |
| Login / Demo Access | `renderLogin()` |
| Home Dashboard - Sales Rep | `renderHome()` |
| Top Producer Roadmap | `renderRoadmap()` |
| Step Detail: Break & Remake the Pact | `renderStepDetail()` |
| Smart GoalSheet | `renderGoalSheet()` |
| Roleplay Live Session | `renderRoleplay()` |
| Resources Vault | `renderResources()` |
| Reminders & Notifications Center | `renderRemindersCenter()` |
| Support & Profile Hub | `renderSupport()` |
| Leadership Workspace | `renderLeadershipWorkspace()` |
| Admin Workspace | `renderAdminWorkspace()` |
| Smart Agent Coaching Workspace | Home Smart Agent plus support insight/action surfaces |

Validation:

- `npx expo export --platform web --output-dir /tmp/vcsa-mobile-stitch-all-check`
- `git diff --check`
