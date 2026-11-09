const { request, setSession, getSession, clearSession, showError } = require('../../utils/request');

Page({
  data: { account: '', password: '', submitting: false },
  onLoad() {
    const session = getSession();
    if (session?.user?.role) wx.switchTab({ url: getApp().rolePage(session.user.role) });
  },
  input(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },
  async login() {
    const { account, password } = this.data;
    if (!account.trim() || !password) { wx.showToast({ title: '请输入账号和密码', icon: 'none' }); return; }
    this.setData({ submitting: true });
    try {
      const data = await request('/auth/login', { method: 'POST', data: { loginAccount: account.trim(), password } });
      if (!['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'].includes(data.user.role)) { clearSession(); throw new Error('账号没有可用的业务角色'); }
      setSession(data); getApp().globalData.session = data;
      wx.switchTab({ url: getApp().rolePage(data.user.role) });
    } catch (error) { showError(error); } finally { this.setData({ submitting: false }); }
  }
});
