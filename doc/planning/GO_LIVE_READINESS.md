# Go Live Readiness

Date: 2026-04-30

## Release Scope

WL Sales Academy is moving from E2E prototype to launch candidate across:

- React webapp.
- Expo React Native app for iOS and Android.
- FastAPI backend.
- SQLite-backed local persistence for launch candidate validation.
- Shared domain package for Blueprint and business rules.

## Demo Accounts

All seeded accounts use password `demo123`.

| Role | Email | Purpose |
|---|---|---|
| Sales Rep | `rep@vcsa.local` | Rep training, Smart Agent, GoalSheet, roleplay, resources, feedback |
| Manager / Trainer | `manager@vcsa.local` | Team dashboard, roleplay reviews, certification decisions |
| Admin | `admin@vcsa.local` | Users, resources, audit events |

## Required Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `VCSA_DB_PATH` | `backend/data/vcsa.sqlite3` | Local SQLite database path |
| `VCSA_SESSION_TTL_DAYS` | `7` | Bearer session lifetime |
| `VCSA_CORS_ORIGINS` | local web/mobile dev origins | Comma-separated allowed browser origins |
| `VCSA_SMART_AGENT_PROVIDER` | `local` | Smart Agent provider interface selection |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8001` | Webapp API target |
| `EXPO_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8001` | Expo app API target |

## Release Check

Run the full local release validation:

```bash
npm run release:check
```

This runs:

- Domain unit tests.
- API E2E smoke with auth, password change, password reset, invite, enable/disable, RBAC, resources, manager review, certification, admin, audit, and logout checks.
- Production web build.
- Expo Doctor.
- Expo web export for mobile preview.

## Go Live Checklist

- [x] Protected API endpoints require Bearer token.
- [x] Web login/logout uses real sessions.
- [x] Mobile login/logout restores session with SecureStore on native and localStorage on web preview.
- [x] Local production-ready auth flows: change password, forgot/reset demo, invite, enable/disable, and session invalidation.
- [x] Mobile UX split into launch-ready screens: Home, Roadmap, Smart Agent, GoalSheet, Roleplay, Library, and Profile.
- [x] Demo users seeded by role.
- [x] Demo knowledge base expanded with Blueprint resources, compliance resources, and multiple roleplay scenarios.
- [x] Smart Agent provider interface with local retrieval, citations, recommendations, and sensitive-content guardrails.
- [x] Manager dashboard and certification decision API.
- [x] Admin users/resources/audit API.
- [x] Web manager workflow can review pending roleplays and submit certification decisions.
- [x] Web admin workflow can invite users, enable/disable users, grant sensitive permissions, publish resources, and inspect audit activity.
- [x] Resource permissions and sensitive access audit.
- [x] Release check script.
- [x] GitHub Actions release check workflow.
- [x] EAS build profile template for development, preview, and production.
- [x] Environment variable example file.
- [x] Backend seed/reset/doctor operational commands.
- [x] Backend Dockerfile and Python requirements.
- [x] Backend readiness endpoint, request IDs, response timing, and baseline security headers.
- [ ] Configure production `VCSA_CORS_ORIGINS`.
- [ ] Replace local SQLite with managed database when target hosting is selected.
- [ ] Replace `https://api.example.com` in EAS profiles with production API URL.
- [ ] Produce native iOS/Android builds through EAS.
- [ ] Configure monitoring/error reporting provider.
- [ ] Complete stakeholder UAT sign-off.
