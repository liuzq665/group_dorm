const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const baseUrl = process.env.BASE_URL || 'http://localhost:5174';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    await page.locator('[name="loginAccount"]').fill('admin');
    await page.locator('[name="password"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await page.getByRole('heading', { name: '工作台' }).waitFor();

    await page.locator('[data-page="messages"]').click();
    const readFilter = page.locator('#message-filter-form [name="read"]');
    await readFilter.selectOption('');
    const allResponse = page.waitForResponse(response => response.url().includes('/api/v1/messages?') && !response.url().includes('read='));
    await page.locator('#message-filter-form button.primary').click();
    await allResponse;
    await page.locator('#message-filter-form').waitFor();
    assert.equal(await page.locator('#message-filter-form [name="read"]').inputValue(), '');
    const messageTable = page.locator('.message-table');
    const visibleRows = await messageTable.locator('tbody tr:not([hidden])').count();
    if (await messageTable.locator('tbody tr').count() > 8) {
      assert.equal(await messageTable.locator('.table-pagination').count(), 1);
      await messageTable.locator('[data-table-page-step="1"]').click();
      assert.match(await messageTable.locator('[data-table-page-label]').innerText(), /^2\s*\//);
    }
    await page.locator('[data-action="message-source"][data-id="DORM_MANAGER"]').click();
    await page.locator('.message-table .table-pagination').waitFor();
    const previousPage = Number((await page.locator('.message-table [data-table-page-label]').innerText()).split('/')[0].trim());
    await page.locator('.message-table [data-table-page-step="1"]').click();
    const nextPage = Number((await page.locator('.message-table [data-table-page-label]').innerText()).split('/')[0].trim());
    assert.equal(nextPage, Math.min(previousPage + 1, 6));

    await page.locator('.nav-group[data-nav-group="dorm"] summary').click();
    await page.locator('[data-page="data"]').click();
    await page.getByRole('button', { name: '批量下载' }).waitFor();
    await page.getByRole('button', { name: '批量删除' }).waitFor();
    const failedRows = page.locator('.resource-table[data-resource-type="backups"] tbody tr').filter({ hasText: 'FAILED' });
    for (let index = 0; index < await failedRows.count(); index++) {
      assert.equal(await failedRows.nth(index).locator('.backup-unavailable:disabled').count(), 1);
    }
    if (await page.locator('.backup-unavailable').count()) {
      const widths = await page.locator('.resource-table[data-resource-type="backups"] tbody tr').first().locator('td:last-child button').evaluateAll(buttons => buttons.map(button => Math.round(button.getBoundingClientRect().width)));
      assert.equal(widths[0], widths[1]);
    }
    const successfulBackup = page.locator('.resource-table[data-resource-type="backups"] tbody tr').filter({ hasText: 'SUCCESS' }).first();
    await successfulBackup.locator('[data-resource-select-row]').check();
    const zipResponsePromise = page.waitForResponse(response => response.url().includes('/admin/backup-tasks/download'));
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '批量下载' }).click();
    const zipResponse = await zipResponsePromise;
    const download = await downloadPromise;
    assert.equal(zipResponse.status(), 200, await zipResponse.text());
    const zipBytes = fs.readFileSync(await download.path());
    assert.ok(zipBytes.length > 0, JSON.stringify(zipResponse.headers()));
    assert.equal(zipBytes.subarray(0, 2).toString(), 'PK');
    await successfulBackup.locator('[data-action="backup-delete"]').click();
    const deleteDialog = page.locator('dialog');
    await deleteDialog.getByRole('heading', { name: '删除备份记录' }).waitFor();
    assert.equal(await deleteDialog.getByRole('button', { name: '确认删除' }).count(), 1);
    await deleteDialog.locator('[data-close]').click();
    await page.locator('#logout').click();
    const logoutDialog = page.locator('dialog');
    await logoutDialog.getByRole('heading', { name: '退出登录' }).waitFor();
    assert.equal(await logoutDialog.getByRole('button', { name: '确认退出' }).count(), 1);
    await logoutDialog.locator('[data-close]').click();
    assert.deepEqual(errors, []);
    console.log(`Passed: all-message filter retained, ${visibleRows} visible message rows, pagination when needed, backup bulk controls and ZIP download.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
