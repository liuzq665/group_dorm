/**
 * UI 诊断：按钮文字垂直居中、 tabBar 覆盖底部内容、 tabBar 选中态。
 *   node tools/cdp-harness/diagnose-ui.js
 */
const { connectApp, connectPage, apiLogin, goto, targets } = require('./lib');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const BUTTON_METRICS = `(() => {
  const buttons = [...document.querySelectorAll('wx-button')].filter(button => button.getBoundingClientRect().height > 0);
  const measure = button => {
    const rect = button.getBoundingClientRect();
    const style = getComputedStyle(button);
    const range = document.createRange();
    range.selectNodeContents(button);
    const textRect = range.getBoundingClientRect();
    return {
      cls: String(button.className || '').slice(0, 50),
      text: (button.innerText || '').trim().slice(0, 12),
      height: Math.round(rect.height),
      textHeight: Math.round(textRect.height),
      gapTop: Math.round(textRect.top - rect.top),
      gapBottom: Math.round(rect.bottom - textRect.bottom),
      diff: Math.round((textRect.top - rect.top) - (rect.bottom - textRect.bottom)),
      lineHeight: style.lineHeight,
      fontSize: style.fontSize,
      display: style.display,
      alignItems: style.alignItems
    };
  };
  return buttons.map(measure);
})()`;

const TABBAR_METRICS = `(() => {
  const tabbar = document.querySelector('[class*="tabbar"]');
  if (!tabbar) return null;
  const rect = tabbar.getBoundingClientRect();
  const items = [...tabbar.querySelectorAll('[class*="tab-item"]')].map(item => {
    const itemRect = item.getBoundingClientRect();
    const style = getComputedStyle(item);
    const icon = item.querySelector('[class*="tab-icon"]');
    const label = item.querySelector('[class*="tab-label"]');
    return {
      text: (label ? label.innerText : item.innerText || '').trim(),
      cls: String(item.className || ''),
      color: style.color,
      fontWeight: style.fontWeight,
      backgroundColor: style.backgroundColor,
      iconColor: icon ? getComputedStyle(icon).color : '',
      iconBackground: icon ? getComputedStyle(icon).backgroundColor : '',
      width: Math.round(itemRect.width),
      height: Math.round(itemRect.height)
    };
  });
  return { height: Math.round(rect.height), top: Math.round(rect.top), background: getComputedStyle(tabbar).backgroundColor, items };
})()`;

const COVER_METRICS = `(() => {
  window.scrollTo(0, document.documentElement.scrollHeight);
  const tabbar = document.querySelector('[class*="tabbar"]');
  if (!tabbar) return null;
  const tabbarRect = tabbar.getBoundingClientRect();
  const pageChildren = [...document.querySelectorAll('.page > *')].filter(element => !element.closest('[class*="tabbar"]'));
  const bottoms = pageChildren.map(element => {
    const rect = element.getBoundingClientRect();
    return { cls: String(element.className || '').slice(0, 40), bottom: Math.round(rect.bottom) };
  }).filter(item => item.bottom > 0);
  const maxBottom = bottoms.reduce((max, item) => (item.bottom > max.bottom ? item : max), { bottom: 0, cls: '' });
  const paddingBottom = getComputedStyle(document.querySelector('.page')).paddingBottom;
  return {
    viewportHeight: window.innerHeight,
    tabbarTop: Math.round(tabbarRect.top),
    tabbarHeight: Math.round(tabbarRect.height),
    contentMaxBottom: maxBottom.bottom,
    contentMaxCls: maxBottom.cls,
    covered: maxBottom.bottom > Math.round(tabbarRect.top) + 1,
    coveredPx: Math.max(0, maxBottom.bottom - Math.round(tabbarRect.top)),
    pagePaddingBottom: paddingBottom,
    scrollHeight: document.documentElement.scrollHeight
  };
})()`;

(async () => {
  const student = await apiLogin('student1');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync('dorm_student_session', ${JSON.stringify(student)}); true`);
  await app.evaluate(`new Promise((resolve) => wx.reLaunch({ url: '/pages/home/index', success: () => setTimeout(() => resolve('ok'), 500), fail: () => resolve('fail') }))`);
  await sleep(2000);
  app.close();

  const report = { buttons: {}, tabbar: {}, cover: {} };
  for (const page of ['pages/home', 'pages/repairs', 'pages/stays', 'pages/messages', 'pages/mine', 'pages/repair-form', 'pages/accommodation']) {
    const { connectApp: connectAppAgain } = require('./lib');
    const appClient = await connectAppAgain();
    const navigated = await appClient.evaluate(`new Promise((resolve) => {
      const target = '/${page}/index';
      const isTab = ['/pages/home/index','/pages/repairs/index','/pages/stays/index','/pages/messages/index','/pages/mine/index'].includes(target);
      const done = (label) => setTimeout(() => resolve(label), 400);
      if (isTab) wx.switchTab({ url: target, success: () => done('switchTab'), fail: () => wx.reLaunch({ url: target, success: () => done('reLaunch'), fail: () => done('fail') }) });
      else wx.navigateTo({ url: target, success: () => done('navigateTo'), fail: () => done('fail') });
    })`);
    appClient.close();
    await sleep(1500);
    const pageClient = await connectPage(`/${page}/index`);
    report.buttons[page] = await pageClient.evaluate(BUTTON_METRICS);
    report.tabbar[page] = await pageClient.evaluate(TABBAR_METRICS);
    report.cover[page] = await pageClient.evaluate(COVER_METRICS);
    await pageClient.evaluate('window.scrollTo(0, 0); true');
    pageClient.close();
    if (!['/pages/home/index', '/pages/repairs/index', '/pages/stays/index', '/pages/messages/index', '/pages/mine/index'].includes(`/${page}/index`)) {
      const client = await (async () => { try { return await connectAppAgain(); } catch { return null; } })();
      if (client) { await client.evaluate('wx.navigateBack({ delta: 1 }); true'); client.close(); }
    }
    console.log(`已诊断 ${page}（导航：${navigated}）`);
  }

  console.log('\n=== 按钮文字垂直居中（|diff| > 2 视为不居中）===');
  for (const [page, buttons] of Object.entries(report.buttons)) {
    for (const button of buttons) {
      if (Math.abs(button.diff) > 2) {
        console.log(`[不一致] ${page} "${button.text}" ${button.cls} h=${button.height} textH=${button.textHeight} gapTop=${button.gapTop} gapBottom=${button.gapBottom} lineHeight=${button.lineHeight} display=${button.display}`);
      }
    }
  }
  console.log('\n=== tabBar 选中态 ===');
  for (const [page, tabbar] of Object.entries(report.tabbar)) {
    if (!tabbar) continue;
    console.log(`${page}: height=${tabbar.height} 选中=${JSON.stringify(tabbar.items.filter(item => item.cls.includes('selected')))}`);
  }
  console.log('\n=== tabBar 覆盖底部内容 ===');
  for (const [page, cover] of Object.entries(report.cover)) {
    if (!cover) continue;
    console.log(`${page}: 视口=${cover.viewportHeight} tabTop=${cover.tabbarTop} 内容最底部=${cover.contentMaxBottom}(${cover.contentMaxCls}) 覆盖=${cover.covered} 覆盖像素=${cover.coveredPx} 页面paddingBottom=${cover.pagePaddingBottom}`);
  }
})().catch(error => { console.error('诊断失败：', error.message); process.exit(1); });


