const { request, upload, showError } = require('../../utils/request');
const { orDash } = require('../../utils/format');
const { normalizeImage } = require('../../utils/image');

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
        const picked = Array.isArray(result.tempFiles) ? result.tempFiles : [];
        if (!picked.length) { this.photoError('没有获取到图片，请重新选择'); return; }
        try {
          const paths = await Promise.all(picked.map(file => this.normalizeImage(file.tempFilePath)));
          const base = this.data.files;
          const added = paths.map((path, index) => ({ path, name: `现场照片${base.length + index + 1}` }));
          const files = [...base, ...added].slice(0, 6);
          this.setData({ files });
        } catch (error) {
          this.photoError(error?.errMsg || error?.message || '图片处理失败');
        }
      },
      fail: error => { if (!/cancel/i.test(error?.errMsg || '')) this.photoError(error?.errMsg || '选择图片失败'); }
    });
  },
  /** 选图失败必须让用户确认，否则照片没选上却以为已上传，提交后两端都看不到附件 */
  photoError(message) {
    wx.showModal({ title: '照片未能加入', content: `${message}。请重新选择照片后再保存。`, showCancel: false });
  },
  normalizeImage(filePath) {
    return normalizeImage(filePath, 'repair');
  },
  /** 无图提交前确认：返回 true 表示继续提交，false 表示先去选图 */
  confirmWithoutPhoto() {
    return new Promise(resolve => {
      wx.showModal({
        title: '还没有现场照片',
        content: '当前没有添加现场照片，直接提交后维修人员只能看到文字描述。确定继续提交吗？',
        confirmText: '继续提交',
        cancelText: '去选照片',
        success: result => resolve(!!result.confirm),
        fail: () => resolve(false)
      });
    });
  },
  removeFile(event) {
    const files = this.data.files.filter((item, index) => index !== Number(event.currentTarget.dataset.index));
    this.setData({ files });
  },
  async save(event) {
    if (this.data.actionBusy) return;
    const submitNow = event.currentTarget.dataset.submit === 'true';
    const { form, files, existing, editing, orderId, categoryIndex, categories, categoryChosen } = this.data;
    const category = categories[categoryIndex];
    if (!categoryChosen || !category) { wx.showToast({ title: '请选择故障分类', icon: 'none' }); return; }
    if (!form.title.trim()) { wx.showToast({ title: '请填写报修标题', icon: 'none' }); return; }
    if (!form.description.trim()) { wx.showToast({ title: '请填写故障位置与说明', icon: 'none' }); return; }
    // 不阻止无图提交，但必须让用户明确确认，避免“以为传了照片其实没传”的静默成功
    if (!files.length && !existing.length) {
      const confirmed = await this.confirmWithoutPhoto();
      if (!confirmed) { this.choose(); return; }
    }
    this.setData({ actionBusy: true });
    wx.showLoading({ title: '正在保存' });
    try {
      const fileIds = await Promise.all(files.map(file => upload(typeof file === 'string' ? file : file.path)));
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
