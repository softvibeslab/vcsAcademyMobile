// @ts-check
const base = require('@playwright/test');

/**
 * Custom fixtures shared by all E2E tests.
 * Extend `base.test` here (e.g. authenticated page, API client, seeded data)
 * and import { test, expect } from './fixtures' in your specs.
 * https://playwright.dev/docs/test-fixtures
 */
const test = base.test.extend({
  // Example:
  // authenticatedPage: async ({ page }, use) => {
  //   await page.goto('/');
  //   await page.getByLabel('Email').fill('rep@vcsa.local');
  //   await page.getByLabel('Password').fill('demo123');
  //   await page.getByRole('button', { name: 'Sign in' }).click();
  //   await use(page);
  // },
});

module.exports = { test, expect: base.expect };
