/**
 * 窄屏（320dp）布局检查：CDP 覆盖视口度量，检测横向溢出、按钮换行与文本裁切。
 *   node tools/cdp-harness/narrow-check.js
 */
const path = require('node:path');
const fs = require('node:fs');
const { connectApp, connectPage, apiLogin } = require('./lib');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'test-results', 'visual', 'extra');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const student = await apiLogin('student1');
  const app = await connectApp();
  const payload = JSON.stringify(student);
  await app.evaluate(`wx.setStorageSync('dorm_student_session', ${payload}); true`);
  await app.evaluate(`new Promise((resolve) => wx.reLaunch({ url: '/pages/repairs/index', success: () => setTimeout(() => resolve('ok'), 400), fail: () => resolve('fail') }))`);
  await sleep(1800);
  app.close();

  const page = await connectPage('pages/repairs');
  const results = {};
  for (const [label, width, height] of [['375', 375, 700], ['320', 320, 640]]) {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
    await sleep(1200);
    const metrics = await page.evaluate(`(() => {
      const de = document.documentElement;
      const all = [...document.querySelectorAll('*')];
      const beyond = all
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > de.clientWidth + 1.5; })
        .slice(0, 6)
        .map(el => ({ cls: String(el.className || '').slice(0, 50), right: Math.round(el.getBoundingClientRect().right) }));
      const bars = [...document.querySelectorAll('.action-bar, .button-row')]
        .map(bar => {
          const buttons = [...bar.querySelectorAll('wx-button, button')].filter(item => item.getBoundingClientRect().width > 0);
          const tops = [...new Set(buttons.map(item => Math.round(item.getBoundingClientRect().top)))];
          return { count: buttons.length, rows: tops.length };
        })
        .filter(bar => bar.count > 0);
      const clipped = all
        .filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible' && (el.textContent || '').trim())
        .filter(el => !/attachment-name|photo-name/.test(String(el.className || '')))
        .slice(0, 6)
        .map(el => (el.textContent || '').trim().slice(0, 24));
      return { vw: de.clientWidth, overflow: de.scrollWidth - de.clientWidth, beyond, bars, clipped };
    })()`);
    const { data } = await page.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width, height, scale: 1 }
    });
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `narrow-${label}.png`), Buffer.from(data, 'base64'));
    results[label] = metrics;
  }
  await page.send('Emulation.clearDeviceMetricsOverride');
  page.close();
  const report = { generatedAt: new Date().toISOString(), widths: results };
  fs.writeFileSync(path.join(OUT, 'narrow-report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  const failed = Object.entries(results).filter(([, metrics]) => metrics.overflow > 0 || metrics.beyond.length || metrics.clipped.length || metrics.bars.some(bar => bar.rows > 1));
  if (failed.length) process.exit(1);
})().catch(error => { console.error('窄屏检查失败：', error.message); process.exit(1); });
