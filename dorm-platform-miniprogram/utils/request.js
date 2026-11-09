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
function upload(filePath, path = '/files') {
  const session = getSession();
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${baseUrl}${path}`, name: 'file', filePath,
      header: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
      success(res) {
        try { const body = JSON.parse(res.data); if (res.statusCode === 401 || body.code === 401) { redirectLogin(); reject(new Error('登录已失效')); return; } if (body.code !== 0) throw new Error(body.message); resolve(body.data.fileId); } catch (error) { reject(error instanceof Error ? error : new Error('上传失败')); }
      },
      fail() { reject(new Error('文件上传失败')); }
    });
  });
}
function uploadMessage(filePath) { return upload(filePath, '/messages/files'); }
function uploadStayApplication(filePath) { return upload(filePath, '/stay/applications/files'); }
function uploadStayMaterial(batchId, filePath) { return upload(filePath, `/stay/batches/${batchId}/materials`); }
function showError(error) { wx.showToast({ title: error.message || '操作失败', icon: 'none', duration: 2600 }); }
module.exports = { request, upload, uploadMessage, uploadStayApplication, uploadStayMaterial, getSession, setSession, clearSession, showError };

