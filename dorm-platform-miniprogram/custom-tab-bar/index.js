const { getSession } = require('../utils/request');

const roleTabs = {
  STUDENT: [
    ['pages/home/index', '首页', '⌂'],
    ['pages/repairs/index', '报修', '⚒'],
    ['pages/stays/index', '留宿', '▦'],
    ['pages/messages/index', '消息', '✉'],
    ['pages/mine/index', '我的', '●']
  ],
  DORM_MANAGER: [
    ['pages/home/index', '工作台', '⌂'],
    ['pages/repairs/index', '报修审核', '⚒'],
    ['pages/stays/index', '留宿审核', '▦'],
    ['pages/messages/index', '消息', '✉'],
    ['pages/mine/index', '我的', '●']
  ],
  REPAIRER: [
    ['pages/home/index', '工作台', '⌂'],
    ['pages/repairs/index', '维修任务', '⚒'],
    ['pages/messages/index', '消息', '✉'],
    ['pages/mine/index', '我的', '●']
  ],
  ADMIN: [
    ['pages/home/index', '工作台', '⌂'],
    ['pages/repairs/index', '报修管理', '⚒'],
    ['pages/stays/index', '留宿管理', '▦'],
    ['pages/messages/index', '消息', '✉'],
    ['pages/mine/index', '我的', '●']
  ]
};

Component({
  data: { tabs: [], selected: 0, unread: 0, resolved: false },
  lifetimes: {
    attached() {
      this.refresh();
      // 组件首次挂载时页面栈可能尚未就绪，补一次渲染后再计算选中态
      setTimeout(() => this.refresh(), 80);
    }
  },
  pageLifetimes: {
    show() {
      this.refresh();
      setTimeout(() => this.refresh(), 60);
    }
  },
  methods: {
    refresh() {
      const role = getSession()?.user?.role || 'STUDENT';
      const tabs = (roleTabs[role] || roleTabs.STUDENT).map(([pagePath, text, icon]) => ({ pagePath, text, icon }));
      const pages = getCurrentPages();
      const route = pages[pages.length - 1]?.route || '';
      const index = tabs.findIndex(item => item.pagePath === route);
      const app = getApp();
      const next = { tabs, unread: Number(app?.globalData?.unreadCount) || 0 };
      // 只有真正匹配到当前页面时才更新选中态，避免页面栈未就绪时把选中态清空
      if (index >= 0) {
        next.selected = index;
        next.resolved = true;
      } else if (this.data.resolved) {
        next.selected = this.data.selected;
      } else {
        next.selected = 0;
      }
      this.setData(next);
    },
    switchTab(event) {
      const path = event.currentTarget.dataset.path;
      if (!path) return;
      wx.switchTab({ url: `/${path}` });
    }
  }
});
