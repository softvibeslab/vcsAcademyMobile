# Mobile Release Runbook

Date: 2026-04-30

## Purpose

This runbook prepares WL Sales Academy for Expo/EAS preview and production builds for iOS and Android.

## Required Decisions

Before running store-grade builds, confirm:

- Production API URL.
- Apple Developer team and bundle identifier.
- Google Play package name.
- Final app icon, adaptive icon, splash assets, and any brand-approved Smart Agent artwork.
- Monitoring provider DSN if error tracking is enabled.

## Required Environment

Set these locally or in EAS environment variables before preview/production builds:

```bash
export EXPO_PUBLIC_API_BASE_URL=https://api.your-production-domain.com
export EXPO_PUBLIC_SENTRY_DSN=
export EXPO_IOS_BUNDLE_IDENTIFIER=com.whitelabel.salesacademy
export EXPO_ANDROID_PACKAGE=com.whitelabel.salesacademy
```

Optional version overrides:

```bash
export EXPO_APP_VERSION=1.0.0
export EXPO_IOS_BUILD_NUMBER=1
export EXPO_ANDROID_VERSION_CODE=1
```

## Preflight

Validate the Expo public config:

```bash
npm run mobile:config
```

For preview/production profiles, config validation intentionally fails if `EXPO_PUBLIC_API_BASE_URL` is missing, points to localhost, or points to `api.example.com`.

## Build Commands

Preview internal builds:

```bash
npm run mobile:build:preview
```

Production builds:

```bash
npm run mobile:build:production
```

Production store submit:

```bash
npm run mobile:submit:production
```

## Validation Before Submission

Run:

```bash
npm run release:check
npm run qa:mobile:screenshots
```

Then verify:

- Login works against the production API.
- Rep Home, Roadmap, Step Detail, GoalSheet, Roleplay, Resources, and Support load on a physical iOS or Android device.
- Auth session restores after app restart.
- Smart Agent returns compliant coaching responses.
- Manager/Admin workflows pass in the webapp against the same API.

## Guardrails In Code

- `apps/mobile/app.config.js` owns dynamic release config.
- `apps/mobile/eas.json` defines `development`, `preview`, and `production` profiles.
- `EXPO_PUBLIC_API_BASE_URL` must be a real HTTPS URL for preview and production.
