# WL Sales Academy App Readiness Analysis

Date: 2026-05-05  
Scope: Expo mobile app, FastAPI backend, demo data, Smart Agent, role workflows, Stitch design application, QA artifacts.

## Executive Status

Current readiness level: **Go-live candidate for demo/UAT**, not yet final app-store production.

The app now has a complete demo-ready E2E surface across authentication, role-based access, Home, Smart Agent, Roadmap, Step Detail, GoalSheet, Roleplay Live, Resources, Support/Profile, Reminders, Leadership, Admin, certification, and audit workflows. The Smart Agent is active today with a local knowledge provider and is now prepared for OpenAI by setting environment variables.

Production still needs external operational decisions: managed production database, final API domain/secrets, EAS release build signing, observability provider, privacy/legal copy, UAT sign-off, and store submission assets.

## Validation Evidence

Commands validated during this pass:

```bash
python3 backend/tests/e2e_smoke.py
python3 -m compileall backend/app
npx expo export --platform web --output-dir /tmp/vcsa-mobile-font-check
git diff --check
```

Result:

- API E2E smoke: passed.
- Backend compile: passed.
- Expo web export: passed.
- Diff whitespace check: passed.

## Smart Agent Status

Current implementation:

- `local` provider: active, deterministic, guardrail-aware, uses Blueprint/resources knowledge.
- `openai` provider: added and configurable with environment variables.
- Public welcome intake: `POST /api/smart-agent/public-chat`.
- Authenticated coaching: `POST /api/smart-agent/chat`.
- Provider status: `GET /api/smart-agent/status`.
- Readiness includes provider status in `GET /api/ready`.

OpenAI activation variables:

```env
VCSA_SMART_AGENT_PROVIDER=openai
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.2
OPENAI_TIMEOUT_SECONDS=12
```

Important: the API key must live only on the backend/VPS environment. It must not be placed in Expo, React Native, GitHub, or client-side config.

OpenAI implementation notes:

- Uses the OpenAI Responses API endpoint: `https://api.openai.com/v1/responses`.
- Sends only allowed role/context summaries and retrieved knowledge snippets.
- Blocks local pricing/fee risk prompts before calling OpenAI.
- Falls back to the local provider if the key is missing, the model is unavailable, timeout occurs, or the API fails.
- Official reference: `https://platform.openai.com/docs/api-reference/responses/create`.

## Feature Readiness Matrix

| Area | Status | What Works | Remaining For Production |
|---|---:|---|---|
| Welcome / Smart Agent Intro | Ready for demo | Shazam-like AI eye, public agent intake, login handoff | Native speech-to-text on iOS/Android if required |
| Login / Demo Access | Ready for demo | Demo users for visitor, rep, trainer, coach, manager, T.O. manager, admin | Production identity provider, email reset delivery |
| Session Persistence | Ready for demo | SecureStore/native, localStorage/web, logout, expired-session clear | Refresh-token policy and device/session management |
| Home Dashboard | Ready for demo | Metrics, quick access, Smart Agent actions | Real analytics aggregation and goal targets |
| Roadmap | Ready for demo | 11-step Blueprint, progress, step completion | Final unlock policy and full content per step |
| Step Detail | Ready for demo | Watch/script/audio/checklist/compliance/common mistakes/run step | Real video/audio assets and finalized scripts |
| GoalSheet | Ready for demo | Daily entry, metrics, follow-ups, Smart Agent insight, history | Editable reminders, manager/T.O. picker from real org data |
| Roleplay Live | Ready for demo | Scenario selection, AI buyer turns, scoring, submit for review | True voice/video transport if live calls are required |
| Resources Vault | Ready for demo | Search, tags, restricted resources, server permission check | Request-access workflow and file upload/storage |
| Reminders Center | Ready for demo | GoalSheet-derived reminders and role workflow cards | Push notifications / calendar integration |
| Support/Profile | Ready for demo | Profile, role chips, certification progress, support card | Real support channel and profile editing |
| Leadership Workspace | Ready for demo | Team dashboard, pending reviews, rubric scoring, readiness checks | Team filters, pagination, deeper analytics |
| Admin Workspace | Ready for demo | Users, invite, status, permissions, resources, audit | Production admin UX depth, resource editor, approvals |
| Certification | Ready for demo | Requirements, manager decision, approval blocking | Final certification badge/certificate issuance |
| Security/Compliance | Partial production | Auth required, role checks, resource checks, audit, headers | HTTPS-only cookies, secrets manager, rate limits, data retention |
| Deployment | Partial production | VPS/mobile API path exists, EAS project configured | Final release build, app-store metadata, monitoring |

## Screen Flow Images

Generated images are in `doc/qa/app-readiness/flows/`.

| Screen / Module | Flow Image |
|---|---|
| Welcome / Smart Agent Intro | `doc/qa/app-readiness/flows/01-welcome-smart-agent.svg` |
| Login / Demo Access | `doc/qa/app-readiness/flows/02-login-demo-access.svg` |
| Home Dashboard | `doc/qa/app-readiness/flows/03-home-dashboard.svg` |
| Top Producer Roadmap | `doc/qa/app-readiness/flows/04-roadmap.svg` |
| Blueprint Step Detail | `doc/qa/app-readiness/flows/05-step-detail.svg` |
| Smart GoalSheet | `doc/qa/app-readiness/flows/06-goalsheet.svg` |
| Roleplay Live | `doc/qa/app-readiness/flows/07-roleplay-live.svg` |
| Resources Vault | `doc/qa/app-readiness/flows/08-resources-vault.svg` |
| Reminders Center | `doc/qa/app-readiness/flows/09-reminders.svg` |
| Support & Profile Hub | `doc/qa/app-readiness/flows/10-support-profile.svg` |
| Leadership Workspace | `doc/qa/app-readiness/flows/11-leadership.svg` |
| Admin Workspace | `doc/qa/app-readiness/flows/12-admin.svg` |
| Smart Agent OpenAI Provider | `doc/qa/app-readiness/flows/13-smart-agent-openai.svg` |

## Backend Coverage

Implemented backend modules:

- Health/readiness: `/api/health`, `/api/ready`.
- Auth: login, logout, demo users, change password, forgot/reset password.
- Mobile profile: `/api/mobile/me`.
- Dashboard: `/api/dashboard/rep`.
- Blueprint: list, detail, complete.
- GoalSheet: today, save, history, metrics.
- Reminders: upcoming.
- Smart Agent: public chat, authenticated chat, GoalSheet insight, provider status.
- Roleplay: scenarios, sessions, turns, complete, submit, pending, mine, manager review.
- Resources: list, read with permission enforcement.
- Certification: readiness, mine, manager decision.
- Admin: users, invite, status, permissions, resources, audit events.

Key backend strengths:

- SQLite persistence is real for demo/UAT.
- Demo seed users cover all required roles.
- Server-side checks protect manager/admin/sensitive-resource workflows.
- Smart Agent sensitive prompts return guardrails instead of unsafe coaching.
- E2E smoke validates core happy paths and blocked paths.

Backend risks before production:

- SQLite is acceptable for demo, but production should move to managed Postgres or an administered persistent DB strategy.
- Cookies are not marked `secure=True` yet because local/demo mode exists.
- No rate limiting on auth or Smart Agent endpoints.
- Password reset delivery is demo-local and returns tokens.
- No centralized secrets manager.

## Mobile App Coverage

Implemented mobile modules in `apps/mobile/App.tsx`:

- Welcome Smart Agent Intro.
- Login and demo role selector.
- Home Dashboard and Smart Agent hub.
- Roadmap and Step Detail.
- Smart GoalSheet.
- Roleplay Live.
- Resources.
- Support/Profile.
- Reminders Center.
- Leadership Workspace.
- Admin Workspace.

Mobile strengths:

- Uses Expo and works for web export.
- Uses SecureStore on native and localStorage on web.
- API base is configured by `EXPO_PUBLIC_API_BASE_URL`.
- Demo data fallback allows the app to remain navigable when API demo user fetch fails.
- Stitch visual direction is applied across the main modules.

Mobile risks before production:

- The app is still mostly in one large `App.tsx`; future maintenance would benefit from module extraction.
- Native microphone/speech is not fully implemented for iOS/Android. Web Speech API only works on web where available.
- No offline queue for GoalSheet/Roleplay.
- No push notification integration for reminders.
- No app-store-ready privacy links inside settings/profile yet.

## Role/Permission Coverage

| Role | Coverage |
|---|---|
| Visitor | Welcome/public Smart Agent and demo access path |
| Sales Rep | Home, Roadmap, Step Detail, GoalSheet, Roleplay, Resources, Support |
| Trainer | Leadership workspace, team review/readiness workflows |
| Coach | Leadership/coaching review workflows |
| Manager | Team dashboard, pending submissions, certification decisions |
| T.O. Manager | Leadership workspace plus sensitive pricing/finance permissions |
| Admin | User management, permissions, resources, audit events |

## Launch Readiness Checklist

Demo/UAT ready:

- [x] Demo users for each role.
- [x] Backend smoke test passes.
- [x] Mobile web export passes.
- [x] Core module flows documented.
- [x] Smart Agent local provider active.
- [x] OpenAI provider ready by env.
- [x] Restricted resource access enforced server-side.
- [x] Manager/admin paths role-gated.
- [x] Basic audit events persisted.

Production pending:

- [ ] Set `VCSA_SMART_AGENT_PROVIDER=openai` and `OPENAI_API_KEY` on VPS only.
- [ ] Run API E2E against VPS domain after setting env.
- [ ] Move production data off demo SQLite strategy or confirm managed persistent volume backup policy.
- [ ] Add rate limiting for auth and Smart Agent.
- [ ] Configure monitoring/Sentry/log drains.
- [ ] Configure privacy policy, terms, support email, and data retention language.
- [ ] Generate final EAS Android/iOS builds.
- [ ] Complete UAT on at least one Android device and one iOS device.
- [ ] Submit app-store assets/metadata.

## Recommended Next Steps

1. Add the OpenAI env values on the VPS backend container and restart only the mobile API container.
2. Hit `GET /api/smart-agent/status` and confirm `provider=openai`, `openai_configured=true`.
3. Run the E2E smoke test against the VPS API, not only local TestClient.
4. Generate a new Android APK.
5. Test the APK with each demo role.
6. Log any visual/functional defects into the backlog before store build.

