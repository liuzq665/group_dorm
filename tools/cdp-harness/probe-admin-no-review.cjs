const { connectApp, connectPage, apiLogin, SESSION_KEY } = require('./lib');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const app = await connectApp();
  const session = await apiLogin('walk_admin', '123456');
  await app.evaluate(`wx.setStorageSync('${SESSION_KEY}', ${JSON.stringify(session)}); wx.reLaunch({ url: '/pages/stays/index' }); true`);
  await sleep(3500);
  const tabs = await app.evaluate(`(() => { const p = getCurrentPages().pop(); p.chooseTab({ currentTarget: { dataset: { tab: 'review' } } }); return (p.data.filtered || []).length; })()`);
  await sleep(1200);
  const page = await connectPage('pages/stays/index');
  const out = await page.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('wx-button')).map(b => b.innerText.trim());
    return { review: buttons.filter(b => b.includes('审核申请')).length, lock: buttons.filter(b => b.includes('进入审核')).length, total: buttons.length, listCount: document.body.innerText.includes('申请名单') };
  })()`);
  console.log(JSON.stringify({ tabs, out }));
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
