const { request, setSession, getSession, clearSession, showError } = require('../../utils/request');

Page({
  data: {
    account: '',
    password: '',
    submitting: false,
    error: '',
    version: '宿舍事务平台'
  },
  onLoad() {
    const session = getSession();
    if (session?.user?.role) wx.switchTab({ url: getApp().rolePage(session.user.role) });
  },
  input(event) {
    this.setData({ [event.currentTarget.dataset.key]: event.detail.value, error: '' });
  },
  async login() {
    const account = this.data.account.trim();
    const password = this.data.password;
    if (!account || !password) {
      this.setData({ error: '请输入账号和密码' });
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true, error: '' });
    try {
      const data = await request('/auth/login', { method: 'POST', data: { loginAccount: account, password } });
      if (!['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'].includes(data.user.role)) {
        clearSession();
        throw new Error('账号没有可用的业务角色');
      }
      setSession(data);
      getApp().globalData.session = data;
      wx.switchTab({ url: getApp().rolePage(data.user.role) });
    } catch (error) {
      this.setData({ error: error.message || '登录失败，请重试' });
      showError(error);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
