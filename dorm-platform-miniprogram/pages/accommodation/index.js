const { request, showError } = require('../../utils/request');
const { formatDate, orDash } = require('../../utils/format');

const TYPE_LABELS = { INITIAL: '首次分配', ASSIGN: '分配调换', CHANGE: '换宿', CHECKOUT: '退宿' };

Page({
  data: {
    loading: true,
    home: null,
    roommates: [],
    history: [],
    currentRows: [],
    historyRows: [],
    historyCount: 0,
    roomLabel: '',
    emptyHistory: { title: '暂无住宿历史', tip: '换宿或退宿后会在此产生记录' }
  },
  onShow() {
    if (getApp().requireStudent()) this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const [homes, roommates, history] = await Promise.all([
        request('/accommodations/current'),
        request('/accommodations/roommates'),
        request('/accommodations/history')
      ]);
      const home = (homes && homes[0]) || null;
      const historyRows = (history || [])
        .filter(row => !home || String(row.assignment_id) !== String(home.assignment_id))
        .sort((left, right) => String(right.check_in_date || '').localeCompare(String(left.check_in_date || '')))
        .map(row => ({
          ...row,
          title: `${orDash(row.building_name)} ${orDash(row.room_no)} · ${orDash(row.bed_no)} 床`,
          typeLabel: TYPE_LABELS[row.assignment_type] || orDash(row.assignment_type),
          rangeLabel: `${formatDate(row.check_in_date)} 至 ${row.check_out_date ? formatDate(row.check_out_date) : '至今'}`
        }));
      this.setData({
        home,
        roommates: roommates || [],
        history: historyRows,
        historyRows,
        historyCount: historyRows.length,
        roomLabel: home ? `${orDash(home.building_name)} ${orDash(home.room_no)} · ${orDash(home.bed_no)} 床` : '',
        currentRows: home
          ? [
              { label: '楼栋', value: orDash(home.building_name) },
              { label: '宿舍', value: orDash(home.room_no) },
              { label: '床位', value: `${orDash(home.bed_no)} 床` },
              { label: '入住日期', value: formatDate(home.check_in_date) },
              { label: '住宿状态', value: home.check_out_date ? '已退宿' : '在住' }
            ]
          : []
      });
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  goRepairs() {
    wx.switchTab({ url: '/pages/repairs/index' });
  }
});
