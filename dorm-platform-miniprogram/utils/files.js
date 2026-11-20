const { baseUrl } = require('./config');

// 附件预览：统一走带登录态的 downloadFile，并按服务端返回区分“文件已丢失/无权限/网络失败”，
// 避免所有失败都提示“暂时无法预览”而让用户以为功能坏了。
function previewAttachment(file, token) {
  if (!file) return;
  const fileId = file.file_id;
  if (!fileId) {
    wx.showToast({ title: '附件信息不完整，请重新上传', icon: 'none' });
    return;
  }
  wx.downloadFile({
    url: `${baseUrl}/files/${fileId}`,
    header: { Authorization: `Bearer ${token}` },
    success: result => {
      const code = result.statusCode;
      if (code === 403) {
        wx.showToast({ title: '无权查看该附件', icon: 'none' });
        return;
      }
      if (code === 404) {
        wx.showToast({ title: '附件文件已丢失，请让上传人重新提交', icon: 'none' });
        return;
      }
      if (code !== 200) {
        wx.showToast({ title: `附件下载失败（${code}）`, icon: 'none' });
        return;
      }
      if (file.content_type && file.content_type.startsWith('image/')) {
        wx.previewImage({ urls: [result.tempFilePath], fail: () => wx.showToast({ title: '图片预览失败，请重试', icon: 'none' }) });
        return;
      }
      wx.openDocument({
        filePath: result.tempFilePath,
        showMenu: true,
        fail: () => wx.showToast({ title: '该文件类型暂不支持预览，可转发到微信中打开', icon: 'none' })
      });
    },
    fail: () => wx.showToast({ title: '附件下载失败，请检查网络后重试', icon: 'none' })
  });
}

module.exports = { previewAttachment };
