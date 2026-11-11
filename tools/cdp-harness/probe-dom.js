/** DOM 结构探针：定位自定义 tabBar 与固定定位元素 */
const { connectApp, connectPage, apiLogin } = require('./lib');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const student = await apiLogin('student1');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync('dorm_student_session', ${JSON.stringify(student)}); true`);
  await app.evaluate(`new Promise((resolve) => wx.reLaunch({ url: '/pages/home/index', success: () => setTimeout(() => resolve('ok'), 500), fail: () => resolve('fail') }))`);
  await sleep(2000);
  app.close();

  const page = await connectPage('pages/home');
  const info = await page.evaluate(`(() => {
    const fixed = [...document.querySelectorAll('*')]
      .filter(el => { const s = getComputedStyle(el); return s.position === 'fixed'; })
      .map(el => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, cls: String(el.className || '').slice(0, 60), top: Math.round(r.top), height: Math.round(r.height), bottom: Math.round(r.bottom), display: getComputedStyle(el).display };
      });
    const custom = [...document.querySelectorAll('*')].filter(el => el.tagName.includes('-')).map(el => el.tagName);
    const tabbarLike = [...document.querySelectorAll('*')].filter(el => String(el.className || '').includes('tab')).map(el => ({ tag: el.tagName, cls: String(el.className || '').slice(0, 60) })).slice(0, 12);
    return {
      bodyChildren: [...document.body.children].map(el => ({ tag: el.tagName, cls: String(el.className || '').slice(0, 50) })),
      fixed,
      customTags: [...new Set(custom)].slice(0, 20),
      tabbarLike,
      text: (document.body.innerText || '').slice(-120)
    };
  })()`);
  console.log(JSON.stringify(info, null, 2));
  page.close();
})().catch(error => { console.error(error.message); process.exit(1); });
