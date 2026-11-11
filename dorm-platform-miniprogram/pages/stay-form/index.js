const { request, upload, showError } = require('../../utils/request');
const { orDash, formatDate } = require('../../utils/format');

const stayUploadPath = '/stay/applications/files';

function emptyRange() {
  return { startDate: '', endDate: '' };
}

function validRanges(ranges) {
  if (!ranges.length) return '请至少填写一段留宿日期';
  if (ranges.some(item => !item.startDate || !item.endDate || item.endDate < item.startDate)) {
    return '请填写有效的开始和结束日期（结束日期不能早于开始日期）';
  }
  const sorted = [...ranges].sort((left, right) => left.startDate.localeCompare(right.startDate));
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].startDate <= sorted[index - 1].endDate) return '留宿日期段不能重叠，共享边界日也不允许';
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
      this.setData({
        batchId,
        application: application || null,
        batch,
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
            success: result => this.setData({ files: [...this.data.files, ...result.tempFiles.map(file => file.tempFilePath)].slice(0, 8) })
          });
        } else {
          wx.chooseMessageFile({
            count: 8,
            type: 'file',
            success: result => this.setData({ files: [...this.data.files, ...result.tempFiles.map(file => file.path)].slice(0, 8) })
          });
        }
      }
    });
  },
  async save(event) {
    const submit = event.currentTarget.dataset.submit === 'true';
    const message = validRanges(this.data.ranges);
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
      const uploaded = await Promise.all(this.data.files.map(filePath => upload(filePath, stayUploadPath)));
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
