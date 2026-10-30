const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const PORT = 9333;
const profile = path.join(__dirname, '..', 'edge-verify-profile');
const results = [];
const fail = (message) => { results.push({ ok: false, message }); };
const pass = (message) => { results.push({ ok: true, message }); };
const check = (condition, message) => (condition ? pass(message) : fail(message));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.ws = null; this.pageErrors = []; }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = () => reject(new Error('websocket open failed'));
    });
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        this.pageErrors.push(details.exception?.description || details.text);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

(async () => {
  fs.rmSync(profile, { recursive: true, force: true });
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--no-sandbox',
    '--disable-extensions', '--disable-background-networking', 'about:blank'
  ], { stdio: 'ignore' });
  let cdp;
  try {
    let targets = null;
    for (let i = 0; i < 60; i++) {
      try { targets = await getJson(`http://127.0.0.1:${PORT}/json/list`); if (targets.some((t) => t.type === 'page')) break; } catch {}
      await sleep(300);
    }
    if (!targets) throw new Error('Edge debugger did not start');
    let page = targets.find((t) => t.type === 'page');
    if (!page) {
      page = await getJson(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
    }
    cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: `${BASE}/login` });
    const evaluate = async (expression) => {
      const response = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) {
        const detail = response.exceptionDetails.exception?.description || response.exceptionDetails.text;
        throw new Error(`evaluate failed: ${detail}`);
      }
      return response.result.value;
    };
    const waitFor = async (expression, timeout = 20000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        try { if (await evaluate(expression)) return true; } catch {}
        await sleep(200);
      }
      throw new Error(`timeout: ${expression}`);
    };
    const click = async (selector) => {
      await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('missing '+${JSON.stringify(selector)});el.click();return true;})()`);
    };

    await waitFor(`!!document.querySelector('#login-form')`);
    await evaluate(`(()=>{document.querySelector('[name=loginAccount]').value='admin';document.querySelector('[name=password]').value='123456';document.querySelector('#login-form').requestSubmit();return true;})()`);
    await waitFor(`!!document.querySelector('.shell')`);
    pass('管理员登录成功');

    const unread = await evaluate(`(()=>{const b=document.querySelector('#notice-bell .nav-badge');return b?b.textContent.trim():'0';})()`);
    check(/^\d+\+?$/.test(unread), `右上角消息入口存在未读徽标（当前 ${unread}）`);
    const navBadge = await evaluate(`(()=>{const b=document.querySelector('.nav [data-page="messages"] .nav-badge');return b?b.textContent.trim():'';})()`);
    check(unread === '0' ? navBadge === '' : navBadge === unread, `侧栏消息中心徽标与右上角一致（${navBadge || '无'}）`);

    await click('#notice-bell');
    await waitFor(`document.querySelector('h1') && document.querySelector('h1').textContent==='消息中心'`);
    await waitFor(`!!document.querySelector('.panel table, .panel .empty')`);
    pass('点击右上角消息入口可进入消息中心');

    const unreadBefore = await evaluate(`(()=>{const b=document.querySelector('#notice-bell .nav-badge');return b?parseInt(b.textContent,10):0;})()`);
    const readButtons = await evaluate(`document.querySelectorAll('[data-action="read-message"]').length`);
    if (readButtons > 0) {
      await click('[data-action="read-message"]');
      await waitFor(`document.querySelectorAll('[data-action="read-message"]').length < ${readButtons}`);
      await sleep(600);
      const unreadAfter = await evaluate(`(()=>{const b=document.querySelector('#notice-bell .nav-badge');return b?parseInt(b.textContent,10):0;})()`);
      check(unreadAfter === Math.max(0, unreadBefore - 1), `标记已读后未读数递减（${unreadBefore} -> ${unreadAfter}）`);
    } else {
      pass('消息中心当前无未读消息，跳过已读递减检查');
    }

    await click('#logout');
    await waitFor(`!!document.querySelector('dialog') && document.querySelector('dialog h2').textContent==='退出登录'`);
    pass('退出登录弹出二次确认');
    const confirmStyle = await evaluate(`(()=>{const b=document.querySelector('dialog .dialog-footer button[type=submit]');return b?b.className+'|'+b.textContent.trim():'';})()`);
    check(confirmStyle.includes('danger') && confirmStyle.includes('退出登录'), `确认按钮为危险样式（${confirmStyle}）`);
    await click('dialog [data-close]');
    await waitFor(`!document.querySelector('dialog')`);
    check(await evaluate(`!!document.querySelector('.shell')`), '取消退出后仍保持登录状态');

    await click('[data-page="students"]');
    await waitFor(`!!document.querySelector('#user-filter-form')`);
    await click('[data-action="user-new"]');
    await waitFor(`!!document.querySelector('dialog .edit-grid')`);
    const studentNo = await evaluate(`(()=>{const i=document.querySelector('dialog [name=studentNo]');return i?{value:i.value,readonly:i.readOnly}:null;})()`);
    check(studentNo && studentNo.readonly === true && /^\d{10}$/.test(studentNo.value), `新增学生学号只读且为硬格式（${studentNo && studentNo.value}）`);
    const genderOptions = await evaluate(`[...document.querySelectorAll('dialog [name=gender] option')].map(o=>o.textContent.trim())`);
    check(JSON.stringify(genderOptions) === JSON.stringify(['请选择', '男', '女']), `新增人员性别仅有男/女（${genderOptions.join('/')}）`);
    const phonePattern = await evaluate(`(()=>{const i=document.querySelector('dialog [name=phone]');return i?i.getAttribute('pattern'):'';})()`);
    check(!!phonePattern, '联系电话输入框带正则校验');
    const phoneValidity = await evaluate(`(()=>{const i=document.querySelector('dialog [name=phone]');i.value='12345';const bad=i.validity.patternMismatch;i.value='13912345678';const good=i.checkValidity();i.value='010-88886666';const landline=i.checkValidity();return {bad,good,landline};})()`);
    check(phoneValidity.bad === true && phoneValidity.good === true && phoneValidity.landline === true, '联系电话正则即时校验生效（非法拒绝/手机与固话通过）');
    const classes = await evaluate(`[...document.querySelectorAll('dialog [name=classId] option')].map(o=>o.value).filter(Boolean)`);
    if (classes.length) {
      const before = studentNo.value;
      await evaluate(`(()=>{const s=document.querySelector('dialog [name=classId]');s.value=${JSON.stringify(classes[0])};s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
      await sleep(1200);
      const after = await evaluate(`document.querySelector('dialog [name=studentNo]').value`);
      const year = await evaluate(`(()=>{const s=document.querySelector('dialog [name=classId]');return s.options[s.selectedIndex].textContent.match(/(\\d{4})级/)?.[1]||'';})()`);
      check(/^\d{10}$/.test(after) && (!year || after.startsWith(year)), `选择班级后学号按入学年份实时刷新（${before} -> ${after}）`);
    }
    await click('dialog [data-close]');

    await click('[data-page="managers"]');
    await waitFor(`!!document.querySelector('#user-filter-form')`);
    await click('[data-action="user-new"]');
    await waitFor(`!!document.querySelector('dialog .edit-grid')`);
    const employeeNo = await evaluate(`(()=>{const i=document.querySelector('dialog [name=employeeNo]');return i?{value:i.value,readonly:i.readOnly}:null;})()`);
    check(employeeNo && employeeNo.readonly === true && /^DM\d{6}$/.test(employeeNo.value), `新增宿管工号只读且为 DM+6 位（${employeeNo && employeeNo.value}）`);
    await click('dialog [data-close]');

    await click('[data-page="profile"]');
    await waitFor(`!!document.querySelector('.profile-grid')`);
    await click('[data-action="profile-edit"]');
    await waitFor(`!!document.querySelector('dialog [name=gender]')`);
    const profileGender = await evaluate(`[...document.querySelectorAll('dialog [name=gender] option')].map(o=>o.textContent.trim())`);
    check(!profileGender.includes('其他') && profileGender.includes('男') && profileGender.includes('女'), `资料编辑性别无“其他”（${profileGender.join('/')}）`);
    const adminEmployee = await evaluate(`document.querySelectorAll('dialog [name=employeeNo]').length`);
    check(adminEmployee === 0, '管理员资料编辑不再提供工号修改入口');
    await click('dialog [data-close]');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(600);
    check(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), '移动端 390px 无整页横向溢出');
    await click('[data-page="students"]');
    await waitFor(`!!document.querySelector('#user-filter-form')`);
    check(await evaluate(`(()=>{const t=document.querySelector('.role-table');return t?getComputedStyle(t).overflowX:'none';})()`) === 'auto', '移动端学生表格使用内部横向滚动');

    check(cdp.pageErrors.length === 0, `页面运行期间无未捕获脚本异常（${cdp.pageErrors.slice(0, 2).join(' | ') || '0'}）`);
  } catch (error) {
    fail(`浏览器验证异常：${error.message}`);
  } finally {
    if (cdp) cdp.close();
    edge.kill('SIGKILL');
    await sleep(500);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    const failed = results.filter((item) => !item.ok);
    for (const item of results) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.message}`);
    console.log(`\nTOTAL=${results.length} FAILED=${failed.length}`);
    process.exitCode = failed.length ? 1 : 0;
  }
})();
