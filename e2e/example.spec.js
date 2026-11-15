// @ts-check
const { test, expect } = require('@playwright/test');

// The web app renders the sign-in screen when no session token is stored.
// These smoke tests only rely on the frontend, so they pass without the FastAPI backend.
test.describe('Sign-in page', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/WL Sales Academy/);
  });

  test('should show the sign-in form', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Sign in to the Blueprint command center/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
