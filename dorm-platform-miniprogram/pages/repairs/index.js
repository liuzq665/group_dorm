const { request, getSession, showError } = require('../../utils/request');
const { statusText, statusClass } = require('../../utils/format');

const tabsByRole = {
  STUDENT: [['all', '全部'], ['draft', '草稿/待修改'], ['review', '待审核'], ['manual', '待人工处理'], ['accept', '待接单'], ['repair', '维修中'], ['confirm', '待确认'], ['completed', '已完成'], ['history', '历史记录']],
  DORM_MANAGER: [['review', '待审核'], ['manual', '待人工处理'], ['assign', '待派单'], ['accept', '待接单'], ['repair', '维修中'], ['confirm', '待确认'], ['completed', '已完成'], ['all', '全部']],
  ADMIN: [['all', '全部'], ['review', '待审核'], ['manual', '待人工处理'], ['assign', '待派单'], ['accept', '待接单'], ['repair', '维修中'], ['confirm', '待确认'], ['completed', '已完成'], ['history', '报修历史']],
  REPAIRER: [['accept', '待接单'], ['repair', '维修中'], ['confirm', '待确认'], ['completed', '已完成'], ['all', '全部'], ['history', '历史记录']]
};
const statusesByTab = { draft: ['DRAFT', 'PENDING_EDIT'], review: ['PENDING_REVIEW'], manual: ['PENDING_MANUAL'], assign: ['PENDING_ASSIGN'], accept: ['PENDING_ACCEPT'], repair: ['ACCEPTED', 'DELAYED'], confirm: ['REPAIRED'], completed: ['CONFIRMED'], all: [], history: ['ARCHIVED', 'CLOSED', 'CANCELLED'] };

Page({
  data: { loading: true, role: 'STUDENT', tab: '', tabs: [], items: [], pageItems: [], page: 1, pageCount: 1, pageSize: 10, filters: { keyword: '' }, statuses: {} },
  onShow() { if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'])) this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const role = getSession().user.role, tabs = tabsByRole[role], tab = tabs.some(x => x[0] === this.data.tab) ? this.data.tab : tabs[0][0];
      const history = tab === 'history';
      const path = history ? '/repair-history' : '/repair-orders';
      const keyword = this.data.filters.keyword.trim();
      const [rows, catalog] = await Promise.all([request(path + (keyword ? `?orderNo=${encodeURIComponent(keyword)}` : '')), request('/repair-catalog')]);
      const items = rows.map(item => ({ ...item, isHistory: history, statusLabel: statusText(item.current_status), statusStyle: statusClass(item.current_status), dispatchText: item.dispatch_availability || '' }));
      const selectedStatuses = statusesByTab[tab] || [];
      const active = items.filter(x => {
        if (role === 'STUDENT' && tab === 'history') return ['ARCHIVED', 'CLOSED', 'CANCELLED'].includes(x.current_status);
        if (role === 'STUDENT' && tab === 'all') return !['ARCHIVED', 'CLOSED', 'CANCELLED'].includes(x.current_status);
        if (role === 'REPAIRER' && !history && tab === 'all' && !['PENDING_ACCEPT', 'ACCEPTED', 'DELAYED', 'REPAIRED', 'CONFIRMED'].includes(x.current_status)) return false;
        if (!history && selectedStatuses.length && !selectedStatuses.includes(x.current_status)) return false;
        if (role === 'STUDENT' && !history && tab !== 'all' && !selectedStatuses.length) return false;
        if (role === 'ADMIN' && tab === 'all' && ['DRAFT', 'PENDING_EDIT'].includes(x.current_status)) return false;
        return true;
      });
      const pageCount = Math.max(1, Math.ceil(active.length / this.data.pageSize));
      const page = Math.min(this.data.page, pageCount);
      this.setData({ role, tab, tabs: tabs.map(([key, label]) => ({ key, label, selected: key === tab })), items: active, page, pageCount, pageItems: active.slice((page - 1) * this.data.pageSize, page * this.data.pageSize), statuses: Object.fromEntries((catalog.statuses || []).map(x => [x.status, true])) });
    } catch (error) { showError(error); } finally { this.setData({ loading: false }); }
  },
  chooseTab(e) { this.setData({ tab: e.currentTarget.dataset.tab, page: 1 }); this.load(); },
  keyword(e) { this.setData({ 'filters.keyword': e.detail.value }); },
  search() { this.setData({ page: 1 }); this.load(); },
  changePage(e) {
    const page = this.data.page + Number(e.currentTarget.dataset.delta);
    if (page < 1 || page > this.data.pageCount) return;
    this.setData({ page, pageItems: this.data.items.slice((page - 1) * this.data.pageSize, page * this.data.pageSize) });
  },
  create() { wx.navigateTo({ url: '/pages/repair-form/index' }); },
  detail(e) { wx.navigateTo({ url: `/pages/repair-detail/index?id=${e.currentTarget.dataset.id}` }); }
});
