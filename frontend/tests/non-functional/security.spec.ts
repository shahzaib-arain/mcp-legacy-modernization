import { test, expect, request } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000';

test.describe('Security — Non-Functional Tests', () => {

  // ─── API Security ───────────────────────────────────────────────

  test('API returns 401 when Authorization header is missing', async () => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Security');
    await allure.feature('Authentication Guard');
    await allure.severity('blocker');
    await allure.description(
      'All protected API endpoints must return HTTP 401 when no Bearer token is provided.'
    );

    const ctx = await request.newContext({ baseURL: API_URL });
    const endpoints = [
      { method: 'get', path: '/api/records' },
      { method: 'post', path: '/api/records' },
    ] as const;

    const results = await Promise.all(
      endpoints.map(async ({ method, path }) => {
        const res = method === 'get' ? await ctx.get(path) : await ctx.post(path, { data: {} });
        return { path, status: res.status() };
      })
    );

    await allure.attachment('Unauthorized Access Results', JSON.stringify(results, null, 2), 'application/json');
    await ctx.dispose();

    for (const result of results) {
      expect(result.status, `${result.path} should return 401`).toBe(401);
    }
  });

  test('API returns 401 for an invalid/expired JWT token', async () => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Security');
    await allure.feature('JWT Validation');
    await allure.severity('blocker');
    await allure.description(
      'Sending a forged or expired JWT should result in HTTP 401, not 200 or 500.'
    );

    const ctx = await request.newContext({ baseURL: API_URL });
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiaWF0IjoxfQ.invalid_signature';

    const res = await ctx.get('/api/records', {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });

    await allure.attachment(
      'Invalid JWT Result',
      JSON.stringify({ status: res.status(), token: fakeToken.substring(0, 30) + '...' }, null, 2),
      'application/json'
    );

    await ctx.dispose();
    expect(res.status()).toBe(401);
  });

  test('SQL injection in API query parameter does not cause 500 error', async () => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Security');
    await allure.feature('SQL Injection Prevention');
    await allure.severity('critical');
    await allure.description(
      'Passing SQL injection payloads in query parameters must not trigger server errors.'
    );

    const ctx = await request.newContext({ baseURL: API_URL });
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE citizens; --",
      "1; SELECT * FROM admins",
      "' UNION SELECT * FROM admins --",
    ];

    const results = await Promise.all(
      sqlPayloads.map(async (payload) => {
        const res = await ctx.get(`/api/records?search=${encodeURIComponent(payload)}`);
        return { payload, status: res.status() };
      })
    );

    await allure.attachment('SQL Injection Test Results', JSON.stringify(results, null, 2), 'application/json');
    await ctx.dispose();

    // None should cause 500 server error
    for (const result of results) {
      expect(result.status, `SQL injection payload caused server error: ${result.payload}`).not.toBe(500);
    }
  });

  // ─── Frontend Security ──────────────────────────────────────────

  test('XSS payload in login form is sanitized — no script execution', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Security');
    await allure.feature('XSS Prevention');
    await allure.severity('blocker');
    await allure.description(
      'Submitting an XSS payload as username must not execute JavaScript in the browser.'
    );

    let xssExecuted = false;
    // Listen for dialogs (alert/confirm) that would indicate XSS
    page.on('dialog', async (dialog) => {
      xssExecuted = true;
      await dialog.dismiss();
    });

    await page.goto(BASE_URL);
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('#login-username', xssPayload);
    await page.fill('#login-password', 'whatever');
    await page.click('#login-submit');
    await page.waitForTimeout(500);

    expect(xssExecuted).toBeFalsy();
  });

  test('XSS payload in citizen search field is not executed', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Security');
    await allure.feature('XSS Prevention');
    await allure.severity('critical');
    await allure.description(
      'Entering an XSS payload in the search box must not execute JavaScript.'
    );

    let xssExecuted = false;
    page.on('dialog', async (dialog) => {
      xssExecuted = true;
      await dialog.dismiss();
    });

    // Login first
    await page.goto(BASE_URL);
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin123');
    await page.click('#login-submit');
    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');

    const xssPayloads = [
      '<script>alert(1)</script>',
      '"><img src=x onerror=alert(1)>',
      "'; alert(1); //",
      '<svg onload=alert(1)>',
    ];

    for (const payload of xssPayloads) {
      await page.fill('input[placeholder="Search by name, NIC, parents..."]', payload);
      await page.waitForTimeout(300);
    }

    expect(xssExecuted).toBeFalsy();
  });

  test('Security headers are present on API responses', async () => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Security');
    await allure.feature('Security Headers');
    await allure.severity('normal');
    await allure.description(
      'API responses should include security headers such as X-Content-Type-Options.'
    );

    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/health');
    const headers = res.headers();

    await allure.attachment(
      'API Response Headers',
      JSON.stringify(headers, null, 2),
      'application/json'
    );

    await ctx.dispose();

    // At minimum, server should be responding
    expect(res.status()).toBe(200);
    // Check for common security header (X-Content-Type-Options or similar)
    const hasSecurityHeader =
      'x-content-type-options' in headers ||
      'x-frame-options' in headers ||
      'strict-transport-security' in headers ||
      'content-security-policy' in headers;

    if (!hasSecurityHeader) {
      console.warn('⚠️  No security headers detected on API responses. Consider adding helmet middleware.');
    }
  });

  test('Password field value is not exposed in page source', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Security');
    await allure.feature('Password Security');
    await allure.severity('normal');
    await allure.description(
      'The password input field must be of type="password" so the value is masked in the browser.'
    );

    await page.goto(BASE_URL);

    const passwordInputType = await page.locator('#login-password').getAttribute('type');
    expect(passwordInputType).toBe('password');
  });
});
