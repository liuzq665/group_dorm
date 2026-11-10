const { request, getSession, showError } = require('../../utils/request');

const roles = {
  STUDENT: { label: '学生', headline: '校园住宿服务', links: [
    { title: '我的住宿', detail: '床位与舍友', url: '/pages/accommodation/index', mark: '住' },
    { title: '报修进度', detail: '提交故障与跟进维修', url: '/pages/repairs/index', mark: '修' },
    { title: '假期留宿', detail: '提交申请与查看审核', url: '/pages/stays/index', mark: '宿' },
    { title: '消息中心', detail: '查看业务通知', url: '/pages/messages/index', mark: '信' }
  ] },
  DORM_MANAGER: { label: '宿管', headline: '楼栋事务工作台', links: [
    { title: '报修审核', detail: '审核、派单与延期复核', url: '/pages/repairs/index', mark: '修' },
    { title: '留宿审核', detail: '锁定申请与审核名单', url: '/pages/stays/index', mark: '宿' },
    { title: '楼栋住宿', detail: '查看负责范围的住宿', url: '/pages/dorm/index', mark: '住' },
    { title: '消息中心', detail: '通知学生与查看消息', url: '/pages/messages/index', mark: '信' }
  ] },
  REPAIRER: { label: '维修人员', headline: '维修任务工作台', links: [
    { title: '维修任务', detail: '接单、处理与提交结果', url: '/pages/repairs/index', mark: '修' },
    { title: '个人维修统计', detail: '工单记录、超时与服务评价', url: '/pages/repairer-stats/index', mark: '数' },
    { title: '消息中心', detail: '接收派单与业务通知', url: '/pages/messages/index', mark: '信' }
  ] },
  ADMIN: { label: '系统管理员', headline: '全校运行工作台', links: [
    { title: '报修管理', detail: '待审核、异常与全校工单', url: '/pages/repairs/index', mark: '修' },
    { title: '留宿管理', detail: '开放批次、申请与历史', url: '/pages/stays/index', mark: '宿' },
    { title: '人员与角色', detail: '学生、宿管、维修人员', url: '/pages/admin/index', mark: '人' },
    { title: '宿舍资源', detail: '楼栋、宿舍、床位与分配', url: '/pages/dorm/index', mark: '住' },
    { title: '操作日志与数据备份', detail: '查看操作记录并创建数据库备份', url: '/pages/admin/index?tab=backup', mark: '系' },
    { title: '消息中心', detail: '发布与管理站内消息', url: '/pages/messages/index', mark: '信' }
  ] }
};
const repairLabels = { PENDING_REVIEW: '待审核', PENDING_MANUAL: '待人工处理', PENDING_ASSIGN: '待派单', PENDING_ACCEPT: '待接单', IN_REPAIR: '维修中', PENDING_CONFIRM: '待确认', COMPLETED: '已完成', ARCHIVED: '已归档' };
const stayLabels = { DRAFT: '草稿', OPEN: '开放申请', PENDING_REVIEW: '待审核', UNDER_REVIEW: '审核中', PENDING_EDIT: '待修改', APPROVED: '已通过', REJECTED: '已驳回', ARCHIVED: '已归档' };
const statusRows = (rows, labels) => (rows || []).map(row => ({ label: labels[row.status] || row.status, count: Number(row.total) || 0 })).filter(row => row.count > 0);

Page({
  data: { loading: true, role: '', roleLabel: '', headline: '', user: {}, profile: {}, home: null, unread: 0, dashboard: {}, stats: {}, repairStatusRows: [], stayStatusRows: [], links: [] },
  onShow() { if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'])) this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const session = getSession(), role = session.user.role;
      const [profile, unread, dashboard] = await Promise.all([request('/profile'), request('/messages/unread-count'), request('/dashboard')]);
      const next = { role, roleLabel: roles[role].label, headline: roles[role].headline, user: session.user, profile, unread: unread.count || 0, dashboard, repairStatusRows: statusRows(dashboard.repairStatus, repairLabels), stayStatusRows: statusRows(dashboard.stayStatus, stayLabels), links: roles[role].links };
      getApp().globalData.unreadCount = next.unread;
      if (['STUDENT', 'DORM_MANAGER', 'ADMIN'].includes(role)) next.home = (await request('/accommodations/current'))[0] || null;
      if (role === 'DORM_MANAGER') next.stats = { pendingRepairs: (dashboard.repairStatus || []).filter(x => ['PENDING_REVIEW', 'PENDING_MANUAL'].includes(x.status)).reduce((n, x) => n + Number(x.total), 0), pendingStays: (dashboard.stayStatus || []).filter(x => ['PENDING_REVIEW', 'UNDER_REVIEW', 'PENDING_EDIT'].includes(x.status)).reduce((n, x) => n + Number(x.total), 0) };
      if (role === 'REPAIRER') next.stats = await request('/repairer-stats');
      if (role === 'ADMIN') next.stats = { students: dashboard.accommodationStats?.students || 0, housed: dashboard.accommodationStats?.housed || 0, repairs: (dashboard.repairStatus || []).filter(x => ['PENDING_REVIEW', 'PENDING_MANUAL', 'PENDING_ACCEPT', 'IN_REPAIR', 'PENDING_CONFIRM'].includes(x.status)).reduce((n, x) => n + Number(x.total), 0), stays: dashboard.stayApproved || 0 };
      this.setData(next);
    } catch (error) { showError(error); } finally { this.setData({ loading: false }); }
  },
  go(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    const path = url.split('?')[0];
    if (['/pages/home/index', '/pages/repairs/index', '/pages/stays/index', '/pages/messages/index', '/pages/mine/index'].includes(path)) wx.switchTab({ url: path });
    else wx.navigateTo({ url });
  }
});
