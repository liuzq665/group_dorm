const { clearSession, getSession } = require('./utils/request');

App({
  globalData: { session: getSession() },
  requireStudent() {
    const session = getSession();
    if (!session || session.user.role !== 'STUDENT') {
      clearSession();
      wx.reLaunch({ url: '/pages/login/index' });
      return false;
    }
    this.globalData.session = session;
    return true;
  }
});

