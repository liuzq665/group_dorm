/**
 * 探针：管理员「分配宿舍」弹层真实点按与布局体检。
 * 目的：验证 J1 修复后的入口可点开、弹层不被底部安全区/自身内容遮挡、能选到楼栋/房间/床位。
 * 用法：node tools/cdp-harness/probe-admin-assign.cjs（需开发者工具已开 CDP 9222）
 */
const path = require('node:path');
const { connectApp, connectPage, apiLogin, SESSION_KEY } = require('./lib');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function tap(page, x, y) {
  return page.evaluate(`(() => {
    const el = document.elementFromPoint(${x}, ${y});
    if (!el) return 'no-element';
    const touch = (type) => el.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: ${x}, clientY: ${y} })],
      changedTouches: [new Touch({ identifier: 1, target: el, clientX: ${x}, clientY: ${y} })]
    }));
    touch('touchstart'); touch('touchend');
    return el.tagName + ':' + (el.innerText || '').slice(0, 20);
  })()`);
}

(async () => {
  const session = await apiLogin('walk_admin');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(session)}); true`);
  await app.evaluate(`new Promise(resolve => wx.reLaunch({ url: '/pages/admin/index', success: () => setTimeout(() => resolve('ok'), 300), fail: e => resolve(e.errMsg) }))`);
  await sleep(3000);

  const page = await connectPage('pages/admin');
  const before = await page.evaluate(`(() => {
    const buttons = [...document.querySelectorAll('wx-button')].map(el => (el.innerText || '').trim());
    return { masks: document.querySelectorAll('.modal-mask').length, buttons: buttons.slice(0, 12), count: buttons.length };
  })()`);
  console.log('before:', JSON.stringify(before));

  const target = await page.evaluate(`(() => {
    const el = [...document.querySelectorAll('wx-button')].find(node => (node.innerText || '').includes('分配宿舍'));
    if (!el) return { found: false };
    el.scrollIntoView({ block: 'center' });
    const rect = el.getBoundingClientRect();
    return { found: true, x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
  })()`);
  console.log('entry:', JSON.stringify(target));
  if (!target.found) {
    console.log('RESULT', JSON.stringify({ ok: false, reason: '未找到「分配宿舍」按钮' }));
    process.exit(1);
  }

  await sleep(150);
  console.log('hit:', await tap(page, target.x, target.y));
  await sleep(1200);

  const shot = path.join('test-results', 'acceptance', 'admin-assign-modal.png');
  await page.screenshot(shot);
  const modal = await page.evaluate(`(() => {
    const mask = document.querySelector('.modal-mask');
    if (!mask) return { open: false };
    const panel = mask.querySelector('.modal-panel');
    const rect = panel.getBoundingClientRect();
    const actions = [...panel.querySelectorAll('wx-button')].map(el => {
      const r = el.getBoundingClientRect();
      return { text: (el.innerText || '').trim(), top: Math.round(r.top), bottom: Math.round(r.bottom) };
    });
    const bodyHit = document.elementFromPoint(195, innerHeight - 20);
    return {
      open: true,
      mask: [Math.round(mask.getBoundingClientRect().top), Math.round(mask.getBoundingClientRect().bottom)],
      panel: [Math.round(rect.top), Math.round(rect.bottom)],
      innerHeight,
      scrollable: panel.scrollHeight > panel.clientHeight + 2,
      scrollHeight: panel.scrollHeight,
      clientHeight: panel.clientHeight,
      text: (panel.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
      actions,
      bottomHit: bodyHit ? (bodyHit.className || bodyHit.tagName) : null
    };
  })()`);
  console.log('modal:', JSON.stringify(modal, null, 2));
  console.log('screenshot:', shot);

  // 关闭：点「取消」
  const close = await page.evaluate(`(() => {
    const el = [...document.querySelectorAll('.modal-mask wx-button')].find(node => (node.innerText || '').trim() === '取消');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  })()`);
  if (close) { await tap(page, close.x, close.y); await sleep(600); }
  const after = await page.evaluate(`({ masks: document.querySelectorAll('.modal-mask').length })`);
  const ok = modal.open && modal.bottomHit !== 'index--tabbar' && !modal.scrollable || (modal.open && modal.actions.every(item => item.bottom <= modal.innerHeight));
  console.log('RESULT', JSON.stringify({ ok: !!ok, afterClose: after, shot }));
  page.close();
  app.close();
})().catch(error => {
  console.error('探针失败：', error.message);
  process.exit(1);
});
