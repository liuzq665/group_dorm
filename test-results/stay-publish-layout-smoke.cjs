const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

async function login(page, account) {
  await page.goto(`${baseUrl}/login`);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.locator('[name="loginAccount"]').fill(account);
  await page.locator('[name="password"]').fill('123456');
  await page.getByRole('button', { name: '登录' }).click();
  await page.getByRole('heading', { name: '工作台' }).waitFor();
}

async function openStayPage(page, group, pageName, heading) {
  const navGroup = page.locator(`.nav-group[data-nav-group="${group}"]`);
  await navGroup.locator('summary').click();
  await navGroup.locator(`[data-page="${pageName}"]`).click();
  await page.getByRole('heading', { name: heading }).waitFor();
}

async function verifyOperationColumns(page) {
  for (const table of await page.locator('.table-component').all()) {
    const header = table.locator('thead th:last-child');
    if (await header.count() === 0 || (await header.innerText()).trim() !== '操作') continue;
    const headerStart = await header.evaluate(element => { const range=document.createRange(); range.selectNodeContents(element); return range.getBoundingClientRect().x; });
    const groups = table.locator('tbody tr td:last-child > .actions');
    if (await groups.count() === 0) continue;
    const widths = await groups.evaluateAll(items => items.map(item => getComputedStyle(item).width));
    assert.ok(widths.every(width => width === widths[0]), 'operation containers must use the widest row width');
    for (const group of await table.locator('tbody tr:not([hidden]) td:last-child > .actions').all()) {
      const first = group.locator('button').first();
      if (await first.count()) assert.ok(Math.abs((await first.boundingBox()).x - headerStart) < 4, 'first operation must align left with the operation heading');
      const groupBox = await group.boundingBox();
      const tableBox = await table.locator('.table').boundingBox();
      assert.ok(groupBox.x + groupBox.width <= tableBox.x + tableBox.width - 2, 'operation container extends past the table right edge');
    }
  }
}

function assertSingleLine(buttons, message) {
  if (buttons.length < 2) return;
  const y = buttons[0].y;
  assert.ok(buttons.every(box => Math.abs(box.y - y) < 2), message);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await login(page, 'admin');
    await openStayPage(page, 'stay', 'staySchool', '全校留宿');
    await page.locator('.stay-school-batch-panel [data-action="stay-publish"]').first().waitFor({ timeout: 30000 });
    const batchRows = page.locator('.stay-school-batch-panel .table tbody tr:not([hidden])');
    assert.ok(await batchRows.count() > 0, 'expected current stay batches');
    for (const row of await batchRows.all()) {
      assert.equal(await row.locator('[data-action="stay-publish"]').count(), 1, 'every batch row must expose 发布消息');
      const heading = await row.locator('xpath=ancestor::table/thead/tr/th[last()]').evaluate(element => { const range=document.createRange(); range.selectNodeContents(element); const box=range.getBoundingClientRect(); return {x:box.x,width:box.width}; });
      const group = row.locator('td:last-child .actions');
      const actionGroup = await group.boundingBox();
      assert.ok(heading && actionGroup && Math.abs(heading.x - actionGroup.x) < 4, 'first operation must align with the left edge of its heading');
      const buttons = await Promise.all((await row.locator('td:last-child .actions button').all()).map(button => button.boundingBox()));
      assertSingleLine(buttons, 'batch operation buttons wrapped');
    }
    const actionWidths = await page.locator('.stay-school-batch-panel tbody td:last-child .actions').evaluateAll(groups => groups.map(group => Math.round(group.getBoundingClientRect().width)));
    assert.ok(actionWidths.every(width => width === actionWidths[0]), 'all batch rows must use the same action container width');
    await page.screenshot({ path: 'test-results/stay-school-publish-smoke.png', fullPage: true });
    await verifyOperationColumns(page);

    const repairMenu = page.locator('.nav-group[data-nav-group="repair"]');
    await repairMenu.locator('summary').click();
    await repairMenu.locator('[data-page="repairs"]').click();
    await page.getByRole('heading', { name: '全校报修' }).waitFor();
    await verifyOperationColumns(page);
    await repairMenu.locator('[data-page="repairHistory"]').click();
    await page.getByRole('heading', { name: '报修历史' }).waitFor();
    await verifyOperationColumns(page);
    await repairMenu.locator('[data-page="rules"]').click();
    await page.getByRole('heading', { name: '报修规则' }).waitFor();
    await verifyOperationColumns(page);

    await login(page, 'demo_manager_05');
    await openStayPage(page, 'stay', 'stayManager', '全楼留宿');
    await page.locator('#stay-manager-deadline-form').waitFor();
    await page.locator('#stay-manager-filter-form [name="studentNo"]').waitFor();
    await page.locator('#stay-manager-filter-form [name="studentName"]').waitFor();
    assert.equal(await page.locator('#stay-manager-filter-form [name="student"]').count(), 0, '学号 and 姓名 must be separate filters');
    assert.ok(await page.locator('.bulk-table[data-bulk-type="stay-manager"] tbody tr').count() > 0, 'manager stay application list should show applications in the selected building and batch');
    for (const label of ['全部', '待审核', '已锁定', '审核通过']) await page.getByRole('button', { name: label, exact: true }).waitFor();
    const filter = page.locator('#stay-manager-filter-form');
    assert.ok(await page.locator('.stay-manager-settings').innerText().then(text => text.includes('负责楼栋') === false), 'manager building name should be present in settings');
    const fieldBoxes = await Promise.all((await filter.locator('.field input, .field select').all()).map(input => input.boundingBox()));
    const queryBox = await filter.getByRole('button', { name: '查询' }).boundingBox();
    assert.ok(queryBox && fieldBoxes.every(box => box && Math.abs(box.y - queryBox.y) < 3), 'query and clear buttons must share the filter-control row');
    const deadlineBox = await page.locator('#stay-manager-deadline-form [name="applicationDeadline"]').boundingBox();
    const saveBox = await page.locator('#stay-manager-deadline-form button[type="submit"]').boundingBox();
    assert.ok(deadlineBox && saveBox, 'deadline and save controls must be visible');
    await page.screenshot({ path: 'test-results/stay-manager-layout-smoke.png', fullPage: true });
    await verifyOperationColumns(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(widths.document <= widths.viewport, `mobile page has horizontal overflow: ${JSON.stringify(widths)}`);
    for (const row of await page.locator('.bulk-table[data-bulk-type="stay-manager"] tbody tr:not([hidden])').all()) {
      const buttons = await row.locator('td:last-child .actions button').all();
      const boxes = await Promise.all(buttons.map(button => button.boundingBox()));
      assert.ok(boxes.every(box => box && box.x >= 0 && box.x + box.width <= widths.viewport), 'mobile action button is clipped or outside the viewport');
      for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) assert.ok(boxes[i].x + boxes[i].width <= boxes[j].x || boxes[j].x + boxes[j].width <= boxes[i].x || boxes[i].y + boxes[i].height <= boxes[j].y || boxes[j].y + boxes[j].height <= boxes[i].y, 'mobile operation buttons overlap');
    }
    await page.screenshot({ path: 'test-results/stay-manager-mobile-smoke.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Passed: per-batch publishing, visible building deadline configuration, filter alignment, and responsive overflow checks.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
