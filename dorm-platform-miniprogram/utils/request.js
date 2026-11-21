const { baseUrl } = require('./config');
const SESSION_KEY = 'dorm_student_session';

function getSession() { return wx.getStorageSync(SESSION_KEY) || null; }
function setSession(session) { wx.setStorageSync(SESSION_KEY, session); }
function clearSession() { wx.removeStorageSync(SESSION_KEY); }
function redirectLogin() {
  clearSession();
  const current = getCurrentPages();
  if (!current.length || current[current.length - 1].route !== 'pages/login/index') wx.reLaunch({ url: '/pages/login/index' });
}
function request(path, options = {}) {
  const session = getSession();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: { 'content-type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
      success(res) {
        if (res.statusCode === 401 || res.data?.code === 401) { redirectLogin(); reject(new Error('登录已失效，请重新登录')); return; }
        if (res.statusCode < 200 || res.statusCode >= 300 || res.data?.code !== 0) { reject(new Error(res.data?.message || `请求失败（${res.statusCode}）`)); return; }
        resolve(res.data.data);
      },
      fail() { reject(new Error('无法连接后端，请检查本机地址与开发者工具网络设置')); }
    });
  });
}
// wx.chooseMessageFile 给的临时路径可能没有扩展名，服务端按扩展名判定文件类型会直接拒绝（400 文件格式不受支持）；
// 上传前用原始文件名补一个带扩展名的副本，仍然上传同一份文件内容。
const EXTENSION_PATTERN = /\.[A-Za-z0-9]{1,8}$/;
function withUploadExtension(filePath, name) {
  if (EXTENSION_PATTERN.test(filePath)) return Promise.resolve(filePath);
  const matched = String(name || '').trim().match(EXTENSION_PATTERN);
  const fs = typeof wx.getFileSystemManager === 'function' ? wx.getFileSystemManager() : null;
  if (!matched || !fs || !wx.env?.USER_DATA_PATH) return Promise.resolve(filePath);
  const destPath = `${wx.env.USER_DATA_PATH}/upload-${Date.now()}-${Math.floor(Math.random() * 1000000)}${matched[0].toLowerCase()}`;
  return new Promise(resolve => {
    fs.copyFile({ srcPath: filePath, destPath, success: () => resolve(destPath), fail: () => resolve(filePath) });
  });
}
function upload(filePath, path = '/files', name = '') {
  return withUploadExtension(filePath, name).then(targetPath => uploadFile(targetPath, path));
}
function uploadFile(filePath, path) {
  const session = getSession();
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${baseUrl}${path}`, name: 'file', filePath,
      header: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
      success(res) {
        try {
          const body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          if (res.statusCode === 401 || body?.code === 401) { redirectLogin(); reject(new Error('登录已失效')); return; }
          if (res.statusCode < 200 || res.statusCode >= 300 || body?.code !== 0) throw new Error(body?.message || `文件上传失败（${res.statusCode}）`);
          const fileId = Number(body?.data?.fileId);
          if (!Number.isSafeInteger(fileId) || fileId <= 0) throw new Error('文件上传成功但未获取到有效附件编号，请重试');
          resolve(fileId);
        } catch (error) { reject(error instanceof Error ? error : new Error('服务器返回了无法识别的上传结果，请重试')); }
      },
      fail() { reject(new Error('文件上传失败')); }
    });
  });
}
function uploadMessage(filePath, name = '') { return upload(filePath, '/messages/files', name); }
function uploadStayApplication(filePath, name = '') { return upload(filePath, '/stay/applications/files', name); }
function uploadStayMaterial(batchId, filePath, name = '') { return upload(filePath, `/stay/batches/${batchId}/materials`, name); }
function showError(error) { wx.showToast({ title: error.message || '操作失败', icon: 'none', duration: 2600 }); }
module.exports = { request, upload, uploadMessage, uploadStayApplication, uploadStayMaterial, getSession, setSession, clearSession, showError };

