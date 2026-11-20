const { request, upload, showError } = require('../../utils/request');
const { orDash } = require('../../utils/format');

Page({
  data: {
    loading: true,
    editing: false,
    orderId: '',
    categories: [],
    categoryIndex: 0,
    categoryName: '',
    categoryChosen: false,
    form: { title: '', description: '', urgent: false },
    files: [],
    existing: [],
    actionBusy: false
  },
  onLoad(query) {
    if (!getApp().requireStudent()) return;
    this.setData({ orderId: query.id || '', editing: !!query.id });
    this.checkAccommodation();
    this.load();
  },
  /** 未分配宿舍的学生创建工单会失败，进页面前先拦下并给出可执行提示 */
  async checkAccommodation() {
    if (this.data.editing) return;
    try {
      const homes = await request('/accommodations/current');
      // The API returns the current accommodation as a list, even for a student.
      // Accept a single object as well to remain compatible with older responses.
      const home = Array.isArray(homes) ? homes[0] : homes;
      const assigned = home && home.room_id;
      if (!assigned) {
        wx.showModal({
          title: '尚未分配宿舍',
          content: '你还没有宿舍床位，报修工单无法定位房间。请先联系宿管或管理员分配床位后再报修。',
          showCancel: false,
          success: () => wx.navigateBack()
        });
      }
    } catch (error) {
      showError(error);
    }
  },
  async load() {
    this.setData({ loading: true });
    try {
      const catalog = await request('/repair-catalog');
      const categories = catalog.categories || [];
      let form = { ...this.data.form };
      let existing = [];
      let categoryId = '';
      if (this.data.editing) {
        const detail = await request(`/repair-orders/${this.data.orderId}`);
        form = { title: detail.title || '', description: detail.description || '', urgent: !!detail.urgent };
        categoryId = String(detail.category_id || '');
        existing = (detail.files || []).filter(file => file.purpose === 'FAULT');
      }
      const categoryIndex = Math.max(0, categories.findIndex(item => String(item.id) === String(categoryId)));
      this.setData({
        categories,
        categoryIndex,
        categoryName: this.data.editing ? categories[categoryIndex]?.name || '' : '',
        categoryChosen: this.data.editing,
        form,
        existing
      });
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  input(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  urgentChange(event) { this.setData({ 'form.urgent': !!event.detail.value }); },
  category(event) {
    const index = Number(event.detail.value);
    this.setData({ categoryIndex: index, categoryName: this.data.categories[index]?.name || '', categoryChosen: true });
  },
  choose() {
    wx.chooseMedia({
      count: Math.max(1, 6 - this.data.files.length),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async result => {
        try {
          const paths = await Promise.all(result.tempFiles.map(file => this.normalizeImage(file.tempFilePath)));
          this.setData({ files: [...this.data.files, ...paths].slice(0, 6) });
        } catch (error) {
          wx.showToast({ title: '图片处理失败，请重新选择', icon: 'none' });
        }
      }
    });
  },
  normalizeImage(filePath) {
    return new Promise((resolve, reject) => wx.compressImage({
      src: filePath,
      quality: 85,
      success: result => {
        const fs = wx.getFileSystemManager();
        const normalizedPath = `${wx.env.USER_DATA_PATH}/repair-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;
        fs.copyFile({ srcPath: result.tempFilePath, destPath: normalizedPath, success: () => resolve(normalizedPath), fail: reject });
      },
      fail: reject
    }));
  },
  removeFile(event) {
    const files = this.data.files.filter((item, index) => index !== Number(event.currentTarget.dataset.index));
    this.setData({ files });
  },
  async save(event) {
    if (this.data.actionBusy) return;
    const submitNow = event.currentTarget.dataset.submit === 'true';
    const { form, files, editing, orderId, categoryIndex, categories, categoryChosen } = this.data;
    const category = categories[categoryIndex];
    if (!categoryChosen || !category) { wx.showToast({ title: '请选择故障分类', icon: 'none' }); return; }
    if (!form.title.trim()) { wx.showToast({ title: '请填写报修标题', icon: 'none' }); return; }
    if (!form.description.trim()) { wx.showToast({ title: '请填写故障位置与说明', icon: 'none' }); return; }
    this.setData({ actionBusy: true });
    wx.showLoading({ title: '正在保存' });
    try {
      const fileIds = await Promise.all(files.map(filePath => upload(filePath)));
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: Number(category.id),
        urgent: !!form.urgent,
        fileIds
      };
      let id = orderId;
      if (editing) {
        await request(`/repair-orders/${id}`, { method: 'PUT', data: payload });
      } else {
        const created = await request('/repair-orders', { method: 'POST', data: payload });
        id = created.orderId;
      }
      if (submitNow) await request(`/repair-orders/${id}/submit`, { method: 'POST' });
      wx.showToast({ title: submitNow ? '已提交审核' : '草稿已保存' });
      setTimeout(() => wx.redirectTo({ url: `/pages/repair-detail/index?id=${id}` }), 600);
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
      wx.hideLoading();
    }
  }
});
