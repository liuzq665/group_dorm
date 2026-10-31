const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');
const baseUrl = process.env.BASE_URL || 'http://localhost:5174';

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

async function applications(page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/v1/stay/applications', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('dorm_token')}` }
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || `HTTP ${response.status}`);
    return body.data;
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const studentNo = '2026900010';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await login(page, 'demo_student_0010');
    await page.locator('[data-page="stay"]').click();
    await page.getByRole('heading', { name: '假期留宿' }).waitFor();
    const studentRows = await applications(page);
    const studentApplication = studentRows.find(row => row.student_no === studentNo && row.batch_name === '2026 寒假留宿申请');
    assert.equal(studentApplication?.current_status, 'UNDER_REVIEW');
    assert.match(await page.locator('main').innerText(), /2026 寒假留宿申请/);

    await login(page, 'demo_manager_01');
    await page.locator('[data-page="stay"]').click();
    await page.getByRole('heading', { name: '假期留宿' }).waitFor();
    const managerRows = await applications(page);
    const managerApplication = managerRows.find(row => row.student_no === studentNo && row.batch_name === '2026 寒假留宿申请');
    assert.equal(managerApplication?.application_id, studentApplication.application_id);
    assert.equal(managerApplication?.current_status, 'UNDER_REVIEW');
    const reviewButton = page.locator(`tr[data-row-id="${managerApplication.application_id}"] [data-action="stay-review"]`);
    await reviewButton.waitFor();

    await login(page, 'admin');
    const adminRows = await applications(page);
    const adminBatchRows = adminRows.filter(row => row.batch_name === '2026 寒假留宿申请');
    assert.equal(adminBatchRows.length, 240);
    assert.ok(adminBatchRows.every(row => row.current_status !== 'DRAFT'));
    assert.ok(adminBatchRows.some(row => row.application_id === studentApplication.application_id));
    assert.deepEqual(errors, []);
    console.log('Passed: the submitted student application is visible to its responsible manager for review and to the system administrator.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
