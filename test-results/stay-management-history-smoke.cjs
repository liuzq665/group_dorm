const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  async function login(account) {
    await page.goto('http://localhost:5173/login');
    await page.locator('[name="loginAccount"]').fill(account);
    await page.locator('[name="password"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await page.getByRole('heading', { name: '工作台' }).waitFor();
  }

  try {
    await login('admin');
    const stayMenu = page.locator('.nav-group[data-nav-group="stay"]');
    await stayMenu.locator('summary').click();
    assert.deepEqual(await stayMenu.locator('.nav-children button').allInnerTexts(), ['全校留宿', '留宿历史']);

    await stayMenu.locator('[data-page="stayHistory"]').click();
    await page.locator('.topbar h1').filter({ hasText: '留宿历史' }).waitFor();
    for (const name of ['student', 'buildingName', 'academicYear', 'vacationType', 'stayDateFrom', 'stayDateTo']) {
      assert.equal(await page.locator(`#stay-history-filter-form [name="${name}"]`).count(), 1, `${name} filter missing\n${await page.locator('body').innerText()}`);
    }
    const returnButton = page.locator('[data-action="stay-history-back"]');
    assert.equal(await returnButton.count(), 1);
    await returnButton.click();
    await page.getByRole('heading', { name: '全校留宿' }).waitFor();
    await page.getByRole('button', { name: '留宿历史' }).waitFor();

    await page.locator('.nav-group[data-nav-group="roles"] summary').click();
    await page.locator('[data-page="students"]').click();
    await page.locator('.role-table-students [data-select-row]').first().waitFor();
    const table = page.locator('.role-table-students');
    const firstTwo = table.locator('tbody tr:not([hidden]) [data-select-row]');
    await firstTwo.nth(0).check();
    await firstTwo.nth(1).check();
    await page.locator('[data-action="student-accommodation-history"]').click();
    await page.getByText('已选 2 名学生').waitFor();
    await page.getByRole('button', { name: '返回学生管理' }).click();
    await page.locator('[data-action="student-accommodation-history"]').click();
    await page.locator('.topbar h1').filter({ hasText: '住宿历史' }).waitFor();
    await page.locator('.history-filter-grid').waitFor();
    assert.equal(await page.locator('.history-student-name').count(), 0, 'No selection should show all history without a student restriction');
    assert.equal(await page.locator('.history-filter-grid').count(), 1, await page.locator('body').innerText());
    assert.deepEqual(errors, []);
    console.log('Stay management/history smoke passed: school stay and history navigation, year/vacation/date filters, multi-student history, and unfiltered all-history access.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
