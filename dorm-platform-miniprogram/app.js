const { clearSession, getSession } = require('./utils/request');

const rolePages = {
  STUDENT: '/pages/home/index',
  DORM_MANAGER: '/pages/home/index',
  REPAIRER: '/pages/home/index',
  ADMIN: '/pages/home/index'
};

App({
  globalData: { session: getSession() },
  requireRole(allowed) {
    const session = getSession();
    if (!session || !allowed.includes(session.user.role)) {
      clearSession();
      wx.reLaunch({ url: '/pages/login/index' });
      return false;
    }
    this.globalData.session = session;
    return true;
  },
  requireStudent() { return this.requireRole(['STUDENT']); },
  rolePage(role) { return rolePages[role] || '/pages/login/index'; }
});

