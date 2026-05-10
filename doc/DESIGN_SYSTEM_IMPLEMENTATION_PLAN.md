# Design System Implementation Plan

Date: 2026-05-05  
Source docs:

- `doc/DESIGN_SYSTEM_GUIDE.md`
- `doc/DESIGN_IMPROVEMENTS_SUMMARY.md`

## Current Reality Check

The design system documentation describes the target architecture correctly, and the repo now contains a compiling first implementation layer under `apps/mobile/src`.

Existing mobile design-system files:

- `apps/mobile/src/constants/colors.ts`
- `apps/mobile/src/constants/typography.ts`
- `apps/mobile/src/constants/spacing.ts`
- `apps/mobile/src/constants/theme.ts`
- `apps/mobile/src/components/ui/Button.tsx`
- `apps/mobile/src/components/ui/Card.tsx`
- `apps/mobile/src/components/ui/Input.tsx`
- `apps/mobile/src/components/ui/Modal.tsx`
- `apps/mobile/src/components/ui/Loading.tsx`
- `apps/mobile/src/components/ui/ErrorState.tsx`
- `apps/mobile/src/components/layout/Screen.tsx`
- `apps/mobile/src/hooks/useAuth.ts`
- `apps/mobile/src/hooks/useApi.ts`
- `apps/mobile/src/hooks/useTheme.ts`

Main gap:

- The production app is still implemented mostly in `apps/mobile/App.tsx` with about 3,750 lines and a large internal `StyleSheet`.
- `App.tsx` now imports the theme and shared feature primitives, but feature screens have not yet been fully extracted into separate modules.
- `npx expo export --platform web` passes for the current app path.
- `npx tsc --noEmit` passes after the design-system foundation fixes.
- `useApi` calls `useAuth`, which can create a second auth state if used beside another `useAuth` instance. This should be handled through an `AuthProvider` or by passing logout/token in before broad hook adoption.
- The documented target architecture exists, but feature screens are not yet split into `src/components/features/*`.

## Implemented In This Pass

- Fixed design-system TypeScript and syntax issues in constants, hooks, UI components, layout, and loading states.
- Aligned foundation tokens with the Stitch / Executive Sales Intelligence look: obsidian surfaces, premium gold, pale-gold accents, muted beige copy, and soft ghost borders.
- Added shared app-specific primitives:
  - `PremiumCard`
  - `ScreenHeader`
  - `AgentEye`
  - `MetricCard`
  - `BottomTabBar`
- Integrated `Theme`, `PremiumCard`, and `BottomTabBar` into `apps/mobile/App.tsx`.
- Replaced the local `GlassCard` implementation with the shared premium card wrapper.
- Replaced the local bottom navigation implementation with the shared responsive bottom tab bar.
- Tightened mobile nav copy by using `Roleplay` as the tab label while preserving `Roleplay Live` as the screen title.
- Reset the main mobile `ScrollView` when switching tabs or opening step detail, so every module starts at the top instead of inheriting the previous screen scroll position.
- Compact-polished GoalSheet option cards, section headers, and metric cards to reduce Android wrapping and oversized text.
- Replaced the generic header bot badge with the shared `AgentEye` visual so modules align better with the Stitch eye motif.
- Updated the mobile screenshot QA script to match the current bottom navigation and roleplay screen labels.
- Added a mobile-focused `tsconfig.json` that keeps Expo bundler resolution and excludes generated output folders.

Validation completed:

```bash
cd apps/mobile && npx tsc --noEmit
cd apps/mobile && npx expo export --platform web --output-dir /tmp/vcsa-mobile-design-impl-final
python3 backend/tests/e2e_smoke.py
git diff --check
```

## Implementation Strategy

Use a phased migration. Do not rewrite all of `App.tsx` at once. The app is already demo/UAT usable, so the safest path is to make the design system compile, adopt tokens first, then replace UI blocks screen by screen.

## Phase 0 - Stabilize Design System Foundation

Goal: make `apps/mobile/src` safe to import.

Tasks:

1. Fix syntax/type issues in token and hook files.
2. Add missing imports and replace incorrect cleanup logic.
3. Confirm `Button`, `Card`, `Input`, `Modal`, `Loading`, `ErrorState`, and `Screen` compile in isolation.
4. Align token colors with Stitch `Executive Sales Intelligence`:
   - background: `#131317` / `#0e0e12`
   - gold: `#f2ca50`
   - pale gold: `#ffe088`
   - ghost border: `rgba(77,70,53,0.24)`
   - muted text: `#d0c5af`
5. Add a simple barrel export for constants and components if missing.

Acceptance criteria:

- `npx expo export --platform web --output-dir /tmp/vcsa-mobile-ds-foundation-check` passes.
- `npx tsc --noEmit` no longer crashes. If strict type errors remain, they are listed and scoped.
- No production screen behavior changes yet.

## Phase 1 - Token Adoption In Existing App

Goal: reduce visual drift without changing app flow.

Tasks:

1. Import design tokens into `App.tsx`.
2. Replace local constants:
   - `gold`
   - `gold2`
   - `ink`
   - repeated surface/border/text colors
3. Replace duplicated spacing values in the main `StyleSheet` with token references.
4. Create compact mobile typography aliases:
   - `screenTitle`
   - `sectionTitle`
   - `cardTitle`
   - `body`
   - `caption`
   - `tabLabel`
5. Keep current function names and state logic unchanged.

Acceptance criteria:

- APK/web visual result remains the same or better.
- No text grows unexpectedly.
- GoalSheet remains readable on narrow Android.
- Expo export passes.

## Phase 2 - Shared Component Adoption

Goal: replace local UI primitives while preserving screens.

Target replacements:

| Current Local Primitive | New Component |
|---|---|
| `GlassCard` | `Card` or `PremiumCard` wrapper |
| `GoldButton` | `Button variant="primary"` |
| `InputBlock` / `TextInput` wrappers | `Input` |
| local loading/error messages | `Loading` / `ErrorState` |
| local screen wrappers | `Screen` |

Tasks:

1. Create app-specific wrappers where needed:
   - `PremiumCard`
   - `MetricCard`
   - `ScreenHeader`
   - `AgentEye`
   - `BottomTabBar`
2. Do not force generic components to carry all product complexity.
3. Replace primitives in one screen at a time.

Acceptance criteria:

- Each replaced screen keeps the same API behavior.
- Touch targets remain at least 44px.
- No button text overflows.
- No nested card-on-card patterns are introduced.

## Phase 3 - Feature Module Extraction

Goal: split the app into maintainable feature modules.

Recommended target structure:

```text
apps/mobile/src/
  app/
    AppShell.tsx
    navigation.ts
    types.ts
  features/
    welcome/
      WelcomeScreen.tsx
      AgentEye.tsx
    auth/
      LoginScreen.tsx
      demoUsers.ts
    home/
      HomeScreen.tsx
      SmartAgentPanel.tsx
    roadmap/
      RoadmapScreen.tsx
      StepDetailScreen.tsx
    goalsheet/
      GoalSheetScreen.tsx
      GoalSection.tsx
      GoalOptionCard.tsx
    roleplay/
      RoleplayScreen.tsx
      ParticipantCard.tsx
    resources/
      ResourcesScreen.tsx
      ResourceCard.tsx
    support/
      SupportScreen.tsx
      RemindersCenter.tsx
      LeadershipWorkspace.tsx
      AdminWorkspace.tsx
```

Extraction order:

1. Pure presentational helpers: `BrandMark`, `HeaderLine`, `BottomNav`, `GlassCard`, `GoldButton`.
2. GoalSheet components, because this has the biggest mobile layout risk.
3. Welcome/Home Smart Agent components.
4. Roadmap and Step Detail.
5. Roleplay.
6. Resources.
7. Support, Leadership, Admin.

Acceptance criteria:

- `App.tsx` becomes an orchestration shell, not a screen container.
- No feature extraction changes backend contracts.
- Existing demo login and all tabs continue working.

## Phase 4 - Hooks Migration

Goal: move logic out of `App.tsx` safely.

Hooks to stabilize/adopt:

- `useAuth`
- `useApi`
- `useTheme`

Additional hooks to create:

- `useSmartAgent`
- `useDashboardData`
- `useGoalSheet`
- `useRoleplay`
- `useResources`
- `useAdminWorkspace`

Important design decision:

- Avoid multiple independent `useAuth()` states. Use an `AuthProvider` or keep auth state in `AppShell` and pass token/logout into API helpers.

Acceptance criteria:

- Session restore works on native and web.
- 401 still clears session.
- Login, logout, demo role switching, and pending Smart Agent action handoff still work.

## Phase 5 - Screen-Level Design Polish

Goal: match Stitch/Executive Sales Intelligence consistently.

Priority order:

1. GoalSheet
   - Compact option cards.
   - Responsive two-column sections.
   - Sticky or highly visible save action.
   - No word-by-word text wrapping.
2. Smart Agent Intro/Home
   - Stronger eye states: idle, listening, thinking, answered.
   - Clear primary action.
   - Less text above the fold.
3. Bottom navigation
   - Stable labels on Android.
   - Consider `Roleplay` instead of `Roleplay Live`.
   - Prevent overlap with device navigation bar.
4. Roadmap/Step Detail
   - Dense rows.
   - Current step emphasis.
   - Run Step CTA remains easy to reach.
5. Roleplay
   - Participant panels resize on small screens.
   - Coach feedback hierarchy.
   - Transcript does not crowd controls.
6. Resources/Support/Admin
   - Action rows over desktop-like tables.
   - Clear restricted content states.
   - Admin/Leadership panels remain role-aware.

Acceptance criteria:

- Screens pass visual QA at 360px, 390px, and 430px widths.
- No major content overlap.
- No clipped CTAs.
- Bottom nav remains readable.
- Smart Agent is visibly the main action surface.

## Phase 6 - Accessibility and QA

Goal: prove the design system is not only prettier, but safer to use.

Tasks:

1. Add accessibility labels to icon-only buttons.
2. Add accessibility roles to cards/buttons where interactive.
3. Ensure focusable inputs have labels.
4. Confirm touch targets are 44px minimum.
5. Regenerate mobile screenshots.
6. Build Android APK and test on physical Android.

QA commands:

```bash
npm run e2e:api
npx expo export --platform web --output-dir /tmp/vcsa-mobile-design-system-check
npm run qa:mobile:screenshots
npm run mobile:build:apk
```

Acceptance criteria:

- API E2E passes.
- Expo export passes.
- Screenshots show no text overlap.
- APK installs and completes demo login, Smart Agent, GoalSheet save, Roleplay turn, Resources access, Support/Profile.

## Suggested Sprint Breakdown

### Sprint DS-1: Stabilize

- Fix token/hook compile issues.
- Make TypeScript health actionable.
- Add foundation validation.

### Sprint DS-2: Tokens + Primitives

- Adopt tokens inside current `App.tsx`.
- Replace `GlassCard`, `GoldButton`, and inputs with shared primitives.
- Keep screen logic in place.

### Sprint DS-3: GoalSheet + Smart Agent

- Extract and polish GoalSheet.
- Extract and polish Agent Eye/Home Smart Agent.
- Validate on Android narrow viewport.

### Sprint DS-4: Roadmap + Roleplay

- Extract Roadmap, Step Detail, Roleplay.
- Improve responsive layout and CTA hierarchy.

### Sprint DS-5: Resources + Role Workspaces

- Extract Resources, Support, Leadership, Admin.
- Polish restricted states, admin rows, certification/readiness.

### Sprint DS-6: QA + APK

- Run visual screenshot pass.
- Run E2E smoke.
- Build APK.
- Produce release notes and known issues.

## Recommended First Implementation Step

Start with **Phase 0**.

Reason: importing the new design system into the live app before fixing `src` type/syntax problems can break the app. Once foundation files compile, token adoption and screen migration become controlled, low-risk work.
