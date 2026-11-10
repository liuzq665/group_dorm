const { request, showError, getSession } = require('../../utils/request');
const { statusText, statusClass } = require('../../utils/format');

Page({
  data: { loading: true, role: '', batches: [], applications: [], students: [], batchForm: null, supplementForm: null, filter: 'all' },
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
      const [batches, applications] = await Promise.all([request('/stay/current'), request('/stay/applications')]);
      const items = applications.map(item => ({ ...item, statusLabel: statusText(item.current_status), statusStyle: statusClass(item.current_status), dateRangeText: (item.dateRanges || []).map(range => `${range.startDate || range.start_date} 至 ${range.endDate || range.end_date}`).join('、'), canReview: ['DORM_MANAGER', 'ADMIN'].includes(this.data.role) && (this.data.role === 'ADMIN' ? ['PENDING_REVIEW', 'UNDER_REVIEW'].includes(item.current_status) : item.current_status === 'UNDER_REVIEW') }));
      this.setData({ batches, applications: items });
      if (this.data.role === 'ADMIN') this.setData({ students: await request('/admin/users?roleCode=STUDENT&accommodation=ASSIGNED&enabled=true') });
      else if (this.data.role === 'DORM_MANAGER') this.setData({ students: (await request('/accommodations/current')).map(item => ({ user_id: item.student_id, real_name: item.student_name, student_no: item.student_no, building_name: item.building_name, room_no: item.room_no })) });
    } catch (error) { showError(error); } finally { this.setData({ loading: false }); }
  },
  apply(e) { wx.navigateTo({ url: `/pages/stay-form/index?batchId=${e.currentTarget.dataset.id}` }); },
  detail(e) { wx.navigateTo({ url: `/pages/stay-detail/index?id=${e.currentTarget.dataset.id}` }); },
  async lock(e) {
    const id = e.currentTarget.dataset.id;
    try { await request(`/stay/applications/${id}/lock`, { method: 'POST', data: { locked: true } }); wx.showToast({ title: '申请已进入审核' }); this.load(); } catch (error) { showError(error); }
  },
  async review(e) {
    const id = e.currentTarget.dataset.id;
    const pass = await new Promise(resolve => wx.showActionSheet({ itemList: ['审核通过', '退回修改'], success: result => resolve(result.tapIndex === 0), fail: () => resolve(null) }));
    if (pass === null) return;
    const reason = await this.prompt(pass ? '审核通过' : '退回修改', pass ? '审核意见（可留空）' : '请填写退回原因');
    if (reason === null || (!pass && !reason.trim())) return;
    let resubmitDeadline;
    if (!pass) {
      resubmitDeadline = await this.prompt('设置重交截止时间', '格式：YYYY-MM-DD HH:mm:ss');
      if (resubmitDeadline === null || !resubmitDeadline.trim()) return;
    }
    try {
      await request(`/stay/applications/${id}/review`, { method: 'POST', data: { pass, reason: reason.trim(), ...(resubmitDeadline ? { resubmitDeadline: resubmitDeadline.trim().replace(' ', 'T') } : {}) } });
      wx.showToast({ title: pass ? '申请已通过' : '已退回修改' }); this.load();
    } catch (error) { showError(error); }
  },
  prompt(title, placeholder) { return new Promise(resolve => wx.showModal({ title, editable: true, placeholderText: placeholder, success: result => resolve(result.confirm ? result.content || '' : null) })); },
  openBatchForm() { this.setData({ batchForm: { batchCode: '', batchName: '', academicYear: String(new Date().getFullYear()), vacationType: 'SUMMER', openStartDate: '', openEndDate: '', applicationDeadline: '', instructions: '' } }); },
  closeBatchForm() { this.setData({ batchForm: null }); },
  batchInput(e) { this.setData({ [`batchForm.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  batchDate(e) { this.setData({ [`batchForm.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  vacation(e) { this.setData({ 'batchForm.vacationType': e.currentTarget.dataset.value }); },
  async saveBatch() {
    const form = this.data.batchForm;
    if (!form.batchCode || !form.batchName || !form.academicYear || !form.openStartDate || !form.openEndDate || !form.applicationDeadline || !form.instructions) { wx.showToast({ title: '请填写完整批次信息', icon: 'none' }); return; }
    try { await request('/stay/batches', { method: 'POST', data: { ...form, academicYear: Number(form.academicYear), applicationDeadline: `${form.applicationDeadline}T23:00:00` } }); wx.showToast({ title: '留宿批次已保存' }); this.setData({ batchForm: null }); this.load(); } catch (error) { showError(error); }
  },
  async publishBatch(e) {
    const id = e.currentTarget.dataset.id;
    const batch = this.data.batches.find(item => String(item.batch_id) === String(id));
    try { await request(`/stay/batches/${id}/publish`, { method: 'POST', data: { applicationDeadline: `${batch.application_deadline}T23:00:00`.slice(0, 19), autoLock: true } }); wx.showToast({ title: '批次已开放' }); this.load(); } catch (error) { showError(error); }
  },
  openSupplement(e) { this.setData({ supplementForm: { batchId: String(e.currentTarget.dataset.id), studentId: '', studentIndex: 0, reason: '', startDate: '', endDate: '' } }); },
  chooseSupplementStudent(e) { const student = this.data.students[Number(e.detail.value)]; this.setData({ 'supplementForm.studentId': String(student.user_id), 'supplementForm.studentIndex': Number(e.detail.value) }); },
  closeSupplement() { this.setData({ supplementForm: null }); },
  supplementInput(e) { this.setData({ [`supplementForm.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  supplementDate(e) { this.setData({ [`supplementForm.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  async saveSupplement() {
    const form = this.data.supplementForm;
    if (!form.studentId || !form.reason || !form.startDate || !form.endDate) { wx.showToast({ title: '请填写学生、原因和留宿日期', icon: 'none' }); return; }
    try {
      await request('/stay/supplements', { method: 'POST', data: { batchId: Number(form.batchId), studentId: Number(form.studentId), reason: form.reason, dateRanges: [{ startDate: form.startDate, endDate: form.endDate }], fileIds: [] } });
      wx.showToast({ title: '已补录' }); this.setData({ supplementForm: null }); this.load();
    } catch (error) { showError(error); }
  },
  async uploadMaterial(e) {
    const batchId = e.currentTarget.dataset.id;
    try {
      const chosen = await new Promise((resolve, reject) => wx.chooseMessageFile({ count: 1, type: 'file', success: result => resolve(result.tempFiles[0].path), fail: reject }));
      const response = await new Promise((resolve, reject) => wx.uploadFile({ url: `${require('../../utils/config').baseUrl}/stay/batches/${batchId}/materials`, name: 'file', filePath: chosen, header: { Authorization: `Bearer ${getSession().token}` }, success: result => { try { const body = JSON.parse(result.data); body.code === 0 ? resolve(body.data) : reject(new Error(body.message)); } catch (error) { reject(error); } }, fail: reject }));
      wx.showToast({ title: `已上传 ${response.originalName || '材料'}` }); this.load();
    } catch (error) { if (!error.errMsg?.includes('cancel')) showError(error); }
  }
});
