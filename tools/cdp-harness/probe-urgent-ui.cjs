const fs = require('fs');
const { connectApp, connectPage, pageTargets, apiLogin, SESSION_KEY } = require('./lib');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function open(app, path, session, name) {
  const payload = JSON.stringify(session);
  await app.evaluate(`wx.setStorageSync(${JSON.stringify(SESSION_KEY)}, ${payload}); wx.reLaunch({ url: ${JSON.stringify(path)} }); true`);
  for (let i = 0; i < 24; i++) { if ((await pageTargets(path.split('?')[0])).length) break; await sleep(400); }
  await sleep(1200);
  return connectPage(path.split('?')[0]);
}
(async () => {
  const app = await connectApp();
  const stu = await apiLogin('walk_stu01', '123456');
  const form = await open(app, '/pages/repair-form/index', stu);
  const info = await form.evaluate(`(() => {
    const labels = Array.from(document.querySelectorAll('.field-label')).map(el => el.textContent.trim());
    const t = document.body.innerText;
    return { labels, hasUrgent: t.includes('紧急程度') && t.includes('标记为紧急'), hint: t.includes('不参与自动派单') };
  })()`);
  console.log('form', JSON.stringify(info));
  const shot = await form.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('test-results/acceptance/repair-form-urgent.png', Buffer.from(shot.data, 'base64'));
  const rep = await apiLogin('walk_rep01', '123456');
  const detail = await open(app, '/pages/repair-detail/index?id=685', rep);
  const d = await detail.evaluate(`(() => { const t = document.body.innerText; return { urgentTag: t.includes('紧急'), status: (t.match(/已接单|待接单|待确认/) || [''])[0], text: t.slice(0, 120) }; })()`);
  console.log('detail', JSON.stringify(d));
  const shot2 = await detail.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('test-results/acceptance/repair-detail-urgent.png', Buffer.from(shot2.data, 'base64'));
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

