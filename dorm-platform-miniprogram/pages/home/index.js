const { request, getSession, showError } = require('../../utils/request');
const { statusText, statusTone, orDash } = require('../../utils/format');

const roles = {
  STUDENT: {
    label: '学生',
    headline: '校园住宿服务',
    links: [
      { title: '我的住宿', detail: '床位、舍友与住宿历史', url: '/pages/accommodation/index', mark: '住' },
      { title: '我的报修', detail: '报修进度、确认完成与评价', url: '/pages/repairs/index', mark: '修' },
      { title: '假期留宿', detail: '提交申请与查看审核', url: '/pages/stays/index', mark: '宿' },
      { title: '消息中心', detail: '查看业务通知', url: '/pages/messages/index', mark: '信' }
    ]
  },
  REPAIRER: {
    label: '维修人员',
    headline: '维修任务工作台',
    links: [
      { title: '维修任务', detail: '接单、拒单、维修与延期', url: '/pages/repairs/index', mark: '修' },
      { title: '维修记录', detail: '工单记录、异常记录与评价', url: '/pages/repairer-stats/index', mark: '记' },
      { title: '消息中心', detail: '接收派单与业务通知', url: '/pages/messages/index', mark: '信' }
    ]
  },
  DORM_MANAGER: {
    label: '宿管',
    headline: '楼栋事务工作台',
    links: [
      { title: '报修审核', detail: '审核、派单与延期复核', url: '/pages/repairs/index', mark: '修' },
      { title: '留宿审核', detail: '锁定申请与审核名单', url: '/pages/stays/index', mark: '宿' },
      { title: '楼栋住宿', detail: '查看负责范围的住宿', url: '/pages/dorm/index', mark: '住' },
      { title: '消息中心', detail: '通知学生与查看消息', url: '/pages/messages/index', mark: '信' }
    ]
  },
  ADMIN: {
    label: '系统管理员',
    headline: '全校运行工作台',
    links: [
      { title: '报修管理', detail: '待审核、异常与全校工单', url: '/pages/repairs/index', mark: '修' },
      { title: '留宿管理', detail: '开放批次、申请与历史', url: '/pages/stays/index', mark: '宿' },
      { title: '人员与角色', detail: '学生、宿管、维修人员', url: '/pages/admin/index', mark: '人' },
      { title: '宿舍资源', detail: '楼栋、宿舍、床位与分配', url: '/pages/dorm/index', mark: '住' },
      { title: '操作日志与数据备份', detail: '查看操作记录并创建数据库备份', url: '/pages/admin/index?tab=backup', mark: '系' },
      { title: '消息中心', detail: '发布与管理站内消息', url: '/pages/messages/index', mark: '信' }
    ]
  }
};

const repairLabels = {
  PENDING_REVIEW: '待审核',
  PENDING_MANUAL: '待人工处理',
  PENDING_ASSIGN: '待派单',
  PENDING_ACCEPT: '待接单',
  IN_REPAIR: '维修中',
  PENDING_CONFIRM: '待确认',
  COMPLETED: '已确认',
  ARCHIVED: '已归档'
};
const stayLabels = {
  DRAFT: '草稿',
  OPEN: '开放申请',
  PENDING_REVIEW: '待审核',
  UNDER_REVIEW: '审核中',
  PENDING_EDIT: '待修改',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  ARCHIVED: '已归档'
};

const statusRows = (rows, labels) => (rows || [])
  .map(row => ({ label: labels[row.status] || row.status, count: Number(row.total) || 0 }))
  .filter(row => row.count > 0);

Page({
  data: {
    loading: true,
    role: '',
    roleLabel: '',
    headline: '',
    user: {},
    profile: {},
    home: null,
    unread: 0,
    dashboard: {},
    stats: {},
    links: [],
    metrics: [],
    repairStatusRows: [],
    stayStatusRows: [],
    showWorkload: false,
    homeAddress: ''
  },
  onShow() {
    if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'])) this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const session = getSession();
      const role = session.user.role;
      const [profile, unread] = await Promise.all([request('/profile'), request('/messages/unread-count')]);
      const unreadCount = Number(unread.count) || 0;
      const next = {
        role,
        roleLabel: roles[role].label,
        headline: roles[role].headline,
        user: session.user,
        profile,
        unread: unreadCount,
        links: roles[role].links.map((item, index, list) => ({
          ...item,
          wide: list.length % 2 === 1 && index === list.length - 1
        })),
        metrics: [],
        repairStatusRows: [],
        stayStatusRows: [],
        showWorkload: false,
        stats: {},
        dashboard: {}
      };
      getApp().globalData.unreadCount = unreadCount;
      this.refreshTabBar();

      if (role === 'STUDENT') {
        // 学生端不展示工作台统计（4.4），只展示当前住宿与服务入口。
        const homes = await request('/accommodations/current');
        next.home = (homes && homes[0]) || null;
        next.homeAddress = next.home
          ? `${orDash(next.home.building_name)} · ${orDash(next.home.room_no)} · ${orDash(next.home.bed_no)} 床`
          : '';
      } else if (role === 'REPAIRER') {
        // 维修工作台数据与“维修任务/维修记录”使用同一统计接口，保证与实际工单一致（G-07）。
        const stats = await request('/repairer-stats');
        next.stats = stats;
        next.metrics = [
          { label: '待接单', value: Number(stats.pendingAccept) || 0 },
          { label: '维修中', value: Number(stats.inRepair) || 0 },
          { label: '延期申请', value: Number(stats.delayedOrders) || 0 },
          { label: '待学生确认', value: Number(stats.pendingConfirm) || 0 }
        ];
      } else {
        const dashboard = await request('/dashboard');
        next.dashboard = dashboard;
        next.repairStatusRows = statusRows(dashboard.repairStatus, repairLabels);
        next.stayStatusRows = statusRows(dashboard.stayStatus, stayLabels);
        next.showWorkload = true;
        next.home = (await request('/accommodations/current'))[0] || null;
        next.homeAddress = next.home
          ? `${orDash(next.home.building_name)} · ${orDash(next.home.room_no)} · ${orDash(next.home.bed_no)} 床`
          : '';
        if (role === 'DORM_MANAGER') {
          next.metrics = [
            {
              label: '待处理报修',
              value: (dashboard.repairStatus || [])
                .filter(row => ['PENDING_REVIEW', 'PENDING_MANUAL'].includes(row.status))
                .reduce((total, row) => total + Number(row.total || 0), 0)
            },
            {
              label: '待审核留宿',
              value: (dashboard.stayStatus || [])
                .filter(row => ['PENDING_REVIEW', 'UNDER_REVIEW', 'PENDING_EDIT'].includes(row.status))
                .reduce((total, row) => total + Number(row.total || 0), 0)
            },
            { label: '管辖楼栋通过留宿人数', value: Number(dashboard.stayApproved) || 0 }
          ];
        } else {
          next.metrics = [
            { label: '在读学生', value: Number(dashboard.accommodationStats?.students) || 0 },
            { label: '已安排住宿', value: Number(dashboard.accommodationStats?.housed) || 0 },
            {
              label: '处理中报修',
              value: (dashboard.repairStatus || [])
                .filter(row => ['PENDING_REVIEW', 'PENDING_MANUAL', 'PENDING_ACCEPT', 'IN_REPAIR', 'PENDING_CONFIRM'].includes(row.status))
                .reduce((total, row) => total + Number(row.total || 0), 0)
            },
            { label: '当前通过留宿', value: Number(dashboard.stayApproved) || 0 }
          ];
        }
      }
      this.setData(next);
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  go(event) {
    const url = event.currentTarget.dataset.url;
    if (!url) return;
    const path = url.split('?')[0];
    if (['/pages/home/index', '/pages/repairs/index', '/pages/stays/index', '/pages/messages/index', '/pages/mine/index'].includes(path)) {
      wx.switchTab({ url: path });
    } else {
      wx.navigateTo({ url });
    }
  },
  goRepairs() {
    wx.switchTab({ url: '/pages/repairs/index' });
  },
  /** 未读数变化后同步底部导航角标（自定义 tabBar） */
  refreshTabBar() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar && typeof tabBar.refresh === 'function') tabBar.refresh();
  },
  goMessages() {
    wx.switchTab({ url: '/pages/messages/index' });
  }
});
