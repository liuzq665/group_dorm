const { request, upload, getSession, showError } = require('../../utils/request');
const { statusText, statusTone, dispatchText, resultText, formatDateTime, orDash, dispatchCandidate } = require('../../utils/format');
const { previewAttachment } = require('../../utils/files');
const { normalizeImage } = require('../../utils/image');
const { overlay } = require('../../utils/overlay');

const PURPOSE_LABELS = { FAULT: '故障照片', RESULT: '完工照片', DELAY: '延期现场照片', REWORK: '重修照片' };

const roleLabels = { STUDENT: '学生', REPAIRER: '维修人员', DORM_MANAGER: '宿管', ADMIN: '系统管理员' };

Page({
  data: {
    loading: true,
    id: '',
    role: '',
    roleLabel: '',
    detail: null,
    rows: [],
    attachments: [],
    dispatches: [],
    audits: [],
    delays: [],
    reworkRequests: [],
    resultHistory: [],
    relatedOrders: [],
    open: { dispatches: true, audits: true, delays: false, rework: true, results: false, related: false },
    evaluation: null,
    actionBusy: false,
    stars: [1, 2, 3, 4, 5],
    scoreModal: '',
    scoreForm: { score: 5, comment: '' },
    rejectModal: false,
    rejectReason: '',
    reworkModal: false,
    reworkReason: '',
    resultModal: false,
    resultText: '',
    resultFiles: [],
    delayModal: false,
    delayForm: { reason: '', date: '', time: '' },
    delayFiles: [],
    dispatchModal: false,
    dispatchCandidates: []
  },
  onLoad(query) {
    this.setData({ id: query.id || '' });
  },
  onShow() {
    const role = getSession()?.user?.role;
    if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'])) {
      this.setData({ role, roleLabel: roleLabels[role] || role });
      this.load();
    }
    // 从相册/相机选择图片会触发 onHide→onShow，回来时按当前弹层状态恢复 tabBar 隐藏，避免弹层被 tabBar 压住
    this.syncOverlay();
  },
  onHide() {
    // 选择相册图片时页面会短暂隐藏，此时不能清空弹层与已填内容，否则回到页面就像“被刷新”
    if (this._pickingMedia) return;
    // 离开页面时关闭所有弹层，避免返回首页后再进入时残留上一轮的弹层状态
    this.setData({
      scoreModal: '',
      rejectModal: false,
      reworkModal: false,
      resultModal: false,
      delayModal: false,
      dispatchModal: false,
      dispatchCandidates: []
    });
    overlay(this, false);
  },
  syncOverlay() {
    const d = this.data;
    const open = !!(d.scoreModal || d.rejectModal || d.reworkModal || d.resultModal || d.delayModal || d.dispatchModal);
    overlay(this, open);
  },
  async load() {
    this.setData({ loading: true });
    try {
      const detail = await request(`/repair-orders/${this.data.id}`);
      if (!detail) throw new Error('工单不存在');
      const role = this.data.role;
      const status = detail.current_status;
      const statusLabel = statusText(status);
      const files = (detail.files || []).map(file => ({ ...file, purposeLabel: PURPOSE_LABELS[file.purpose] || '' }));
      const rows = this.buildRows(detail, role, statusLabel);
      this.setData({
        detail: {
          ...detail,
          statusLabel,
          statusTone: statusTone(status),
          isRepaired: status === 'REPAIRED',
          isConfirmed: status === 'CONFIRMED',
          canEdit: role === 'STUDENT' && ['DRAFT', 'PENDING_EDIT'].includes(status),
          canSubmit: role === 'STUDENT' && ['DRAFT', 'PENDING_EDIT'].includes(status),
          canCancel: role === 'STUDENT' && ['DRAFT', 'PENDING_EDIT', 'PENDING_REVIEW', 'PENDING_ASSIGN', 'PENDING_MANUAL'].includes(status),
          canResubmit: role === 'STUDENT' && status === 'CANCELLED',
          canConfirm: role === 'STUDENT' && status === 'REPAIRED',
          canRework: role === 'STUDENT' && status === 'REPAIRED',
          canEvaluate: role === 'STUDENT' && status === 'CONFIRMED',
          canAccept: role === 'REPAIRER' && status === 'PENDING_ACCEPT',
          canSubmitResult: role === 'REPAIRER' && ['ACCEPTED', 'DELAYED'].includes(status),
          canDelay: role === 'REPAIRER' && status === 'ACCEPTED',
          canReview: role === 'DORM_MANAGER' && status === 'PENDING_REVIEW',
          canDispatch: ['DORM_MANAGER', 'ADMIN'].includes(role) && ['PENDING_ASSIGN', 'PENDING_MANUAL'].includes(status),
          canRetry: ['DORM_MANAGER', 'ADMIN'].includes(role) && status === 'PENDING_MANUAL' && !detail.urgent && !detail.abnormal && !detail.parent_order_id && !(detail.reworkRequests || []).some(row => ['PENDING', 'APPROVED'].includes(row.request_status)),
          canDelayReview: role === 'DORM_MANAGER' && status === 'DELAYED'
        },
        rows,
        attachments: files,
        attachmentView: { files },
        evaluation: detail.score ? { score: detail.score, comment: orDash(detail.comment) } : null,
        dispatches: (detail.dispatches || []).map(row => ({
          ...row,
          title: `${orDash(row.repairer_name)} · ${row.dispatch_mode === 'AUTO' ? '自动派单' : '人工派单'} · ${dispatchText(row.dispatch_status)}` + (row.dispatch_status === 'REJECTED' && row.decision_reason ? ` · 拒单理由：${row.decision_reason}` : '') + (row.dispatch_status === 'TIMEOUT' ? ' · 超过接单时限未处理' : ''),
          timeLabel: formatDateTime(row.decided_at || row.created_at)
        })),
        audits: (detail.audits || []).map(row => ({
          ...row,
          title: `${resultText(row.result)} · ${orDash(row.reason)}`,
          timeLabel: formatDateTime(row.created_at)
        })),
        delays: (detail.delays || []).map(row => ({
          ...row,
          title: `${resultText(row.current_status)} · ${orDash(row.reason)}`,
          timeLabel: `预计完成 ${formatDateTime(row.expected_finish_at)}`
        })),
        reworkRequests: (detail.reworkRequests || []).map(row => ({
          ...row,
          statusLabel: statusText(row.request_status),
          statusTone: statusTone(row.request_status),
          timeLabel: formatDateTime(row.created_at)
        })),
        resultHistory: (detail.resultHistory || []).map(row => ({
          ...row,
          roundLabel: `第 ${row.round_no} 轮`,
          timeLabel: formatDateTime(row.created_at)
        })),
        relatedOrders: (detail.relatedOrders || []).map(row => ({
          ...row,
          statusLabel: statusText(row.current_status),
          statusTone: statusTone(row.current_status),
          timeLabel: formatDateTime(row.created_at)
        }))
      });
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  buildRows(detail, role, statusLabel) {
    const rows = [
      { label: '工单编号', value: orDash(detail.order_no) },
      { label: '当前状态', value: orDash(statusLabel) },
      { label: '故障分类', value: orDash(detail.category_name) },
      { label: '维修工种', value: orDash(detail.work_type_name) },
      { label: '报修位置', value: `${orDash(detail.building_name)} ${orDash(detail.room_no)}` },
      { label: '维修人员', value: orDash(detail.repairer_name || '暂无派单') },
      { label: '报修时间', value: formatDateTime(detail.created_at) },
      { label: '更新时间', value: formatDateTime(detail.updated_at) }
    ];
    if (role !== 'STUDENT') rows.splice(4, 0, { label: '申请学生', value: orDash(detail.student_name) });
    if (detail.repair_deadline) rows.push({ label: '维修期限', value: formatDateTime(detail.repair_deadline) });
    if (detail.accept_deadline) rows.push({ label: '接单截止', value: formatDateTime(detail.accept_deadline) });
    if (detail.completed_at) rows.push({ label: '完工时间', value: formatDateTime(detail.completed_at) });
    if (detail.reject_reason) rows.push({ label: '审核意见', value: orDash(detail.reject_reason) });
    if (detail.manual_reason) rows.push({ label: '人工处理原因', value: orDash(detail.manual_reason) });
    const refused = (detail.dispatches || []).filter(row => row.dispatch_status === 'REJECTED');
    if (refused.length && ['PENDING_ACCEPT', 'PENDING_ASSIGN', 'PENDING_MANUAL'].includes(detail.current_status)) {
      const last = refused[refused.length - 1];
      rows.push({ label: '派单情况', value: `${orDash(last.repairer_name)} 已拒单${last.decision_reason ? `（${last.decision_reason}）` : ''}，系统已重新派单或转人工指派` });
    }
    const timedOut = (detail.dispatches || []).filter(row => row.dispatch_status === 'TIMEOUT');
    if (timedOut.length && ['PENDING_ACCEPT', 'PENDING_ASSIGN', 'PENDING_MANUAL'].includes(detail.current_status)) {
      rows.push({ label: '派单情况', value: '维修工超过接单时限未处理，系统已重新派单或转人工指派' });
    }
    return rows;
  },
  /* ------------------------------ 学生操作 ------------------------------ */
  edit() {
    wx.navigateTo({ url: `/pages/repair-form/index?id=${this.data.id}` });
  },
  async submit() {
    const confirmed = await this.modal('提交审核', '提交后进入宿管审核，审核期间不可修改。确定提交吗？');
    if (!confirmed) return;
    await this.run(`/repair-orders/${this.data.id}/submit`, { method: 'POST' }, '已提交审核');
  },
  async cancel() {
    const confirmed = await this.modal('撤销报修', '撤销后工单进入历史记录，确定撤销吗？');
    if (!confirmed) return;
    await this.run(`/repair-orders/${this.data.id}/cancel`, { method: 'POST' }, '已撤销报修');
  },
  async resubmit() {
    const confirmed = await this.modal('重新提交', '将重新提交审核，确定继续吗？');
    if (!confirmed) return;
    await this.run(`/repair-orders/${this.data.id}/resubmit`, { method: 'POST' }, '已重新提交');
  },
  openScore(event) {
    const mode = event.currentTarget.dataset.mode || 'confirm';
    this.setData({ scoreModal: mode, scoreForm: { score: 5, comment: '' } });
    overlay(this, true);
  },
  closeScore() {
    this.setData({ scoreModal: '', scoreForm: { score: 5, comment: '' } });
    overlay(this, false);
  },
  setScore(event) {
    this.setData({ 'scoreForm.score': Number(event.currentTarget.dataset.score) });
  },
  scoreComment(event) {
    this.setData({ 'scoreForm.comment': event.detail.value });
  },
  async submitScore() {
    const { scoreModal, scoreForm } = this.data;
    const score = Number(scoreForm.score);
    const comment = scoreForm.comment.trim();
    if (!(score >= 1 && score <= 5)) { wx.showToast({ title: '请选择 1 至 5 分评分', icon: 'none' }); return; }
    if (!comment) { wx.showToast({ title: '请填写文字评价', icon: 'none' }); return; }
    if (this.data.actionBusy) return;
    const path = scoreModal === 'evaluate' ? 'evaluation' : 'confirm';
    const title = scoreModal === 'evaluate' ? '提交评价' : '确认维修完成';
    const confirmed = await this.modal(title, `提交 ${score} 分评价并归档工单？评价将同步给维修人员、宿管和系统管理员。`);
    if (!confirmed) return;
    this.setData({ actionBusy: true });
    try {
      await request(`/repair-orders/${this.data.id}/${path}`, { method: 'POST', data: { score, comment } });
      wx.showToast({ title: '评价已提交' });
      this.setData({ scoreModal: '' });
      overlay(this, false);
      await this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
    }
  },
  openRework() {
    this.setData({ reworkModal: true, reworkReason: '' });
    overlay(this, true);
  },
  closeRework() {
    this.setData({ reworkModal: false, reworkReason: '' });
    overlay(this, false);
  },
  reworkInput(event) {
    this.setData({ reworkReason: event.detail.value });
  },
  async submitRework() {
    const reason = this.data.reworkReason.trim();
    if (!reason) { wx.showToast({ title: '请填写重修原因', icon: 'none' }); return; }
    if (this.data.actionBusy) return;
    this.setData({ actionBusy: true });
    try {
      await request(`/repair-orders/${this.data.id}/rework`, { method: 'POST', data: { reason, fileIds: [] } });
      wx.showToast({ title: '重修已提交，沿用原工单' });
      this.setData({ reworkModal: false });
      overlay(this, false);
      await this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
    }
  },
  /* ------------------------------ 维修操作 ------------------------------ */
  async accept() {
    const confirmed = await this.modal('接单确认', '接单后请在维修期限内完成维修并提交结果。确定接单吗？');
    if (!confirmed) return;
    await this.run(`/repair-orders/${this.data.id}/decision`, { method: 'POST', data: { accept: true, reason: '' } }, '已接单');
  },
  openReject() {
    this.setData({ rejectModal: true, rejectReason: '' });
    overlay(this, true);
  },
  closeReject() {
    this.setData({ rejectModal: false, rejectReason: '' });
    overlay(this, false);
  },
  rejectInput(event) {
    this.setData({ rejectReason: event.detail.value });
  },
  async submitReject() {
    const reason = this.data.rejectReason.trim();
    if (!reason) { wx.showToast({ title: '请填写拒单原因', icon: 'none' }); return; }
    const confirmed = await this.modal('拒绝接单', '拒单后工单将重新派单或转人工处理，确定拒单吗？');
    if (!confirmed) return;
    this.setData({ rejectModal: false });
    overlay(this, false);
    await this.run(`/repair-orders/${this.data.id}/decision`, { method: 'POST', data: { accept: false, reason } }, '已提交拒单');
  },
  openResult() {
    this.setData({ resultModal: true, resultText: '', resultFiles: [] });
    overlay(this, true);
  },
  closeResult() {
    this.setData({ resultModal: false, resultText: '', resultFiles: [] });
    overlay(this, false);
  },
  resultInput(event) {
    this.setData({ resultText: event.detail.value });
  },
  async chooseResultPhotos() {
    try {
      const paths = await this.choosePhotos();
      // 兜底：若选图期间弹层被生命周期清掉，重新打开并恢复 tabBar 隐藏
      const base = this.data.resultModal ? this.data.resultFiles : [];
      const added = paths.map((path, index) => ({ path, name: `现场照片${base.length + index + 1}` }));
      this.setData({ resultModal: true, resultFiles: [...base, ...added].slice(0, 6) });
      overlay(this, true);
    } catch (error) {
      if (!error.errMsg?.includes('cancel')) this.photoError(error);
    }
  },
  removeResultPhoto(event) {
    const resultFiles = [...this.data.resultFiles];
    resultFiles.splice(Number(event.currentTarget.dataset.index), 1);
    this.setData({ resultFiles });
  },
  async submitResult() {
    const text = this.data.resultText.trim();
    if (!text) { wx.showToast({ title: '请填写维修处理过程', icon: 'none' }); return; }
    if (!this.data.resultFiles.length) { wx.showToast({ title: '请上传完工现场照片', icon: 'none' }); return; }
    if (this.data.actionBusy) return;
    this.setData({ actionBusy: true });
    wx.showLoading({ title: '正在提交' });
    try {
      const fileIds = await Promise.all(this.data.resultFiles.map(file => upload(typeof file === 'string' ? file : file.path)));
      await request(`/repair-orders/${this.data.id}/result`, { method: 'POST', data: { result: text, fileIds } });
      wx.showToast({ title: '维修结果已提交' });
      this.setData({ resultModal: false });
      overlay(this, false);
      await this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
      wx.hideLoading();
    }
  },
  openDelay() {
    this.setData({ delayModal: true, delayForm: { reason: '', date: '', time: '' }, delayFiles: [] });
    overlay(this, true);
  },
  closeDelay() {
    this.setData({ delayModal: false, delayForm: { reason: '', date: '', time: '' }, delayFiles: [] });
    overlay(this, false);
  },
  delayInput(event) {
    this.setData({ [`delayForm.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  async chooseDelayPhotos() {
    try {
      const paths = await this.choosePhotos();
      const base = this.data.delayModal ? this.data.delayFiles : [];
      const added = paths.map((path, index) => ({ path, name: `现场照片${base.length + index + 1}` }));
      this.setData({ delayModal: true, delayFiles: [...base, ...added].slice(0, 6) });
      overlay(this, true);
    } catch (error) {
      if (!error.errMsg?.includes('cancel')) this.photoError(error);
    }
  },
  removeDelayPhoto(event) {
    const delayFiles = [...this.data.delayFiles];
    delayFiles.splice(Number(event.currentTarget.dataset.index), 1);
    this.setData({ delayFiles });
  },
  async submitDelay() {
    const { reason, date, time } = this.data.delayForm;
    if (!reason.trim()) { wx.showToast({ title: '请填写延期原因', icon: 'none' }); return; }
    if (!date || !time) { wx.showToast({ title: '请选择预计完成日期和时间', icon: 'none' }); return; }
    if (!this.data.delayFiles.length) { wx.showToast({ title: '请上传维修现场照片', icon: 'none' }); return; }
    if (this.data.actionBusy) return;
    this.setData({ actionBusy: true });
    wx.showLoading({ title: '正在提交' });
    try {
      const fileIds = await Promise.all(this.data.delayFiles.map(file => upload(typeof file === 'string' ? file : file.path)));
      await request(`/repair-orders/${this.data.id}/delay`, {
        method: 'POST',
        data: { reason: reason.trim(), expectedFinishAt: `${date}T${time}:00`, fileIds }
      });
      wx.showToast({ title: '延期申请已提交' });
      this.setData({ delayModal: false });
      overlay(this, false);
      await this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
      wx.hideLoading();
    }
  },
  /* --------------------------- 宿管/管理员操作 --------------------------- */
  async review() {
    const pass = await new Promise(resolve => wx.showActionSheet({
      itemList: ['审核通过', '退回修改'],
      success: result => resolve(result.tapIndex === 0),
      fail: () => resolve(null)
    }));
    if (pass === null) return;
    const reason = await this.prompt(pass ? '审核通过' : '退回修改', pass ? '审核意见（可留空）' : '请填写退回原因');
    if (reason === null || (!pass && !reason.trim())) return;
    let urgent = !!(this.data.detail && this.data.detail.urgent);
    if (pass && !urgent) {
      urgent = await new Promise(resolve => wx.showModal({
        title: '是否需要人工指派',
        content: '紧急工单（漏水、断电、门锁损坏等）不参与自动派单，审核后转人工指派。',
        confirmText: '标记紧急',
        cancelText: '普通工单',
        success: result => resolve(!!result.confirm),
        fail: () => resolve(false)
      }));
    }
    try {
      await request(`/repair-orders/${this.data.id}/review`, {
        method: 'POST',
        data: { pass, reason: reason.trim(), urgent }
      });
      wx.showToast({ title: pass ? '审核通过' : '已退回修改' });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  async dispatch() {
    if (this.data.actionBusy) return;
    try {
      const candidates = await request(`/repair-orders/${this.data.id}/candidates`);
      if (!candidates.length) {
        wx.showModal({ title: '暂无可派维修人员', content: '当前没有同时满足工种、楼栋范围和在岗条件的维修人员。', showCancel: false });
        return;
      }
      this.setData({ dispatchModal: true, dispatchCandidates: candidates.map(dispatchCandidate) }, () => overlay(this, true));
    } catch (error) {
      showError(error);
    }
  },
  closeDispatch() {
    this.setData({ dispatchModal: false, dispatchCandidates: [] }, () => overlay(this, false));
  },
  async pickCandidate(event) {
    if (this.data.actionBusy) return;
    const repairerUserId = event.currentTarget.dataset.id;
    try {
      this.setData({ actionBusy: true });
      await request(`/repair-orders/${this.data.id}/dispatch`, { method: 'POST', data: { repairerUserId } });
      wx.showToast({ title: '已派单' });
      this.setData({ dispatchModal: false, dispatchCandidates: [] });
      overlay(this, false);
      await this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
    }
  },
  async retry() {
    try {
      await request(`/repair-orders/${this.data.id}/retry`, { method: 'POST' });
      wx.showToast({ title: '已重新自动派单' });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  async delayReview(event) {
    const pass = event.currentTarget.dataset.pass === 'true';
    const reason = await this.prompt(pass ? '通过延期申请' : '驳回延期申请', pass ? '审核意见（可留空）' : '请填写驳回原因');
    if (reason === null || (!pass && !reason.trim())) return;
    try {
      await request(`/repair-orders/${this.data.id}/delay-review`, { method: 'POST', data: { pass, reason: reason.trim() } });
      wx.showToast({ title: pass ? '延期已通过' : '延期已驳回' });
      this.load();
    } catch (error) {
      showError(error);
    }
  },
  /* ------------------------------- 公共 ------------------------------- */
  async run(path, options, successTitle) {
    if (this.data.actionBusy) return;
    this.setData({ actionBusy: true });
    try {
      await request(path, options);
      wx.showToast({ title: successTitle });
      await this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
    }
  },
  modal(title, content) {
    return new Promise(resolve => wx.showModal({ title, content, success: result => resolve(result.confirm) }));
  },
  prompt(title, placeholder) {
    return new Promise(resolve => wx.showModal({
      title,
      editable: true,
      placeholderText: placeholder,
      success: result => resolve(result.confirm ? result.content || '' : null)
    }));
  },
  choosePhotos() {
    // 选图期间页面会 onHide/onShow，用标记避免 onHide 清空正在填写的弹层内容
    this._pickingMedia = true;
    return new Promise((resolve, reject) => wx.chooseMedia({
      count: 6,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: result => {
        this._pickingMedia = false;
        const picked = Array.isArray(result.tempFiles) ? result.tempFiles : [];
        if (!picked.length) { reject(new Error('没有获取到图片，请重新选择')); return; }
        // 与报修/留宿表单保持一致：压缩后再上传，避免相机原图超过后端 5MB 上限
        Promise.all(picked.map(file => normalizeImage(file.tempFilePath, 'repair')))
          .then(paths => resolve(paths))
          .catch(reject);
      },
      fail: error => { this._pickingMedia = false; reject(error); }
    }));
  },
  /** 选图/压缩失败需要用户确认，否则照片没选上却以为已上传，提交后两端都看不到附件 */
  photoError(error) {
    wx.showModal({ title: '照片未能加入', content: `${error?.errMsg || error?.message || '图片处理失败'}。请重新选择照片后再提交。`, showCancel: false });
  },
  previewFile(event) {
    previewAttachment(event.currentTarget.dataset.file, getSession().token);
  },
  toggleSection(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`open.${key}`]: !this.data.open[key] });
  },
  copyOrderNo() {
    if (!this.data.detail?.order_no) return;
    wx.setClipboardData({ data: this.data.detail.order_no });
  }
});

