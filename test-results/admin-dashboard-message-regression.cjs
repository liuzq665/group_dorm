const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://localhost:5188/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('账号', { exact: true }).fill('admin');
    await page.getByLabel('密码', { exact: true }).fill('123456');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.getByRole('heading', { name: '留宿人数' }).waitFor();
    assert.equal(await page.locator('.dashboard-toc').count(), 0);
    assert.deepEqual(await page.locator('.dashboard-chart-filters select').evaluateAll(nodes => nodes.map(node => node.name)), ['stayPeriod', 'stayBatch', 'stayBuilding']);
    assert.equal(await page.locator('[name="stayPeriod"]').inputValue(), 'year1');
    const firstOpenBatch = await page.evaluate(async () => (await (await fetch('/api/v1/stay/current', { headers: { Authorization: `Bearer ${sessionStorage.getItem('dorm_token')}` } })).json()).data.find(batch => batch.current_status === 'OPEN')?.batch_id);
    if (firstOpenBatch) assert.equal(await page.locator('[name="stayBatch"]').inputValue(), String(firstOpenBatch));
    await page.screenshot({ path: 'test-results/admin-dashboard-regression.png', fullPage: true });
    await page.locator('[name="stayBatch"]').selectOption('all');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const chartState = await page.locator('#stay-analysis-chart').evaluate(node => ({ html: node.innerHTML.slice(0, 240), size: [node.clientWidth, node.clientHeight] }));
    assert.ok(await page.locator('#stay-analysis-chart canvas,#stay-analysis-chart svg').count(), JSON.stringify({ chartState, errors }));

    const stayGroup = page.locator('.nav-group[data-nav-group="stay"]');
    if (!(await stayGroup.evaluate(node => node.open))) await stayGroup.locator('summary').click();
    await page.locator('[data-page="staySchool"]').click();
    await page.locator('#stay-approved-filter-form').waitFor();
    assert.equal(await page.locator('#stay-approved-filter-form .field').count(), 4);
    const rosterRows = await page.locator('#stay-approved-filter-form > .field').evaluateAll(nodes => [...new Set(nodes.map(node => Math.round(node.getBoundingClientRect().top)))]);
    assert.equal(rosterRows.length, 1, `roster filters use multiple rows: ${rosterRows}`);

    await page.locator('[data-page="messages"]').click();
    await page.locator('#message-filter-form').waitFor();
    assert.equal(await page.locator('.message-filter-tabs[aria-label="消息状态"]').count(), 0);
    assert.equal(await page.locator('#message-filter-form [name="read"]').inputValue(), 'unread');
    assert.equal(await page.locator('.table-component').getAttribute('data-table-page-size'), '8');
    await page.setViewportSize({ width: 1440, height: 500 });
    await page.evaluate(() => window.scrollTo(0, 200));
    assert.ok(await page.evaluate(() => window.scrollY) > 0, 'message page needs enough height to exercise scroll retention');
    await page.locator('#message-filter-form button.primary').click();
    await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('正在加载...'));
    assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - 200) < 8, `scrollY=${await page.evaluate(() => window.scrollY)}`);

    await page.locator('[data-page="logs"]').click();
    await page.locator('#log-filter-form').waitFor();
    assert.deepEqual(await page.locator('#log-filter-form select').evaluateAll(nodes => nodes.map(node => node.name)), ['role', 'module']);
    await page.locator('#log-filter-form [name="role"]').selectOption('STUDENT');
    await page.locator('#log-filter-form button.primary').click();
    await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('正在加载...'));
    assert.match(await page.locator('main').innerText(), /操作日志/);
    for (const roleLabel of await page.locator('td[data-label="操作角色"]').allTextContents()) assert.equal(roleLabel, '学生');

    await page.locator('.nav-group[data-nav-group="dorm"] summary').click();
    await page.locator('[data-page="accommodationHistory"]').click();
    await page.locator('#accommodation-history-filter-form').waitFor();
    const dateWidths = await page.locator('#accommodation-history-filter-form .date-range-field').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().width)));
    assert.ok(dateWidths.every(width => width >= 210 && width <= 300), `date range widths=${dateWidths}`);
    const historyAlignment = await page.locator('#accommodation-history-filter-form').evaluate(form => ({ ranges: [...form.querySelectorAll('.date-range-field .range-control')].map(node => node.getBoundingClientRect().top), actions: form.querySelector('.filter-actions').getBoundingClientRect().top }));
    assert.ok(historyAlignment.ranges.every(top => Math.abs(top - historyAlignment.actions) <= 4), `history query controls are misaligned: ${JSON.stringify(historyAlignment)}`);

    await page.locator('.nav-group[data-nav-group="stay"]').evaluate(node => { node.open = true; });
    await page.locator('[data-page="stayHistory"]').click();
    await page.locator('#stay-history-filter-form').waitFor();
    const stayHistoryAlignment = await page.locator('#stay-history-filter-form').evaluate(form => ({ range: form.querySelector('.date-range-field .range-control').getBoundingClientRect().top, actions: form.querySelector('.filter-actions').getBoundingClientRect().top }));
    assert.ok(Math.abs(stayHistoryAlignment.range - stayHistoryAlignment.actions) <= 4, `stay query controls are misaligned: ${JSON.stringify(stayHistoryAlignment)}`);

    await page.locator('.nav-group[data-nav-group="repair"] summary').click();
    await page.locator('[data-page="rules"]').click();
    await page.locator('.rules-table-fixed').first().waitFor();
    const pager = page.locator('.rules-table-fixed .table-pagination').last();
    if (await pager.count()) {
      const before = await pager.boundingBox();
      const beforePageY = before.y + await page.evaluate(() => window.scrollY);
      await page.locator('.rules-table-fixed [data-table-page-step="1"]').first().click();
      const after = await page.locator('.rules-table-fixed .table-pagination').last().boundingBox();
      const afterPageY = after.y + await page.evaluate(() => window.scrollY);
      assert.ok(Math.abs(beforePageY - afterPageY) <= 2, `rules pager moved: ${beforePageY} -> ${afterPageY}`);
    }

    const normalized = await page.evaluate(async () => {
      const { normalizeImageUpload } = await import('/src/app.js');
      const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
      canvas.getContext('2d').fillRect(0, 0, 2, 2);
      const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const image = await normalizeImageUpload(new File([jpeg], 'photo.jpg', { type: 'image/jpeg' }));
      return { type: image.type, name: image.name, signature: Array.from(new Uint8Array(await image.arrayBuffer()).slice(0, 8)) };
    });
    assert.deepEqual(normalized, { type: 'image/png', name: 'photo.png', signature: [137, 80, 78, 71, 13, 10, 26, 10] });
    assert.deepEqual(errors, []);
    console.log('Passed: stay roster one-row filters, global message pagination and scroll retention, date range sizing/alignment, fixed repair-rule pagers, operation role filters, dashboard charts, image normalization.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
