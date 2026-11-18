/**
 * 探针：学生端工单详情是否展示“拒单理由/接单超时”。
 * 用法：node tools/cdp-harness/probe-reject-note.cjs [orderId]
 */
const path = require('node:path');
const fs = require('node:fs');
const { connectApp, connectPage, apiLogin, SESSION_KEY } = require('./lib');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const orderId = process.argv[2] || '683';
  const session = await apiLogin('walk_stu01');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(session)}); true`);
  await app.evaluate(`new Promise(resolve => wx.reLaunch({ url: '/pages/repair-detail/index?id=${orderId}', success: () => setTimeout(() => resolve('ok'), 300), fail: e => resolve(e.errMsg) }))`);
  await sleep(3500);
  const page = await connectPage('pages/repair-detail');
  const state = await page.evaluate(`(() => {
    const text = document.body.innerText;
    return {
      hasReason: text.includes('拒单理由'),
      hasNote: text.includes('已拒单'),
      hasSnippet: text.includes('现场需要专用配件'),
      status: (text.match(/当前状态\\s*([^\\n]+)/) || [])[1] || null,
      dispatchLines: text.split('\\n').filter(line => line.includes('派单')).slice(0, 6)
    };
  })()`);
  console.log('state:', JSON.stringify(state));
  const shot = path.join('test-results', 'acceptance', 'student-reject-note.png');
  const png = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(shot, Buffer.from(png.data, 'base64'));
  console.log('screenshot:', shot);
  app.close(); page.close();
})().catch(error => { console.error(error); process.exit(1); });
