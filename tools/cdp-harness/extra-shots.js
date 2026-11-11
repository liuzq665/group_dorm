/**
 * 补充视觉验收：构造“待接单/待确认”真实工单，截取操作区、页面底部与窄屏(320)布局。
 *   node tools/cdp-harness/extra-shots.js
 */
const path = require('node:path');
const fs = require('node:fs');
const { connectApp, connectPage, apiLogin, goto, targets } = require('./lib');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'test-results', 'visual', 'extra');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function api(session, apiPath, options = {}) {
  const response = await fetch(`http://127.0.0.1:8080/api/v1${apiPath}`, {
    method: options.method || 'GET',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.token}` },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json();
  if (body.code !== 0) throw new Error(`${apiPath} 失败：${body.message}`);
  return body.data;
}

async function uploadPng(session, apiPath) {
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'image/png' }), 'visual.png');
  const response = await fetch(`http://127.0.0.1:8080/api/v1${apiPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}` },
    body: form
  });
  const body = await response.json();
  if (body.code !== 0) throw new Error(`上传失败：${body.message}`);
  return body.data.fileId;
}

async function switchRole(app, session) {
  const payload = JSON.stringify(session);
  await app.evaluate(`wx.setStorageSync('dorm_student_session', ${payload}); true`);
  await app.evaluate(`new Promise((resolve) => wx.reLaunch({ url: '/pages/home/index', success: () => setTimeout(() => resolve('ok'), 400), fail: () => resolve('fail') }))`);
  await sleep(1800);
}

async function pageShot(app, url, file, { scrollBottom = false, wait = 1400 } = {}) {
  await goto(app, url, null, { wait });
  let client;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try { client = await connectPage(url.split('?')[0]); break; } catch { await sleep(250); }
  }
  if (scrollBottom) {
    await client.evaluate(`(() => { window.scrollTo(0, document.documentElement.scrollHeight); return document.documentElement.scrollHeight; })()`);
    await sleep(700);
  }
  const filePath = path.join(OUT, file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await client.screenshot(filePath);
  const info = await client.evaluate(`(() => ({ scrollY: window.scrollY, height: document.documentElement.scrollHeight, vw: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }))()`);
  client.close();
  return { file: path.relative(ROOT, filePath).replace(/\\/g, '/'), ...info };
}

(async () => {
  const student = await apiLogin('student1');
  const manager = await apiLogin('manager3');
  const repairer = await apiLogin('repair1');
  const catalog = await api(student, '/repair-catalog');
  const home = (await api(student, '/accommodations/current'))[0];
  const category = catalog.categories.find(item => Number(item.workTypeId) === 1) || catalog.categories[0];

  const makeOrder = async title => {
    const created = await api(student, '/repair-orders', {
      method: 'POST',
      body: { title, description: '视觉验收用临时工单：阀门异响，需要检修', categoryId: Number(category.id), fileIds: [] }
    });
    await api(student, `/repair-orders/${created.orderId}/submit`, { method: 'POST' });
    await api(manager, `/repair-orders/${created.orderId}/review`, { method: 'POST', body: { pass: true, reason: '', urgent: false } });
    return created.orderId;
  };

  // 1) 待接单：维修端应有“接单/拒单”操作区
  const pendingAccept = await makeOrder('视觉验收-待接单工单');
  // 2) 待确认：学生端应有“确认完成/申请重修”操作区
  const repaired = await makeOrder('视觉验收-待确认工单');

  // 自动派单可能分配给任一具备资质的维修人员，按实际派单人登录后再执行接单与提交结果
  const admin = await apiLogin('admin');
  const workerOf = async orderId => {
    const detail = await api(manager, `/repair-orders/${orderId}`);
    if (!detail.repairer_user_id) throw new Error(`工单 ${orderId} 未派单：${detail.current_status}`);
    const user = await api(admin, `/admin/users/${detail.repairer_user_id}`);
    return apiLogin(user.login_account);
  };
  const workerA = await workerOf(pendingAccept);
  const workerB = await workerOf(repaired);
  await api(workerB, `/repair-orders/${repaired}/decision`, { method: 'POST', body: { accept: true, reason: '' } });
  const photo = await uploadPng(workerB, '/files');
  await api(workerB, `/repair-orders/${repaired}/result`, { method: 'POST', body: { result: '已更换阀芯并试压，无渗漏', fileIds: [photo] } });

  // 3) 待审核：宿管/管理员详情页应有“审核”操作区
  const createdReview = await api(student, '/repair-orders', {
    method: 'POST',
    body: { title: '视觉验收-待审核工单', description: '视觉验收用临时工单：等待审核', categoryId: Number(category.id), fileIds: [] }
  });
  const pendingReview = createdReview.orderId;
  await api(student, `/repair-orders/${pendingReview}/submit`, { method: 'POST' });
  console.log('构造工单：待接单=', pendingAccept, '（', workerA.user.name, '）待确认=', repaired, '（', workerB.user.name, '）待审核=', pendingReview, '楼栋=', home.building_name);

  const app = await connectApp();
  const results = [];
  await switchRole(app, student);
  results.push(await pageShot(app, `/pages/repair-detail/index?id=${repaired}`, 'student-repaired-actions.png'));
  results.push(await pageShot(app, `/pages/repair-detail/index?id=${repaired}`, 'student-repaired-bottom.png', { scrollBottom: true }));
  results.push(await pageShot(app, `/pages/repair-detail/index?id=${pendingAccept}`, 'student-pending-accept.png'));
  results.push(await pageShot(app, '/pages/repairs/index', 'student-repairs-bottom.png', { scrollBottom: true }));

  await switchRole(app, workerA);
  results.push(await pageShot(app, `/pages/repair-detail/index?id=${pendingAccept}`, 'repairer-pending-accept.png'));
  results.push(await pageShot(app, `/pages/repair-detail/index?id=${pendingAccept}`, 'repairer-pending-accept-bottom.png', { scrollBottom: true }));
  results.push(await pageShot(app, '/pages/repairs/index', 'repairer-repairs.png'));

  await switchRole(app, manager);
  results.push(await pageShot(app, `/pages/repair-detail/index?id=${pendingReview}`, 'manager-review-bottom.png', { scrollBottom: true }));
  await switchRole(app, admin);
  results.push(await pageShot(app, `/pages/repair-detail/index?id=${pendingReview}`, 'admin-review-bottom.png', { scrollBottom: true }));

  // 3) 窄屏 320dp：通过 CDP 覆盖页面视口度量，检查是否横向溢出
  const narrow = await pageShot(app, '/pages/repairs/index', 'narrow-before.png');
  const client = await connectPage('/pages/repairs');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 640, deviceScaleFactor: 2, mobile: true });
  await sleep(1200);
  await client.screenshot(path.join(OUT, 'narrow-320.png'));
  const narrowMetrics = await client.evaluate(`(() => {
    const de = document.documentElement;
    const all = [...document.querySelectorAll('*')];
    const beyond = all.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > de.clientWidth + 1.5; }).slice(0, 6).map(el => String(el.className || ''));
    const clipped = all.filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible' && (el.textContent || '').trim()).slice(0, 6).map(el => (el.textContent || '').trim().slice(0, 20));
    return { vw: de.clientWidth, overflow: de.scrollWidth - de.clientWidth, beyond, clipped };
  })()`);
  await client.send('Emulation.clearDeviceMetricsOverride');
  client.close();
  results.push({ file: 'test-results/visual/extra/narrow-320.png', narrowMetrics, baseline: narrow });

  const reportFile = path.join(OUT, 'extra-report.json');
  fs.writeFileSync(reportFile, JSON.stringify({ generatedAt: new Date().toISOString(), orders: { pendingAccept, repaired }, results }, null, 2), 'utf8');
  app.close();
  console.log(JSON.stringify({ orders: { pendingAccept, repaired }, results, narrowMetrics }, null, 2));
})().catch(error => {
  console.error('补充视觉验收失败：', error.message);
  process.exit(1);
});


