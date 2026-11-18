/**
 * 回归验证：维修人员“提交维修结果”弹层在选择照片后不应被生命周期清空。
 * 模拟：打开弹层 → 填文字/加照片 → 触发选图期间的 onHide（_pickingMedia=true）→ onShow
 * 期望：弹层仍在、文字与照片都在；正常离开（非选图）仍会关闭弹层。
 */
const { connectApp, goto, apiLogin, SESSION_KEY } = require('./lib');

(async () => {
  const session = await apiLogin('repair1');
  const app = await connectApp();
  await app.evaluate(`wx.setStorageSync(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(JSON.stringify(session))}); true`);
  await goto(app, '/pages/repair-detail/index?id=678', session, { wait: 300 });
  await new Promise(resolve => setTimeout(resolve, 1800));

  const result = await app.evaluate(`(async () => {
    const stack = getCurrentPages();
    const page = stack[stack.length - 1];
    const status = page.data.detail && page.data.detail.current_status;
    page.openResult();
    page.resultInput({ detail: { value: '已更换水龙头并试水，无渗漏' } });
    page.setData({ resultFiles: ['/tmp/wx-demo-1.png'] });
    const before = { modal: page.data.resultModal, text: page.data.resultText, files: page.data.resultFiles.length };

    page._pickingMedia = true;
    page.onHide();
    const duringPick = { modal: page.data.resultModal, text: page.data.resultText };
    page._pickingMedia = false;
    page.onShow();
    await new Promise(resolve => setTimeout(resolve, 1500));
    const afterPick = { modal: page.data.resultModal, text: page.data.resultText, files: page.data.resultFiles.length };

    page.onHide();
    const afterLeave = { modal: page.data.resultModal, files: page.data.resultFiles.length };
    page.closeResult();

    return { status, before, duringPick, afterPick, afterLeave };
  })()`);

  const ok = result.before.modal === true
    && result.duringPick.modal === true
    && result.afterPick.modal === true
    && result.afterPick.text === '已更换水龙头并试水，无渗漏'
    && result.afterPick.files === 1
    && result.afterLeave.modal === false;

  console.log(JSON.stringify({ ok, ...result }, null, 2));
  app.close();
  process.exit(ok ? 0 : 1);
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
