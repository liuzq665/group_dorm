const { request, showError, getSession } = require('../../utils/request');
const { statusText, statusTone, ranges, orDash, formatDate, formatDateTime } = require('../../utils/format');
const { baseUrl } = require('../../utils/config');

Page({
  data: {
    loading: true,
    id: '',
    role: '',
    detail: null,
    rows: [],
    attachmentView: { files: [] },
    reviews: [],
    actionBusy: false
  },
  onLoad(query) {
    this.setData({ id: query.id });
  },
  onShow() {
    const role = getSession()?.user?.role;
    if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'ADMIN'])) {
      this.setData({ role });
      this.load();
    }
  },
  async load() {
    this.setData({ loading: true });
    try {
      const items = await request('/stay/applications');
      const detail = (items || []).find(row => String(row.application_id) === String(this.data.id));
      if (!detail) {
        this.setData({ detail: null });
        return;
      }
      const status = detail.current_status;
      const role = this.data.role;
      const attachments = (detail.attachments || []).map(file => ({ ...file }));
      this.setData({
        detail: {
          ...detail,
          statusLabel: statusText(status),
          statusTone: statusTone(status),
          dateRangeText: ranges(detail.dateRanges || []),
          canEdit: role === 'STUDENT' && ['DRAFT', 'PENDING_EDIT'].includes(status),
          canSubmit: role === 'STUDENT' && ['DRAFT', 'PENDING_EDIT'].includes(status),
          canWithdraw: role === 'STUDENT' && status === 'PENDING_REVIEW'
        },
        rows: [
          { label: '申请编号', value: orDash(detail.application_id) },
          { label: '留宿批次', value: orDash(detail.batch_name) },
          { label: '申请状态', value: orDash(statusText(status)) },
          { label: '住宿楼栋', value: orDash(detail.building_name) },
          { label: '留宿日期', value: ranges(detail.dateRanges || []) },
          { label: '留宿原因', value: orDash(detail.reason) },
          { label: '审核意见', value: orDash(detail.review_reason) },
          { label: '重交截止', value: detail.resubmit_deadline ? formatDateTime(detail.resubmit_deadline) : '-' },
          { label: '提交时间', value: formatDateTime(detail.updated_at) }
        ],
        attachmentView: { files: attachments },
        reviews: (detail.reviews || []).map(row => ({
          ...row,
          title: `${row.result === 'APPROVED' ? '审核通过' : '退回修改'} · ${orDash(row.reason)}`,
          timeLabel: orDash(row.reviewed_at)
        }))
      });
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  edit() {
    const detail = this.data.detail;
    wx.navigateTo({ url: `/pages/stay-form/index?batchId=${detail.batch_id}&applicationId=${detail.application_id}` });
  },
  async submit() {
    if (this.data.actionBusy) return;
    const confirmed = await new Promise(resolve => wx.showModal({
      title: '提交审核',
      content: '提交后进入宿管审核，审核前可撤回。确定提交吗？',
      success: result => resolve(result.confirm)
    }));
    if (!confirmed) return;
    this.setData({ actionBusy: true });
    try {
      await request(`/stay/applications/${this.data.id}/submit`, { method: 'POST' });
      wx.showToast({ title: '已提交审核' });
      await this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
    }
  },
  async withdraw() {
    const confirmed = await new Promise(resolve => wx.showModal({
      title: '撤回申请',
      content: '撤回后将回到草稿，可继续修改。确定撤回吗？',
      success: result => resolve(result.confirm)
    }));
    if (!confirmed) return;
    this.setData({ actionBusy: true });
    try {
      await request(`/stay/applications/${this.data.id}/withdraw`, { method: 'POST' });
      wx.showToast({ title: '已撤回' });
      await this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
    }
  },
  previewFile(event) {
    const file = event.currentTarget.dataset.file;
    if (!file) return;
    wx.downloadFile({
      url: `${baseUrl}/files/${file.file_id}`,
      header: { Authorization: `Bearer ${getSession().token}` },
      success: result => {
        if (file.content_type && file.content_type.startsWith('image/')) {
          wx.previewImage({ urls: [result.tempFilePath] });
        } else {
          wx.openDocument({ filePath: result.tempFilePath, showMenu: true, fail: () => wx.showToast({ title: '附件暂时无法预览', icon: 'none' }) });
        }
      },
      fail: () => wx.showToast({ title: '附件暂时无法预览', icon: 'none' })
    });
  }
});
