const { request, getSession, showError } = require('../../utils/request');
const { statusText } = require('../../utils/format');
Page({
  data: { loading: true, user: {}, profile: {}, home: null, unread: 0, dashboard: {} },
  onShow() { if (getApp().requireStudent()) this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const session = getSession();
      const [profile, homes, unread, dashboard] = await Promise.all([request('/profile'), request('/accommodations/current'), request('/messages/unread-count'), request('/dashboard')]);
      this.setData({ user: session.user, profile, home: homes[0] || null, unread: unread.count || 0, dashboard });
    } catch (error) { showError(error); } finally { this.setData({ loading: false }); }
  },
  go(e) { const url = e.currentTarget.dataset.url; if (url) wx.navigateTo({ url }); },
  statusText
});
