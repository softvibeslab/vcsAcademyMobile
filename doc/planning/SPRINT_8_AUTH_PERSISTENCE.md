# Sprint 8 Auth and Persistence Notes

Date: 2026-04-30

## Scope Started

Sprint 8 begins by replacing the first E2E slice's in-memory backend behavior with durable local persistence and real session authentication.

## Implemented

- SQLite persistence under `backend/app/persistence.py`.
- Local database path: `backend/data/vcsa.sqlite3`.
- Database is ignored by Git.
- Demo user seed:
  - Email: `rep@vcsa.local`
  - Password: `demo123`
  - Roles: `sales_rep`, `manager`
- Password hashing with PBKDF2-HMAC-SHA256.
- Bearer session tokens stored in SQLite.
- Auth endpoints:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/mobile/me`
- Protected E2E endpoints now require `Authorization: Bearer <token>`.
- Persistent records for:
  - Training progress.
  - GoalSheet entries.
  - Roleplay sessions.
  - Roleplay submissions/reviews.
  - Audit events.
- Web and mobile clients perform demo login before API calls.

## Verification

Passed:

```bash
npm run check
npm --workspace frontend run build
npx expo-doctor
npx expo export --platform web --output-dir dist-mobile-web
```

## Next Sprint 8 Work

- Replace demo login with full login screens.
- Add admin user/role management UI.
- Add content/resource CRUD.
- Add audit log viewer.
- Add MongoDB or production database adapter if required by deployment.
- Add migration/seed CLI commands.
