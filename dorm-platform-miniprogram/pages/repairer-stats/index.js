const { request, showError, getSession } = require('../../utils/request');
const { statusText, statusTone, formatDateTime, orDash } = require('../../utils/format');
const { yearOptions, monthOptions, inYearMonth, paginate } = require('../../utils/pager');

const RECORD_SECTIONS = [
  { key: 'reject', title: '拒单记录', source: 'rejectRecords', empty: '暂无拒单记录', line: row => `${row.order_no} · ${row.title}`, meta: row => `拒单原因：${orDash(row.decision_reason)} · ${formatDateTime(row.decided_at)}` },
  { key: 'acceptTimeout', title: '接单超时记录', source: 'acceptTimeoutRecords', empty: '暂无接单超时记录', line: row => `${row.order_no} · ${row.title}`, meta: row => `接单截止 ${formatDateTime(row.accept_deadline)} · ${formatDateTime(row.decided_at)}` },
  { key: 'repairTimeout', title: '超时未修好记录', source: 'repairTimeoutRecords', empty: '暂无超时未修好记录', line: row => `${row.order_no} · ${row.title}`, meta: row => `${orDash(row.reason)} · ${formatDateTime(row.created_at)}` },
  { key: 'delay', title: '延期记录', source: 'delayRecords', empty: '暂无延期记录', line: row => `${row.order_no} · ${row.reason}`, meta: row => `审核状态 ${orDash(row.current_status)} · 预计完成 ${formatDateTime(row.expected_finish_at)}` },
  { key: 'rework', title: '重修工单记录', source: 'reworkRecords', empty: '暂无重修记录', line: row => `${row.order_no} · ${row.title}`, meta: row => `重修原因 ${orDash(row.reason)} · ${formatDateTime(row.created_at)}` }
];

Page({
  data: {
    loading: true,
    profile: {},
    stats: {},
    tab: 'records',
    yearOptions: [],
    monthOptions: monthOptions(),
    yearIndex: 0,
    monthIndex: 0,
    year: '',
    month: '',
    filterLabel: '全部时间',
    metrics: [],
    sections: [],
    open: { work: true, reject: true, acceptTimeout: false, repairTimeout: false, delay: true, rework: true },
    workRecords: [],
    workPageItems: [],
    workPage: 1,
    workPageCount: 1,
    workPageSize: 10,
    workView: { page: 1, pages: 1, total: 0, size: 10 },
    workEmptyView: { title: '该统计范围暂无个人工单记录', tip: '可调整年份或月份后重新查询' },
    ratingSummary: { averageScore: 0, evaluationCount: 0 },
    ratingTrend: [],
    evaluationRecords: [],
    ratingLabel: '全部时间综合评分'
  },
  onShow() {
    if (getApp().requireRole(['REPAIRER'])) this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const now = new Date().getFullYear();
      const years = yearOptions(now, 6);
      const year = this.data.year;
      const month = this.data.month;
      const query = [];
      if (year) {
        query.push(`eventYear=${year}`, `ratingYear=${year}`);
        if (month) query.push(`eventMonth=${month}`, `ratingMonth=${month}`);
      }
      const [stats, profile, history] = await Promise.all([
        request(`/repairer-stats${query.length ? `?${query.join('&')}` : ''}`),
        request('/profile'),
        request('/repair-history')
      ]);
      // 指标收敛为 4 个核心数字，降低单屏密度；累计完工与评价次数放在头部说明
      const metrics = [
        { label: '待接单', value: Number(stats.pendingAccept) || 0 },
        { label: '维修中', value: Number(stats.inRepair) || 0 },
        { label: '待学生确认', value: Number(stats.pendingConfirm) || 0 },
        { label: '综合评分', value: `${Number(stats.averageScore) || 0}` }
      ];
      const heroCopy = `累计完工 ${Number(stats.completed) || 0} 单 · 收到评价 ${Number(stats.ratingSummary?.evaluationCount) || 0} 条`;
      const sections = RECORD_SECTIONS.map(section => {
        const items = (stats[section.source] || []).map(row => ({
          ...row,
          line: section.line(row),
          meta: section.meta(row),
          statusLabel: statusText(row.current_status),
          statusTone: statusTone(row.current_status)
        }));
        return { key: section.key, title: section.title, empty: section.empty, count: items.length, items };
      });
      const workRecords = (history || [])
        .filter(row => inYearMonth(row.completed_at || row.updated_at || row.created_at, year, month))
        .map(row => ({
          ...row,
          statusLabel: statusText(row.current_status),
          statusTone: statusTone(row.current_status),
          timeLabel: formatDateTime(row.completed_at || row.updated_at || row.created_at),
          scoreLabel: row.score ? `${row.score} 分` : '未评价',
          commentLabel: orDash(row.comment)
        }));
      const ratingTrend = (stats.ratingTrend || []).map(row => ({
        ...row,
        label: orDash(row.label),
        scoreLabel: Number(row.averageScore || 0).toFixed(2),
        barWidth: `${Math.max(0, Math.min(100, Number(row.averageScore || 0) * 20))}%`,
        countLabel: `${Number(row.evaluationCount || 0)} 次`
      }));
      const evaluationRecords = (stats.evaluationRecords || []).map(row => ({
        ...row,
        scoreLabel: `${row.score} 分`,
        commentLabel: orDash(row.comment),
        timeLabel: formatDateTime(row.created_at)
      }));
      const filterLabel = year ? `${year}年${month ? `${month}月` : '全年'}` : '全部时间';
      this.setData({
        profile,
        stats,
        metrics,
        heroCopy,
        sections,
        workRecords,
        yearOptions: years,
        ratingSummary: {
          averageScore: Number(stats.ratingSummary?.averageScore) || 0,
          evaluationCount: Number(stats.ratingSummary?.evaluationCount) || 0
        },
        ratingTrend,
        evaluationRecords,
        filterLabel,
        ratingLabel: `${filterLabel}综合评分`
      });
      this.applyWorkPage(this.data.workPage);
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  applyWorkPage(page) {
    const view = paginate(this.data.workRecords, page, this.data.workPageSize);
    this.setData({
      workPage: view.page,
      workPageCount: view.pageCount,
      workPageItems: view.items,
      workView: { page: view.page, pages: view.pageCount, total: view.total, size: view.pageSize }
    });
  },
  changeWorkPage(event) {
    const delta = Number(event.currentTarget.dataset.delta);
    const next = Math.min(Math.max(1, this.data.workPage + delta), this.data.workPageCount);
    if (next !== this.data.workPage) this.applyWorkPage(next);
  },
  /** 公共分页模板（templates/ui.wxml）统一调用 changePage。 */
  changePage(event) {
    this.changeWorkPage(event);
  },
  selectTab(event) {
    this.setData({ tab: event.currentTarget.dataset.tab });
  },
  chooseYear(event) {
    const index = Number(event.detail.value);
    this.setData({ yearIndex: index, year: this.data.yearOptions[index]?.key || '', workPage: 1 });
    this.load();
  },
  chooseMonth(event) {
    const index = Number(event.detail.value);
    this.setData({ monthIndex: index, month: this.data.monthOptions[index]?.key || '', workPage: 1 });
    this.load();
  },
  resetFilter() {
    this.setData({ yearIndex: 0, monthIndex: 0, year: '', month: '', workPage: 1 });
    this.load();
  },
  toggleSection(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`open.${key}`]: !this.data.open[key] });
  },
  openRecord(event) {
    const id = event.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/repair-detail/index?id=${id}` });
  }
});
