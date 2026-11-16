const { connectApp, connectPage, apiLogin, goto } = require('./lib');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function withTimeout(p, ms, label) {
  return Promise.race([p, new Promise((res, rej) => setTimeout(() => rej(new Error('timeout:' + label)), ms))]);
}
async function api(s, p) {
  const r = await fetch('http://127.0.0.1:8080/api/v1' + p, { headers: { Authorization: 'Bearer ' + s.token } });
  const b = await r.json(); if (b.code !== 0) throw new Error(p + ' ' + b.message); return b.data;
}
const METRICS = `(() => {
  const vw = document.documentElement.clientWidth;
  const all = [...document.querySelectorAll('*')];
  const beyond = all.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1.5; }).slice(0, 6).map(el => String(el.className || '').slice(0, 40));
  const bars = [...document.querySelectorAll('.action-bar, .button-row')].map(bar => {
    const bs = [...bar.querySelectorAll('wx-button, button')].filter(b => b.getBoundingClientRect().width > 0);
    return { count: bs.length, rows: new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size };
  }).filter(b => b.count > 0);
  const mis = [...document.querySelectorAll('wx-button')].filter(b => b.getBoundingClientRect().height > 0 && (b.innerText || '').trim())
    .map(b => { const r = b.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect();
      return { text: (b.innerText || '').trim().slice(0, 10), diff: Math.round((t.top - r.top) - (r.bottom - t.bottom)) }; }).filter(x => Math.abs(x.diff) > 2);
  return { vw, overflow: document.documentElement.scrollWidth - vw, beyond, wrapBars: bars.filter(b => b.rows > 1), mis, text: (document.body.innerText || '').slice(0, 400) };
})()`;
(async () => {
  const sessions = { STUDENT: await apiLogin('student1'), DORM_MANAGER: await apiLogin('manager3') };
  const stays = await api(sessions.STUDENT, '/stay/applications');
  const batches = await api(sessions.STUDENT, '/stay/current');
  const orders = await api(sessions.STUDENT, '/repair-orders');
  const stayId = (stays[0] || {}).application_id, batchId = (batches[0] || {}).batch_id, orderId = (orders[0] || {}).order_id;
  const app = await connectApp();
  const specs = [
    { role: 'STUDENT', name: 'stay-form', url: `/pages/stay-form/index?batchId=${batchId}` },
    { role: 'STUDENT', name: 'stay-detail', url: `/pages/stay-detail/index?id=${stayId}` },
    { role: 'DORM_MANAGER', name: 'stays', url: '/pages/stays/index' },
    { role: 'DORM_MANAGER', name: 'stay-detail', url: `/pages/stay-detail/index?id=${stayId}` },
    { role: 'STUDENT', name: 'repair-detail', url: `/pages/repair-detail/index?id=${orderId}` }
  ];
  let bad = 0;
  for (const spec of specs) {
    try {
      await withTimeout((async () => {
        await app.evaluate(`wx.setStorageSync('dorm_student_session', ${JSON.stringify(JSON.stringify(sessions[spec.role]))}); true`);
        await goto(app, spec.url, sessions[spec.role], { wait: 2000 });
        await sleep(500);
      })(), 20000, spec.role + '/' + spec.name);
      const page = await withTimeout(connectPage(spec.url.split('?')[0].replace(/^\//, '')), 12000, 'connect ' + spec.name);
      const m = await withTimeout(page.evaluate(METRICS), 12000, 'metrics ' + spec.name);
      page.close();
      const issues = [
        ...(m.overflow > 0 ? ['溢出' + m.overflow] : []), ...(m.beyond.length ? ['越界:' + m.beyond.join(',')] : []),
        ...(m.wrapBars.length ? ['按钮换行'] : []), ...(m.mis.length ? ['按钮不居中:' + m.mis.map(x => x.text).join(',')] : [])
      ];
      if (issues.length) bad += 1;
      console.log(`[${issues.length ? 'BAD' : 'OK '}] ${spec.role}/${spec.name}`, issues.join('；') || '无问题');
    } catch (e) { bad += 1; console.log(`[FAIL] ${spec.role}/${spec.name}: ${e.message}`); }
  }
  app.close();
  console.log(`页面 ${specs.length}，异常 ${bad}`);
  process.exit(0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
