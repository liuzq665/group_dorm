const { connectApp, connectPage, apiLogin, SESSION_KEY } = require('./lib');
(async () => {
  const session = await apiLogin('manager3');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(session)}); true`);
  await app.evaluate(`new Promise(r => wx.reLaunch({ url: '/pages/stays/index', success: () => r('ok') }))`);
  await new Promise(r => setTimeout(r, 2500));
  const page = await connectPage('pages/stays');
  const out = await page.evaluate(`(async () => {
    const buttons = Array.from(document.querySelectorAll('wx-button')).map(b => b.innerText.trim()).filter(Boolean);
    const btn = Array.from(document.querySelectorAll('wx-button')).find(b => b.innerText.trim() === '设置本楼截止');
    if (!btn) return { buttons, opened: false };
    const r = btn.getBoundingClientRect();
    const x = Math.round(r.left + r.width/2), y = Math.round(r.top + r.height/2);
    const mk = () => new Touch({ identifier: 1, target: btn, clientX: x, clientY: y });
    btn.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk()], targetTouches: [mk()], changedTouches: [mk()] }));
    btn.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], targetTouches: [], changedTouches: [mk()] }));
    for (let i = 0; i < 10; i += 1) {
      if (document.querySelector('.modal-mask')) break;
      await new Promise(r => setTimeout(r, 300));
    }
    return { buttons, opened: !!document.querySelector('.modal-mask'), text: (document.querySelector('.modal-mask') || {}).innerText ? document.querySelector('.modal-mask').innerText.slice(0, 60) : '' };
  })()`);
  console.log(JSON.stringify(out, null, 2));
  app.close(); page.close();
})();
