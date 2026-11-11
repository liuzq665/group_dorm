const { request, showError, getSession } = require('../../utils/request');
const { statusText, statusTone, orDash, formatDate, formatDateTime } = require('../../utils/format');
const { paginate, stepPage } = require('../../utils/pager');

const TABS = {
  STUDENT: [
    { key: 'all', label: '全部' },
    { key: 'draft', label: '草稿', statuses: ['DRAFT'] },
    { key: 'review', label: '待审核', statuses: ['PENDING_REVIEW'] },
    { key: 'under', label: '审核中', statuses: ['UNDER_REVIEW'] },
    { key: 'edit', label: '待修改', statuses: ['PENDING_EDIT'] },
    { key: 'approved', label: '已通过', statuses: ['APPROVED', 'COMPLETED'] },
    { key: 'history', label: '历史记录', statuses: ['ARCHIVED', 'CLOSED'] }
  ],
  DORM_MANAGER: [
    { key: 'all', label: '全部' },
    { key: 'review', label: '待审核', statuses: ['PENDING_REVIEW'] },
    { key: 'under', label: '审核中', statuses: ['UNDER_REVIEW'] },
    { key: 'edit', label: '待修改', statuses: ['PENDING_EDIT'] },
    { key: 'approved', label: '已通过', statuses: ['APPROVED', 'COMPLETED'] },
    { key: 'history', label: '历史记录', statuses: ['ARCHIVED', 'CLOSED'] }
  ],
  ADMIN: [
    { key: 'all', label: '全部' },
    { key: 'review', label: '待审核', statuses: ['PENDING_REVIEW'] },
    { key: 'under', label: '审核中', statuses: ['UNDER_REVIEW'] },
    { key: 'edit', label: '待修改', statuses: ['PENDING_EDIT'] },
    { key: 'approved', label: '已通过', statuses: ['APPROVED', 'COMPLETED'] },
    { key: 'history', label: '历史记录', statuses: ['ARCHIVED', 'CLOSED'] }
  ]
};

Page({
  data: {
    loading: true,
    role: '',
    batches: [],
    applications: [],
    filtered: [],
    pageItems: [],
    page: 1,
    pageCount: 1,
    pageSize: 10,
    pager: { page: 1, pages: 1, total: 0, size: 10 },
    tabs: [],
    tab: 'all',
    batchOptions: [{ batch_id: '', batch_name: '全部批次' }],
    batchIndex: 0,
    batchId: '',
    emptyView: { title: '暂无留宿申请', tip: '' },
    batchEmptyView: { title: '当前没有可申请或管理的留宿批次', tip: '批次开放后可在本页提交申请' },
    batchForm: null,
    supplementForm: null,
    students: [],
    actionBusy: false
  },
  onShow() {
    const role = getSession()?.user?.role;
    if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'ADMIN'])) {
      this.setData({ role, tabs: (TABS[role] || TABS.STUDENT).map(item => ({ ...item, selected: item.key === this.data.tab })) });
      this.load();
    }
    this.refreshTabBar();
  },
  /** 刷新自定义 tabBar 选中态，确保当前页高亮与角色一致 */
  refreshTabBar() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar && typeof tabBar.refresh === 'function') tabBar.refresh();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const role = this.data.role;
      const [batches, applications] = await Promise.all([request('/stay/current'), request('/stay/applications')]);
      const items = (applications || []).map(item => this.decorate(item, role));
      const batchOptions = [{ batch_id: '', batch_name: '全部批次' }, ...batches.map(item => ({ batch_id: String(item.batch_id), batch_name: item.batch_name }))];
      const batchViews = batches.map(batch => {
        const application = items.find(item => String(item.batch_id) === String(batch.batch_id));
        return {
          ...batch,
          applied: !!application,
          applied_status: application ? application.statusLabel : '',
          applied_application_id: application ? application.application_id : '',
          applied_editable: !!application && ['DRAFT', 'PENDING_EDIT'].includes(application.current_status),
          deadlineText: batch.student_deadline
            ? formatDateTime(batch.student_deadline)
            : batch.application_deadline ? formatDateTime(batch.application_deadline) : '-',
          materials: (batch.materials || []).map(material => ({ ...material }))
        };
      });
      this.setData({ batches: batchViews, applications: items, batchOptions, batchIndex: 0, batchId: '' });
      this.applyFilter(1);
      if (role === 'ADMIN') this.setData({ students: await request('/admin/users?roleCode=STUDENT&accommodation=ASSIGNED&enabled=true') });
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  decorate(item, role) {
    const status = item.current_status;
    const dateRanges = item.dateRanges || [];
    return {
      ...item,
      statusLabel: statusText(status),
      statusTone: statusTone(status),
      dateRangeText: dateRanges.length
        ? dateRanges.map(range => `${range.startDate || range.start_date} 至 ${range.endDate || range.end_date}`).join('、')
        : '尚未填写日期',
      reasonText: orDash(item.reason),
      reviewText: orDash(item.review_reason),
      majorLabel: orDash(item.major_name),
      classLabel: orDash(item.class_name),
      updatedLabel: formatDateTime(item.updated_at),
      resubmitText: item.resubmit_deadline ? formatDate(item.resubmit_deadline) : '-',
      attachments: item.attachments || [],
      canEdit: role === 'STUDENT' && ['DRAFT', 'PENDING_EDIT'].includes(status) && !item.resubmit_deadline,
      canWithdraw: role === 'STUDENT' && status === 'PENDING_REVIEW',
      canDetail: true,
      canLock: role === 'DORM_MANAGER' && status === 'PENDING_REVIEW',
      canReview: ['DORM_MANAGER', 'ADMIN'].includes(role) && ['PENDING_REVIEW', 'UNDER_REVIEW'].includes(status),
      deadlines: item.student_deadline ? formatDate(item.student_deadline) : ''
    };
  },
  applyFilter(page) {
    const definition = (TABS[this.data.role] || TABS.STUDENT).find(item => item.key === this.data.tab) || { key: 'all' };
    const batchId = this.data.batchId;
    let items = this.data.applications;
    if (batchId) items = items.filter(row => String(row.batch_id) === String(batchId));
    if (definition.statuses) items = items.filter(row => definition.statuses.includes(row.current_status));
    const view = paginate(items, page, this.data.pageSize);
    this.setData({
      filtered: items,
      page: view.page,
      pageCount: view.pageCount,
      pageItems: view.items,
      pager: { page: view.page, pages: view.pageCount, total: view.total, size: view.pageSize },
      emptyView: {
        title: items.length ? '' : `当前分类暂无${definition.label}申请`,
        tip: items.length ? '' : '可切换分类或批次后重试'
      }
    });
  },
  chooseTab(event) {
    const tab = event.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    this.setData({
      tab,
      page: 1,
      tabs: (TABS[this.data.role] || TABS.STUDENT).map(item => ({ ...item, selected: item.key === tab }))
    });
    this.applyFilter(1);
  },
  chooseBatch(event) {
    const index = Number(event.detail.value);
    this.setData({ batchIndex: index, batchId: this.data.batchOptions[index]?.batch_id || '', page: 1 });
    this.applyFilter(1);
  },
  changePage(event) {
    const page = stepPage(this.data.page, this.data.pageCount, event.currentTarget.dataset.delta);
    if (page === this.data.page) return;
    this.applyFilter(page);
  },
  apply(event) {
    wx.navigateTo({ url: `/pages/stay-form/index?batchId=${event.currentTarget.dataset.id}` });
  },
  openApplication(event) {
    wx.navigateTo({ url: `/pages/stay-detail/index?id=${event.currentTarget.dataset.id}` });
  },
  detail(event) {
    wx.navigateTo({ url: `/pages/stay-detail/index?id=${event.currentTarget.dataset.id}` });
  },
  async lock(event) {
    const id = event.currentTarget.dataset.id;
    try {
      await request(`/stay/applications/${id}/lock`, { method: 'POST', data: { locked: true } });
      wx.showToast({ title: '申请已进入审核' });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  async review(event) {
    const id = event.currentTarget.dataset.id;
    const pass = await new Promise(resolve => wx.showActionSheet({
      itemList: ['审核通过', '退回修改'],
      success: result => resolve(result.tapIndex === 0),
      fail: () => resolve(null)
    }));
    if (pass === null) return;
    const reason = await this.prompt(pass ? '审核通过' : '退回修改', pass ? '审核意见（可留空）' : '请填写退回原因');
    if (reason === null || (!pass && !reason.trim())) return;
    let resubmitDeadline;
    if (!pass) {
      resubmitDeadline = await this.prompt('设置重交截止时间', '格式：YYYY-MM-DD HH:mm:ss');
      if (resubmitDeadline === null || !resubmitDeadline.trim()) return;
    }
    try {
      await request(`/stay/applications/${id}/review`, {
        method: 'POST',
        data: { pass, reason: reason.trim(), ...(resubmitDeadline ? { resubmitDeadline: resubmitDeadline.trim().replace(' ', 'T') } : {}) }
      });
      wx.showToast({ title: pass ? '申请已通过' : '已退回修改' });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  prompt(title, placeholder) {
    return new Promise(resolve => wx.showModal({
      title,
      editable: true,
      placeholderText: placeholder,
      success: result => resolve(result.confirm ? result.content || '' : null)
    }));
  },
  openBatchForm() {
    this.setData({
      batchForm: {
        batchCode: '',
        batchName: '',
        academicYear: String(new Date().getFullYear()),
        vacationType: 'SUMMER',
        openStartDate: '',
        openEndDate: '',
        applicationDeadline: '',
        instructions: ''
      }
    });
  },
  closeBatchForm() {
    this.setData({ batchForm: null });
  },
  batchInput(event) {
    this.setData({ [`batchForm.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  batchDate(event) {
    this.setData({ [`batchForm.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  vacation(event) {
    this.setData({ 'batchForm.vacationType': event.currentTarget.dataset.value });
  },
  async saveBatch() {
    const form = this.data.batchForm;
    if (!form.batchCode || !form.batchName || !form.academicYear || !form.openStartDate || !form.openEndDate || !form.applicationDeadline || !form.instructions) {
      wx.showToast({ title: '请填写完整批次信息', icon: 'none' });
      return;
    }
    try {
      await request('/stay/batches', {
        method: 'POST',
        data: { ...form, academicYear: Number(form.academicYear), applicationDeadline: `${form.applicationDeadline}T23:00:00` }
      });
      wx.showToast({ title: '留宿批次已保存' });
      this.setData({ batchForm: null });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  async publishBatch(event) {
    const id = event.currentTarget.dataset.id;
    const batch = this.data.batches.find(item => String(item.batch_id) === String(id));
    try {
      await request(`/stay/batches/${id}/publish`, {
        method: 'POST',
        data: { applicationDeadline: `${batch.application_deadline}T23:00:00`.slice(0, 19), autoLock: true }
      });
      wx.showToast({ title: '批次已开放' });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  openSupplement(event) {
    this.setData({
      supplementForm: { batchId: String(event.currentTarget.dataset.id), studentId: '', studentIndex: 0, reason: '', startDate: '', endDate: '' }
    });
  },
  chooseSupplementStudent(event) {
    const student = this.data.students[Number(event.detail.value)];
    this.setData({ 'supplementForm.studentId': String(student.user_id), 'supplementForm.studentIndex': Number(event.detail.value) });
  },
  closeSupplement() {
    this.setData({ supplementForm: null });
  },
  supplementInput(event) {
    this.setData({ [`supplementForm.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  supplementDate(event) {
    this.setData({ [`supplementForm.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  async saveSupplement() {
    const form = this.data.supplementForm;
    if (!form.studentId || !form.reason || !form.startDate || !form.endDate) {
      wx.showToast({ title: '请填写学生、原因和留宿日期', icon: 'none' });
      return;
    }
    try {
      await request('/stay/supplements', {
        method: 'POST',
        data: {
          batchId: Number(form.batchId),
          studentId: Number(form.studentId),
          reason: form.reason,
          dateRanges: [{ startDate: form.startDate, endDate: form.endDate }],
          fileIds: []
        }
      });
      wx.showToast({ title: '已补录' });
      this.setData({ supplementForm: null });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  async uploadMaterial(event) {
    const batchId = event.currentTarget.dataset.id;
    try {
      const chosen = await new Promise((resolve, reject) => wx.chooseMessageFile({
        count: 1,
        type: 'file',
        success: result => resolve(result.tempFiles[0].path),
        fail: reject
      }));
      const response = await new Promise((resolve, reject) => wx.uploadFile({
        url: `${require('../../utils/config').baseUrl}/stay/batches/${batchId}/materials`,
        name: 'file',
        filePath: chosen,
        header: { Authorization: `Bearer ${getSession().token}` },
        success: result => {
          try {
            const body = JSON.parse(result.data);
            body.code === 0 ? resolve(body.data) : reject(new Error(body.message));
          } catch (error) {
            reject(error);
          }
        },
        fail: reject
      }));
      wx.showToast({ title: `已上传 ${response.originalName || '材料'}` });
      this.load();
    } catch (error) {
      if (!error.errMsg?.includes('cancel')) showError(error);
    }
  }
});
