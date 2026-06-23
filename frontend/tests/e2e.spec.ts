import { test, expect } from '@playwright/test';

test.describe('NADRA Management Portal End-to-End Tests', () => {
  const portalUrl = 'http://localhost:5173';
  const testNic = `54321-${Math.floor(1000000 + Math.random() * 9000000)}-9`;

  test('should log in, view dashboard, create, edit and delete citizen', async ({ page }) => {
    // 1. Visit Portal & verify login screen
    await page.goto(portalUrl);
    await expect(page.locator('h1')).toContainText('NADRA Portal');

    // 2. Submit credentials
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin123');
    await page.click('#login-submit');

    // 3. Verify landing on Dashboard
    await expect(page.locator('h1')).toContainText('NADRA Admin Panel');
    await expect(page.locator('text=Total Citizens')).toBeVisible();

    // 4. Register new citizen
    await page.click('button:has-text("Register Citizen")');
    await expect(page.locator('h3:has-text("Register New Citizen")')).toBeVisible();

    await page.fill('label:has-text("Full Name") input', 'Playwright Test User');
    await page.fill('label:has-text("NIC Number") input', testNic);
    await page.fill('label:has-text("Father NIC") input', '35202-6789012-3');
    await page.fill('label:has-text("Mother Name") input', 'Test Mother');
    await page.fill('label:has-text("Birth Certificate") input', 'BC-PW-888');
    await page.fill('label:has-text("Resident Form") input', 'RF-PW-999');
    await page.selectOption('label:has-text("Marital Status") select', 'married');
    await page.fill('label:has-text("Age") input', '22');
    
    await page.click('button:has-text("Create Record")');

    // 5. Verify citizen added in the list grid
    await page.fill('input[placeholder="Search by name, NIC, parents..."]', testNic);
    await page.waitForTimeout(1000); // Wait for debounce/grid refresh
    await expect(page.locator('table')).toContainText('Playwright Test User');

    // 6. Edit Citizen details
    await page.click('table tbody tr:first-child td:last-child button:first-child');
    await expect(page.locator('h3:has-text("Modify Citizen Profile")')).toBeVisible();
    await page.fill('label:has-text("Full Name") input', 'Playwright Test User Edited');
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);

    // Verify update
    await page.fill('input[placeholder="Search by name, NIC, parents..."]', testNic);
    await expect(page.locator('table')).toContainText('Playwright Test User Edited');

    // 7. Delete Citizen
    await page.click('table tbody tr:first-child td:last-child button:nth-child(2)');
    await expect(page.locator('h3:has-text("Delete Citizen Record?")')).toBeVisible();
    await page.click('button:has-text("Delete")'); // The delete confirm button says "Delete"
    await page.waitForTimeout(1000);

    // Verify removal
    await page.fill('input[placeholder="Search by name, NIC, parents..."]', testNic);
    await expect(page.locator('table')).not.toContainText('Playwright Test User Edited');
  });
});
