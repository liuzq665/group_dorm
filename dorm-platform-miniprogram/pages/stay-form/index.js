const { request, upload, showError } = require('../../utils/request');
const { orDash, formatDate, statusText } = require('../../utils/format');
const { normalizeImage } = require('../../utils/image');

const stayUploadPath = '/stay/applications/files';

function emptyRange() {
  return { startDate: '', endDate: '' };
}

function validRanges(ranges, batch) {
  if (!ranges.length) return '请至少填写一段留宿日期';
  if (ranges.some(item => !item.startDate || !item.endDate || item.endDate < item.startDate)) {
    return '请填写有效的开始和结束日期（结束日期不能早于开始日期）';
  }
  const sorted = [...ranges].sort((left, right) => left.startDate.localeCompare(right.startDate));
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].startDate <= sorted[index - 1].endDate) return '留宿日期段不能重叠，共享边界日也不允许';
  }
  if (batch && batch.open_start_date && batch.open_end_date) {
    const openStart = String(batch.open_start_date).slice(0, 10);
    const openEnd = String(batch.open_end_date).slice(0, 10);
    for (const item of sorted) {
      if (item.startDate < openStart || item.endDate > openEnd) {
        return `留宿日期须落在开放区间 ${openStart} 至 ${openEnd} 内`;
      }
    }
  }
  return '';
}

Page({
  data: {
    loading: true,
    batchId: '',
    applicationId: '',
    application: null,
    batch: null,
    reason: '',
    ranges: [emptyRange()],
    files: [],
    existing: [],
    batchInfo: {},
    deadlineLabel: '',
    locked: false,
    lockedHint: '',
    lockedApplicationId: '',
    actionBusy: false
  },
  onLoad(query) {
    if (!getApp().requireStudent()) return;
    this.setData({ batchId: query.batchId || '', applicationId: query.applicationId || '' });
    this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const [batches, applications] = await Promise.all([request('/stay/current'), request('/stay/applications')]);
      const application = this.data.applicationId
        ? applications.find(row => String(row.application_id) === String(this.data.applicationId))
        : applications.find(row => String(row.batch_id) === String(this.data.batchId) && ['DRAFT', 'PENDING_EDIT'].includes(row.current_status));
      const batchId = String(this.data.batchId || (application || {}).batch_id || '');
      const batch = batches.find(row => String(row.batch_id) === batchId) || null;
      // 同一批次已经提交/审核的申请不能再修改：先拦在页面上，避免用户选图上传后才被服务端拒绝（附件会变成无人引用的孤儿）
      const sameBatch = batchId ? applications.find(row => String(row.batch_id) === batchId) : null;
      const locked = !!sameBatch && !['DRAFT', 'PENDING_EDIT'].includes(sameBatch.current_status);
      this.setData({
        batchId,
        application: application || null,
        batch,
        locked,
        lockedApplicationId: locked ? sameBatch.application_id : '',
        lockedHint: locked ? `本批次已有申请（状态：${statusText(sameBatch.current_status)}），不能再修改或新增。请到留宿详情查看进度。` : '',
        reason: application?.reason || '',
        ranges: application?.dateRanges?.length
          ? application.dateRanges.map(item => ({ startDate: item.startDate || item.start_date, endDate: item.endDate || item.end_date }))
          : [emptyRange()],
        existing: (application?.attachments || []).map(file => ({ ...file })),
        batchInfo: batch
          ? {
              name: orDash(batch.batch_name),
              openRange: `${formatDate(batch.open_start_date)} 至 ${formatDate(batch.open_end_date)}`,
              instructions: orDash(batch.instructions)
            }
          : {},
        deadlineLabel: batch?.student_deadline
          ? `本人楼栋申请截止：${formatDate(batch.student_deadline)}${batch.auto_lock ? '（截止后自动锁定进入审核）' : ''}`
          : ''
      });
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  reasonInput(event) {
    this.setData({ reason: event.detail.value });
  },
  date(event) {
    const { index, key } = event.currentTarget.dataset;
    const ranges = this.data.ranges.map((item, position) => (position === Number(index) ? { ...item, [key]: event.detail.value } : item));
    this.setData({ ranges });
  },
  addRange() {
    this.setData({ ranges: [...this.data.ranges, emptyRange()] });
  },
  removeRange(event) {
    const ranges = this.data.ranges.filter((item, index) => index !== Number(event.currentTarget.dataset.index));
    this.setData({ ranges: ranges.length ? ranges : [emptyRange()] });
  },
  removeExisting(event) {
    const existing = this.data.existing.filter((item, index) => index !== Number(event.currentTarget.dataset.index));
    this.setData({ existing });
  },
  removeFile(event) {
    const files = this.data.files.filter((item, index) => index !== Number(event.currentTarget.dataset.index));
    this.setData({ files });
  },
  choose() {
    wx.showActionSheet({
      itemList: ['选择图片', '选择文档或其他文件'],
      success: choice => {
        if (choice.tapIndex === 0) {
          wx.chooseMedia({
            count: 8,
            mediaType: ['image'],
            success: async result => {
              const picked = Array.isArray(result.tempFiles) ? result.tempFiles : [];
              if (!picked.length) { this.photoError('没有获取到图片，请重新选择'); return; }
              try {
                const paths = await Promise.all(picked.map(file => this.normalizeImage(file.tempFilePath)));
                const base = this.data.files;
                const added = paths.map((path, index) => ({ path, name: `照片${base.length + index + 1}` }));
                this.setData({ files: [...base, ...added].slice(0, 8) });
              } catch (error) {
                this.photoError(error?.errMsg || error?.message || '图片处理失败');
              }
            },
            fail: error => { if (!/cancel/i.test(error?.errMsg || '')) this.photoError(error?.errMsg || '选择图片失败'); }
          });
        } else {
          wx.chooseMessageFile({
            count: 8,
            type: 'file',
            success: async result => {
              const picked = Array.isArray(result.tempFiles) ? result.tempFiles : [];
              if (!picked.length) { this.photoError('没有获取到文件，请重新选择'); return; }
              try {
                const base = this.data.files;
                const added = await Promise.all(picked.map(async (file, index) => {
                  const isImage = /\.(png|jpe?g|gif|webp|bmp|avif|heic|heif)$/i.test(file.name);
                  return {
                    path: isImage ? await this.normalizeImage(file.path) : file.path,
                    name: isImage ? `照片${base.length + index + 1}` : (file.name || `附件${base.length + index + 1}`)
                  };
                }));
                this.setData({ files: [...base, ...added].slice(0, 8) });
              } catch (error) {
                this.photoError(error?.errMsg || error?.message || '文件处理失败');
              }
            },
            fail: error => { if (!/cancel/i.test(error?.errMsg || '')) this.photoError(error?.errMsg || '选择文件失败'); }
          });
        }
      }
    });
  },
  /** 选文件失败必须让用户确认，否则材料没选上却以为已上传，提交后两端都看不到附件 */
  photoError(message) {
    wx.showModal({ title: '材料未能加入', content: `${message}。请重新选择后再保存。`, showCancel: false });
  },
  backToDetail() {
    if (this.data.lockedApplicationId) { wx.redirectTo({ url: `/pages/stay-detail/index?id=${this.data.lockedApplicationId}` }); return; }
    wx.navigateBack();
  },
  normalizeImage(filePath) {
    return normalizeImage(filePath, 'stay');
  },
  async save(event) {
    if (this.data.locked) { wx.showToast({ title: '本批次已有申请，不能再修改', icon: 'none' }); return; }
    const submit = event.currentTarget.dataset.submit === 'true';
    const message = validRanges(this.data.ranges, this.data.batch);
    if (message) { wx.showToast({ title: message, icon: 'none' }); return; }
    if (!this.data.reason.trim()) { wx.showToast({ title: '请填写留宿原因', icon: 'none' }); return; }
    if (submit && !this.data.existing.length && !this.data.files.length) {
      wx.showToast({ title: '提交审核前请至少上传一份申请材料', icon: 'none' });
      return;
    }
    if (this.data.actionBusy) return;
    this.setData({ actionBusy: true });
    wx.showLoading({ title: '正在保存' });
    try {
      const uploaded = await Promise.all(this.data.files.map(file => (typeof file === 'string' ? upload(file, stayUploadPath) : upload(file.path, stayUploadPath, file.name))));
      const fileIds = [...this.data.existing.map(file => Number(file.file_id)), ...uploaded];
      const saved = await request('/stay/applications', {
        method: 'POST',
        data: { batchId: Number(this.data.batchId), reason: this.data.reason.trim(), dateRanges: this.data.ranges, fileIds }
      });
      if (submit) await request(`/stay/applications/${saved.applicationId}/submit`, { method: 'POST' });
      wx.showToast({ title: submit ? '已提交审核' : '草稿已保存' });
      setTimeout(() => wx.redirectTo({ url: `/pages/stay-detail/index?id=${saved.applicationId}` }), 600);
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
      wx.hideLoading();
    }
  }
});
