const { connectApp, apiLogin, SESSION_KEY } = require('./lib');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const app = await connectApp();
  const results = {};
  for (const account of ['walk_stu01', 'student6']) {
    const session = await apiLogin(account, '123456');
    const info = await app.evaluate(`(() => {
      globalThis.__modals = [];
      if (!globalThis.__origShowModal) globalThis.__origShowModal = wx.showModal;
      wx.showModal = (o) => { globalThis.__modals.push((o && o.title) || ''); if (o && o.success) {} return Promise.resolve({ confirm: true }); };
      wx.setStorageSync('${SESSION_KEY}', ${JSON.stringify(session)});
      wx.reLaunch({ url: '/pages/repair-form/index' });
      return true;
    })()`);
    await sleep(3200);
    const state = await app.evaluate(`(() => {
      const p = getCurrentPages().pop();
      return { route: p.route, loading: p.data.loading, hasCategory: (p.data.categories || []).length, modals: globalThis.__modals.slice() };
    })()`);
    results[account] = state;
  }
  await app.evaluate(`(() => { if (globalThis.__origShowModal) wx.showModal = globalThis.__origShowModal; return true; })()`);
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
