const { request, showError, getSession } = require('../../utils/request');
const { statusText, statusTone, orDash, formatDate, formatDateTime } = require('../../utils/format');
const { paginate, stepPage } = require('../../utils/pager');
const { overlay } = require('../../utils/overlay');

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
    ruleForm: null,
    reviewForm: null,
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
    if (this.data.batchForm || this.data.ruleForm || this.data.reviewForm || this.data.supplementForm) overlay(this, true);
  },
  onHide() {
    // 选择材料文件时页面会短暂隐藏，不要清空正在填写的弹层
    if (this._pickingMedia) return;
    // 离开留宿页时关闭批次/补录弹层，并恢复底部导航
    this.setData({ batchForm: null, ruleForm: null, reviewForm: null, supplementForm: null });
    overlay(this, false);
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
      if (role === 'ADMIN' || role === 'DORM_MANAGER') this.setData({ students: await request('/admin/users?roleCode=STUDENT&accommodation=ASSIGNED&enabled=true') });
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  decorate(item, role) {
    const status = item.current_status;
    const deadlinePassed = !!item.resubmit_deadline && new Date(item.resubmit_deadline).getTime() <= Date.now();
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
      canEdit: role === 'STUDENT' && ['DRAFT', 'PENDING_EDIT'].includes(status) && !deadlinePassed,
      canWithdraw: role === 'STUDENT' && status === 'PENDING_REVIEW',
      canDetail: true,
      canLock: role === 'DORM_MANAGER' && status === 'PENDING_REVIEW',
      // 审核只给宿管：管理员与宿管职责重叠会让职能模糊，管理员端不出现审核入口
      canReview: role === 'DORM_MANAGER' && status === 'UNDER_REVIEW',
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
    // 默认重交截止：7 天后 23:59，可再通过日期/时间选择器调整
    const base = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    this.setData({
      reviewForm: {
        applicationId: id,
        pass,
        title: pass ? '审核通过' : '退回修改',
        reason: '',
        deadlineDate: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`,
        deadlineTime: '23:59'
      }
    });
    overlay(this, true);
  },
  closeReview() {
    this.setData({ reviewForm: null });
    overlay(this, false);
  },
  reviewInput(event) {
    this.setData({ [`reviewForm.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  reviewDate(event) {
    this.setData({ [`reviewForm.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  async saveReview() {
    const form = this.data.reviewForm;
    if (!form) return;
    const reason = (form.reason || '').trim();
    if (!form.pass && !reason) {
      wx.showToast({ title: '请填写退回原因', icon: 'none' });
      return;
    }
    let deadline = '';
    if (!form.pass) {
      if (!form.deadlineDate || !form.deadlineTime) {
        wx.showToast({ title: '请选择重交截止日期与时间', icon: 'none' });
        return;
      }
      const due = new Date(`${form.deadlineDate}T${form.deadlineTime}:00`);
      if (isNaN(due.getTime()) || due.getTime() <= Date.now()) {
        wx.showToast({ title: '重交截止时间需晚于当前时间', icon: 'none' });
        return;
      }
      deadline = `${form.deadlineDate}T${form.deadlineTime}:00`;
    }
    try {
      this.setData({ actionBusy: true });
      await request(`/stay/applications/${form.applicationId}/review`, {
        method: 'POST',
        data: { pass: !!form.pass, reason, ...(deadline ? { resubmitDeadline: deadline } : {}) }
      });
      this.setData({ reviewForm: null });
      overlay(this, false);
      wx.showToast({ title: form.pass ? '申请已通过' : '已退回修改' });
      this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
    }
  },
  openBatchForm(event) {
    const id = event && event.currentTarget ? event.currentTarget.dataset.id : '';
    const batch = id ? this.data.batches.find(item => String(item.batch_id) === String(id)) : null;
    this.setData({
      batchForm: batch
        ? {
            batchId: batch.batch_id,
            batchCode: batch.batch_code || '',
            batchName: batch.batch_name || '',
            academicYear: String(batch.academic_year || new Date().getFullYear()),
            vacationType: batch.vacation_type || 'SUMMER',
            openStartDate: String(batch.open_start_date || '').slice(0, 10),
            openEndDate: String(batch.open_end_date || '').slice(0, 10),
            instructions: batch.instructions || ''
          }
        : {
            batchId: '',
            batchCode: '',
            batchName: '',
            academicYear: String(new Date().getFullYear()),
            vacationType: 'SUMMER',
            openStartDate: '',
            openEndDate: '',
            instructions: ''
          }
    });
    overlay(this, true);
  },
  closeBatchForm() {
    this.setData({ batchForm: null });
    overlay(this, false);
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
    if (!form.batchCode || !form.batchName || !form.academicYear || !form.openStartDate || !form.openEndDate || !form.instructions) {
      wx.showToast({ title: '请填写完整批次信息', icon: 'none' });
      return;
    }
    if (form.openEndDate < form.openStartDate) {
      wx.showToast({ title: '开放结束不能早于开放开始', icon: 'none' });
      return;
    }
    try {
      const payload = {
        batchCode: form.batchCode,
        batchName: form.batchName,
        academicYear: Number(form.academicYear),
        vacationType: form.vacationType,
        openStartDate: form.openStartDate,
        openEndDate: form.openEndDate,
        instructions: form.instructions
      };
      if (form.batchId) await request(`/stay/batches/${form.batchId}`, { method: 'PUT', data: payload });
      else await request('/stay/batches', { method: 'POST', data: payload });
      wx.showToast({ title: form.batchId ? '批次已更新' : '留宿批次已保存' });
      this.setData({ batchForm: null });
      overlay(this, false);
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  async deleteBatch(event) {
    const id = event.currentTarget.dataset.id;
    const batch = this.data.batches.find(item => String(item.batch_id) === String(id));
    const ok = await new Promise(resolve => wx.showModal({
      title: '删除批次',
      content: `删除「${batch ? batch.batch_name : id}」？只有草稿批次、且没有申请记录和楼栋规则时才能删除。`,
      success: result => resolve(result.confirm)
    }));
    if (!ok) return;
    try {
      await request(`/stay/batches/${id}`, { method: 'DELETE' });
      wx.showToast({ title: '批次已删除' });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  async publishBatch(event) {
    const id = event.currentTarget.dataset.id;
    try {
      await request(`/stay/batches/${id}/publish`, { method: 'POST', data: {} });
      wx.showToast({ title: '批次已开放，请宿管设置本楼截止' });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  /** 宿管：设置本楼申请截止时间（学生是否能看到该批次取决于本楼规则） */
  openRuleForm(event) {
    const id = event.currentTarget.dataset.id;
    const batch = this.data.batches.find(item => String(item.batch_id) === String(id));
    if (!batch) return;
    const existing = batch.application_deadline ? String(batch.application_deadline) : '';
    this.setData({
      ruleForm: {
        batchId: id,
        batchName: batch.batch_name,
        openStartDate: batch.open_start_date,
        openEndDate: batch.open_end_date,
        buildingId: batch.building_id,
        deadlineDate: existing ? existing.slice(0, 10) : '',
        deadlineTime: existing ? existing.slice(11, 16) : '23:59',
        autoLock: batch.auto_lock !== 0 && batch.auto_lock !== false
      }
    });
    overlay(this, true);
  },
  closeRuleForm() {
    this.setData({ ruleForm: null });
    overlay(this, false);
  },
  ruleDate(event) {
    this.setData({ [`ruleForm.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  ruleSwitch(event) {
    this.setData({ 'ruleForm.autoLock': event.detail.value });
  },
  async saveRule() {
    const form = this.data.ruleForm;
    if (!form || !form.deadlineDate || !form.deadlineTime) {
      wx.showToast({ title: '请选择申请截止日期与时间', icon: 'none' });
      return;
    }
    const deadline = `${form.deadlineDate} ${form.deadlineTime}:00`;
    if (new Date(deadline.replace(/-/g, '/')).getTime() <= Date.now()) {
      wx.showToast({ title: '截止时间必须晚于当前时间', icon: 'none' });
      return;
    }
    if (form.openEndDate && form.deadlineDate > String(form.openEndDate).slice(0, 10)) {
      wx.showToast({ title: '截止时间不能晚于开放结束日期', icon: 'none' });
      return;
    }
    try {
      await request(`/stay/batches/${form.batchId}/building-rule`, {
        method: 'PUT',
        data: { buildingId: Number(form.buildingId), applicationDeadline: deadline, autoLock: !!form.autoLock }
      });
      wx.showToast({ title: '本楼截止时间已保存' });
      this.setData({ ruleForm: null });
      overlay(this, false);
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  /** 宿管：发布本楼申请通知（需要先设置有效的截止时间） */
  async publishBuilding(event) {
    const id = event.currentTarget.dataset.id;
    const batch = this.data.batches.find(item => String(item.batch_id) === String(id));
    if (batch && !batch.application_deadline) {
      wx.showToast({ title: '请先设置本楼申请截止时间', icon: 'none' });
      this.openRuleForm(event);
      return;
    }
    try {
      await request(`/stay/batches/${id}/publish`, { method: 'POST', data: { buildingId: Number(batch.building_id) } });
      wx.showToast({ title: '已通知本楼学生' });
      this.setData({ batches: this.data.batches.map(item => (String(item.batch_id) === String(id) ? { ...item, building_published: true } : item)) });
    } catch (error) {
      showError(error);
    }
  },
  openSupplement(event) {
    this.setData({
      supplementForm: { batchId: String(event.currentTarget.dataset.id), studentId: '', studentIndex: 0, reason: '', startDate: '', endDate: '' }
    });
    overlay(this, true);
  },
  chooseSupplementStudent(event) {
    const student = this.data.students[Number(event.detail.value)];
    this.setData({ 'supplementForm.studentId': String(student.user_id), 'supplementForm.studentIndex': Number(event.detail.value) });
  },
  closeSupplement() {
    this.setData({ supplementForm: null });
    overlay(this, false);
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
      overlay(this, false);
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  async uploadMaterial(event) {
    const batchId = event.currentTarget.dataset.id;
    try {
      // 选择文件会触发 onHide/onShow，标记一下以免把正在填写的弹层收掉
      this._pickingMedia = true;
      const chosen = await new Promise((resolve, reject) => wx.chooseMessageFile({
        count: 1,
        type: 'file',
        success: result => { this._pickingMedia = false; resolve(result.tempFiles[0].path); },
        fail: error => { this._pickingMedia = false; reject(error); }
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
