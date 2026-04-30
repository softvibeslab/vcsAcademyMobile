# Sprint 19 - Mobile Release Prep

Date: 2026-04-30

## Goal

Move the Expo mobile app from design-validated candidate to EAS-build-ready candidate for iOS and Android.

## Completed

- Added dynamic Expo config in `apps/mobile/app.config.js`.
- Added release guards so preview/production builds cannot use localhost or `api.example.com`.
- Added configurable native identifiers:
  - `EXPO_IOS_BUNDLE_IDENTIFIER`
  - `EXPO_ANDROID_PACKAGE`
  - build number / version code overrides
- Removed hardcoded production placeholder API URL from `apps/mobile/eas.json`.
- Added EAS commands:
  - `npm run mobile:config`
  - `npm run mobile:build:preview`
  - `npm run mobile:build:production`
  - `npm run mobile:submit:production`
- Added release environment examples in `.env.example`.
- Added `doc/release/MOBILE_RELEASE_RUNBOOK.md`.

## Validation

- `npm run mobile:config` resolves local development config.
- Preview config resolves successfully when a real HTTPS API URL is provided.
- Preview config fails intentionally when the API URL is `https://api.example.com`.

## Remaining External Inputs

- Real production API URL.
- Apple Developer account/team.
- Google Play Console app.
- Final store metadata and privacy answers.
- Final approved icon/splash/brand artwork.
- Monitoring DSN if Sentry or another provider is selected.
