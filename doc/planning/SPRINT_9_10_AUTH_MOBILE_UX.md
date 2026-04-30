# Sprint 9-10 Auth and Mobile UX Delivery

Date: 2026-04-30

## Goal

Move the launch candidate closer to Go Live by completing local production-ready authentication flows and replacing the mobile vertical slice with a multi-screen product experience backed by real APIs.

## Implemented

### Auth

- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/admin/users/invite`
- `PATCH /api/admin/users/{user_id}/status`
- Password reset token persistence with expiry and one-time consumption.
- Password updates invalidate active sessions.
- Disabled users cannot log in.
- Auth actions are covered by audit events.

### Mobile UX

- Session restore with SecureStore on native and localStorage on web preview.
- Bottom tab shell for:
  - Home
  - Roadmap
  - Smart Agent
  - GoalSheet
  - Roleplay
  - Library
  - Profile
- Dashboard metrics and certification status.
- Step selection and completion.
- Smart Agent prompt and guarded response display.
- GoalSheet form, metrics, and history.
- Roleplay scenario, transcript, submission, and feedback history.
- Resource library with access/restricted states.
- Profile/session readiness panel.

## Verification

Passed:

```bash
npm run release:check
```

The release check now covers the expanded auth lifecycle and mobile bundling.

## Remaining For Commercial Go Live

- Production API URL and CORS values.
- Managed production database adapter/hosting decision.
- EAS native builds for iOS and Android.
- Monitoring/error reporting provider.
- UAT sign-off with stakeholders.
