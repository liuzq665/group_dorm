const { connectApp, connectPage, apiLogin, SESSION_KEY } = require('./lib');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const app = await connectApp();
  const session = await apiLogin('demo_manager_08', '123456');
  await app.evaluate(`wx.setStorageSync('${SESSION_KEY}', ${JSON.stringify(session)}); wx.reLaunch({ url: '/pages/stays/index' }); true`);
  await sleep(3500);
  await app.evaluate(`(() => { const p = getCurrentPages().pop(); p.chooseTab({ currentTarget: { dataset: { tab: 'under' } } }); return p.data.tab; })()`);
  await sleep(1200);
  const open = await app.evaluate(`(() => {
    const p = getCurrentPages().pop();
    const item = (p.data.filtered || []).find(row => row.current_status === 'UNDER_REVIEW');
    if (!item) return { error: 'no under review row', filtered: (p.data.filtered || []).map(r => r.current_status) };
    p.setData({ reviewForm: { applicationId: item.application_id, pass: false, title: '退回修改', reason: '', deadlineDate: '2026-11-25', deadlineTime: '23:59' } });
    return { applicationId: item.application_id, deadline: item.resubmit_deadline || null };
  })()`);
  await sleep(900);
  const page = await connectPage('pages/stays/index');
  const view = await page.evaluate(`(() => {
    const picks = Array.from(document.querySelectorAll('wx-picker')).map(n => n.innerText.trim()).filter(Boolean);
    const texts = document.body.innerText;
    const mask = document.querySelector('.modal-mask');
    const buttons = Array.from(document.querySelectorAll('wx-button')).map(b => b.innerText.trim());
    return {
      modal: !!mask,
      picks,
      hasDeadlineLabel: texts.includes('重交截止日期'),
      hasTimeLabel: texts.includes('重交截止时间'),
      hasHint: texts.includes('超期未提交'),
      buttons: buttons.filter(b => b === '取消' || b === '确认退回'),
      maskRect: mask ? { top: Math.round(mask.getBoundingClientRect().top), bottom: Math.round(mask.getBoundingClientRect().bottom) } : null
    };
  })()`);
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('test-results/acceptance/manager-stay-review-modal.png', Buffer.from(shot.data, 'base64'));
  const submit = await app.evaluate(`(async () => {
    const p = getCurrentPages().pop();
    p.setData({ reviewForm: { ...p.data.reviewForm, reason: '请补充留宿事由与家长联系方式' } });
    await p.saveReview();
    return { modal: !!p.data.reviewForm, busy: p.data.actionBusy };
  })()`);
  await sleep(1500);
  console.log(JSON.stringify({ open, view, submit }, null, 2));
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

