# VCSA Academy

WL | White Label Sales Academy is a mobile-first sales training, roleplay, Smart Agent, GoalSheet, manager review, and certification platform.

## Local Commands

```bash
npm install
npm run backend:seed
npm run dev:backend
npm run dev:web
npm run dev:mobile
npm run check
npm run release:check
```

## Demo Accounts

All seeded accounts use password `demo123`.

| Role | Email |
|---|---|
| Sales Rep | `rep@vcsa.local` |
| Manager / Trainer | `manager@vcsa.local` |
| Admin | `admin@vcsa.local` |

## Current Release Candidate Scope

- Monorepo structure.
- Shared domain rules.
- FastAPI backend.
- React webapp.
- Expo mobile app.
- Auth/session persistence with SQLite.
- Web and mobile login/logout.
- Rep dashboard, Blueprint, GoalSheet, Roleplay, Smart Agent, resources, feedback, and certification flows.
- Manager team dashboard, roleplay review, and certification decisions.
- Admin users, resources, and audit APIs.
- GitHub Actions release check.
- EAS build profile template for iOS and Android.

## Backend Operations

```bash
npm run backend:doctor
npm run backend:reset
```

`backend:reset` deletes the configured local SQLite database and reseeds demo launch data. Use it only for local development or test environments.

## Backend Container

```bash
docker build -f backend/Dockerfile -t vcsa-academy-api .
docker run --rm -p 8001:8001 --env-file .env.example vcsa-academy-api
```

Production deployments must set `VCSA_CORS_ORIGINS`, `VCSA_DB_PATH`, `VITE_API_BASE_URL`, and `EXPO_PUBLIC_API_BASE_URL` for their target environment.
