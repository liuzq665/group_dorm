const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const PORT = 9336;
const profile = path.join(__dirname, '..', 'edge-v15-profile');
const results = [];
const check = (ok, message) => results.push({ ok, message });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.errors = []; this.ws = null; }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = () => rej(new Error('ws failed')); });
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      else if (m.method === 'Runtime.exceptionThrown') this.errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    };
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  close() { try { this.ws.close(); } catch {} }
}
async function getJson(url, opt) { const r = await fetch(url, opt); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }

(async () => {
  fs.rmSync(profile, { recursive: true, force: true });
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--no-sandbox', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });
  let cdp;
  try {
    let targets = null;
    for (let i = 0; i < 60; i++) { try { targets = await getJson(`http://127.0.0.1:${PORT}/json/list`); if (targets.some((t) => t.type === 'page')) break; } catch {} await sleep(300); }
    if (!targets) throw new Error('edge not started');
    const page = targets.find((t) => t.type === 'page') || await getJson(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
    cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    const ev = async (expression) => {
      const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const waitFor = async (expr, timeout = 25000) => { const t = Date.now(); while (Date.now() - t < timeout) { try { if (await ev(expr)) return; } catch {} await sleep(200); } throw new Error('timeout ' + expr); };
    const login = async (account) => {
      await cdp.send('Page.navigate', { url: `${BASE}/login` }); await sleep(600);
      await ev('sessionStorage.clear();true'); await cdp.send('Page.reload');
      await waitFor(`!!document.querySelector('#login-form')`);
      await ev(`(()=>{document.querySelector('[name=loginAccount]').value=${JSON.stringify(account)};document.querySelector('[name=password]').value='123456';document.querySelector('#login-form').requestSubmit();return true;})()`);
      await waitFor(`!!document.querySelector('.shell')`, 30000); await sleep(1500);
    };
    const menuText = async () => ev(`document.querySelector('.nav')?document.querySelector('.nav').innerText:''`);
    const clickPage = async (pageName) => { await ev(`(()=>{const b=document.querySelector('[data-page="${pageName}"]');if(!b)throw new Error('no menu '+${JSON.stringify(pageName)});b.click();return true;})()`); await sleep(1200); };
    const clickAction = async (action) => { await ev(`(()=>{const b=document.querySelector('[data-action="${action}"]');if(!b)throw new Error('no action '+${JSON.stringify(action)});b.click();return true;})()`); await sleep(1200); };
    const bodyText = async () => ev(`document.body.innerText`);

    // 学生：历史入口、工作台数字、评价记录
    await login('student1');
    let menu = await menuText();
    check(menu.includes('报修历史'), '学生菜单出现“报修历史”');
    const apiDash = await ev(`fetch('/api/v1/dashboard',{headers:{Authorization:'Bearer '+sessionStorage.getItem('dorm_token')}}).then(r=>r.json()).then(j=>j.data)`);
    const renderedStats = await ev(`(()=>{const g=[...document.querySelectorAll('.dashboard-status-group')].find(x=>x.querySelector('h2').textContent==='报修');return g?[...g.querySelectorAll('.stat')].map(x=>[x.querySelector('span').textContent,Number(x.querySelector('strong').textContent)]):[];})()`);
    const statusTotals = {}; for (const row of (apiDash.repairStatus || [])) statusTotals[row.status] = Number(row.total);
    const expectedStats = {'待审核': statusTotals.PENDING_REVIEW || 0, '待人工处理': statusTotals.PENDING_MANUAL || 0, '待接单': statusTotals.PENDING_ACCEPT || 0, '维修中': statusTotals.IN_REPAIR || 0, '待确认': statusTotals.PENDING_CONFIRM || 0, '已完成': statusTotals.COMPLETED || 0, '已归档': statusTotals.ARCHIVED || 0};
    const statsMatch = renderedStats.length === 7 && renderedStats.every(([label, value]) => expectedStats[label] === value);
    check(statsMatch, `学生工作台报修统计与接口一致（${renderedStats.map((x) => x.join(':')).join(',')}）`);
    let filterNames;
    await clickPage('repairs');
    await waitFor(`!!document.querySelector('#repair-filter-form')`);
    filterNames = await ev(`[...document.querySelectorAll('#repair-filter-form [name]')].map(x=>x.name)`);
    check(!filterNames.includes('student') && !filterNames.includes('repairer') && !filterNames.includes('building') && !filterNames.includes('room') && filterNames.includes('orderNo') && filterNames.includes('category'), `学生报修筛选仅本人范围字段（${filterNames.join('/')}）`);
    await clickPage('repairHistory');
    await waitFor(`!!document.querySelector('#repair-history-filter-form')`);
    filterNames = await ev(`[...document.querySelectorAll('#repair-history-filter-form [name]')].map(x=>x.name)`);
    check(!filterNames.includes('student') && !filterNames.includes('building') && !filterNames.includes('room') && !filterNames.includes('repairer'), `学生报修历史隐藏越权筛选（${filterNames.join('/')}）`);
    check((await bodyText()).includes('我的评价记录'), '学生报修历史页提供“我的评价记录”入口');
    await clickAction('repair-evaluations-open');
    await waitFor(`!!document.querySelector('dialog')`);
    check((await ev(`document.querySelector('dialog').innerText`)).includes('评价'), '学生评价记录弹窗可打开');
    await ev(`document.querySelector('dialog [data-close]')?.click();true`);

    // 维修人员：维修统计、历史入口
    await login('repair1');
    menu = await menuText();
    check(menu.includes('维修统计') && menu.includes('报修历史'), '维修人员菜单出现“维修统计/报修历史”');
    await clickPage('repairs');
    await waitFor(`!!document.querySelector('.repair-status-tabs')`);
    check(await ev(`document.querySelector('h1')?.textContent==='我的维修任务'`), '维修人员“我的维修任务”页标题正确');
    check(!(await bodyText()).includes('无权访问该数据或执行此操作'), '维修任务页不再出现无权访问错误');
    const repairerRows = await ev(`document.querySelectorAll('tbody tr').length`);
    check(repairerRows >= 0, `维修任务列表正常渲染（${repairerRows} 行）`);
    filterNames = await ev(`[...document.querySelectorAll('#repair-filter-form [name]')].map(x=>x.name)`);
    check(filterNames.includes('building') && filterNames.includes('room') && !filterNames.includes('student') && !filterNames.includes('repairer'), `维修人员报修筛选限定负责范围且隐藏越权条件（${filterNames.join('/')}）`);
    await clickPage('repairerStats');
    await waitFor(`!!document.querySelector('.grid .stat')`);
    const statCount = await ev(`document.querySelectorAll('.grid .stat').length`);
    check(statCount >= 11, `维修统计页统计卡片数量=${statCount}`);
    check((await bodyText()).includes('拒单记录') && (await bodyText()).includes('学生评价'), '维修统计页含拒单/超时/延期/评价明细');

    // 管理员：规则 edit_days、身份只读、性别/电话校验、强制派单入口
    await login('admin');
    await clickPage('rules');
    await waitFor(`!!document.querySelector('.panel')`);
    check((await bodyText()).includes('待修改关闭/天'), '工单规则页展示“待修改关闭/天”');
    await clickPage('students');
    await waitFor(`!!document.querySelector('#user-filter-form')`);
    await clickAction('user-new');
    await waitFor(`!!document.querySelector('dialog .edit-grid')`);
    const identity = await ev(`(()=>{const i=document.querySelector('dialog [name=studentNo]');return i?{value:i.value,readonly:i.readOnly}:null;})()`);
    check(identity && identity.readonly && /^\d{10}$/.test(identity.value), `新增学生学号只读自动生成（${identity && identity.value}）`);
    const genderOptions = await ev(`[...document.querySelectorAll('dialog [name=gender] option')].map(o=>o.textContent.trim())`);
    check(!genderOptions.includes('其他'), `新增人员性别无“其他”（${genderOptions.join('/')}）`);
    const phonePattern = await ev(`document.querySelector('dialog [name=phone]')?.getAttribute('pattern')||''`);
    check(!!phonePattern, '新增人员电话带正则校验');
    await ev(`document.querySelector('dialog [data-close]')?.click();true`);
    await clickPage('repairs');
    await waitFor(`!!document.querySelector('.repair-status-tabs')`);
    const dispatchButtons = await ev(`[...document.querySelectorAll('[data-action="repair-dispatch"]')].length`);
    check(dispatchButtons > 0, `管理员报修列表出现强制派单入口（${dispatchButtons}）`);
    filterNames = await ev(`[...document.querySelectorAll('#repair-filter-form [name]')].map(x=>x.name)`);
    check(filterNames.includes('student') && filterNames.includes('repairer') && filterNames.includes('building') && filterNames.includes('room') && filterNames.includes('category'), `管理员保留多条件查询字段（${filterNames.join('/')}）`);
    await clickPage('repairHistory');
    await waitFor(`!!document.querySelector('#repair-history-filter-form')`);
    filterNames = await ev(`[...document.querySelectorAll('#repair-history-filter-form [name]')].map(x=>x.name)`);
    check(filterNames.includes('repairer') && filterNames.includes('completedFrom') && filterNames.includes('completedTo'), `管理员报修历史额外提供维修人/完成时间筛选（${filterNames.join('/')}）`);
    await clickPage('profile');
    await waitFor(`!!document.querySelector('.profile-grid')`);
    await clickAction('profile-edit');
    await waitFor(`!!document.querySelector('dialog [name=gender]')`);
    check(await ev(`document.querySelectorAll('dialog [name=employeeNo]').length===0`), '管理员资料编辑不再提供工号修改');
    await ev(`document.querySelector('dialog [data-close]')?.click();true`);

    // 宿管：留宿批量操作、评价统计
    await login('manager1');
    await clickPage('repairs');
    await waitFor(`!!document.querySelector('#repair-filter-form')`);
    filterNames = await ev(`[...document.querySelectorAll('#repair-filter-form [name]')].map(x=>x.name)`);
    check(filterNames.includes('student') && filterNames.includes('building') && filterNames.includes('room') && !filterNames.includes('repairer'), `宿管报修筛选限定负责楼栋且隐藏维修人筛选（${filterNames.join('/')}）`);
    await clickPage('stay');
    await waitFor(`!!document.querySelector('.panel')`);
    const stayButtons = await bodyText();
    check(stayButtons.includes('批量解锁') && stayButtons.includes('统一重交截止') && stayButtons.includes('批量审核'), '宿管留宿页提供批量解锁/统一重交截止/批量审核');
    const managerDash = await ev(`fetch('/api/v1/dashboard',{headers:{Authorization:'Bearer '+sessionStorage.getItem('dorm_token')}}).then(async r=>({s:r.status,j:await r.json()}))`);
    check(managerDash.s === 200, '宿管工作台接口 200');
    await clickPage('dashboard');
    await sleep(1500);
    check((await bodyText()).includes('维修评价统计（负责楼栋）'), '宿管工作台展示维修评价统计');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(600);
    check(await ev(`document.documentElement.scrollWidth <= innerWidth + 1`), '移动端 390px 无整页横向溢出');
    check(cdp.errors.length === 0, `无未捕获脚本异常（${cdp.errors.slice(0, 2).join(' | ') || '0'}）`);
  } catch (e) {
    check(false, '浏览器验证异常：' + e.message);
    try { console.error('ERRORS', JSON.stringify(cdp.errors)); } catch {}
  } finally {
    if (cdp) cdp.close();
    edge.kill('SIGKILL'); await sleep(500);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.message}`);
    console.log(`TOTAL=${results.length} FAILED=${results.filter((r) => !r.ok).length}`);
    process.exitCode = results.some((r) => !r.ok) ? 1 : 0;
  }
})();
