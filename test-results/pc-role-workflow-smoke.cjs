const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');
const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const login = async account => {
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('账号', { exact: true }).fill(account);
    await page.getByLabel('密码', { exact: true }).fill('123456');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.waitForTimeout(700);
  };

  try {
    await login('admin');
    await page.getByRole('heading', { name: '留宿人数' }).waitFor();
    await page.screenshot({ path: 'test-results/pc-admin-dashboard-current.png', fullPage: true });
    const admin = await page.evaluate(async () => {
      const token = sessionStorage.getItem('dorm_token');
      return (await (await fetch('/api/v1/dashboard', { headers: { Authorization: `Bearer ${token}` } })).json()).data;
    });
    assert.equal(admin.stayStatus.length, 6);
    assert.equal(admin.repairStatus.length, 7);
    const repairLabels = await page.evaluate(() => window.echarts.getInstanceByDom(document.querySelector('#repair-status-chart')).getOption().xAxis[0].data);
    assert.ok(repairLabels.includes('维修中'));
    assert.ok(repairLabels.includes('待确认'));
    assert.match(await page.locator('#stay-status').innerText(), /全校申请单的当前状态/);
    assert.match(await page.locator('#repair-status').innerText(), /全校工单的当前状态/);
    const statusAxes=await page.evaluate(()=>['stay-status-chart','repair-status-chart','stay-monthly-chart','repair-monthly-chart'].map(id=>{const option=window.echarts.getInstanceByDom(document.getElementById(id)).getOption();return {id,x:option.xAxis[0].name,y:option.yAxis[0].name};}));
    assert.deepEqual(statusAxes.map(axis=>[axis.x,axis.y]),[['申请状态','申请数量（份）'],['工单状态','工单数量（张）'],['申请创建月份','申请数量（份）'],['工单创建月份','工单数量（张）']]);
    assert.equal(await page.evaluate(() => window.echarts.getInstanceByDom(document.querySelector('#accommodation-status-chart')).getOption().series[0].type), 'pie');

    await page.locator('[data-page="messages"]').click();
    const messageFields = await page.evaluate(async () => {
      const token = sessionStorage.getItem('dorm_token');
      const response = await fetch('/api/v1/messages?sender=SYSTEM', { headers: { Authorization: `Bearer ${token}` } });
      return (await response.json()).data;
    });
    assert.ok(messageFields.length > 0);
    assert.ok(messageFields.some(message => message.recipient_roles && message.recipient_roles !== '未指定'));
    assert.ok(messageFields.some(message => message.building_names && message.building_names !== '未指定'));
    await page.getByRole('button', { name: '我发布的', exact: true }).click();
    await page.locator('#message-filter-form [name=from]').fill('2026-01-01');
    await page.locator('#message-filter-form button.primary').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#message-filter-form [name=from]').inputValue(), '2026-01-01');
    await page.getByRole('button', { name: '系统通知', exact: true }).click();
    assert.equal(await page.locator('#message-filter-form [name=from]').inputValue(), '2026-01-01');

    const stack = await page.evaluate(async () => {
      const app = await import('/src/app.js');
      const detail = app.modal('详情', '<p>保留详情</p>', null);
      const preview = app.modal('附件预览', '<p>文件</p>', null, '保存', true);
      const label = preview.querySelector('[data-close]').textContent;
      preview.querySelector('[data-close]').click();
      await new Promise(resolve => setTimeout(resolve, 20));
      return { label, detailOpen: detail.open, dialogCount: document.querySelectorAll('dialog').length };
    });
    assert.deepEqual(stack, { label: '返回详情', detailOpen: true, dialogCount: 1 });

    await page.evaluate(() => sessionStorage.clear());
    await login('manager1');
    await page.locator('#stay-status-chart').waitFor();
    for (const chartId of ['repair-rating-chart', 'accommodation-status-chart', 'stay-analysis-chart', 'repair-status-chart']) {
      assert.equal(await page.locator(`#${chartId} canvas`).count(), 1, `missing dorm manager chart ${chartId}`);
    }
    await page.screenshot({ path: 'test-results/pc-dorm-manager-dashboard-current.png', fullPage: true });
    const manager = await page.evaluate(async () => {
      const token = sessionStorage.getItem('dorm_token');
      return (await (await fetch('/api/v1/dashboard', { headers: { Authorization: `Bearer ${token}` } })).json()).data;
    });
    assert.equal(manager.stayStatus.length, 6);
    assert.equal(manager.repairStatus.length, 7);
    assert.ok(manager.accommodationStats.scope);
    assert.match(await page.locator('.dashboard-chart-grid').innerText(), /本人负责楼栋内申请单的当前状态/);
    await page.locator('[data-page="messages"]').click();
    await page.locator('#message-filter-form').waitFor();
    assert.deepEqual(await page.locator('.message-filter-tabs [data-action="message-source"]').evaluateAll(nodes => nodes.map(node => node.dataset.id)), ['SYSTEM', 'ADMIN', 'MINE']);
    const managerActionLayout = await page.locator('.message-table td[data-label="操作"] .actions').first().evaluate(node => ({wrap:getComputedStyle(node).flexWrap,overflow:getComputedStyle(node).overflowX}));
    assert.equal(managerActionLayout.wrap, 'nowrap');
    assert.notEqual(managerActionLayout.overflow, 'auto');
    const managerMine = await page.evaluate(async () => {
      const token = sessionStorage.getItem('dorm_token');
      const userId = JSON.parse(sessionStorage.getItem('dorm_user')).id;
      const messages = (await (await fetch('/api/v1/messages?sender=MINE', { headers: { Authorization: `Bearer ${token}` } })).json()).data;
      return { userId, messages };
    });
    assert.ok(managerMine.messages.every(message => String(message.publisher_user_id) === String(managerMine.userId)));

    await page.evaluate(() => sessionStorage.clear());
    await login('repair1');
    await page.getByRole('heading', { name: '个人工单记录' }).waitFor();
    await page.getByRole('heading', { name: '个人维修评价' }).waitFor();
    await page.locator('[data-page="repairs"]').click();
    await page.locator('.repair-status-tabs').waitFor();
    const repairerTaskTabs=await page.locator('.repair-status-tabs [data-action="repair-status"]').evaluateAll(nodes=>nodes.map(node=>[node.dataset.id,node.textContent.trim()]));
    assert.deepEqual(repairerTaskTabs,[['PENDING_ACCEPT','待接单'],['IN_REPAIR','维修中'],['DELAYED','维修延期'],['PENDING_CONFIRM','待确认'],['PENDING_MANUAL','已转人工处理'],['ALL','全部']]);
    await page.locator('.repair-status-tabs [data-id="PENDING_ACCEPT"]').click();
    assert.equal(await page.locator('.repair-status-tabs [data-id="PENDING_ACCEPT"]').evaluate(node=>node.classList.contains('active')),true);
    await page.locator('.repair-status-tabs [data-id="ALL"]').click();
    await page.locator('[data-page="messages"]').click();
    await page.locator('#message-filter-form').waitFor();
    assert.deepEqual(await page.locator('.message-filter-tabs [data-action="message-source"]').evaluateAll(nodes => nodes.map(node => node.dataset.id)), ['SYSTEM', 'ADMIN', 'DORM_MANAGER']);
    const repairerStats = await page.evaluate(async () => {
      const token = sessionStorage.getItem('dorm_token');
      return (await (await fetch('/api/v1/repairer-stats?eventYear=2026&eventMonth=10&ratingYear=2026&ratingMonth=10', { headers: { Authorization: `Bearer ${token}` } })).json()).data;
    });
    assert.ok(repairerStats.recordCounts && repairerStats.ratingSummary && repairerStats.ratingTrend);
    assert.equal('evaluationRecords' in repairerStats, false);

    await page.evaluate(() => sessionStorage.clear());
    await login('student1');
    assert.equal(await page.locator('[data-page="dashboard"]').count(), 0);
    await page.locator('[data-page="messages"]').click();
    await page.locator('#message-filter-form').waitFor();
    assert.deepEqual(await page.locator('.message-filter-tabs [data-action="message-source"]').evaluateAll(nodes => nodes.map(node => node.dataset.id)), ['SYSTEM', 'ADMIN', 'DORM_MANAGER']);
    assert.deepEqual(errors, []);
    console.log('Passed role dashboard, live status counts, message filter retention, and return from attachment preview.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
