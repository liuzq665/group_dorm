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
    form: { title: '', description: '' },
    files: [],
    existing: [],
    actionBusy: false
  },
  onLoad(query) {
    if (!getApp().requireStudent()) return;
    this.setData({ orderId: query.id || '', editing: !!query.id });
    this.load();
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
        form = { title: detail.title || '', description: detail.description || '' };
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
  category(event) {
    const index = Number(event.detail.value);
    this.setData({ categoryIndex: index, categoryName: this.data.categories[index]?.name || '', categoryChosen: true });
  },
  choose() {
    wx.chooseMedia({
      count: Math.max(1, 6 - this.data.files.length),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: result => {
        this.setData({ files: [...this.data.files, ...result.tempFiles.map(file => file.tempFilePath)].slice(0, 6) });
      }
    });
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
