const { connectApp, apiLogin, SESSION_KEY } = require('./lib');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const app = await connectApp();
  const session = await apiLogin('walk_admin', '123456');
  await app.evaluate(`wx.setStorageSync('${SESSION_KEY}', ${JSON.stringify(session)}); wx.reLaunch({ url: '/pages/stay-detail/index?id=544' }); true`);
  await sleep(3000);
  const out = await app.evaluate(`(async () => {
    const toasts = []; const previews = []; const opens = [];
    const origToast = wx.showToast; const origPreview = wx.previewImage; const origOpen = wx.openDocument;
    wx.showToast = o => { toasts.push(o.title); return origToast.call(wx, o); };
    wx.previewImage = o => { previews.push(o.urls); return origPreview.call(wx, o); };
    wx.openDocument = o => { opens.push(o.filePath); return origOpen.call(wx, o); };
    const p = getCurrentPages().pop();
    const files = ((p.data.attachmentView || {}).files || []);
    if (files[0]) p.previewFile({ currentTarget: { dataset: { file: files[0] } } });
    await new Promise(r => setTimeout(r, 2500));
    p.previewFile({ currentTarget: { dataset: { file: { file_id: 60, content_type: 'image/jpeg' } } } });
    await new Promise(r => setTimeout(r, 2500));
    wx.showToast = origToast; wx.previewImage = origPreview; wx.openDocument = origOpen;
    return { fileCount: files.length, first: files[0], toasts, previews, opens };
  })()`);
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
