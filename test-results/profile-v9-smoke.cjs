const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');
const path = require('node:path');

const baseUrl = process.env.BASE_URL || 'http://localhost:15175';
const accounts = [
  { account: 'admin', page: 'profile', heading: '个人信息', detail: '系统管理员' },
  { account: 'student1', page: 'profile', heading: '个人信息', detail: '张三' },
  { account: 'manager1', page: 'profile', heading: '个人信息', detail: '李老师' },
  { account: 'repair1', page: 'profile', heading: '个人信息', detail: '王师傅' },
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const failedApi = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/api/') && response.status() >= 500) failedApi.push(`${response.status()} ${response.url()}`);
  });
  try {
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('账号', { exact: true }).fill('admin');
    await page.getByLabel('密码', { exact: true }).fill('123456');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.getByRole('heading', { name: '工作台' }).waitFor();
    const group = page.locator('summary').filter({ hasText: '角色管理' });
    assert.equal(await group.count(), 1);
    assert.equal(await group.evaluate(node => getComputedStyle(node, '::after').content), '"▾"');

    await page.locator('[data-page="students"]').click();
    await page.locator('#user-filter-form').waitFor();
    assert.match(await page.locator('#user-filter-form').innerText(), /账号、姓名、电话、学号或工号/);
    assert.equal(await page.locator('#user-filter-form input').count(), 1);
    assert.equal(await page.locator('[data-action="academic-new"], [data-action="academic-edit"]').count(), 0);
    assert.equal(await page.locator('#user-filter-form + .table-wrap tbody tr').count(), 3);
    await page.locator('[name="keyword"]').fill('student2');
    await page.getByRole('button', { name: '查询', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('#user-filter-form + .table-wrap tbody tr').length === 1);
    assert.match(await page.locator('#user-filter-form + .table-wrap tbody tr').innerText(), /张四/);
    await page.screenshot({ path: path.join(__dirname, 'profile-v9-desktop.png'), fullPage: true });

    for (const item of accounts) {
      const rolePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      rolePage.on('pageerror', error => errors.push(error.message));
      rolePage.on('response', response => {
        if (response.url().includes('/api/') && response.status() >= 500) failedApi.push(`${response.status()} ${response.url()}`);
      });
      await rolePage.goto(`${baseUrl}/login`);
      await rolePage.waitForLoadState('networkidle');
      await rolePage.getByLabel('账号', { exact: true }).fill(item.account);
      await rolePage.getByLabel('密码', { exact: true }).fill('123456');
      await rolePage.getByRole('button', { name: '登录', exact: true }).click();
      await rolePage.getByRole('heading', { name: '工作台' }).waitFor();
      await rolePage.locator(`[data-page="${item.page}"]`).click();
      await rolePage.getByRole('heading', { name: item.heading, exact: true }).waitFor();
      await rolePage.getByText(item.detail, { exact: false }).first().waitFor();
      await rolePage.close();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(__dirname, 'profile-v9-mobile.png'), fullPage: true });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(dimensions.document <= dimensions.viewport + 1, JSON.stringify(dimensions));
    assert.deepEqual(errors, []);
    assert.deepEqual(failedApi, []);
    console.log('Browser checks passed: role arrow, searchable student list, read-only academic references, four roles, and mobile width.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
