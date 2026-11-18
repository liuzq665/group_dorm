/**
 * 小程序页面级验收：四角色逐页走查 + 弹层/浮层/导航/滚动/安全区遮挡检测
 *   node tools/cdp-harness/acceptance-ui.js            # 仅度量（稳）
 *   SHOT=1 node tools/cdp-harness/acceptance-ui.js     # 同时截图（窗口需在前台）
 * 产物：test-results/acceptance/acceptance-report.json 与截图（SHOT=1）
 */
const fs = require('node:fs');
const path = require('node:path');
const { connectApp, connectPage, apiLogin, goto } = require('./lib');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'test-results', 'acceptance');
const FIXTURES = JSON.parse(fs.readFileSync(path.join(ROOT, 'test-results', 'acceptance-fixtures.json'), 'utf8'));
const SHOT = process.env.SHOT === '1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const PAGE_METRICS = `(() => {
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  const de = document.documentElement;
  const all = [...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().width > 0);
  const beyond = all.filter(el => el.getBoundingClientRect().right > vw + 1.5)
    .slice(0, 8).map(el => ({ cls: String(el.className || '').slice(0, 60), right: Math.round(el.getBoundingClientRect().right) }));
  const fixed = all.filter(el => {
    const style = getComputedStyle(el);
    if (style.position !== 'fixed') return false;
    if (String(el.className || '').includes('tabbar')) return false;
    return el.getBoundingClientRect().height > 0;
  }).map(el => ({ cls: String(el.className || '').slice(0, 50), rect: el.getBoundingClientRect().toJSON() }));
  const bars = [...document.querySelectorAll('.action-bar, .button-row')].map(bar => {
    const buttons = [...bar.querySelectorAll('wx-button, button')].filter(b => b.getBoundingClientRect().width > 0);
    return { count: buttons.length, rows: new Set(buttons.map(b => Math.round(b.getBoundingClientRect().top))).size };
  }).filter(bar => bar.count > 0);
  const clipped = all.filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible' && (el.textContent || '').trim())
    .slice(0, 6).map(el => ({ cls: String(el.className || '').slice(0, 50), text: (el.textContent || '').trim().slice(0, 20) }));
  const heads = [...document.querySelectorAll('.record-head, .row')].slice(0, 6).map(head => {
    const title = head.querySelector('.record-title, .section-inline, .batch-title');
    const tag = head.querySelector('.tag, .status');
    if (!title || !tag) return null;
    return { overlap: Math.round(title.getBoundingClientRect().right - tag.getBoundingClientRect().left) > 1 };
  }).filter(Boolean);
  const misaligned = [...document.querySelectorAll('wx-button')].filter(b => b.getBoundingClientRect().height > 0 && (b.innerText || '').trim()).map(b => {
    const rect = b.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(b);
    const text = range.getBoundingClientRect();
    return { text: (b.innerText || '').trim().slice(0, 10), diff: Math.round((text.top - rect.top) - (rect.bottom - text.bottom)) };
  }).filter(item => Math.abs(item.diff) > 2);
  const tabBarRoot = document.querySelector('[class*="tabbar"]');
  let tabBar = null;
  if (tabBarRoot) {
    const items = [...tabBarRoot.querySelectorAll('[class*="tab-item"]')];
    const selected = items.filter(item => String(item.className || '').includes('selected'));
    window.scrollTo(0, de.scrollHeight);
    const barRect = tabBarRoot.getBoundingClientRect();
    const contentBottoms = [...document.querySelectorAll('.page > *')]
      .filter(el => !el.closest('[class*="tabbar"]') && el.getBoundingClientRect().width > 0 && getComputedStyle(el).position !== 'fixed')
      .map(el => el.getBoundingClientRect().bottom);
    const maxBottom = contentBottoms.length ? Math.max(...contentBottoms) : 0;
    window.scrollTo(0, 0);
    tabBar = {
      items: items.length,
      selectedCount: selected.length,
      selectedText: selected.map(item => (item.innerText || '').replace(/\\s+/g, ' ').trim()).join('、'),
      top: Math.round(barRect.top),
      coveredPx: Math.max(0, Math.round(maxBottom - barRect.top))
    };
  }
  const empty = (document.body.innerText || '').trim().length < 8;
  // 页面可滚动性：滚到底再回到顶部，验证内容不被裁切
  const scrollHeight = de.scrollHeight, viewport = vh;
  window.scrollTo(0, scrollHeight);
  const scrolledTop = Math.round(window.scrollY);
  const scrollable = scrollHeight - viewport;
  window.scrollTo(0, 0);
  return {
    vw, vh, docOverflow: de.scrollWidth - vw, scrollHeight, scrollable, scrolledTop, empty,
    beyond, fixed, bars, clipped, heads, misaligned, tabBar,
    text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 220)
  };
})()`;

const MODAL_METRICS = `(() => {
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  const mask = document.querySelector('.modal-mask');
  if (!mask) return { present: false };
  const panel = mask.querySelector('.modal-panel, .publish-panel, .detail-panel, .form-panel');
  const results = [];
  if (panel) {
    const before = panel.getBoundingClientRect();
    const scrollHeight = panel.scrollHeight, clientHeight = panel.clientHeight;
    // 把弹层内部滚到底，确认底部操作按钮可达
    panel.scrollTop = scrollHeight;
    const after = panel.getBoundingClientRect();
    const action = panel.querySelector('.action-bar');
    const actionRect = action ? action.getBoundingClientRect() : null;
    results.push({
      rect: { top: Math.round(before.top), bottom: Math.round(before.bottom), left: Math.round(before.left), right: Math.round(before.right) },
      scrollHeight, clientHeight, scrollTopAfter: panel.scrollTop,
      innerScrollable: scrollHeight > clientHeight + 2,
      actionTop: actionRect ? Math.round(actionRect.top) : null,
      actionBottom: actionRect ? Math.round(actionRect.bottom) : null,
      actionReachable: actionRect ? actionRect.bottom <= vh + 1 && actionRect.top >= 0 : true,
      horizontalOverflow: panel.scrollWidth - panel.clientWidth,
      text: (panel.innerText || '').replace(/\\s+/g, ' ').slice(0, 200)
    });
    panel.scrollTop = 0;
  }
  const close = [...mask.querySelectorAll('.modal-close, [class*="modal-close"]')].find(el => el.getBoundingClientRect().width > 0);
  const maskRect = mask.getBoundingClientRect();
  // 底部 24px 中心点命中的元素：是否仍是弹层（tabBar 不应盖住弹层）
  const hit = document.elementFromPoint(vw / 2, vh - 12);
  return {
    present: true,
    maskRect: { top: Math.round(maskRect.top), bottom: Math.round(maskRect.bottom), height: Math.round(maskRect.height) },
    closeVisible: !!close,
    bottomHit: hit ? String(hit.className || hit.tagName).slice(0, 40) : '',
    bottomInModal: hit ? !!hit.closest('.modal-mask') : false,
    panel: panel ? {
      count: 1
    } : null,
    details: results
  };
})()`;

async function tap(page, text, { exact = false } = {}) {
  return page.evaluate(`(() => {
    const wanted = ${JSON.stringify(text)};
    const nodes = [...document.querySelectorAll('wx-button, button, .modal-close, .record-more, .tab, [class*="tab-item"], text')];
    const labelOf = node => (node.innerText || '').replace(/\\s+/g, ' ').trim();
    const usable = nodes.filter(node => { const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; });
    const matches = usable.filter(node => { const label = labelOf(node); return ${exact ? 'label === wanted' : 'label.includes(wanted)'}; });
    if (!matches.length) {
      const seen = usable.filter(node => { const rect = node.getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight; }).slice(0, 20).map(labelOf).filter(Boolean);
      return { ok: false, tried: wanted, seen };
    }
    const inView = matches.find(node => { const rect = node.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; });
    const target = inView || matches[0];
    const fire = () => {
      const rect = target.getBoundingClientRect();
      const point = new Touch({ identifier: 1, target, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
      target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [point], targetTouches: [point], changedTouches: [point] }));
      setTimeout(() => target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [point] })), 40);
    };
    // 弹层内部有滚动时，底部操作按钮可能不在视口内，先滚到视口中央再点击
    if (!inView) target.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = target.getBoundingClientRect();
    if (inView) {
      fire();
      return { ok: true, label: labelOf(target), rect: { top: Math.round(rect.top), height: Math.round(rect.height) } };
    }
    setTimeout(fire, 120);
    return { ok: true, label: labelOf(target), rect: { top: Math.round(rect.top), height: Math.round(rect.height) }, scrolled: true };
  })()`);
}

function judgePage(metrics) {
  const issues = [];
  if (metrics.empty) issues.push('页面无内容（可能是权限拦截或接口失败）');
  if (metrics.docOverflow > 0) issues.push(`横向溢出 ${metrics.docOverflow}px`);
  if (metrics.beyond.length) issues.push(`元素超出右边界：${metrics.beyond.map(item => item.cls || '未知').join('、')}`);
  for (const bar of metrics.bars) if (bar.rows > 1) issues.push(`操作按钮换行（${bar.count} 个按钮占 ${bar.rows} 行）`);
  const clipped = metrics.clipped.filter(item => !/attachment-name|photo-name/.test(item.cls));
  if (clipped.length) issues.push(`文本被裁切：${clipped.map(item => item.text).join('、')}`);
  for (const head of metrics.heads) if (head.overlap) issues.push('标题与状态标签重叠');
  if (metrics.misaligned.length) issues.push(`按钮文字垂直不居中：${metrics.misaligned.map(item => `${item.text}(${item.diff}px)`).join('、')}`);
  if (metrics.tabBar) {
    if (metrics.tabBar.coveredPx > 1) issues.push(`底部导航覆盖内容 ${metrics.tabBar.coveredPx}px`);
    if (metrics.tabBar.selectedCount === 0) issues.push('底部导航未高亮当前页');
    if (metrics.tabBar.selectedCount > 1) issues.push(`底部导航高亮 ${metrics.tabBar.selectedCount} 项`);
  }
  if (metrics.fixed.length) issues.push(`存在固定浮层：${metrics.fixed.map(item => item.cls).join('、')}`);
  return issues;
}

function judgeModal(metrics, { expectClose = true } = {}) {
  const issues = [];
  if (!metrics.present) return { issues: ['弹层未打开'], metrics };
  const detail = metrics.details[0];
  if (!detail) return { issues: ['未找到弹层面板'], metrics };
  if (detail.rect.top < 4) issues.push(`弹层顶部超出视口 ${4 - detail.rect.top}px`);
  if (detail.rect.bottom > metrics.maskRect.height - 2) issues.push(`弹层底部超出视口 ${detail.rect.bottom - metrics.maskRect.height}px`);
  if (detail.horizontalOverflow > 0) issues.push(`弹层横向溢出 ${detail.horizontalOverflow}px`);
  if (detail.innerScrollable && !detail.actionReachable) issues.push('弹层底部操作按钮滚动后仍不可达');
  if (metrics.maskRect.top > 0 || metrics.maskRect.bottom < metrics.vh - 2) issues.push('遮罩未覆盖全屏');
  if (!metrics.bottomInModal) issues.push('底部命中的不是弹层（可能被导航栏/浮层压住）');
  if (expectClose && !metrics.closeVisible) issues.push('弹层缺少可见的关闭入口');
  if (!detail.text || detail.text.length < 4) issues.push('弹层内容为空');
  return { issues, metrics: { ...metrics, detail } };
}

async function navigate(app, session, url, wait = 1400) {
  const result = await goto(app, url, session, { wait });
  if (String(result).startsWith('fail')) throw new Error(`导航失败 ${url}：${result}`);
  await sleep(200);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const sessions = {
    STUDENT: await apiLogin('student1'),
    REPAIRER: await apiLogin('repair1'),
    DORM_MANAGER: await apiLogin('manager3'),
    ADMIN: await apiLogin('admin')
  };
  console.log('登录完成');
  const app = await connectApp();
  let currentRole = '';
  const report = [];

  const capture = async (spec) => {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        let page = await connectPage(spec.matchPath || spec.url.split('?')[0].replace(/^\//, ''));
        const ready = await page.evaluate(`document.body.innerText.trim().length`);
        if (!ready) {
          page.close();
          throw new Error('页面未渲染');
        }
        if (spec.openTap) {
          // 详情类页面需要先拉接口再渲染操作区，等按钮出现后再点，避免骨架屏阶段判为“无入口”
          for (let i = 0; i < 8; i += 1) {
            const hasButton = await page.evaluate(`[...document.querySelectorAll('wx-button, button')].some(node => (node.innerText || '').includes(${JSON.stringify(spec.openTap)}))`);
            if (hasButton) break;
            await sleep(400);
          }
          const tapped = await tap(page, spec.openTap);
          if (!tapped.ok) {
            report.push({ ...spec, issues: [`未找到「${spec.openTap}」入口`], seen: tapped.seen, skipped: true });
            page.close();
            return;
          }
          await sleep(600);
        } else if (spec.openMethod) {
          await app.evaluate(`(() => { const pages = getCurrentPages(); const page = pages[pages.length - 1]; ${spec.openMethod}; return true; })()`);
          await sleep(600);
        }
        if (spec.shot && SHOT) {
          const file = path.join(OUT, `${spec.id}.png`);
          await page.screenshot(file);
        }
        let raw = await page.evaluate(spec.modal ? MODAL_METRICS : PAGE_METRICS);
        let judged = spec.modal ? judgeModal(raw, spec) : { issues: judgePage(raw), metrics: raw };
        // 弹层隐藏 tabBar 是异步 setData，首次测量偶尔会打到底部 tabBar：等一拍再量一次，避免偶发误报
        if (spec.modal && judged.issues.some(issue => issue.includes('底部命中'))) {
          await sleep(700);
          raw = await page.evaluate(MODAL_METRICS);
          judged = judgeModal(raw, spec);
        }
        report.push({ ...spec, issues: judged.issues, metrics: judged.metrics });
        if (spec.closeTap) {
          const closed = await tap(page, spec.closeTap);
          await sleep(450);
          let stillOpen = await page.evaluate(`!!document.querySelector('.modal-mask')`);
          // 兜底：触摸合成在个别弹层上不生效时，直接调用页面关闭方法，确认“能关掉、关掉后不留遮罩”
          if (stillOpen && spec.closeMethod) {
            try {
              await app.evaluate(`(() => { const pages = getCurrentPages(); const page = pages[pages.length - 1]; page["${spec.closeMethod}"](); return true; })()`);
              await sleep(450);
              stillOpen = await page.evaluate(`!!document.querySelector('.modal-mask')`);
            } catch (error) {
              stillOpen = true;
            }
          }
          if (!closed.ok && !spec.closeMethod) {
            report[report.length - 1].issues.push('关闭失败（未找到关闭入口）');
          } else if (stillOpen) {
            report[report.length - 1].issues.push('关闭失败（弹层仍在）');
          }
        }
        page.close();
        return;
      } catch (error) {
        lastError = error;
        await sleep(500);
      }
    }
    report.push({ ...spec, issues: [`执行异常：${lastError && lastError.message}`] });
  };

  const ONLY = (process.env.ONLY || '').split(',').map(item => item.trim()).filter(Boolean);
  const run = async (role, spec) => {
    if (ONLY.length && !ONLY.includes(spec.id)) return;
    // 每个用例都用 reLaunch 重建页面栈：navigateTo 会在同一路由上叠加多个实例，
    // pageTarget() 只能按标题匹配，容易连到旧实例，导致弹层入口找错页面。
    const payload = JSON.stringify(sessions[role]);
    await app.evaluate(`wx.setStorageSync('dorm_student_session', ${payload}); true`);
    const result = await app.evaluate(`new Promise((resolve) => wx.reLaunch({ url: ${JSON.stringify(spec.url)}, success: () => setTimeout(() => resolve('ok'), 500), fail: (e) => resolve('fail:' + e.errMsg) }))`);
    if (String(result).startsWith('fail')) throw new Error(`导航失败 ${spec.url}：${result}`);
    currentRole = role;
    await sleep(spec.wait || 1800);
    await capture({ role, ...spec });
  };

  // ----------------------------- 学生端 -----------------------------
  const S = 'STUDENT';
  await run(S, { id: 'student-home', url: '/pages/home/index' });
  await run(S, { id: 'student-repairs', url: '/pages/repairs/index', matchPath: 'pages/repairs' });
  await run(S, { id: 'student-repairs-history', url: '/pages/repairs/index', matchPath: 'pages/repairs', openMethod: `page.chooseTab({ currentTarget: { dataset: { tab: 'history' } } })` });
  await run(S, { id: 'student-detail-pending-review', url: `/pages/repair-detail/index?id=${FIXTURES.pendingReview}`, matchPath: 'pages/repair-detail' });
  await run(S, {
    id: 'student-detail-confirm-modal', url: `/pages/repair-detail/index?id=${FIXTURES.repaired}`, matchPath: 'pages/repair-detail',
    modal: true, openTap: '确认完成', closeTap: '取消', shot: true
  });
  await run(S, {
    id: 'student-detail-rework-modal', url: `/pages/repair-detail/index?id=${FIXTURES.repaired}`, matchPath: 'pages/repair-detail',
    modal: true, openTap: '申请重修', closeTap: '取消', shot: true
  });
  await run(S, { id: 'student-repair-form', url: '/pages/repair-form/index', matchPath: 'pages/repair-form' });
  await run(S, { id: 'student-stays', url: '/pages/stays/index', matchPath: 'pages/stays' });
  await run(S, { id: 'student-messages', url: '/pages/messages/index', matchPath: 'pages/messages' });
  await run(S, { id: 'student-message-detail', url: '/pages/messages/index', matchPath: 'pages/messages', modal: true, openMethod: `const item = page.data.items[0]; page.open({ currentTarget: { dataset: { item } } })`, closeTap: '返回列表' });
  await run(S, { id: 'student-accommodation', url: '/pages/accommodation/index', matchPath: 'pages/accommodation' });
  await run(S, { id: 'student-mine', url: '/pages/mine/index', matchPath: 'pages/mine' });

  // ---------------------------- 维修人员端 ----------------------------
  const R = 'REPAIRER';
  await run(R, { id: 'repairer-home', url: '/pages/home/index' });
  await run(R, { id: 'repairer-repairs', url: '/pages/repairs/index', matchPath: 'pages/repairs' });
  await run(R, {
    id: 'repairer-reject-modal', url: `/pages/repair-detail/index?id=${FIXTURES.pendingAccept}`, matchPath: 'pages/repair-detail',
    modal: true, openTap: '拒单', closeTap: '取消', shot: true
  });
  await run(R, {
    id: 'repairer-result-modal', url: `/pages/repair-detail/index?id=${FIXTURES.delayed}`, matchPath: 'pages/repair-detail',
    modal: true, openTap: '提交维修结果', closeTap: '取消', shot: true
  });
  await run(R, { id: 'repairer-records', url: '/pages/repairer-stats/index', matchPath: 'pages/repairer-stats' });
  await run(R, {
    id: 'repairer-records-rating', url: '/pages/repairer-stats/index', matchPath: 'pages/repairer-stats',
    openMethod: `page.selectTab({ currentTarget: { dataset: { tab: 'rating' } } })`
  });
  await run(R, { id: 'repairer-messages', url: '/pages/messages/index', matchPath: 'pages/messages' });
  await run(R, { id: 'repairer-mine', url: '/pages/mine/index', matchPath: 'pages/mine' });

  // ----------------------------- 宿管端 -----------------------------
  const M = 'DORM_MANAGER';
  await run(M, { id: 'manager-home', url: '/pages/home/index' });
  await run(M, { id: 'manager-repairs', url: '/pages/repairs/index', matchPath: 'pages/repairs' });
  await run(M, { id: 'manager-repair-detail', url: `/pages/repair-detail/index?id=${FIXTURES.pendingReview}`, matchPath: 'pages/repair-detail' });
  await run(M, { id: 'manager-stays', url: '/pages/stays/index', matchPath: 'pages/stays' });
  await run(M, {
    id: 'manager-stays-batch-modal', url: '/pages/stays/index', matchPath: 'pages/stays',
    modal: true, openTap: '人工补录', closeTap: '取消', closeMethod: 'closeSupplement', shot: true
  });
  await run(M, { id: 'manager-messages', url: '/pages/messages/index', matchPath: 'pages/messages' });
  await run(M, {
    id: 'manager-message-publish-modal', url: '/pages/messages/index', matchPath: 'pages/messages',
    modal: true, openTap: '发布', closeTap: '关闭', closeMethod: 'closePublish', shot: true
  });
  await run(M, { id: 'manager-dorm', url: '/pages/dorm/index', matchPath: 'pages/dorm' });
  await run(M, { id: 'manager-mine', url: '/pages/mine/index', matchPath: 'pages/mine' });

  // --------------------------- 系统管理员端 ---------------------------
  const A = 'ADMIN';
  await run(A, { id: 'admin-home', url: '/pages/home/index' });
  await run(A, { id: 'admin-repairs', url: '/pages/repairs/index', matchPath: 'pages/repairs' });
  await run(A, { id: 'admin-repair-detail', url: `/pages/repair-detail/index?id=${FIXTURES.pendingReview}`, matchPath: 'pages/repair-detail' });
  await run(A, { id: 'admin-stays', url: '/pages/stays/index', matchPath: 'pages/stays' });
  await run(A, {
    id: 'admin-stays-batch-modal', url: '/pages/stays/index', matchPath: 'pages/stays',
    modal: true, openTap: '新增批次', closeTap: '取消', closeMethod: 'closeBatchForm'
  });
  await run(A, {
    id: 'admin-message-publish-modal', url: '/pages/messages/index', matchPath: 'pages/messages',
    modal: true, openTap: '发布', closeTap: '关闭', closeMethod: 'closePublish'
  });
  await run(A, { id: 'admin-panel', url: '/pages/admin/index', matchPath: 'pages/admin' });
  await run(A, { id: 'admin-dorm', url: '/pages/dorm/index', matchPath: 'pages/dorm' });
  await run(A, { id: 'admin-mine', url: '/pages/mine/index', matchPath: 'pages/mine' });

  app.close();
  const summary = {
    generatedAt: new Date().toISOString(),
    total: report.length,
    failed: report.filter(item => item.issues.length > 0).length,
    results: report
  };
  fs.writeFileSync(path.join(OUT, 'acceptance-report.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n检查 ${summary.total} 个页面/状态，问题 ${summary.failed} 个`);
  for (const item of report) {
    const flag = item.issues.length ? 'ISSUE' : 'OK   ';
    console.log(`[${flag}] ${item.role}/${item.id}${item.issues.length ? `  ⚠ ${item.issues.join('；')}` : ''}`);
  }
})().catch(error => { console.error('验收执行失败：', error.message); process.exit(1); });


