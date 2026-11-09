const { getSession } = require('../utils/request');

const roleTabs = {
  STUDENT: [['pages/home/index', '首页', '⌂'], ['pages/repairs/index', '报修', '⚒'], ['pages/stays/index', '留宿', '▦'], ['pages/mine/index', '我的', '●']],
  DORM_MANAGER: [['pages/home/index', '工作台', '⌂'], ['pages/repairs/index', '报修审核', '⚒'], ['pages/stays/index', '留宿审核', '▦'], ['pages/mine/index', '我的', '●']],
  REPAIRER: [['pages/home/index', '工作台', '⌂'], ['pages/repairs/index', '维修任务', '⚒'], ['pages/messages/index', '消息', '✉'], ['pages/mine/index', '我的', '●']],
  ADMIN: [['pages/home/index', '工作台', '⌂'], ['pages/repairs/index', '报修管理', '⚒'], ['pages/stays/index', '留宿管理', '▦'], ['pages/mine/index', '我的', '●']]
};

Component({
  data: { tabs: [], selected: 0, unread: 0 },
  lifetimes: { attached() { this.refresh(); } },
  pageLifetimes: { show() { this.refresh(); } },
  methods: {
    refresh() {
      const role = getSession()?.user?.role || 'STUDENT';
      const tabs = (roleTabs[role] || roleTabs.STUDENT).map(([pagePath, text, icon]) => ({ pagePath, text, icon }));
      const pages = getCurrentPages(), route = pages[pages.length - 1]?.route || '';
      const selected = Math.max(0, tabs.findIndex(item => item.pagePath === route));
      this.setData({ tabs, selected });
      const app = getApp(); this.setData({ unread: Number(app.globalData.unreadCount) || 0 });
    },
    switchTab(event) { wx.switchTab({ url: `/${event.currentTarget.dataset.path}` }); }
  }
});
