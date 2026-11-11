/** 验证底部导航可点击切换：模拟触摸事件点击其它 tab，确认路由切换且选中态更新 */
const { connectApp, connectPage, apiLogin } = require('./lib');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const student = await apiLogin('student1');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync('dorm_student_session', ${JSON.stringify(student)}); true`);
  await app.evaluate(`new Promise((resolve) => wx.reLaunch({ url: '/pages/home/index', success: () => setTimeout(() => resolve('ok'), 500), fail: () => resolve('fail') }))`);
  await sleep(2000);

  const results = [];
  const taps = [
    { from: 'pages/home', targetText: '报修', expect: 'pages/repairs/index' },
    { from: 'pages/repairs', targetText: '留宿', expect: 'pages/stays/index' },
    { from: 'pages/stays', targetText: '消息', expect: 'pages/messages/index' },
    { from: 'pages/messages', targetText: '我的', expect: 'pages/mine/index' },
    { from: 'pages/mine', targetText: '首页', expect: 'pages/home/index' }
  ];
  for (const tap of taps) {
    const client = await connectPage(tap.from);
    const tapped = await client.evaluate(`(() => {
      const root = document.querySelector('[class*="tabbar"]');
      const items = root ? [...root.querySelectorAll('[class*="tab-item"]')] : [];
      const item = items.find(node => (node.innerText || '').includes('${tap.targetText}'));
      if (!item) return { ok: false, reason: '未找到 tab', texts: items.map(node => (node.innerText || '').replace(/\\s+/g, ' ').trim()) };
      const rect = item.getBoundingClientRect();
      const touch = (type) => {
        const touchPoint = new Touch({ identifier: 1, target: item, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
        item.dispatchEvent(new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === 'touchend' ? [] : [touchPoint],
          targetTouches: type === 'touchend' ? [] : [touchPoint],
          changedTouches: [touchPoint]
        }));
      };
      touch('touchstart');
      setTimeout(() => touch('touchend'), 60);
      return { ok: true };
    })()`);
    client.close();
    await sleep(1500);
    const route = await app.evaluate(`getCurrentPages().map(item => item.route)`);
    const current = route[route.length - 1];
    const selected = await (async () => {
      const page = await connectPage(tap.expect.split('/')[1]);
      const value = await page.evaluate(`(() => {
        const root = document.querySelector('[class*="tabbar"]');
        const items = root ? [...root.querySelectorAll('[class*="tab-item"]')] : [];
        const selectedItems = items.filter(node => String(node.className).includes('selected'));
        return selectedItems.map(node => (node.innerText || '').replace(/\\s+/g, ' ').trim());
      })()`);
      page.close();
      return value;
    })();
    results.push({ from: tap.from, target: tap.targetText, expect: tap.expect, current, selected, tapped });
    console.log(`${tap.from} 点击「${tap.targetText}」→ 当前=${current}（期望 ${tap.expect}），高亮=${JSON.stringify(selected)}，点击结果=${JSON.stringify(tapped)}`);
  }
  app.close();
  const failed = results.filter(item => item.current !== item.expect || !item.tapped.ok || item.selected.length !== 1);
  if (failed.length) { console.error('tabBar 点击验证失败'); process.exit(1); }
  console.log('\ntabBar 点击切换与高亮全部通过');
})().catch(error => { console.error('验证失败：', error.message); process.exit(1); });
