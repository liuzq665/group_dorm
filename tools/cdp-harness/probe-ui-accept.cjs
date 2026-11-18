/**
 * 通过小程序 UI 真点一次「接单」，验证：按钮 → 接口 → 状态流转 → 页面回显 → 列表数据更新。
 * 用法：node probe-ui-accept.cjs [orderId]
 */
const { SESSION_KEY, connectApp, connectPage, apiLogin, goto } = require('./lib');

const orderId = process.argv[2] || '662';

async function main() {
  const session = await apiLogin('repair1');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync('${SESSION_KEY}', ${JSON.stringify(session)}); true`);
  const nav = await goto(app, `/pages/repair-detail/index?id=${orderId}`, session, { wait: 1500 });
  console.log('导航：', nav);
  await new Promise(resolve => setTimeout(resolve, 2000));

  const page = await connectPage('pages/repair-detail');
  const before = await page.evaluate(`({ text: document.body.innerText.slice(0, 200), buttons: [...document.querySelectorAll('wx-button, button')].map(b => (b.innerText || '').trim()).filter(Boolean) })`);
  console.log('接单前按钮：', JSON.stringify(before.buttons));

  let tapped = { ok: false };
  for (let i = 0; i < 12 && !tapped.ok; i += 1) {
    tapped = await page.evaluate(`(() => {
      const node = [...document.querySelectorAll('wx-button, button')].find(b => (b.innerText || '').trim() === '接单');
      if (!node) return { ok: false, reason: 'no-button' };
      const rect = node.getBoundingClientRect();
      if (rect.top < 0 || rect.top > innerHeight - 20) { node.scrollIntoView({ block: 'center' }); return { ok: false, reason: 'out-of-view', top: Math.round(rect.top) }; }
      const point = new Touch({ identifier: 1, target: node, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
      node.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [point], targetTouches: [point], changedTouches: [point] }));
      setTimeout(() => node.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [point] })), 40);
      return { ok: true, top: Math.round(rect.top) };
    })()`);
    if (!tapped.ok) await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.log('点击接单：', JSON.stringify(tapped));
  await new Promise(resolve => setTimeout(resolve, 2500));

  const after = await page.evaluate(`({ text: document.body.innerText.slice(0, 300), buttons: [...document.querySelectorAll('wx-button, button')].map(b => (b.innerText || '').trim()).filter(Boolean) })`);
  console.log('接单后按钮：', JSON.stringify(after.buttons));
  console.log('接单后文本：', after.text.replace(/\n+/g, ' | '));
  page.close();
  app.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
