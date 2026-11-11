/** 调试 tabBar 选中态：读取组件 data 与 DOM 类名 */
const { connectApp, connectPage, apiLogin } = require('./lib');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const student = await apiLogin('student1');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync('dorm_student_session', ${JSON.stringify(student)}); true`);
  await app.evaluate(`new Promise((resolve) => wx.reLaunch({ url: '/pages/home/index', success: () => setTimeout(() => resolve('ok'), 500), fail: () => resolve('fail') }))`);
  await sleep(2000);

  for (const route of ['pages/home', 'pages/repairs', 'pages/stays', 'pages/messages', 'pages/mine']) {
    const result = await app.evaluate(`new Promise((resolve) => {
      const url = '/${route}/index';
      wx.switchTab({ url, success: () => setTimeout(() => {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const tabBar = typeof page.getTabBar === 'function' ? page.getTabBar() : null;
        resolve({
          route: page.route,
          stack: pages.map(item => item.route),
          tabBarData: tabBar ? tabBar.data : null,
          hasTabBar: !!tabBar
        });
      }, 600), fail: (error) => resolve({ fail: error.errMsg }) });
    })`);
    await sleep(800);
    const client = await connectPage(`/${route}/index`);
    const dom = await client.evaluate(`(() => {
      const root = document.querySelector('[class*="tabbar"]');
      const items = root ? [...root.querySelectorAll('[class*="tab-item"]')] : [];
      return {
        rootClass: root ? String(root.className) : null,
        items: items.map(item => ({ cls: String(item.className), text: (item.innerText || '').replace(/\\s+/g, ' ').trim() }))
      };
    })()`);
    client.close();
    console.log(route, JSON.stringify({ ...result, dom }, null, 2));
  }
  app.close();
})().catch(error => { console.error(error.message); process.exit(1); });
