const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5174';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  const apiResponses = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().includes('/api/')) apiResponses.push(`${response.status()} ${response.url()}`); });
  try {
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    await page.locator('[name="loginAccount"]').fill('admin');
    await page.locator('[name="password"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    try {
      await page.getByRole('heading', { name: '工作台' }).waitFor({ timeout: 8000 });
    } catch (error) {
      console.error('Login page:', await page.locator('body').innerText());
      console.error('API responses:', apiResponses);
      console.error('Page errors:', errors);
      throw error;
    }

    await page.locator('[data-page="students"]').click();
    await page.locator('#user-filter-form').waitFor();
    const genderSwitch = page.locator('[data-gender-toggle]');
    assert.equal(await genderSwitch.isChecked(), true);
    assert.equal((await page.locator('.role-table th').allTextContents()).includes('性别'), false);
    await genderSwitch.uncheck();
    await page.waitForFunction(() => document.querySelector('#user-filter-form [name="gender"]')?.value === 'MALE');

    await page.getByRole('button', { name: '新增学生' }).click();
    const form = page.locator('dialog form');
    await form.locator('[name="departmentId"]').selectOption({ index: 1 });
    const major = form.locator('[name="majorId"]');
    await major.selectOption(await major.evaluate(element => [...element.options].find(option => option.value)?.value));
    const grade = form.locator('[name="grade"]');
    const gradeValue = await grade.evaluate(element => [...element.options].find(option => option.value)?.value);
    if (gradeValue) await grade.selectOption(gradeValue);
    const classSelect = form.locator('[name="classId"]');
    await classSelect.selectOption(await classSelect.evaluate(element => [...element.options].find(option => option.value)?.value));
    assert.notEqual(await form.locator('[name="departmentId"]').inputValue(), '');
    await page.locator('dialog [data-close]').click();

    await page.locator('[data-page="managers"]').click();
    await page.locator('#user-filter-form').waitFor();
    assert.equal(await page.locator('[data-gender-toggle]').isChecked(), true);
    assert.equal((await page.locator('.role-table th').allTextContents()).includes('性别'), false);
    await page.locator('.role-table tbody tr').first().locator('[data-action="user-edit"]').click();
    await page.locator('dialog [name="buildingId"]').waitFor();
    assert.equal(await page.locator('dialog [name="buildingId"]').count(), 1);
    const managerFooter = await page.locator('dialog .dialog-footer').boundingBox();
    assert.ok(managerFooter.y + managerFooter.height <= 960);
    await page.locator('dialog [data-close]').click();

    await page.locator('[data-page="repairers"]').click();
    await page.locator('#user-filter-form').waitFor();
    assert.equal(await page.locator('[data-gender-toggle]').isChecked(), false);
    assert.equal((await page.locator('.role-table th').allTextContents()).includes('性别'), false);
    await page.locator('.role-table tbody tr').first().locator('[data-action="user-edit"]').click();
    const dropdown = page.locator('dialog .checkbox-dropdown').first();
    await dropdown.locator('summary').click();
    const firstChoice = dropdown.locator('input[type="checkbox"]').first();
    const choiceName = await firstChoice.locator('xpath=..').locator('span').textContent();
    await firstChoice.check();
    assert.ok((await dropdown.locator('.checkbox-dropdown-value').textContent()).includes(choiceName.trim()));
    await page.locator('dialog [data-close]').click();

    await page.locator('[data-page="students"]').click();
    await page.locator('.role-table tbody tr').first().locator('[data-action="user-edit"]').click();
    assert.match(await page.locator('dialog .edit-extra-action').innerText(), /当前住宿：/);
    await page.locator('dialog [data-student-assign]').click();
    await page.locator('dialog .assignment-form').waitFor();
    assert.equal(await page.locator('dialog .assignment-form > .field').count(), 4);
    assert.equal(await page.locator('dialog [name="buildingFilter"]').getAttribute('size'), '4');
    const availableBed = page.locator('dialog .bed-choice').first();
    await availableBed.waitFor();
    await availableBed.click();
    assert.equal(await availableBed.getAttribute('aria-selected'), 'true');
    await page.locator('dialog [data-close]').click();

    await page.locator('.role-table tbody tr').first().locator('[data-action="user-edit"]').click();
    const passwordBox = await page.locator('dialog [name="password"]').boundingBox();
    const dialogBox = await page.locator('dialog').boundingBox();
    assert.ok(passwordBox.y < dialogBox.y + dialogBox.height);
    await page.locator('dialog [data-close]').click();

    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

    assert.deepEqual(errors, []);
    console.log('Document UI smoke passed: role gender filters, student class cascade and accommodation flow, single-building manager assignment, repair scope labels, mobile width.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
