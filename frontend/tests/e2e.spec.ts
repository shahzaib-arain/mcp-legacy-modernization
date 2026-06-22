import { test, expect } from '@playwright/test';

test.describe('NADRA Management Portal End-to-End Tests', () => {
  const portalUrl = 'http://localhost:5173';
  const testNic = `PW_${Date.now()}`;

  test('should log in, view dashboard, create, edit and delete citizen', async ({ page }) => {
    // 1. Visit Portal & verify login screen
    await page.goto(portalUrl);
    await expect(page.locator('h2')).toContainText('NADRA Portal');

    // 2. Submit credentials
    await page.fill('input[placeholder="Administrator Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Sign In")');

    // 3. Verify landing on Dashboard
    await expect(page.locator('h1')).toContainText('NADRA Database Management');
    await expect(page.locator('text=Total Directory')).toBeVisible();

    // 4. Register new citizen
    await page.click('button:has-text("Register Citizen")');
    await expect(page.locator('h3:has-text("Register New citizen card")')).toBeVisible();

    await page.fill('label:has-text("Citizen Name") + input', 'Playwright Test User');
    await page.fill('label:has-text("Assign NIC Number") + input', testNic);
    await page.fill('label:has-text("Father or Relative NIC") + input', '12345-6789012-3');
    await page.fill('label:has-text("Mother Name") + input', 'Test Mother');
    await page.fill('label:has-text("Birth Certificate ID") + input', 'BC-PW-888');
    await page.fill('label:has-text("Resident Form Number") + input', 'RF-PW-999');
    await page.selectOption('select', 'married');
    await page.fill('label:has-text("Age Gate Validation") + input', '22');
    
    await page.click('button:has-text("Create NIC")');

    // 5. Verify citizen added in the list grid
    await page.fill('input[placeholder="Search by Name, NIC, Parents..."]', testNic);
    await page.waitForTimeout(1000); // Wait for debounce/grid refresh
    await expect(page.locator('table')).toContainText('Playwright Test User');

    // 6. Edit Citizen details
    await page.click('table tbody tr:first-child button:has-text("")'); // Click first action (edit)
    await expect(page.locator('h3:has-text("Modify Citizen Profile")')).toBeVisible();
    await page.fill('label:has-text("Citizen Name") + input', 'Playwright Test User Edited');
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(500);

    // Verify update
    await expect(page.locator('table')).toContainText('Playwright Test User Edited');

    // 7. Delete Citizen
    await page.click('table tbody tr:first-child button:nth-child(2)'); // Click delete icon
    await expect(page.locator('h3:has-text("Delete Citizen Record?")')).toBeVisible();
    await page.click('button:has-text("Delete Record")');
    await page.waitForTimeout(500);

    // Verify removal
    await expect(page.locator('table')).not.toContainText('Playwright Test User Edited');
  });
});
