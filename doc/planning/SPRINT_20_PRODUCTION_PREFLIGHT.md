# Sprint 20 - Production Preflight

Date: 2026-04-30

## Goal

Add a repeatable production environment preflight so release builds do not ship with local URLs, placeholders, invalid native package IDs, or wildcard CORS.

## Completed

- Added `npm run release:env:check`.
- Added `tools/release/validate-production-env.mjs`.
- Added `doc/release/production.env.example`.
- Updated the mobile release runbook to include the production environment check.

## Validation Rules

The preflight validates:

- `VCSA_CORS_ORIGINS` is present, uses HTTPS origins, and does not use `*`.
- `VITE_API_BASE_URL` is a real HTTPS URL.
- `EXPO_PUBLIC_API_BASE_URL` is a real HTTPS URL.
- `EXPO_IOS_BUNDLE_IDENTIFIER` is a reverse-DNS style identifier.
- `EXPO_ANDROID_PACKAGE` is a reverse-DNS style identifier.
- Localhost, `api.example.com`, `.example.com`, and `.invalid` values are rejected.

## Remaining External Inputs

- Final hosting URL for API and webapp.
- Managed database target and database connection convention.
- Store-specific identifiers if `com.whitelabel.salesacademy` changes.
- Monitoring DSN and provider decision.
