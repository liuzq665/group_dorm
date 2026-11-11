/**
 * 小程序视觉级验收（通过微信开发者工具 CDP 直接驱动真实渲染层）
 *   node tools/cdp-harness/visual-acceptance.js
 * 前置：微信开发者工具已启动（--remote-debugging-port=9222）并打开本项目；后端已在 8080 运行。
 * 产物：test-results/visual/<role>/<page>[-<state>].png 与 test-results/visual/visual-report.json
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  connectApp, connectPage, apiLogin, goto, pageTarget
} = require('./lib');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'test-results', 'visual');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function api(session, apiPath) {
  const response = await fetch(`http://127.0.0.1:8080/api/v1${apiPath}`, {
    headers: { Authorization: `Bearer ${session.token}` }
  });
  const body = await response.json();
  if (body.code !== 0) throw new Error(`${apiPath} 失败：${body.message}`);
  return body.data;
}

const METRICS = `(() => {
  const vw = document.documentElement.clientWidth;
  const de = document.documentElement;
  const all = [...document.querySelectorAll('*')];
  const beyond = all
    .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1.5; })
    .slice(0, 8)
    .map(el => ({ cls: String(el.className || '').slice(0, 60), right: Math.round(el.getBoundingClientRect().right) }));
  const bars = [...document.querySelectorAll('.action-bar, .button-row')]
    .map(bar => {
      const buttons = [...bar.querySelectorAll('wx-button, button')].filter(button => button.getBoundingClientRect().width > 0);
      const tops = [...new Set(buttons.map(button => Math.round(button.getBoundingClientRect().top)))];
      return {
        count: buttons.length,
        rows: tops.length,
        widths: buttons.map(button => Math.round(button.getBoundingClientRect().width))
      };
    })
    .filter(bar => bar.count > 0);
  const clipped = all
    .filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible' && (el.textContent || '').trim())
    .slice(0, 8)
    .map(el => ({ cls: String(el.className || '').slice(0, 60), text: (el.textContent || '').trim().slice(0, 24), sw: el.scrollWidth, cw: el.clientWidth }));
  const heads = [...document.querySelectorAll('.record-head, .row')]
    .slice(0, 6)
    .map(head => {
      const title = head.querySelector('.record-title, .section-inline, .batch-title');
      const tag = head.querySelector('.tag, .status');
      if (!title || !tag) return null;
      const tr = title.getBoundingClientRect(), gr = tag.getBoundingClientRect();
      return { overlap: Math.round(tr.right - gr.left) > 1, titleRight: Math.round(tr.right), tagLeft: Math.round(gr.left) };
    })
    .filter(Boolean);
  // 按钮文字垂直居中：文字盒上下留白差异超过 2px 视为“置顶/贴底”
  const buttonsMisaligned = [...document.querySelectorAll('wx-button')]
    .filter(button => button.getBoundingClientRect().height > 0 && (button.innerText || '').trim())
    .map(button => {
      const rect = button.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(button);
      const textRect = range.getBoundingClientRect();
      const gapTop = textRect.top - rect.top;
      const gapBottom = rect.bottom - textRect.bottom;
      return { text: (button.innerText || '').trim().slice(0, 12), diff: Math.round(gapTop - gapBottom) };
    })
    .filter(item => Math.abs(item.diff) > 2);
  // 底部导航：选中态数量 + 是否覆盖底部内容（仅在含 tabBar 的页面检查）
  const tabBarRoot = document.querySelector('[class*="tabbar"]');
  let tabBar = null;
  if (tabBarRoot) {
    const items = [...tabBarRoot.querySelectorAll('[class*="tab-item"]')];
    const selectedItems = items.filter(item => String(item.className || '').includes('selected'));
    window.scrollTo(0, document.documentElement.scrollHeight);
    const tabBarRect = tabBarRoot.getBoundingClientRect();
    const contentBottoms = [...document.querySelectorAll('.page > *')]
      .filter(element => !element.closest('[class*="tabbar"]') && element.getBoundingClientRect().width > 0 && getComputedStyle(element).position !== 'fixed')
      .map(element => element.getBoundingClientRect().bottom);
    const contentMaxBottom = contentBottoms.length ? Math.max(...contentBottoms) : 0;
    window.scrollTo(0, 0);
    tabBar = {
      items: items.length,
      selectedCount: selectedItems.length,
      selectedText: selectedItems.map(item => (item.innerText || '').replace(/\\s+/g, ' ').trim()).join('、'),
      covered: contentMaxBottom > Math.round(tabBarRect.top) + 1,
      coveredPx: Math.max(0, Math.round(contentMaxBottom - tabBarRect.top))
    };
  }
  return {
    vw,
    docOverflow: de.scrollWidth - vw,
    paintHeight: de.scrollHeight,
    beyond,
    bars,
    clipped,
    heads,
    buttonsMisaligned,
    tabBar,
    text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 260)
  };
})()`;

async function evaluateApp(app, expression) {
  return app.evaluate(`(() => { const pages = getCurrentPages(); const page = pages[pages.length - 1]; ${expression} })()`);
}

async function capture(app, spec, suffix) {
  const pageClient = await (async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try { return await connectPage(spec.matchPath || spec.url.split('?')[0]); } catch { await sleep(250); }
    }
    throw new Error(`无法连接页面渲染目标：${spec.url}`);
  })();
  const file = path.join(OUT, spec.role, `${spec.name}${suffix ? `-${suffix}` : ''}.png`);
  await pageClient.screenshot(file);
  if (spec.fullPage) {
    await pageClient.screenshotFull(path.join(OUT, spec.role, `${spec.name}${suffix ? `-${suffix}` : ''}-full.png`));
  }
  const metrics = await pageClient.evaluate(METRICS);
  pageClient.close();
  const issues = [];
  if (metrics.docOverflow > 0) issues.push(`横向溢出 ${metrics.docOverflow}px`);
  if (metrics.beyond.length) issues.push(`元素超出视口右边界：${metrics.beyond.map(item => item.cls || '未知').join('、')}`);
  for (const bar of metrics.bars) if (bar.rows > 1) issues.push(`操作按钮换行（${bar.count} 个按钮占 ${bar.rows} 行）`);
  // 附件名称按规范 C-09 单行省略，属设计内行为，不计为缺陷
  const clippedText = metrics.clipped.filter(item => !/attachment-name|photo-name/.test(item.cls));
  if (clippedText.length) issues.push(`文本被裁切：${clippedText.map(item => item.text).join('、')}`);
  for (const head of metrics.heads) if (head.overlap) issues.push('标题与状态标签重叠');
  if (metrics.buttonsMisaligned.length) {
    issues.push(`按钮文字垂直不居中：${metrics.buttonsMisaligned.map(item => `${item.text}(偏差${item.diff}px)`).join('、')}`);
  }
  if (metrics.tabBar) {
    if (metrics.tabBar.covered) issues.push(`底部导航覆盖页面内容 ${metrics.tabBar.coveredPx}px`);
    if (metrics.tabBar.selectedCount === 0) issues.push('底部导航未高亮当前页面');
    if (metrics.tabBar.selectedCount > 1) issues.push(`底部导航高亮多个页面（${metrics.tabBar.selectedCount}）`);
  }
  return {
    role: spec.role,
    page: spec.name,
    state: suffix || 'default',
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    issues,
    metrics
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const sessions = {
    STUDENT: await apiLogin('student1'),
    REPAIRER: await apiLogin('repair1'),
    DORM_MANAGER: await apiLogin('manager3'),
    ADMIN: await apiLogin('admin')
  };
  console.log('登录完成：', Object.entries(sessions).map(([role, session]) => `${role}=${session.user.name}`).join('，'));

  const studentActive = await api(sessions.STUDENT, '/repair-orders');
  const studentHistory = await api(sessions.STUDENT, '/repair-history');
  const repairerActive = await api(sessions.REPAIRER, '/repair-orders');
  const repairerHistory = await api(sessions.REPAIRER, '/repair-history');
  const studentStays = await api(sessions.STUDENT, '/stay/applications');
  const batches = await api(sessions.STUDENT, '/stay/current');
  const detailActive = studentActive[0] || studentHistory[0];
  const detailScored = studentHistory.find(row => row.score) || studentHistory[0] || studentActive[0];
  const repairerOrder = repairerActive[0] || repairerHistory[0];
  const stayApplication = studentStays[0];
  const batch = batches[0];
  console.log('样本数据：', JSON.stringify({
    detailActive: detailActive?.order_id,
    detailScored: detailScored?.order_id,
    repairerOrder: repairerOrder?.order_id,
    stayApplication: stayApplication?.application_id,
    batch: batch?.batch_id
  }));

  const app = await connectApp();
  const report = [];
  let currentRole = '';
  const run = async (role, spec) => {
    const targetPath = spec.url.split('?')[0].replace(/^\//, '');
    const roleChanged = role !== currentRole;
    if (roleChanged) {
      // 切换角色时强制 reLaunch，避免复用上一角色的 tab 页面实例导致脏状态（tabBar/弹层残留）
      const payload = JSON.stringify(sessions[role]);
      await app.evaluate(`wx.setStorageSync('dorm_student_session', ${payload}); true`);
      await app.evaluate(`new Promise((resolve) => wx.reLaunch({ url: ${JSON.stringify(spec.url)}, success: () => setTimeout(() => resolve('reLaunch'), 400), fail: () => resolve('fail') }))`);
      currentRole = role;
      await sleep(spec.wait || 1800);
    } else {
      const stack = await app.evaluate(`getCurrentPages().map(item => item.route)`);
      const samePage = !spec.url.includes('?') && stack[stack.length - 1] === targetPath;
      if (!samePage) {
        const result = await goto(app, spec.url, sessions[role], { wait: spec.wait || 1500 });
        if (String(result).startsWith('fail')) throw new Error(`${spec.role}/${spec.name} 导航失败：${result}`);
      } else if (spec.wait) {
        await sleep(spec.wait);
      }
    }
    if (spec.before) { await evaluateApp(app, spec.before); await sleep(900); }
    report.push(await capture(app, { ...spec, role }, spec.suffix));
    if (spec.after) { await evaluateApp(app, spec.after); await sleep(300); }
    if (spec.pop) {
      await app.evaluate('wx.navigateBack({ delta: 1 }); true');
      await sleep(600);
    }
  };

  // ------------------------------- 学生端 -------------------------------
  const S = 'STUDENT';
  await run(S, { role: '学生端', name: 'home', url: '/pages/home/index' });
  await run(S, { role: '学生端', name: 'repairs-all', url: '/pages/repairs/index', matchPath: 'pages/repairs' });
  await run(S, {
    role: '学生端', name: 'repairs-accept', url: '/pages/repairs/index', matchPath: 'pages/repairs',
    before: `page.chooseTab({ currentTarget: { dataset: { tab: 'accept' } } }); return true;`
  });
  await run(S, {
    role: '学生端', name: 'repairs-history', url: '/pages/repairs/index', matchPath: 'pages/repairs',
    before: `page.chooseTab({ currentTarget: { dataset: { tab: 'history' } } }); return true;`
  });
  await run(S, { role: '学生端', name: 'repair-detail', url: `/pages/repair-detail/index?id=${detailActive.order_id}`, matchPath: 'pages/repair-detail', pop: true, fullPage: true });
  await run(S, { role: '学生端', name: 'repair-detail-scored', url: `/pages/repair-detail/index?id=${detailScored.order_id}`, matchPath: 'pages/repair-detail', pop: true, fullPage: true });
  await run(S, { role: '学生端', name: 'repair-form', url: '/pages/repair-form/index', matchPath: 'pages/repair-form' , pop: true });
  await run(S, { role: '学生端', name: 'messages-all', url: '/pages/messages/index', matchPath: 'pages/messages' });
  await run(S, {
    role: '学生端', name: 'messages-source', url: '/pages/messages/index', matchPath: 'pages/messages',
    before: `page.chooseSource({ currentTarget: { dataset: { key: 'DORM_MANAGER' } } }); return true;`, wait: 2000
  });
  await run(S, {
    role: '学生端', name: 'messages-detail', url: '/pages/messages/index', matchPath: 'pages/messages',
    before: `const item = page.data.items[0]; page.open({ currentTarget: { dataset: { item } } }); return true;`
  });
  await run(S, { role: '学生端', name: 'stays', url: '/pages/stays/index', matchPath: 'pages/stays' });
  await run(S, {
    role: '学生端', name: 'stays-approved', url: '/pages/stays/index', matchPath: 'pages/stays',
    before: `page.chooseTab({ currentTarget: { dataset: { tab: 'approved' } } }); return true;`
  });
  await run(S, { role: '学生端', name: 'stay-form', url: `/pages/stay-form/index?batchId=${batch.batch_id}`, matchPath: 'pages/stay-form' , pop: true });
  await run(S, { role: '学生端', name: 'stay-detail', url: `/pages/stay-detail/index?id=${stayApplication.application_id}`, matchPath: 'pages/stay-detail', pop: true, fullPage: true });
  await run(S, { role: '学生端', name: 'accommodation', url: '/pages/accommodation/index', matchPath: 'pages/accommodation' });
  await run(S, { role: '学生端', name: 'mine', url: '/pages/mine/index', matchPath: 'pages/mine' });

  // ------------------------------ 维修人员端 ------------------------------
  const R = 'REPAIRER';
  await run(R, { role: '维修人员端', name: 'home', url: '/pages/home/index' });
  await run(R, { role: '维修人员端', name: 'repairs-all', url: '/pages/repairs/index', matchPath: 'pages/repairs' });
  await run(R, {
    role: '维修人员端', name: 'repairs-history', url: '/pages/repairs/index', matchPath: 'pages/repairs',
    before: `page.chooseTab({ currentTarget: { dataset: { tab: 'history' } } }); return true;`
  });
  await run(R, { role: '维修人员端', name: 'repair-detail', url: `/pages/repair-detail/index?id=${repairerOrder.order_id}`, matchPath: 'pages/repair-detail' });
  await run(R, { role: '维修人员端', name: 'records', url: '/pages/repairer-stats/index', matchPath: 'pages/repairer-stats', fullPage: true });
  await run(R, {
    role: '维修人员端', name: 'records-rating', url: '/pages/repairer-stats/index', matchPath: 'pages/repairer-stats',
    before: `page.selectTab({ currentTarget: { dataset: { tab: 'rating' } } }); return true;`
  });
  await run(R, { role: '维修人员端', name: 'messages', url: '/pages/messages/index', matchPath: 'pages/messages' });
  await run(R, { role: '维修人员端', name: 'mine', url: '/pages/mine/index', matchPath: 'pages/mine' });

  // ---------------------- 宿管/管理员（公共样式回归） ----------------------
  await run('DORM_MANAGER', { role: '宿管端', name: 'home', url: '/pages/home/index' });
  await run('DORM_MANAGER', { role: '宿管端', name: 'repairs', url: '/pages/repairs/index', matchPath: 'pages/repairs' });
  await run('DORM_MANAGER', { role: '宿管端', name: 'stays', url: '/pages/stays/index', matchPath: 'pages/stays' });
  await run('ADMIN', { role: '系统管理员端', name: 'home', url: '/pages/home/index' });
  await run('ADMIN', { role: '系统管理员端', name: 'repairs', url: '/pages/repairs/index', matchPath: 'pages/repairs' });
  await run('ADMIN', { role: '系统管理员端', name: 'stays', url: '/pages/stays/index', matchPath: 'pages/stays' });
  await run('ADMIN', { role: '系统管理员端', name: 'messages', url: '/pages/messages/index', matchPath: 'pages/messages' });

  // 登录页（清空会话 → 截图 → 恢复学生会话）
  await app.evaluate('wx.removeStorageSync("dorm_student_session"); true');
  await app.evaluate('new Promise((resolve) => wx.reLaunch({ url: "/pages/login/index", success: () => setTimeout(() => resolve("ok"), 400), fail: () => resolve("fail") }))');
  await sleep(1600);
  report.push(await capture(app, { role: '通用', name: 'login', url: '/pages/login/index', matchPath: 'pages/login' }, ''));
  await app.evaluate(`wx.setStorageSync('dorm_student_session', ${JSON.stringify(sessions.STUDENT)}); true`);

  app.close();
  const summary = {
    generatedAt: new Date().toISOString(),
    total: report.length,
    failed: report.filter(item => item.issues.length > 0).length,
    results: report
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'visual-report.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n截图 ${report.length} 张，问题页面 ${summary.failed} 个`);
  for (const item of report) {
    const flag = item.issues.length ? 'ISSUE' : 'OK   ';
    console.log(`[${flag}] ${item.role}/${item.page}/${item.state} -> ${item.file}${item.issues.length ? `  ⚠ ${item.issues.join('；')}` : ''}`);
  }
})().catch(error => {
  console.error('视觉验收执行失败：', error.message);
  process.exit(1);
});



