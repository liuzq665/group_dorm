const { baseUrl } = require('./config');

// 微信 downloadFile 的临时路径没有扩展名，openDocument 会把它当成未知类型直接失败；
// 因此预览前先按原始文件名/内容类型推断扩展名，必要时复制出带扩展名的副本。
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic', 'heif'];
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/json': 'json',
  'text/plain': 'txt',
  'text/csv': 'csv'
};

function attachmentExtension(file) {
  const name = typeof file?.original_name === 'string' ? file.original_name : (typeof file?.name === 'string' ? file.name : '');
  const matched = name.trim().match(/\.([A-Za-z0-9]{1,8})$/);
  if (matched) return matched[1].toLowerCase();
  const type = typeof file?.content_type === 'string' ? file.content_type.toLowerCase() : '';
  if (MIME_EXTENSIONS[type]) return MIME_EXTENSIONS[type];
  if (type.includes('wordprocessingml')) return 'docx';
  if (type.includes('spreadsheetml')) return 'xlsx';
  if (type.includes('presentationml')) return 'pptx';
  return '';
}

function isImageAttachment(file, extension = attachmentExtension(file)) {
  const type = typeof file?.content_type === 'string' ? file.content_type.toLowerCase() : '';
  if (type.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.includes(extension);
}

function withExtension(filePath, extension, fileId) {
  if (!extension || new RegExp(`\\.${extension}$`, 'i').test(filePath)) return Promise.resolve(filePath);
  const fs = typeof wx.getFileSystemManager === 'function' ? wx.getFileSystemManager() : null;
  if (!fs || !wx.env?.USER_DATA_PATH) return Promise.resolve(filePath);
  const destPath = `${wx.env.USER_DATA_PATH}/preview-${fileId}-${Date.now()}.${extension}`;
  return new Promise(resolve => {
    fs.copyFile({
      srcPath: filePath,
      destPath,
      success: () => resolve(destPath),
      fail: () => resolve(filePath)
    });
  });
}

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
      const extension = attachmentExtension(file);
      if (isImageAttachment(file, extension)) {
        wx.previewImage({ urls: [result.tempFilePath], fail: () => wx.showToast({ title: '图片预览失败，请重试', icon: 'none' }) });
        return;
      }
      const unsupported = () => wx.showToast({ title: '该文件类型暂不支持预览，可转发到微信中打开', icon: 'none' });
      withExtension(result.tempFilePath, extension, fileId).then(filePath => {
        wx.openDocument({
          filePath,
          showMenu: true,
          fail: () => {
            if (filePath === result.tempFilePath) { unsupported(); return; }
            wx.openDocument({ filePath: result.tempFilePath, showMenu: true, fail: unsupported });
          }
        });
      });
    },
    fail: () => wx.showToast({ title: '附件下载失败，请检查网络后重试', icon: 'none' })
  });
}

module.exports = { previewAttachment, attachmentExtension, isImageAttachment };
