/**
 * 变更页回归：仅截图/度量本次改动的页面（带超时，避免整批挂起）
 *   node tools/cdp-harness/check-changed-pages.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { connectApp, connectPage, apiLogin, goto } = require('./lib');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'test-results', 'visual-changed');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => setTimeout(() => reject(new Error(`超时(${ms}ms)：${label}`)), ms))
  ]);
}

async function api(session, apiPath) {
  const response = await fetch(`http://127.0.0.1:8080/api/v1${apiPath}`, { headers: { Authorization: `Bearer ${session.token}` } });
  const body = await response.json();
  if (body.code !== 0) throw new Error(`${apiPath} 失败：${body.message}`);
  return body.data;
}

const METRICS = `(() => {
  const vw = document.documentElement.clientWidth;
  const all = [...document.querySelectorAll('*')];
  const beyond = all.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1.5; })
    .slice(0, 6).map(el => String(el.className || '').slice(0, 50));
  const bars = [...document.querySelectorAll('.action-bar, .button-row')].map(bar => {
    const bs = [...bar.querySelectorAll('wx-button, button')].filter(b => b.getBoundingClientRect().width > 0);
    return { count: bs.length, rows: new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size };
  }).filter(b => b.count > 0);
  const misaligned = [...document.querySelectorAll('wx-button')].filter(b => b.getBoundingClientRect().height > 0 && (b.innerText || '').trim())
    .map(b => { const r = b.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(b);
      const t = range.getBoundingClientRect(); return { text: (b.innerText || '').trim().slice(0, 10), diff: Math.round((t.top - r.top) - (r.bottom - t.bottom)) }; })
    .filter(x => Math.abs(x.diff) > 2);
  const tabRoot = document.querySelector('[class*="tabbar"]');
  let tab = null;
  if (tabRoot) {
    const items = [...tabRoot.querySelectorAll('[class*="tabbar-item"]')];
    tab = { selected: items.filter(el => /active|selected/.test(String(el.className || ''))).length };
  }
  return { vw, overflow: document.documentElement.scrollWidth - vw, beyond, wrapBars: bars.filter(b => b.rows > 1), misaligned, tab };
})()`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const sessions = { STUDENT: await apiLogin('student1'), DORM_MANAGER: await apiLogin('manager3') };
  const stays = await api(sessions.STUDENT, '/stay/applications');
  const batches = await api(sessions.STUDENT, '/stay/current');
  const orders = await api(sessions.STUDENT, '/repair-orders');
  const stayId = (stays[0] || {}).application_id || 1;
  const batchId = (batches[0] || {}).batch_id || 41;
  const orderId = (orders[0] || {}).order_id || 657;
  console.log('样本：stay', stayId, 'batch', batchId, 'order', orderId);

  const app = await connectApp();
  const report = [];
  const specs = [
    { role: 'STUDENT', name: 'stay-form', url: `/pages/stay-form/index?batchId=${batchId}` },
    { role: 'STUDENT', name: 'stay-detail', url: `/pages/stay-detail/index?id=${stayId}` },
    { role: 'DORM_MANAGER', name: 'stays', url: '/pages/stays/index' },
    { role: 'DORM_MANAGER', name: 'stay-detail', url: `/pages/stay-detail/index?id=${stayId}` },
    { role: 'STUDENT', name: 'repair-detail', url: `/pages/repair-detail/index?id=${orderId}` }
  ];
  for (const spec of specs) {
    try {
      await withTimeout((async () => {
        const payload = JSON.stringify(sessions[spec.role]);
        await app.evaluate(`wx.setStorageSync('dorm_student_session', ${payload}); true`);
        await goto(app, spec.url, sessions[spec.role], { wait: 2000 });
        await sleep(600);
      })(), 25000, spec.role + '/' + spec.name);
      const page = await withTimeout(connectPage(spec.url.split('?')[0].replace(/^\//, '')), 15000, 'connect ' + spec.name);
      const metrics = await withTimeout(page.evaluate(METRICS), 15000, 'metrics ' + spec.name);
      const file = path.join(OUT, `${spec.role}-${spec.name}.png`);
      await withTimeout(page.screenshot(file), 20000, 'shot ' + spec.name);
      page.close();
      const issues = [
        ...(metrics.overflow > 0 ? [`横向溢出 ${metrics.overflow}px`] : []),
        ...(metrics.beyond.length ? [`越界元素 ${metrics.beyond.join(',')}`] : []),
        ...(metrics.wrapBars.length ? ['按钮换行'] : []),
        ...(metrics.misaligned.length ? [`按钮文字不居中 ${metrics.misaligned.map(x => x.text).join(',')}`] : [])
      ];
      report.push({ page: spec.name, role: spec.role, metrics, issues });
      console.log(`[OK] ${spec.role}/${spec.name}`, issues.join('；') || '无问题');
    } catch (error) {
      console.log(`[FAIL] ${spec.role}/${spec.name}: ${error.message}`);
      report.push({ page: spec.name, role: spec.role, error: error.message });
    }
  }
  app.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  const failed = report.filter(row => row.error || (row.issues || []).length).length;
  console.log(`合计 ${report.length} 页，异常 ${failed} 页`);
})().catch(error => { console.error('FATAL', error.message); process.exit(1); });
