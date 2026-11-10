const { request, uploadMessage, showError, getSession } = require('../../utils/request');

Page({
  data: { loading: true, role: '', items: [], pageItems: [], page: 1, pageCount: 1, pageSize: 10, detail: null, buildings: [], unread: 0, source: 'SYSTEM', sourceOptions: [], read: 'unread', readOptions: [{ key: 'all', label: '全部' }, { key: 'unread', label: '未读' }, { key: 'read', label: '已读' }], buildingId: '', publishing: false, selectedBuildings: [], form: { title: '', content: '', targetRole: 'STUDENT' }, files: [], fileIds: [] },
  onShow() {
    const role = getSession()?.user?.role;
    if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'])) { this.setData({ role }); this.load(); }
  },
  async load() {
    this.setData({ loading: true });
    try {
      const sourceOptions = this.data.role === 'ADMIN' ? [['ALL', '全部'], ['SYSTEM', '系统通知'], ['DORM_MANAGER', '宿管发布'], ['MINE', '我发布的']] : this.data.role === 'DORM_MANAGER' ? [['ALL', '全部'], ['SYSTEM', '系统通知'], ['ADMIN', '系统管理员发布'], ['MINE', '我发布的']] : [['ALL', '全部'], ['SYSTEM', '系统通知'], ['ADMIN', '系统管理员发布'], ['DORM_MANAGER', '宿管发布']];
      const source = sourceOptions.some(([key]) => key === this.data.source) ? this.data.source : 'SYSTEM';
      const query = `sender=${encodeURIComponent(source)}&read=${encodeURIComponent(this.data.read)}` + (this.data.role === 'REPAIRER' && this.data.buildingId ? `&building=${encodeURIComponent(this.data.buildingId)}` : '');
      const [items, unread] = await Promise.all([request(`/messages?${query}`), request('/messages/unread-count')]);
      const app = getApp(); app.globalData.unreadCount = Number(unread.count) || 0;
      const pageCount = Math.max(1, Math.ceil(items.length / this.data.pageSize));
      const page = Math.min(this.data.page, pageCount);
      this.setData({ items, page, pageCount, pageItems: items.slice((page - 1) * this.data.pageSize, page * this.data.pageSize), unread: app.globalData.unreadCount, source, sourceOptions: sourceOptions.map(([key, label]) => ({ key, label, selected: key === source })) });
      if (['ADMIN', 'DORM_MANAGER'].includes(this.data.role)) this.setData({ buildings: (await request('/buildings')).map(item => ({ ...item, selected: true })) });
      else if (this.data.role === 'REPAIRER') this.setData({ buildings: await request('/buildings') });
    } catch (error) { showError(error); } finally { this.setData({ loading: false }); }
  },
  async open(e) {
    const item = e.currentTarget.dataset.item;
    if (item.is_recipient && !item.read_at) {
      try {
        await request(`/messages/${item.message_id}/read`, { method: 'POST' });
        item.read_at = 'read';
        const items = this.data.read === 'unread' ? this.data.items.filter(row => row.message_id !== item.message_id) : this.data.items;
        const pageCount = Math.max(1, Math.ceil(items.length / this.data.pageSize)), page = Math.min(this.data.page, pageCount);
        this.setData({ items, page, pageCount, pageItems: items.slice((page - 1) * this.data.pageSize, page * this.data.pageSize) });
        await this.refreshUnread();
      } catch (error) { showError(error); }
    }
    this.setData({ detail: item });
  },
  closeDetail() { this.setData({ detail: null }); },
  chooseSource(e) { this.setData({ source: e.currentTarget.dataset.key, page: 1 }); this.load(); },
  chooseRead(e) { this.setData({ read: e.currentTarget.dataset.key, page: 1 }); this.load(); },
  chooseBuilding(e) { this.setData({ buildingId: String(this.data.buildings[Number(e.detail.value)]?.building_id || ''), page: 1 }); this.load(); },
  changePage(e) {
    const page = this.data.page + Number(e.currentTarget.dataset.delta);
    if (page < 1 || page > this.data.pageCount) return;
    this.setData({ page, pageItems: this.data.items.slice((page - 1) * this.data.pageSize, page * this.data.pageSize) });
  },
  refreshUnread() { return request('/messages/unread-count').then(result => { const unread = Number(result.count) || 0; getApp().globalData.unreadCount = unread; this.setData({ unread }); }); },
  async readAll() {
    const ids = this.data.items.filter(item => !item.read_at && item.is_recipient).map(item => item.message_id);
    if (!ids.length) return;
    try { await request('/messages/read', { method: 'POST', data: { ids } }); wx.showToast({ title: '已全部标为已读' }); this.load(); } catch (error) { showError(error); }
  },
  openPublish() { this.setData({ publishing: true, selectedBuildings: this.data.buildings.map(item => item.building_id), form: { title: '', content: '', targetRole: this.data.role === 'ADMIN' ? 'STUDENT' : 'STUDENT' }, files: [], fileIds: [] }); },
  closePublish() { this.setData({ publishing: false }); },
  input(e) { this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  target(e) { this.setData({ 'form.targetRole': e.currentTarget.dataset.value }); },
  selectBuildings(e) { const selectedBuildings = e.detail.value.map(Number); this.setData({ selectedBuildings, buildings: this.data.buildings.map(item => ({ ...item, selected: selectedBuildings.includes(Number(item.building_id)) })) }); },
  async chooseFiles() {
    try {
      const paths = await new Promise((resolve, reject) => wx.chooseMessageFile({ count: 8 - this.data.files.length, type: 'file', success: result => resolve(result.tempFiles.map(item => item.path)), fail: reject }));
      this.setData({ files: [...this.data.files, ...paths].slice(0, 8) });
    } catch (error) { if (!error.errMsg?.includes('cancel')) showError(error); }
  },
  async publish() {
    const { form, selectedBuildings, files } = this.data;
    if (!form.title.trim() || !form.content.trim() || !selectedBuildings.length) { wx.showToast({ title: '请填写标题、正文并选择楼栋', icon: 'none' }); return; }
    wx.showLoading({ title: '正在发布' });
    try {
      const attachmentIds = await Promise.all(files.map(path => uploadMessage(path)));
      await request('/messages', { method: 'POST', data: { title: form.title.trim(), content: form.content.trim(), targetRole: form.targetRole, buildingIds: selectedBuildings, attachmentIds } });
      wx.showToast({ title: '通知已发布' }); this.setData({ publishing: false }); this.load();
    } catch (error) { showError(error); } finally { wx.hideLoading(); }
  },
  preview(file) {
    wx.downloadFile({ url: `${require('../../utils/config').baseUrl}/files/${file.file_id}`, header: { Authorization: `Bearer ${getSession().token}` }, success: result => { if (file.content_type && file.content_type.startsWith('image/')) wx.previewImage({ urls: [result.tempFilePath] }); else wx.openDocument({ filePath: result.tempFilePath, showMenu: true }); }, fail: () => wx.showToast({ title: '附件暂时无法预览', icon: 'none' }) });
  }
});
