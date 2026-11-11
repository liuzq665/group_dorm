const { request, getSession, showError } = require('../../utils/request');
const { statusText, statusTone, formatDateTime, orDash } = require('../../utils/format');
const { paginate, stepPage } = require('../../utils/pager');

const HISTORY_STATUSES = ['ARCHIVED', 'CLOSED', 'CANCELLED'];
// 维修人员“全部”只看进入维修环节的工单，未派单到本人的待审核/待人工工单不展示。
const REPAIRER_VISIBLE = ['PENDING_ACCEPT', 'ACCEPTED', 'DELAYED', 'REPAIRED', 'CONFIRMED'];

// 分类定义：固定展示业务分类，不因当前无数据隐藏（问题三版、4.4）。
const tabsByRole = {
  STUDENT: [
    { key: 'all', label: '全部' },
    { key: 'review', label: '待审核', statuses: ['PENDING_REVIEW'] },
    { key: 'manual', label: '待人工处理', statuses: ['PENDING_MANUAL', 'PENDING_ASSIGN'] },
    { key: 'accept', label: '待接单', statuses: ['PENDING_ACCEPT'] },
    { key: 'accepted', label: '已接单', statuses: ['ACCEPTED', 'DELAYED'] },
    { key: 'confirm', label: '待确认', statuses: ['REPAIRED'] },
    { key: 'completed', label: '已完成', statuses: ['CONFIRMED'] },
    { key: 'history', label: '历史记录', statuses: HISTORY_STATUSES, history: true }
  ],
  REPAIRER: [
    { key: 'all', label: '全部' },
    { key: 'accept', label: '待接单', statuses: ['PENDING_ACCEPT'] },
    { key: 'repair', label: '维修中', statuses: ['ACCEPTED'] },
    { key: 'delay', label: '延期', statuses: ['DELAYED'] },
    { key: 'confirm', label: '待确认', statuses: ['REPAIRED'] },
    { key: 'completed', label: '已确认', statuses: ['CONFIRMED'] },
    { key: 'history', label: '历史记录', statuses: HISTORY_STATUSES, history: true }
  ],
  DORM_MANAGER: [
    { key: 'all', label: '全部' },
    { key: 'review', label: '待审核', statuses: ['PENDING_REVIEW'] },
    { key: 'manual', label: '待人工处理', statuses: ['PENDING_MANUAL'] },
    { key: 'assign', label: '待派单', statuses: ['PENDING_ASSIGN'] },
    { key: 'accept', label: '待接单', statuses: ['PENDING_ACCEPT'] },
    { key: 'repair', label: '维修中', statuses: ['ACCEPTED', 'DELAYED'] },
    { key: 'confirm', label: '待确认', statuses: ['REPAIRED'] },
    { key: 'history', label: '历史记录', statuses: HISTORY_STATUSES, history: true }
  ],
  ADMIN: [
    { key: 'all', label: '全部' },
    { key: 'review', label: '待审核', statuses: ['PENDING_REVIEW'] },
    { key: 'manual', label: '待人工处理', statuses: ['PENDING_MANUAL'] },
    { key: 'assign', label: '待派单', statuses: ['PENDING_ASSIGN'] },
    { key: 'accept', label: '待接单', statuses: ['PENDING_ACCEPT'] },
    { key: 'repair', label: '维修中', statuses: ['ACCEPTED', 'DELAYED'] },
    { key: 'confirm', label: '待确认', statuses: ['REPAIRED'] },
    { key: 'history', label: '历史记录', statuses: HISTORY_STATUSES, history: true }
  ]
};

const roleTitles = {
  STUDENT: { title: '我的报修', sub: '查看处理进度、确认完成并评价' },
  REPAIRER: { title: '维修任务', sub: '只显示派给本人的工单' },
  DORM_MANAGER: { title: '楼栋报修', sub: '仅显示负责楼栋范围' },
  ADMIN: { title: '全校报修', sub: '按工单状态处理业务' }
};

const emptyTips = {
  STUDENT: '当前分类没有工单，可在“全部”中查看草稿',
  REPAIRER: '当前分类没有派给本人的工单',
  DORM_MANAGER: '当前分类没有负责楼栋的工单',
  ADMIN: '当前分类没有工单'
};

Page({
  data: {
    loading: true,
    role: 'STUDENT',
    title: '',
    sub: '',
    tab: 'all',
    tabs: [],
    page: 1,
    pageCount: 1,
    pageSize: 10,
    pager: { page: 1, pages: 1, total: 0, size: 10 },
    emptyView: { title: '暂无工单', tip: '' },
    filters: { keyword: '' },
    keyword: '',
    activeList: [],
    historyList: [],
    items: [],
    pageItems: []
  },
  onShow() {
    if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'])) this.load();
    this.refreshTabBar();
  },
  /** 刷新自定义 tabBar 选中态，确保当前页高亮与角色一致 */
  refreshTabBar() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar && typeof tabBar.refresh === 'function') tabBar.refresh();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const role = getSession().user.role;
      const tabs = tabsByRole[role];
      const tab = tabs.some(item => item.key === this.data.tab) ? this.data.tab : 'all';
      const keyword = this.data.filters.keyword.trim();
      const query = keyword ? `?orderNo=${encodeURIComponent(keyword)}` : '';
      const [activeRows, historyRows] = await Promise.all([
        request(`/repair-orders${query}`),
        request(`/repair-history${query}`)
      ]);
      const activeList = (activeRows || [])
        .filter(row => !HISTORY_STATUSES.includes(row.current_status))
        .map(row => this.decorate(row, role));
      const historyList = (historyRows || []).map(row => this.decorate(row, role));
      const info = roleTitles[role];
      this.setData({
        role,
        title: info.title,
        sub: info.sub,
        tab,
        activeList,
        historyList,
        tabs: this.buildTabs(tabs, tab, activeList, historyList)
      });
      this.applyTab(this.data.page);
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  decorate(row, role) {
    const status = row.current_status;
    const tone = statusTone(status);
    return {
      ...row,
      statusLabel: statusText(status),
      statusTone: tone,
      statusStyle: tone.replace('tag-', ''),
      scoreLabel: row.score ? `${row.score} 分` : '',
      commentLabel: row.comment ? orDash(row.comment) : '',
      orderNoLabel: orDash(row.order_no),
      categoryLabel: orDash(row.category_name),
      buildingLabel: orDash(row.building_name),
      roomLabel: orDash(row.room_no),
      studentLabel: orDash(row.student_name),
      repairerLabel: orDash(row.repairer_name),
      timeLabel: formatDateTime(row.updated_at || row.created_at),
      deadlineLabel: row.repair_deadline ? `维修期限 ${formatDateTime(row.repair_deadline)}` : '',
      acceptDeadlineLabel: row.accept_deadline ? `接单截止 ${formatDateTime(row.accept_deadline)}` : '',
      dispatchHint: (role === 'ADMIN' || role === 'DORM_MANAGER') && row.dispatch_availability ? row.dispatch_availability : '',
      confirmHint: role === 'STUDENT' && status === 'REPAIRED' ? '维修已完成，请确认并填写评价' : '',
      acceptHint: role === 'REPAIRER' && status === 'PENDING_ACCEPT' ? '请在接单截止前接单或拒单（拒单需填写原因）' : '',
      delayHint: role === 'REPAIRER' && status === 'DELAYED' ? '延期申请待宿管审核' : '',
      positionLabel: `${orDash(row.building_name)} ${orDash(row.room_no)}`
    };
  },
  buildTabs(tabs, current, activeList, historyList) {
    const visibleList = this.data.role === 'REPAIRER'
      ? activeList.filter(row => REPAIRER_VISIBLE.includes(row.current_status))
      : activeList;
    return tabs.map(item => {
      const source = item.history ? historyList : activeList;
      const count = item.statuses
        ? source.filter(row => item.statuses.includes(row.current_status)).length
        : visibleList.length;
      return { key: item.key, label: item.label, count, selected: item.key === current };
    });
  },
  applyTab(page) {
    const tabs = tabsByRole[this.data.role];
    const definition = tabs.find(item => item.key === this.data.tab) || tabs[0];
    let source = definition.history ? this.data.historyList : this.data.activeList;
    const items = definition.statuses
      ? source.filter(row => definition.statuses.includes(row.current_status))
      : source.filter(row => this.data.role !== 'REPAIRER' || REPAIRER_VISIBLE.includes(row.current_status));
    const view = paginate(items, page, this.data.pageSize);
    const tip = this.data.filters.keyword.trim()
      ? '可清空工单号后重新查询'
      : (definition.key === 'all' ? emptyTips[this.data.role] : '可切换其他分类查看');
    this.setData({
      items,
      itemCount: items.length,
      page: view.page,
      pageCount: view.pageCount,
      pageItems: view.items,
      pager: { page: view.page, pages: view.pageCount, total: view.total, size: view.pageSize },
      emptyView: {
        title: items.length ? '' : `当前分类暂无${definition.label}工单`,
        tip: items.length ? '' : tip
      }
    });
  },
  chooseTab(event) {
    const tab = event.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    this.setData({ tab, page: 1, tabs: this.buildTabs(tabsByRole[this.data.role], tab, this.data.activeList, this.data.historyList) });
    this.applyTab(1);
  },
  keyword(event) {
    this.setData({ 'filters.keyword': event.detail.value });
  },
  search() {
    this.setData({ page: 1 });
    this.load();
  },
  reset() {
    this.setData({ 'filters.keyword': '', page: 1 });
    this.load();
  },
  changePage(event) {
    const page = stepPage(this.data.page, this.data.pageCount, event.currentTarget.dataset.delta);
    if (page === this.data.page) return;
    this.applyTab(page);
  },
  create() {
    wx.navigateTo({ url: '/pages/repair-form/index' });
  },
  detail(event) {
    wx.navigateTo({ url: `/pages/repair-detail/index?id=${event.currentTarget.dataset.id}` });
  }
});
