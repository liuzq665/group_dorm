const { connectApp, connectPage, apiLogin } = require('./lib');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync('dorm_student_session', ${JSON.stringify(await apiLogin('walk_admin','123456'))}); wx.switchTab({ url: '/pages/stays/index' }); true`);
  await sleep(3000);
  await app.evaluate(`(() => { const p = getCurrentPages().pop(); p.chooseTab({ currentTarget: { dataset: { tab: 'review' } } }); return p.data.tab; })()`);
  await sleep(1500);
  const page = await connectPage('pages/stays/index');
  const out = await page.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('wx-button')).map(b=>b.innerText.trim());
    return { review: buttons.filter(b=>b.includes('审核申请')).length, lock: buttons.filter(b=>b.includes('进入审核')).length, total: buttons.length };
  })()`);
  console.log(JSON.stringify(out));
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('test-results/acceptance/admin-stay-review-tab.png', Buffer.from(shot.data, 'base64'));
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
