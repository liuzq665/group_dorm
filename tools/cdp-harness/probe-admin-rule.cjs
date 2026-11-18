/**
 * 探针：管理员「报修规则」页的字段与维修人员展示。
 * 目的：验证 B-64 修复后能改「待修改改单时限」，维修人员行能看出“有无登录账号 / 工种 / 楼栋”。
 * 用法：node tools/cdp-harness/probe-admin-rule.cjs（需开发者工具已开 CDP 9222）
 */
const path = require('node:path');
const { connectApp, connectPage, apiLogin, SESSION_KEY } = require('./lib');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const session = await apiLogin('walk_admin');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(session)}); true`);
  await app.evaluate(`new Promise(resolve => wx.reLaunch({ url: '/pages/admin/index?tab=repair', success: () => setTimeout(() => resolve('ok'), 300), fail: e => resolve(e.errMsg) }))`);
  await sleep(3000);

  const page = await connectPage('pages/admin');
  const state = await page.evaluate(`(() => {
    const texts = [...document.querySelectorAll('wx-text, wx-view, text, view')].map(el => (el.innerText || '').trim()).filter(Boolean);
    const labels = [...new Set(texts.filter(t => t.length <= 24 && /时限|维修人员|账号|工种|楼栋|在岗|离岗/.test(t)))];
    const inputs = [...document.querySelectorAll('input')].map(el => ({ value: el.value, type: el.type }));
    return { labels: labels.slice(0, 24), inputs };
  })()`);
  console.log('state:', JSON.stringify(state));

  const shot = path.join('test-results', 'acceptance', 'admin-rule-tab.png');
  const png = await page.send('Page.captureScreenshot', { format: 'png' });
  require('node:fs').writeFileSync(shot, Buffer.from(png.data, 'base64'));
  console.log('screenshot:', shot);
  app.close(); page.close();
})().catch(error => { console.error(error); process.exit(1); });
