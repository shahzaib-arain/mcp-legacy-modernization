import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = 'http://localhost:5173';

async function loginAndOpenRegisterModal(page: any) {
  await page.goto(BASE_URL);
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', 'admin123');
  await page.click('#login-submit');
  await expect(page.locator('h1')).toContainText('NADRA Admin Panel');
  await page.click('button:has-text("Register Citizen")');
  await expect(page.locator('h3:has-text("Register New Citizen")')).toBeVisible();
}

test.describe('Form Validation — Functional Tests', () => {

  test.beforeEach(async ({ page }) => {
    await allure.suite('Functional');
    await allure.subSuite('Form Validation');
  });

  test('Citizen under 18 years old is rejected', async ({ page }) => {
    await allure.feature('Age Validation');
    await allure.severity('critical');
    await allure.description('Registering a citizen with age < 18 should be rejected by the HTML5 age gate and not submit.');

    await loginAndOpenRegisterModal(page);

    await page.fill('label:has-text("Full Name") input', 'Underage Person');
    await page.fill('label:has-text("NIC Number") input', `35202-${Math.floor(1000000 + Math.random() * 9000000)}-1`);
    await page.fill('label:has-text("Father NIC") input', '12345-1234567-1');
    await page.fill('label:has-text("Mother Name") input', 'Mother Name');
    await page.fill('label:has-text("Birth Certificate") input', 'BC-UNDER-001');
    await page.fill('label:has-text("Resident Form") input', 'RF-UNDER-001');
    await page.selectOption('label:has-text("Marital Status") select', 'single');
    await page.fill('label:has-text("Age") input', '16');

    await page.click('button:has-text("Create Record")');

    // Form should reject submit natively; modal remains open
    await expect(page.locator('h3:has-text("Register New Citizen")')).toBeVisible();
  });

  test('Missing required Citizen Name is rejected', async ({ page }) => {
    await allure.feature('Required Field Validation');
    await allure.severity('normal');
    await allure.description('Submitting without a citizen name should prevent form submission.');

    await loginAndOpenRegisterModal(page);

    // Leave name empty, fill all other required fields
    await page.fill('label:has-text("NIC Number") input', `35202-${Math.floor(1000000 + Math.random() * 9000000)}-1`);
    await page.fill('label:has-text("Father NIC") input', '12345-1234567-1');
    await page.fill('label:has-text("Mother Name") input', 'Mother Name');
    await page.fill('label:has-text("Birth Certificate") input', 'BC-NN-001');
    await page.fill('label:has-text("Resident Form") input', 'RF-NN-001');
    await page.selectOption('label:has-text("Marital Status") select', 'single');
    await page.fill('label:has-text("Age") input', '25');

    await page.click('button:has-text("Create Record")');

    // Modal should remain open due to required input validation
    await expect(page.locator('h3:has-text("Register New Citizen")')).toBeVisible();
  });

  test('Missing NIC Number is rejected', async ({ page }) => {
    await allure.feature('Required Field Validation');
    await allure.severity('normal');
    await allure.description('Submitting without NIC number should prevent form submission.');

    await loginAndOpenRegisterModal(page);

    await page.fill('label:has-text("Full Name") input', 'No NIC Person');
    // Leave NIC empty
    await page.fill('label:has-text("Father NIC") input', '12345-1234567-1');
    await page.fill('label:has-text("Mother Name") input', 'Mother Name');
    await page.fill('label:has-text("Birth Certificate") input', 'BC-NONIC-001');
    await page.fill('label:has-text("Resident Form") input', 'RF-NONIC-001');
    await page.selectOption('label:has-text("Marital Status") select', 'single');
    await page.fill('label:has-text("Age") input', '25');

    await page.click('button:has-text("Create Record")');

    // Modal should remain open
    await expect(page.locator('h3:has-text("Register New Citizen")')).toBeVisible();
  });

  test('Cancel button closes registration modal without saving', async ({ page }) => {
    await allure.feature('Modal Dismiss');
    await allure.severity('minor');
    await allure.description('Clicking Cancel on the registration modal should close it without saving any data.');

    await loginAndOpenRegisterModal(page);

    await page.fill('label:has-text("Full Name") input', 'Should Not Be Saved');

    // Find and click Cancel button
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.first().click();

    // Modal should be gone
    await expect(page.locator('h3:has-text("Register New Citizen")')).not.toBeVisible();
  });

  test('Age zero is rejected', async ({ page }) => {
    await allure.feature('Age Validation');
    await allure.severity('normal');
    await allure.description('Age of 0 should be rejected as it is below the min 18 limit.');

    await loginAndOpenRegisterModal(page);

    await page.fill('label:has-text("Full Name") input', 'Zero Age Person');
    await page.fill('label:has-text("NIC Number") input', `35202-${Math.floor(1000000 + Math.random() * 9000000)}-1`);
    await page.fill('label:has-text("Father NIC") input', '12345-1234567-1');
    await page.fill('label:has-text("Mother Name") input', 'Mother Name');
    await page.fill('label:has-text("Birth Certificate") input', 'BC-ZERO-001');
    await page.fill('label:has-text("Resident Form") input', 'RF-ZERO-001');
    await page.selectOption('label:has-text("Marital Status") select', 'single');
    await page.fill('label:has-text("Age") input', '0');

    await page.click('button:has-text("Create Record")');

    // Modal stays open
    await expect(page.locator('h3:has-text("Register New Citizen")')).toBeVisible();
  });

  test('Search box accepts text input without errors', async ({ page }) => {
    await allure.feature('Search Validation');
    await allure.severity('minor');
    await allure.description('The search input should accept free text without throwing errors.');

    await page.goto(BASE_URL);
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin123');
    await page.click('#login-submit');
    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');

    const searchInput = page.getByPlaceholder('Search by name, NIC, parents...');
    await searchInput.fill('test search query');
    await page.waitForTimeout(800);

    // No error banners should appear
    const errorVisible = await page.locator('div.text-red-400').first().isVisible().catch(() => false);
    expect(errorVisible).toBeFalsy();
  });
});
