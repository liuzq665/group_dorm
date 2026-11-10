const { request, showError, getSession } = require('../../utils/request');

const sections = [
  ['rejectRecords', '拒单记录', row => `${row.order_no} · ${row.title}`, row => `${row.decision_reason || '未填写原因'} · ${row.decided_at || ''}`],
  ['acceptTimeoutRecords', '接单超时', row => `${row.order_no} · ${row.title}`, row => `接单截止 ${row.accept_deadline || '-'} · ${row.decided_at || ''}`],
  ['repairTimeoutRecords', '维修超时', row => `${row.order_no} · ${row.title}`, row => `${row.reason || '维修超时'} · ${row.created_at || ''}`],
  ['delayRecords', '延期申请', row => `${row.order_no} · ${row.reason}`, row => `${row.current_status || ''} · ${row.expected_finish_at || ''}`],
  ['reworkRecords', '重修工单', row => `${row.order_no} · ${row.title}`, row => `${row.current_status || ''} · ${row.created_at || ''}`]
];

Page({
  data: { loading: true, profile: {}, stats: {}, sections: [] },
  onShow() { if (getApp().requireRole(['REPAIRER'])) this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const [stats, profile] = await Promise.all([request('/repairer-stats'), request('/profile')]);
      const rows = sections.map(([key, title, titleOf, metaOf]) => ({ key, title, items: (stats[key] || []).map(row => ({ ...row, displayTitle: titleOf(row), displayMeta: metaOf(row) })) }));
      const ratingTrend = (stats.ratingTrend || []).map(row => ({ ...row, scoreLabel: Number(row.averageScore || 0).toFixed(2), barWidth: `${Math.max(0, Math.min(100, Number(row.averageScore || 0) * 20))}%` }));
      this.setData({ stats, profile, sections: rows, ratingTrend });
    } catch (error) { showError(error); } finally { this.setData({ loading: false }); }
  },
  openRecord(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/repair-detail/index?id=${id}` });
  }
});
