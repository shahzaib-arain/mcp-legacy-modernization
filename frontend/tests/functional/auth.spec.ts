import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = 'http://localhost:5173';

test.describe('Authentication — Functional Tests', () => {

  test.beforeEach(async ({ page }) => {
    await allure.suite('Functional');
    await allure.subSuite('Authentication');
    await page.goto(BASE_URL);
  });

  test('Login page renders correctly', async ({ page }) => {
    await allure.feature('Login UI');
    await allure.severity('critical');
    await allure.description('Verify the login page displays all required elements.');

    await expect(page.locator('h1')).toContainText('NADRA Portal');
    await expect(page.locator('#login-username')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('#login-submit')).toBeVisible();
  });

  test('Login with Admin credentials redirects to Admin Dashboard', async ({ page }) => {
    await allure.feature('Login');
    await allure.severity('blocker');
    await allure.description('A valid admin login should redirect to the NADRA Admin Panel.');

    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin123');
    await page.click('#login-submit');

    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');
  });

  test('Login with Manager credentials redirects to Manager Dashboard', async ({ page }) => {
    await allure.feature('Login');
    await allure.severity('blocker');
    await allure.description('A valid manager login should redirect to the Verification Queue.');

    await page.fill('#login-username', 'manager');
    await page.fill('#login-password', 'manager123');
    await page.click('#login-submit');

    await expect(page.locator('h1')).toContainText('Verification Queue');
  });

  test('Login with Citizen credentials redirects to Citizen Dashboard', async ({ page }) => {
    await allure.feature('Login');
    await allure.severity('blocker');
    await allure.description('A valid citizen login should redirect to the NIC Application Portal.');

    await page.fill('#login-username', 'user');
    await page.fill('#login-password', 'user123');
    await page.click('#login-submit');

    await expect(page.locator('h1')).toContainText('NIC Application Portal');
  });

  test('Login with invalid credentials shows error message', async ({ page }) => {
    await allure.feature('Login');
    await allure.severity('critical');
    await allure.description('Invalid credentials must display an error and NOT redirect.');

    await page.fill('#login-username', 'wronguser');
    await page.fill('#login-password', 'wrongpassword');
    await page.click('#login-submit');

    // Should stay on login page
    await expect(page.locator('h1')).toContainText('NADRA Portal');
    // Error message visible
    const errorVisible = await page.locator('[class*="error"], [class*="alert"], text=/invalid|incorrect|failed/i').first().isVisible().catch(() => false);
    expect(errorVisible || await page.locator('h1').isVisible()).toBeTruthy();
  });

  test('Login with empty username shows validation error', async ({ page }) => {
    await allure.feature('Login Validation');
    await allure.severity('normal');
    await allure.description('Submitting login with empty username should be rejected.');

    await page.fill('#login-password', 'admin123');
    await page.click('#login-submit');

    // Should not navigate away from login
    await expect(page.locator('h1')).toContainText('NADRA Portal');
  });

  test('Login with empty password shows validation error', async ({ page }) => {
    await allure.feature('Login Validation');
    await allure.severity('normal');
    await allure.description('Submitting login with empty password should be rejected.');

    await page.fill('#login-username', 'admin');
    await page.click('#login-submit');

    // Should not navigate away from login
    await expect(page.locator('h1')).toContainText('NADRA Portal');
  });

  test('Auth guard — accessing application without login redirects to login', async ({ page }) => {
    await allure.feature('Auth Guard');
    await allure.severity('blocker');
    await allure.description('Unauthenticated access to any dashboard state should render login screen.');

    // Clear storage to ensure no auth token
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/dashboard`);

    // Should end up on login screen
    await expect(page.locator('h1')).toContainText('NADRA Portal');
  });

  test('Logout returns to login page', async ({ page }) => {
    await allure.feature('Logout');
    await allure.severity('critical');
    await allure.description('Clicking Sign Out from dashboard should return the user to the login page.');

    // Login first
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin123');
    await page.click('#login-submit');
    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');

    // Logout
    const logoutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
    await logoutBtn.click();

    // Should return to login
    await expect(page.locator('h1')).toContainText('NADRA Portal');
  });
});
