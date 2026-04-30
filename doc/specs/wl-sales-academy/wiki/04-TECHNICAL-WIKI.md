# Technical Wiki

## Current Repository Surfaces

- `apps/mobile`: Expo / React Native mobile app.
- `frontend`: web frontend.
- `backend`: FastAPI backend.
- `docs`, `wiki`, `obsidian-super-wiki`: documentation layers.

## Preferred Implementation Approach

- Follow existing architecture.
- Keep mobile UI in `apps/mobile`.
- Keep shared UI in reusable components.
- Keep business rules server-side where data/security matters.
- Add focused tests for calculations and permissions.

## Mobile App Notes

Primary files likely involved:

- `apps/mobile/src/navigation/AppNavigator.tsx`
- `apps/mobile/src/screens/`
- `apps/mobile/src/components/`
- `apps/mobile/src/services/api/`
- `apps/mobile/src/types/`

## Backend Notes

Primary areas likely involved:

- auth/session routes.
- academy modules routes.
- smart agent routes.
- mobile routes.
- GoalSheet routes.
- tests under `backend/tests`.

## Testing Commands

Use actual package scripts.

Mobile:

```bash
cd apps/mobile
npm run type-check
npm test
npm run lint
```

Known note:

- At time of spec creation, `apps/mobile` lint may fail if no ESLint config exists.
- Jest may report no tests if none are present.

## Documentation Rule

If code and docs conflict, inspect code and update docs.

