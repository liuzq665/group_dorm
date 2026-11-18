/**
 * 端到端（UI 层）验证维修工“提交维修结果”：
 * repair1 打开夹具工单 674（PENDING_ACCEPT）→ 接单 → 打开结果弹层 →
 * 模拟选图导致的 onHide/onShow → 用真实上传得到的 fileId 提交 → 期望 REPAIRED。
 */
const fs = require('fs');
const path = require('path');
const { connectApp, apiLogin, SESSION_KEY } = require('./lib');

const API = 'http://127.0.0.1:8080/api/v1';
const IMAGE = path.resolve(__dirname, '../../test-results/visual/通用/login.png');

async function uploadReal(token) {
  const form = new FormData();
  const bytes = fs.readFileSync(IMAGE);
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'login.png');
  const res = await fetch(`${API}/files`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const body = await res.json();
  if (!body.data || !body.data.fileId) throw new Error(`upload failed: ${res.status} ${JSON.stringify(body)}`);
  return body.data.fileId;
}

(async () => {
  const session = await apiLogin('repair1');
  const fileId = await uploadReal(session.token);
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(session)}); true`);
  await app.evaluate(`new Promise(r => wx.reLaunch({ url: '/pages/repair-detail/index?id=674', success: () => r('ok'), fail: e => r(e.errMsg) }))`);
  await new Promise(resolve => setTimeout(resolve, 2200));

  const result = await app.evaluate(`(async () => {
    const stack = getCurrentPages();
    const page = stack[stack.length - 1];
    const statusBefore = page.data.detail && page.data.detail.current_status;
    page.modal = () => Promise.resolve(true);
    if (page.data.detail && page.data.detail.current_status === 'PENDING_ACCEPT') {
      await page.accept();
      await new Promise(r => setTimeout(r, 900));
    }
    const statusAccepted = page.data.detail && page.data.detail.current_status;

    page.openResult();
    page.resultInput({ detail: { value: '已更换水龙头并试水，无渗漏' } });
    page.setData({ resultFiles: ['http://tmp/demo-1.png'] });

    page._pickingMedia = true;
    page.onHide();
    page._pickingMedia = false;
    page.onShow();
    await new Promise(r => setTimeout(r, 900));
    const afterPick = { modal: page.data.resultModal, text: page.data.resultText, files: page.data.resultFiles.length };

    const toasts = [];
    const rawToast = wx.showToast;
    wx.showToast = (opts) => { toasts.push(opts.title); };
    const rawUpload = wx.uploadFile;
    wx.uploadFile = (opts) => { setTimeout(() => opts.success({ statusCode: 200, data: JSON.stringify({ code: 0, data: { fileId: ${fileId} } }) }), 10); return { abort() {} }; };
    await page.submitResult();
    await new Promise(r => setTimeout(r, 1200));
    const afterSubmit = {
      modal: page.data.resultModal,
      busy: page.data.actionBusy,
      status: page.data.detail && page.data.detail.current_status,
      toasts
    };
    wx.showToast = rawToast;
    wx.uploadFile = rawUpload;
    if (page.data.resultModal) page.closeResult();
    return { statusBefore, statusAccepted, afterPick, afterSubmit };
  })()`);

  const ok = result.statusAccepted === 'ACCEPTED'
    && result.afterPick.modal === true
    && result.afterPick.text === '已更换水龙头并试水，无渗漏'
    && result.afterPick.files === 1
    && result.afterSubmit.status === 'REPAIRED'
    && result.afterSubmit.modal === false;

  console.log(JSON.stringify({ ok, fileId, ...result }, null, 2));
  app.close();
  process.exit(ok ? 0 : 1);
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
