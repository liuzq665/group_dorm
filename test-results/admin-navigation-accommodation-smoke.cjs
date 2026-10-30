const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  let historyRequests = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/v1/accommodations/history') historyRequests += 1;
  });

  try {
    await page.goto('http://localhost:5173/login');
    await page.locator('[name="loginAccount"]').fill('admin');
    await page.locator('[name="password"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await page.getByRole('heading', { name: '工作台' }).waitFor();

    const groups = page.locator('.nav-group');
    assert.equal(await groups.count(), 3);
    assert.equal(await page.locator('.nav-group[open]').count(), 0);
    assert.equal(await page.locator('.nav-group[data-nav-group="repair"] summary').innerText(), '报修管理');
    assert.equal(await page.locator('.nav-group[data-nav-group="dorm"] summary').innerText(), '宿舍管理');
    assert.equal(await page.locator('.nav-group[data-nav-group="roles"] summary').innerText(), '角色管理');
    assert.equal(await page.locator('[data-page="rules"]').count(), 1);

    const logout = page.locator('#logout');
    const originalLogoutBottom = await logout.evaluate(element => element.getBoundingClientRect().bottom);
    await page.locator('.nav-group[data-nav-group="repair"] summary').click();
    assert.deepEqual(await page.locator('.nav-group[data-nav-group="repair"] .nav-children button').allInnerTexts(), ['全校报修', '报修规则']);
    assert.equal(await logout.evaluate(element => element.getBoundingClientRect().bottom), originalLogoutBottom);
    await page.locator('.nav-group[data-nav-group="repair"] summary').click();
    await page.locator('.nav-group[data-nav-group="dorm"] summary').click();
    assert.deepEqual(await page.locator('.nav-group[data-nav-group="dorm"] .nav-children button').allInnerTexts(), ['楼栋管理', '宿舍管理', '床位管理', '住宿历史']);
    const expandedLogoutBottom = await logout.evaluate(element => element.getBoundingClientRect().bottom);
    assert.ok(Math.abs(expandedLogoutBottom - originalLogoutBottom) < 1, `${originalLogoutBottom} -> ${expandedLogoutBottom}`);
    assert.equal(await page.locator('[data-page="buildings"]').innerText(), '楼栋管理');
    assert.equal(await page.locator('[data-page="rooms"]').innerText(), '宿舍管理');
    assert.equal(await page.locator('[data-page="beds"]').innerText(), '床位管理');
    assert.equal(await page.locator('[data-page="accommodationHistory"]').innerText(), '住宿历史');
    assert.equal(await page.locator('[data-page="accommodation"]').count(), 0);
    assert.equal(await page.locator('[data-page="repairs"]').count(), 1);
    assert.equal(await page.locator('.nav > [data-page="rules"]').count(), 0);

    assert.equal(historyRequests, 0, 'History should not load before the history menu is opened');
    await page.locator('[data-page="accommodationHistory"]').click();
    await page.getByRole('heading', { name: '住宿历史' }).waitFor();
    await page.locator('#list-search').waitFor();
    assert.equal(historyRequests, 1);
    const historyTable = page.locator('.panel').filter({ has: page.locator('#list-search') }).locator('.table-component');
    const headers = await historyTable.locator('thead th').allInnerTexts();
    for (const header of ['学号', '姓名', '账号', '楼栋', '宿舍', '床位', '入住日期', '退宿日期']) assert.ok(headers.includes(header));
    assert.equal(await historyTable.locator('.table-pagination').count(), 1);
    assert.equal(await historyTable.locator('tbody tr:not([hidden])').count(), 8);
    const firstStudentNo = await historyTable.locator('tbody tr:not([hidden])').first().locator('td').first().innerText();
    await page.locator('#list-search').fill(firstStudentNo);
    assert.ok(await historyTable.locator('tbody tr:not([hidden])').count() > 0);
    await page.locator('#list-search').fill('no-such-student');
    assert.equal(await historyTable.locator('tbody tr:not([hidden])').count(), 0);

    await page.locator('.nav-group[data-nav-group="roles"] summary').click();
    await page.locator('[data-page="students"]').click();
    await page.locator('#user-filter-form').waitFor();
    const studentPanel = page.locator('.panel').filter({ has: page.locator('#user-filter-form') });
    assert.deepEqual(await studentPanel.locator('.toolbar .actions button').allInnerTexts(), ['新增学生', '分配/调整宿舍', '住宿历史', '批量删除']);
    await studentPanel.locator('[data-action="student-accommodation-history"]').click();
    await page.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('请勾选一名学生查看住宿历史'));
    const selectedRow = page.locator('.role-table-students tbody tr:not([hidden])').first();
    const studentName = (await selectedRow.locator('td[data-label="姓名"]').innerText()).trim();
    await selectedRow.locator('[data-select-row]').check();
    const studentHistoryRequest = page.waitForRequest(request => new URL(request.url()).pathname === '/api/v1/accommodations/history');
    await studentPanel.locator('[data-action="student-accommodation-history"]').click();
    await studentHistoryRequest;
    const studentHistoryDialog = page.locator('dialog.dialog');
    assert.ok((await studentHistoryDialog.locator('h2').innerText()).includes(studentName));
    assert.ok(await studentHistoryDialog.locator('.table-component tbody tr').count() > 0);
    await studentHistoryDialog.locator('[data-close]').click();
    assert.equal(historyRequests, 2);

    await page.reload();
    await page.getByRole('heading', { name: '工作台' }).waitFor();
    assert.equal(await page.locator('.nav-group[open]').count(), 0, 'Menu groups should start collapsed after refresh');

    await page.locator('#logout').click();
    await page.locator('#login-form').waitFor();
    await page.locator('[name="loginAccount"]').fill('admin');
    await page.locator('[name="password"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await page.getByRole('heading', { name: '工作台' }).waitFor();
    assert.equal(await page.locator('.nav-group[open]').count(), 0, 'Menu groups should start collapsed after a new login');

    await page.setViewportSize({ width: 390, height: 844 });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(dimensions.document <= dimensions.viewport + 1, JSON.stringify(dimensions));
    assert.ok(await page.locator('#logout').isVisible());
    assert.deepEqual(errors, []);
    console.log('Admin navigation/accommodation history smoke passed: grouped menus, history page and student action, collapsed refresh, anchored logout, mobile width.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
