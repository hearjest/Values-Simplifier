import { test, expect } from '@playwright/test';

test.describe('Basic Auth UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/checkToken', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false }),
      });
    });

    await page.route('**/api/getFiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: [] }),
      });
    });

    await page.goto('/index.html');
  });

  test('shows login shell by default', async ({ page }) => {
    await expect(page.locator('#loginShell')).toBeVisible();
    await expect(page.locator('#uploadContainer')).toBeHidden();
    await expect(page.locator('#loginForm')).toBeVisible();
  });

  test('toggles login and register forms', async ({ page }) => {
    await page.click('#showRegister');

    await expect(page.locator('#registerForm')).toBeVisible();
    await expect(page.locator('#loginForm')).toBeHidden();

    await page.click('#showLogin');

    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#registerForm')).toBeHidden();
  });

  test('validates username and password in same error area', async ({ page }) => {
    await page.click('#showRegister');

    await page.fill('#regUsername', 'ab!');
    await page.fill('#regPassword', 'weak');

    const errorText = page.locator('#error');
    await expect(errorText).toContainText('Username: At least 4 characters');
    await expect(errorText).toContainText('Username: Only letters, numbers, underscore, and hyphen allowed');
    await expect(errorText).toContainText('Password: At least 8 characters');
    await expect(page.locator('#registerbutton')).toBeDisabled();

    await page.fill('#regUsername', 'valid_user');
    await page.fill('#regPassword', 'StrongPass!');
    await expect(errorText).toHaveText('');
    await expect(page.locator('#registerbutton')).toBeEnabled();
  });

  test('shows login error message for invalid credentials', async ({ page }) => {
    await page.route('**/api/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid username or password' }),
      });
    });

    await page.fill('#loginUsername', 'nonexistent');
    await page.fill('#loginPassword', 'wrongpassword');
    await page.click('#loginForm button[type="submit"]');

    await expect(page.locator('#authMessage')).toContainText('Invalid username or password');
  });

  test('shows upload view after successful login', async ({ page }) => {
    await page.route('**/api/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Login successful' }),
      });
    });

    await page.fill('#loginUsername', 'demo_user');
    await page.fill('#loginPassword', 'StrongPass!');
    await page.click('#loginForm button[type="submit"]');

    await expect(page.locator('#loginShell')).toBeHidden();
    await expect(page.locator('#uploadContainer')).toBeVisible();
  });
});
