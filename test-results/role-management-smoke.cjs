const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');
const path = require('node:path');
const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const failedApi = [];
  const apiResponses = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      apiResponses.push(`${response.status()} ${response.url()}`);
      if (response.status() >= 500) failedApi.push(`${response.status()} ${response.url()}`);
    }
  });
  try {
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('账号', { exact: true }).fill('admin');
    await page.getByLabel('密码', { exact: true }).fill('123456');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.waitForTimeout(1000);
    if (await page.locator('#login-form').count()) throw new Error(`Login stayed on form: ${await page.locator('#app').innerText()}`);
    if (await page.locator('.panel .error').count()) throw new Error(`Dashboard failed: ${await page.locator('main').innerText()}`);
    await page.getByRole('heading', { name: '工作台', exact: true }).waitFor();
    await page.waitForLoadState('networkidle');

    assert.equal(await page.locator('[data-page="users"]').count(), 0);
    assert.equal(await page.locator('summary').filter({ hasText: '角色管理' }).count(), 1);
    await page.locator('[data-page="students"]').click();
    await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('正在加载...'));
    await page.locator('#user-filter-form').waitFor({ timeout: 15000 }).catch(async () => {
      throw new Error(`Student list did not render: ${await page.locator('main').innerText()}\nAPI: ${apiResponses.join('\n')}`);
    });
    await page.locator('h1').filter({ hasText: '学生管理' }).waitFor();
    await page.waitForLoadState('networkidle');
    assert.match(await page.locator('main').innerText(), /学院/);
    assert.match(await page.locator('main').innerText(), /张三/);
    assert.equal(await page.locator('#user-filter-form + .table-wrap tbody tr').count(), 3);
    await page.screenshot({ path: path.join(__dirname, 'role-management-desktop.png'), fullPage: true });

    await page.locator('[name="account"]').fill('student1');
    await page.locator('[name="realName"]').fill('张三');
    await page.locator('[name="phone"]').fill('13800000001');
    await page.getByRole('button', { name: '查询', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('#user-filter-form + .table-wrap tbody tr').length === 1);
    assert.equal(await page.locator('#user-filter-form + .table-wrap tbody tr').count(), 1, apiResponses.join('\n'));

    await page.locator('[data-action="user-filter-reset"]').click();
    await page.waitForLoadState('networkidle');
    await page.locator('[name="keyword"]').fill('student2');
    const keywordResponse = page.waitForResponse(response => response.url().includes('/admin/users?') && response.url().includes('keyword='));
    await page.getByRole('button', { name: '查询', exact: true }).click();
    await keywordResponse;
    await page.waitForFunction(() => document.querySelectorAll('#user-filter-form + .table-wrap tbody tr').length === 1);
    assert.equal(await page.locator('#user-filter-form + .table-wrap tbody tr').count(), 1, apiResponses.join('\n'));
    assert.match(await page.locator('#user-filter-form + .table-wrap tbody tr').innerText(), /张四/);

    await page.locator('[data-page="managers"]').click();
    await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('正在加载...'));
    assert.match(await page.locator('main').innerText(), /李老师/);
    assert.match(await page.locator('main').innerText(), /负责楼栋/);
    await page.locator('[data-page="repairers"]').click();
    await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('正在加载...'));
    assert.match(await page.locator('main').innerText(), /王师傅/);
    assert.match(await page.locator('main').innerText(), /水暖维修/);

    await page.locator('[data-page="profile"]').click();
    await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('正在加载...'));
    assert.match(await page.locator('main').innerText(), /系统管理员/);
    assert.match(await page.locator('main').innerText(), /入职时间/);
    await page.locator('[data-action="profile-edit"]').click();
    assert.equal(await page.locator('dialog [name="employeeNo"]').count(), 1);
    assert.equal(await page.locator('dialog [name="hireDate"]').count(), 1);
    await page.locator('dialog [data-close]').click();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-page="students"]').click();
    await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('正在加载...'));
    await page.screenshot({ path: path.join(__dirname, 'role-management-mobile.png'), fullPage: true });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(dimensions.document <= dimensions.viewport + 1, JSON.stringify(dimensions));
    assert.deepEqual(errors, []);
    assert.deepEqual(failedApi, []);
    console.log('Browser checks passed: role navigation, student filters, staff lists, admin profile, mobile layout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
