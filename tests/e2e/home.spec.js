import { test, expect } from '@playwright/test';

test('homepage loads with login form', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('File Upload');
  await expect(page.getByPlaceholder('Username')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('register link shows register form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to Login' })).toBeVisible();
});
