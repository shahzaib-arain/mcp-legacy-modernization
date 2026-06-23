import { test, expect, request } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000';

test.describe('Performance — Non-Functional Tests', () => {

  test('Login page loads in under 3 seconds', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Performance');
    await allure.feature('Page Load Time');
    await allure.severity('critical');
    await allure.description(
      'Measure navigation timing for the login page. Total load time must be < 3000 ms.'
    );

    const startTime = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    await allure.attachment(
      'Load Time Metrics',
      JSON.stringify({ pageUrl: BASE_URL, loadTimeMs: loadTime, threshold: 3000 }, null, 2),
      'application/json'
    );

    expect(loadTime).toBeLessThan(3000);
  });

  test('Dashboard loads in under 4 seconds after login', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Performance');
    await allure.feature('Dashboard Load Time');
    await allure.severity('critical');
    await allure.description(
      'After login, the dashboard page should fully render within 4 seconds.'
    );

    await page.goto(BASE_URL);
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin123');

    const startTime = Date.now();
    await page.click('#login-submit');
    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');
    const loadTime = Date.now() - startTime;

    await allure.attachment(
      'Dashboard Load Metrics',
      JSON.stringify({ loadTimeMs: loadTime, threshold: 4000 }, null, 2),
      'application/json'
    );

    expect(loadTime).toBeLessThan(4000);
  });

  test('Web Vitals — First Contentful Paint < 2 seconds', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Performance');
    await allure.feature('Core Web Vitals');
    await allure.severity('normal');
    await allure.description(
      'Measure First Contentful Paint (FCP) using the Performance API. Must be < 2000 ms.'
    );

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    });

    await allure.attachment(
      'FCP Metric',
      JSON.stringify({ firstContentfulPaintMs: fcp, threshold: 2000 }, null, 2),
      'application/json'
    );

    if (fcp !== null) {
      expect(fcp).toBeLessThan(2000);
    }
  });

  test('No memory leaks — heap size stays stable after navigation', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Performance');
    await allure.feature('Memory Usage');
    await allure.severity('normal');
    await allure.description(
      'Navigate login → dashboard multiple times and check heap does not grow excessively.'
    );

    const measurements: number[] = [];

    for (let i = 0; i < 3; i++) {
      await page.goto(BASE_URL);
      await page.fill('#login-username', 'admin');
      await page.fill('#login-password', 'admin123');
      await page.click('#login-submit');
      await expect(page.locator('h1')).toContainText('NADRA Admin Panel');

      const heap = await page.evaluate(() =>
        (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0
      );
      measurements.push(heap);

      // Logout to reset state
      const logoutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
      await logoutBtn.click();
      await expect(page.locator('h1')).toContainText('NADRA Portal');
    }

    await allure.attachment(
      'Heap Usage Over Navigations',
      JSON.stringify({ measurements, unit: 'bytes' }, null, 2),
      'application/json'
    );

    // Heap should not grow more than 50MB between first and last measurement
    if (measurements[0] && measurements[measurements.length - 1]) {
      const growth = measurements[measurements.length - 1] - measurements[0];
      expect(growth).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('API health endpoint responds in under 500ms', async () => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Performance');
    await allure.feature('API Response Time');
    await allure.severity('critical');
    await allure.description(
      'The /health endpoint must respond within 500 ms to be considered performant.'
    );

    const ctx = await request.newContext({ baseURL: API_URL });
    const startTime = Date.now();
    const response = await ctx.get('/health');
    const responseTime = Date.now() - startTime;

    await allure.attachment(
      'Health Endpoint Metrics',
      JSON.stringify({ statusCode: response.status(), responseTimeMs: responseTime, threshold: 500 }, null, 2),
      'application/json'
    );

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(500);

    await ctx.dispose();
  });

  test('API login endpoint responds in under 1 second', async () => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Performance');
    await allure.feature('API Response Time');
    await allure.severity('critical');
    await allure.description(
      'The POST /api/auth/login endpoint should process authentication within 1000 ms.'
    );

    const ctx = await request.newContext({ baseURL: API_URL });
    const startTime = Date.now();
    const response = await ctx.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    const responseTime = Date.now() - startTime;

    await allure.attachment(
      'Login API Metrics',
      JSON.stringify({ statusCode: response.status(), responseTimeMs: responseTime, threshold: 1000 }, null, 2),
      'application/json'
    );

    expect([200, 401]).toContain(response.status());
    expect(responseTime).toBeLessThan(1000);

    await ctx.dispose();
  });
});
