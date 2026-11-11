/** 探针：在逻辑层验证可操作能力（wx / getCurrentPages / setData） */
const { connectApp, apiLogin, goto } = require('./lib');

(async () => {
  const app = await connectApp();
  const info = await app.evaluate(`(() => ({
    hasWx: typeof wx,
    hasGetCurrentPages: typeof getCurrentPages,
    hasGetApp: typeof getApp,
    pages: (typeof getCurrentPages === 'function' ? getCurrentPages().map(p => p.route) : []),
    appData: (() => { try { return JSON.stringify(getApp().globalData).slice(0, 120); } catch (error) { return String(error); } })()
  }))()`);
  console.log('逻辑层能力：', JSON.stringify(info, null, 2));

  const session = await apiLogin('student1');
  console.log('登录成功：', session.user.name, session.user.role, session.token.slice(0, 12) + '...');
  const nav = await goto(app, '/pages/mine/index', session);
  console.log('导航结果：', nav);
  const after = await app.evaluate(`getCurrentPages().map(p => p.route)`);
  console.log('当前页面栈：', after);
  app.close();
})().catch(error => {
  console.error('失败：', error.message);
  process.exit(1);
});
