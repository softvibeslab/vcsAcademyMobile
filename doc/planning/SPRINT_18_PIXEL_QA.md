# Sprint 18 - Mobile Pixel QA

Date: 2026-04-30

## Goal

Validate the Expo mobile web preview against the supplied dark/gold WL Sales Academy mockups and close obvious mobile UX mismatches before native build work.

## Scope Completed

- Added reproducible mobile screenshot QA with Playwright:
  - `npm run qa:mobile:screenshots`
  - Output: `doc/qa/sprint18/screenshots/`
- Captured the launch-critical mobile screens:
  - Welcome / Smart Agent access
  - Login
  - Home
  - Top Producer Roadmap
  - Roadmap step detail
  - Smart GoalSheet
  - Roleplay Live
  - Resources
- Fixed visual/navigation findings from the QA pass:
  - Removed duplicated greeting on Home.
  - Split Roadmap list and Step Detail into separate states so Roadmap opens as the blueprint list first.
  - Tightened the logged-in header to avoid clipping on mobile width.
  - Normalized currency display to `$8,450` style.
  - Fixed literal `\n` rendering inside GoalSheet option cards.
  - Reduced metric text pressure in narrow GoalSheet cards.

## QA Evidence

Screenshots:

- `doc/qa/sprint18/screenshots/01-welcome.png`
- `doc/qa/sprint18/screenshots/02-login.png`
- `doc/qa/sprint18/screenshots/03-home.png`
- `doc/qa/sprint18/screenshots/04-roadmap.png`
- `doc/qa/sprint18/screenshots/05-step-detail.png`
- `doc/qa/sprint18/screenshots/06-goalsheet.png`
- `doc/qa/sprint18/screenshots/07-roleplay.png`
- `doc/qa/sprint18/screenshots/08-resources.png`

## Notes

- This pass validates the Expo web preview at `430x932`, approximating an iPhone-sized viewport.
- The current implementation matches layout language, colors, hierarchy, and workflows from the mockups using native React Native components and lucide icons.
- Exact photographic/3D robot artwork from the mockups is still represented by generated UI halos/icons, so final brand-grade launch may still need production image assets before App Store submission.
