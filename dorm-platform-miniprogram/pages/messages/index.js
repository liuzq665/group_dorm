const { request, uploadMessage, showError, getSession } = require('../../utils/request');
const { sourceOptions: buildSourceOptions, formatDateTime, orDash } = require('../../utils/format');
const { paginate, stepPage } = require('../../utils/pager');
const { previewAttachment } = require('../../utils/files');
const { overlay } = require('../../utils/overlay');

const READ_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'read', label: '已读' }
];

Page({
  data: {
    loading: true,
    role: '',
    items: [],
    pageItems: [],
    page: 1,
    pageCount: 1,
    pageSize: 10,
    pager: { page: 1, pages: 1, total: 0, size: 10 },
    emptyView: { title: '暂无消息', tip: '' },
    source: 'ALL',
    sourceOptions: [],
    read: 'all',
    readOptions: READ_OPTIONS,
    buildingId: '',
    buildings: [],
    buildingIndex: 0,
    buildingLabel: '全部楼栋',
    unread: 0,
    detail: null,
    detailView: {},
    publishing: false,
    selectedBuildings: [],
    form: { title: '', content: '', targetRole: 'STUDENT' },
    files: [],
    actionBusy: false
  },
  onShow() {
    const role = getSession()?.user?.role;
    if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'])) {
      this.setData({ role, sourceOptions: buildSourceOptions(role) });
      this.load();
    }
    // 选择附件会触发 onHide→onShow，回来时恢复发布弹层与 tabBar 隐藏状态
    if (this.data.publishing || this.data.detail) overlay(this, true);
  },
  onHide() {
    // 选择文件时页面会短暂隐藏，此时不能关闭弹层，否则已填写的标题/正文会丢
    if (this._pickingMedia) return;
    // 离开消息中心时关闭详情/发布弹层，避免下次进入残留
    this.setData({ detail: null, detailView: {}, publishing: false });
    overlay(this, false);
  },
  /** 未读数变化后同步底部导航角标（自定义 tabBar） */
  refreshTabBar() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar && typeof tabBar.refresh === 'function') tabBar.refresh();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const role = this.data.role;
      const options = this.data.sourceOptions.length ? this.data.sourceOptions : buildSourceOptions(role);
      const source = options.some(option => option.key === this.data.source) ? this.data.source : 'ALL';
      const params = [`read=${encodeURIComponent(this.data.read)}`];
      if (source !== 'ALL') params.push(`sender=${encodeURIComponent(source)}`);
      if (this.data.buildingId) params.push(`building=${encodeURIComponent(this.data.buildingId)}`);
      const [rows, unread] = await Promise.all([
        request(`/messages?${params.join('&')}`),
        request('/messages/unread-count')
      ]);
      const items = rows.map(row => ({
        ...row,
        sourceLabel: orDash(row.source_label),
        publisherLabel: orDash(row.publisher_name),
        buildingLabel: orDash(row.building_names),
        attachmentLabel: orDash(row.attachment_names),
        readLabel: orDash(row.read_label || (row.read_at ? '已读' : '未读')),
        timeLabel: formatDateTime(row.created_at),
        attachments: row.attachments || [],
        unread: !row.read_at && !!row.is_recipient
      }));
      const unreadCount = Number(unread.count) || 0;
      const app = getApp();
      app.globalData.unreadCount = unreadCount;
      this.setData({ items, unread: unreadCount, source });
      this.applyPage(this.data.page);
      this.refreshTabBar();
      if (role === 'REPAIRER') await this.loadBuildings();
      else if (role === 'ADMIN' || role === 'DORM_MANAGER') await this.loadBuildings(true);
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  async loadBuildings(selectAll = false) {
    try {
      const buildings = await request('/buildings');
      this.setData({
        buildings: buildings.map(item => ({ ...item, selected: selectAll ? true : !!item.selected })),
        buildingLabel: this.data.buildingId ? this.data.buildingLabel : '全部楼栋'
      });
    } catch (error) {
      if (this.data.role === 'REPAIRER') showError(error);
    }
  },
  applyPage(page) {
    const view = paginate(this.data.items, page, this.data.pageSize);
    const emptyView = this.data.items.length
      ? { title: '', tip: '' }
      : { title: '暂无消息', tip: this.data.read === 'unread' ? '当前没有未读消息' : '当前来源分类下暂无消息' };
    this.setData({
      page: view.page,
      pageCount: view.pageCount,
      pageItems: view.items,
      pager: { page: view.page, pages: view.pageCount, total: view.total, size: view.pageSize },
      emptyView
    });
  },
  changePage(event) {
    const page = stepPage(this.data.page, this.data.pageCount, event.currentTarget.dataset.delta);
    if (page === this.data.page) return;
    this.applyPage(page);
  },
  chooseSource(event) {
    this.setData({ source: event.currentTarget.dataset.key, page: 1 });
    this.load();
  },
  chooseRead(event) {
    this.setData({ read: event.currentTarget.dataset.key, page: 1 });
    this.load();
  },
  chooseBuilding(event) {
    const index = Number(event.detail.value) + 1;
    const building = this.data.buildings[index - 1];
    this.setData({
      buildingIndex: index,
      buildingId: building ? String(building.building_id) : '',
      buildingLabel: building ? building.building_name : '全部楼栋',
      page: 1
    });
    this.load();
  },
  async open(event) {
    const item = event.currentTarget.dataset.item;
    this.setData({ detail: item, detailView: this.detailOf(item) });
    overlay(this, true);
    if (item.is_recipient && !item.read_at) {
      try {
        await request(`/messages/${item.message_id}/read`, { method: 'POST' });
        item.read_at = 'read';
        item.unread = false;
        item.readLabel = '已读';
        const items = this.data.read === 'unread'
          ? this.data.items.filter(row => row.message_id !== item.message_id)
          : this.data.items;
        this.setData({ items });
        this.applyPage(this.data.page);
        await this.refreshUnread();
      } catch (error) {
        showError(error);
      }
    }
  },
  detailOf(item) {
    return {
      title: orDash(item.title),
      fields: [
        { label: '通知来源', value: orDash(item.sourceLabel) },
        { label: '发布人', value: orDash(item.publisherLabel) },
        { label: '接收对象', value: orDash(item.recipient_roles || item.target_role || '当前账号') },
        { label: '楼栋范围', value: orDash(item.buildingLabel) },
        { label: '发送时间', value: orDash(item.timeLabel || formatDateTime(item.created_at)) },
        { label: '阅读状态', value: orDash(item.readLabel) }
      ],
      content: orDash(item.content),
      files: item.attachments || []
    };
  },
  closeDetail() {
    this.setData({ detail: null, detailView: {} });
    overlay(this, false);
  },
  refreshUnread() {
    return request('/messages/unread-count').then(result => {
      const unread = Number(result.count) || 0;
      getApp().globalData.unreadCount = unread;
      this.setData({ unread });
      this.refreshTabBar();
    });
  },
  async readAll() {
    const ids = this.data.items.filter(item => !item.read_at && item.is_recipient).map(item => item.message_id);
    if (!ids.length) { wx.showToast({ title: '当前没有未读消息', icon: 'none' }); return; }
    const confirmed = await new Promise(resolve => wx.showModal({
      title: '全部标为已读',
      content: `将把当前列表 ${ids.length} 条消息标为已读，确定继续吗？`,
      success: result => resolve(result.confirm)
    }));
    if (!confirmed) return;
    try {
      await request('/messages/read', { method: 'POST', data: { ids } });
      wx.showToast({ title: '已全部标为已读' });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  openPublish() {
    this.setData({
      publishing: true,
      selectedBuildings: this.data.buildings.map(item => item.building_id),
      form: { title: '', content: '', targetRole: 'STUDENT' },
      files: []
    });
    overlay(this, true);
  },
  closePublish() {
    this.setData({ publishing: false });
    overlay(this, false);
  },
  input(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  target(event) {
    this.setData({ 'form.targetRole': event.currentTarget.dataset.value });
  },
  selectBuildings(event) {
    const selectedBuildings = event.detail.value.map(Number);
    this.setData({
      selectedBuildings,
      buildings: this.data.buildings.map(item => ({ ...item, selected: selectedBuildings.includes(Number(item.building_id)) }))
    });
  },
  async chooseFiles() {
    try {
      this._pickingMedia = true;
      const picked = await new Promise((resolve, reject) => wx.chooseMessageFile({
        count: 8 - this.data.files.length,
        type: 'file',
        success: result => { this._pickingMedia = false; resolve(result.tempFiles.map(item => ({ path: item.path, name: item.name || '附件' }))); },
        fail: error => { this._pickingMedia = false; reject(error); }
      }));
      this.setData({ publishing: true, files: [...this.data.files, ...picked].slice(0, 8) });
      overlay(this, true);
    } catch (error) {
      if (!error.errMsg?.includes('cancel')) showError(error);
    }
  },
  async publish() {
    const { form, selectedBuildings, files } = this.data;
    if (!form.title.trim() || !form.content.trim() || !selectedBuildings.length) {
      wx.showToast({ title: '请填写标题、正文并选择楼栋', icon: 'none' });
      return;
    }
    if (this.data.actionBusy) return;
    this.setData({ actionBusy: true });
    wx.showLoading({ title: '正在发布' });
    try {
      const attachmentIds = await Promise.all(files.map(file => uploadMessage(typeof file === 'string' ? file : file.path, file.name)));
      await request('/messages', {
        method: 'POST',
        data: {
          title: form.title.trim(),
          content: form.content.trim(),
          targetRole: form.targetRole,
          buildingIds: selectedBuildings,
          attachmentIds
        }
      });
      wx.showToast({ title: '通知已发布' });
      this.setData({ publishing: false });
      overlay(this, false);
      this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
      wx.hideLoading();
    }
  },
  previewFile(event) {
    previewAttachment(event.currentTarget.dataset.file, getSession().token);
  },
  preview(event) {
    this.previewFile(event);
  },
  goBack() {
    if (this.data.detail) { this.closeDetail(); return; }
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  }
});

