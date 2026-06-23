import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = 'http://localhost:5173';

async function loginAs(page: any, role: 'admin' | 'manager' | 'user') {
  await page.goto(BASE_URL);
  await page.fill('#login-username', role);
  await page.fill('#login-password', role + '123');
  await page.click('#login-submit');
}

test.describe('Citizen Management & RBAC Pipeline — Functional Tests', () => {

  test('Dashboard displays summary statistics', async ({ page }) => {
    await allure.suite('Functional');
    await allure.subSuite('Citizen Management');
    await allure.feature('Dashboard Stats');
    await allure.severity('normal');
    await allure.description('Dashboard should display registry count cards.');

    await loginAs(page, 'admin');
    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');
    await expect(page.locator('.rounded-xl:has-text("Total Citizens")').first()).toBeVisible();
    await expect(page.locator('.rounded-xl:has-text("Single")').first()).toBeVisible();
    await expect(page.locator('.rounded-xl:has-text("Married")').first()).toBeVisible();
  });

  test('Citizen list table renders with columns', async ({ page }) => {
    await allure.suite('Functional');
    await allure.subSuite('Citizen Management');
    await allure.feature('Citizen Directory');
    await allure.severity('normal');
    await allure.description('The citizen records table should be visible with columns.');

    await loginAs(page, 'admin');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Name")').first()).toBeVisible();
    await expect(page.locator('th:has-text("NIC")').first()).toBeVisible();
  });

  test('Register Citizen modal opens on button click', async ({ page }) => {
    await allure.suite('Functional');
    await allure.subSuite('Citizen Management');
    await allure.feature('Citizen Registration');
    await allure.severity('critical');
    await allure.description('Clicking Register Citizen should open the registration modal.');

    await loginAs(page, 'admin');
    await page.click('button:has-text("Register Citizen")');
    await expect(page.locator('h3:has-text("Register New Citizen")')).toBeVisible();
  });

  test('Create, Edit, and Delete citizen record end-to-end by Admin', async ({ page }) => {
    await allure.suite('Functional');
    await allure.subSuite('Citizen Management');
    await allure.feature('Admin Direct CRUD');
    await allure.severity('blocker');
    await allure.description('Admin can directly CRUD a citizen record.');

    const tempNic = `54321-${Math.floor(1000000 + Math.random() * 9000000)}-1`;
    const tempName = `E2E Admin ${Date.now()}`;
    const editedName = `${tempName} Edited`;

    await loginAs(page, 'admin');

    // CREATE
    await page.click('button:has-text("Register Citizen")');
    await page.fill('label:has-text("Full Name") input', tempName);
    await page.fill('label:has-text("NIC Number") input', tempNic);
    await page.fill('label:has-text("Father NIC") input', '35202-9876543-1');
    await page.fill('label:has-text("Mother Name") input', 'Admin Mother');
    await page.fill('label:has-text("Birth Certificate") input', 'BC-ADM-999');
    await page.fill('label:has-text("Resident Form") input', 'RF-ADM-999');
    await page.selectOption('label:has-text("Marital Status") select', 'single');
    await page.fill('label:has-text("Age") input', '29');
    await page.click('button:has-text("Create Record")');

    // SEARCH & EDIT
    await page.fill('input[placeholder="Search by name, NIC, parents..."]', tempNic);
    await page.waitForTimeout(1000);
    await expect(page.locator('table')).toContainText(tempName);

    // Edit button (first button in Actions column)
    await page.click('table tbody tr:first-child td:last-child button:first-child');
    await expect(page.locator('h3:has-text("Modify Citizen Profile")')).toBeVisible();
    await page.fill('label:has-text("Full Name") input', editedName);
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);

    // Verify change in table
    await page.fill('input[placeholder="Search by name, NIC, parents..."]', tempNic);
    await expect(page.locator('table')).toContainText(editedName);

    // DELETE
    await page.click('table tbody tr:first-child td:last-child button:nth-child(2)');
    await expect(page.locator('h3:has-text("Delete Citizen Record?")')).toBeVisible();
    await page.click('button:has-text("Delete")');
    await page.waitForTimeout(1000);

    // Verify deleted
    await page.fill('input[placeholder="Search by name, NIC, parents..."]', tempNic);
    await expect(page.locator('table')).not.toContainText(editedName);
  });

  test('Search filters citizen list correctly', async ({ page }) => {
    await allure.suite('Functional');
    await allure.subSuite('Citizen Management');
    await allure.feature('Citizen Search');
    await allure.severity('normal');
    await allure.description('Search box should filter the citizen table in real-time.');

    await loginAs(page, 'admin');
    const searchInput = page.getByPlaceholder('Search by name, NIC, parents...');
    await searchInput.fill('NonExistentSearchXYZ987');
    await page.waitForTimeout(1000);

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('RBAC Pipeline: Citizen submit -> Manager verify -> Admin approve with unique NIC', async ({ page }) => {
    await allure.suite('Functional');
    await allure.subSuite('Citizen Management');
    await allure.feature('RBAC Pipeline Flow');
    await allure.severity('blocker');
    await allure.description('End-to-end RBAC verification pipeline flow.');

    const citizenName = `Citizen E2E ${Date.now()}`;
    const birthCert = `BC-E2E-${Date.now()}`;

    // 1. Citizen submits application
    await loginAs(page, 'user');
    await expect(page.locator('h1')).toContainText('NIC Application Portal');
    await page.click('#apply-nic-btn');

    await page.fill('label:has-text("Full Name") input', citizenName);
    await page.fill('label:has-text("Age") input', '22');
    await page.fill('label:has-text("Father / Relative NIC") input', '35202-1234567-1');
    await page.fill('label:has-text("Mother\'s Name") input', 'Citizen E2E Mother');
    await page.fill('label:has-text("Birth Certificate No.") input', birthCert);
    await page.fill('label:has-text("Resident Form No.") input', 'RF-CITIZEN-001');
    await page.selectOption('label:has-text("Marital Status") select', 'single');
    
    await page.click('#submit-application-btn');
    await page.waitForTimeout(1000);

    // Verify request is PENDING_MANAGER on Citizen Dashboard
    await expect(page.locator('table')).toContainText(citizenName);
    await expect(page.locator('table')).toContainText('Awaiting Manager');

    // Logout
    await page.click('button:has-text("Sign Out")');

    // 2. Manager reviews & forwards to Admin
    await loginAs(page, 'manager');
    await expect(page.locator('h1')).toContainText('Verification Queue');
    
    // Find the record and click Review
    await page.click(`tr:has-text("${citizenName}") button:has-text("Review")`);
    await expect(page.locator('h3:has-text("Review Application")')).toBeVisible();

    // Verify & Forward
    await page.click('#verify-forward-btn');
    await page.waitForTimeout(1000);

    // Verify it is removed from Manager queue
    await expect(page.locator('table')).not.toContainText(citizenName);

    // Logout
    await page.click('button:has-text("Sign Out")');

    // 3. Admin final approval & unique NIC generation
    await loginAs(page, 'admin');
    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');

    // Switch to Manager Requests tab
    await page.click('#approvals-tab');
    await page.waitForTimeout(500);

    // Click Review on the request
    await page.click(`tr:has-text("${citizenName}") button:has-text("Review")`);
    await expect(page.locator('h3:has-text("Review Approval Request")')).toBeVisible();

    // Approve & Generate NIC
    await page.click('#approve-request-btn');
    await expect(page.locator('h3:has-text("Confirm NIC Auto-Generation")')).toBeVisible();
    await page.click('#confirm-generate-nic-btn');
    await page.waitForTimeout(1000);

    // Verify approved request disappears from approvals queue
    await expect(page.locator(`text=${citizenName}`)).not.toBeVisible();

    // Switch back to Citizen Registry tab and verify record exists with manager name
    await page.click('#approvals-tab'); // Toggle just in case, wait, click Citizen Registry
    await page.click('button:has-text("Citizen Registry")');
    await page.fill('input[placeholder="Search by name, NIC, parents..."]', citizenName);
    await page.waitForTimeout(1000);

    await expect(page.locator('table')).toContainText(citizenName);
    // Verify Manager name shows in registry columns or details
    await expect(page.locator('table')).toContainText('manager', { ignoreCase: true });
  });

  test('Pagination controls work correctly', async ({ page }) => {
    await allure.suite('Functional');
    await allure.subSuite('Citizen Management');
    await allure.feature('Pagination');
    await allure.severity('minor');
    await allure.description('Pagination buttons should navigate through citizen pages.');

    await loginAs(page, 'admin');
    const nextBtn = page.locator('button:has-text("Next"), button[aria-label*="next" i]');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('table')).toBeVisible();
    }
  });
});
