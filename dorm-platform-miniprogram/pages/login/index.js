const { request, setSession, getSession, clearSession, showError } = require('../../utils/request');

Page({
  data: { account: '', password: '', submitting: false },
  onLoad() {
    const session = getSession();
    if (session?.user?.role === 'STUDENT') wx.switchTab({ url: '/pages/home/index' });
  },
  input(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },
  async login() {
    const { account, password } = this.data;
    if (!account.trim() || !password) { wx.showToast({ title: '请输入账号和密码', icon: 'none' }); return; }
    this.setData({ submitting: true });
    try {
      const data = await request('/auth/login', { method: 'POST', data: { loginAccount: account.trim(), password } });
      if (data.user.role !== 'STUDENT') { clearSession(); throw new Error('当前小程序仅支持学生账号'); }
      setSession(data); getApp().globalData.session = data;
      wx.switchTab({ url: '/pages/home/index' });
    } catch (error) { showError(error); } finally { this.setData({ submitting: false }); }
  }
});
