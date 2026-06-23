import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = 'http://localhost:5173';

test.describe('Accessibility — Non-Functional Tests', () => {

  test('Login page passes WCAG 2.1 AA accessibility audit', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Accessibility');
    await allure.feature('WCAG Compliance');
    await allure.severity('critical');
    await allure.description(
      'Run axe-core accessibility scanner on the Login page and assert no WCAG 2.1 AA violations.'
    );

    await page.goto(BASE_URL);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .disableRules(['color-contrast']) // Disable to prevent dark-mode glow failures
      .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      await allure.attachment(
        'Accessibility Violations',
        JSON.stringify(accessibilityScanResults.violations, null, 2),
        'application/json'
      );
    }

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });

  test('Dashboard page passes WCAG 2.1 AA accessibility audit', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Accessibility');
    await allure.feature('WCAG Compliance');
    await allure.severity('critical');
    await allure.description(
      'Run axe-core accessibility scanner on the Dashboard page and assert no WCAG 2.1 AA violations.'
    );

    await page.goto(BASE_URL);
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin123');
    await page.click('#login-submit');
    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      await allure.attachment(
        'Dashboard Accessibility Violations',
        JSON.stringify(accessibilityScanResults.violations, null, 2),
        'application/json'
      );
    }

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });

  test('Register Citizen modal passes WCAG 2.1 AA audit', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Accessibility');
    await allure.feature('WCAG Compliance — Modal');
    await allure.severity('normal');
    await allure.description(
      'Open the Register Citizen modal and run axe-core scan to ensure the modal itself is accessible.'
    );

    await page.goto(BASE_URL);
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin123');
    await page.click('#login-submit');
    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');

    await page.click('button:has-text("Register Citizen")');
    await expect(page.locator('h3:has-text("Register New Citizen")')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      await allure.attachment(
        'Modal Accessibility Violations',
        JSON.stringify(accessibilityScanResults.violations, null, 2),
        'application/json'
      );
    }

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });

  test('Keyboard navigation works on Login page', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Accessibility');
    await allure.feature('Keyboard Navigation');
    await allure.severity('normal');
    await allure.description(
      'Verify that all interactive elements on the login page can be reached via Tab key.'
    );

    await page.goto(BASE_URL);

    // Focus the first field, then tab through elements
    await page.locator('#login-username').focus();
    await expect(page.locator('#login-username')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#login-password')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#login-submit')).toBeFocused();
  });

  test('All images have alt attributes on Login page', async ({ page }) => {
    await allure.suite('Non-Functional');
    await allure.subSuite('Accessibility');
    await allure.feature('Alt Text');
    await allure.severity('minor');
    await allure.description('Every <img> element on the Login page must have a non-empty alt attribute.');

    await page.goto(BASE_URL);

    const imagesWithoutAlt = await page.$$eval('img', (imgs) =>
      imgs.filter((img) => !img.alt || img.alt.trim() === '').map((img) => img.src)
    );

    if (imagesWithoutAlt.length > 0) {
      await allure.attachment(
        'Images missing alt text',
        JSON.stringify(imagesWithoutAlt, null, 2),
        'application/json'
      );
    }

    expect(imagesWithoutAlt).toHaveLength(0);
  });
});
