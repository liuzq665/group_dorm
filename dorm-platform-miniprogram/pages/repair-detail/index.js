const { request, upload, getSession, showError } = require('../../utils/request');
const { statusText, statusClass } = require('../../utils/format');

Page({
  data: { loading: true, id: '', role: '', detail: null, actionBusy: false },
  onLoad(query) { this.setData({ id: query.id || '' }); },
  onShow() {
    const role = getSession()?.user?.role;
    if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'])) {
      this.setData({ role });
      this.load();
    }
  },
  async load() {
    this.setData({ loading: true });
    try {
      const detail = await request(`/repair-orders/${this.data.id}`);
      this.setData({ detail: { ...detail, statusLabel: statusText(detail.current_status), statusStyle: statusClass(detail.current_status), audits: detail.audits || [], dispatches: detail.dispatches || [], delays: detail.delays || [], files: detail.files || [] } });
    } catch (error) { showError(error); } finally { this.setData({ loading: false }); }
  },
  edit() { wx.navigateTo({ url: `/pages/repair-form/index?id=${this.data.id}` }); },
  async confirmAction(action, title, content, data = {}) {
    const confirmed = await new Promise(resolve => wx.showModal({ title, content, success: result => resolve(result.confirm) }));
    if (!confirmed) return;
    try {
      this.setData({ actionBusy: true });
      await request(`/repair-orders/${this.data.id}/${action}`, { method: 'POST', data });
      wx.showToast({ title: '操作已完成' });
      await this.load();
    } catch (error) { showError(error); } finally { this.setData({ actionBusy: false }); }
  },
  simple(e) {
    const action = e.currentTarget.dataset.action;
    const text = { submit: '提交审核', cancel: '撤销报修', resubmit: '重新提交', confirm: '确认维修完成' }[action];
    this.confirmAction(action, text, `确定${text}吗？`);
  },
  async confirmRepair() {
    const score = await new Promise(resolve => wx.showActionSheet({
      itemList: ['5 分（默认）', '4 分', '3 分', '2 分', '1 分'],
      success: result => resolve(5 - result.tapIndex),
      fail: () => resolve(0)
    }));
    if (!score) return;
    const comment = await this.prompt('维修评价', '评价内容（可留空）');
    if (comment === null) return;
    const confirmed = await new Promise(resolve => wx.showModal({
      title: '确认维修完成',
      content: `提交${score}分评价并归档工单？`,
      success: result => resolve(result.confirm)
    }));
    if (!confirmed) return;
    try {
      this.setData({ actionBusy: true });
      await request(`/repair-orders/${this.data.id}/confirm`, { method: 'POST', data: { score, comment } });
      wx.showToast({ title: '已确认并提交评价' });
      await this.load();
    } catch (error) { showError(error); } finally { this.setData({ actionBusy: false }); }
  },
  async review() {
    const pass = await new Promise(resolve => wx.showActionSheet({ itemList: ['审核通过', '退回修改'], success: result => resolve(result.tapIndex === 0), fail: () => resolve(null) }));
    if (pass === null) return;
    const input = pass ? '' : await this.prompt('退回修改', '请填写退回原因');
    if (input === null || (!pass && !input.trim())) return;
    try {
      await request(`/repair-orders/${this.data.id}/review`, { method: 'POST', data: { pass, reason: input.trim(), urgent: !!this.data.detail.urgent } });
      wx.showToast({ title: pass ? '审核通过' : '已退回修改' });
      this.load();
    } catch (error) { showError(error); }
  },
  prompt(title, placeholder) {
    return new Promise(resolve => wx.showModal({ title, editable: true, placeholderText: placeholder, success: result => resolve(result.confirm ? result.content || '' : null) }));
  },
  async dispatch() {
    try {
      const candidates = await request(`/repair-orders/${this.data.id}/candidates`);
      if (!candidates.length) { wx.showModal({ title: '暂无可派维修人员', content: '当前没有同时满足工种、楼栋范围和在岗条件的维修人员。', showCancel: false }); return; }
      const worker = await this.chooseCandidate(candidates);
      if (!worker) return;
      await request(`/repair-orders/${this.data.id}/dispatch`, { method: 'POST', data: { repairerUserId: worker.repairer_user_id } });
      wx.showToast({ title: '已派单' });
      this.load();
    } catch (error) { showError(error); }
  },
  async chooseCandidate(candidates) {
    let start = 0;
    while (true) {
      const end = Math.min(start + 5, candidates.length);
      const options = candidates.slice(start, end).map(item => `${item.real_name}（在办 ${item.active_orders}${item.max_active_orders ? `/${item.max_active_orders}` : ''}）`);
      const hasPrevious = start > 0, hasNext = end < candidates.length;
      if (hasPrevious) options.unshift('上一页');
      if (hasNext) options.push('下一页');
      const selected = await new Promise(resolve => wx.showActionSheet({ itemList: options, success: result => resolve(result.tapIndex), fail: () => resolve(-1) }));
      if (selected < 0) return null;
      if (hasPrevious && selected === 0) { start = Math.max(0, start - 5); continue; }
      const candidateIndex = selected - (hasPrevious ? 1 : 0);
      if (hasNext && candidateIndex === end - start) { start = end; continue; }
      return candidates[start + candidateIndex];
    }
  },
  async retry() {
    try {
      await request(`/repair-orders/${this.data.id}/retry`, { method: 'POST' });
      wx.showToast({ title: '已重新自动派单' });
      this.load();
    } catch (error) { showError(error); }
  },
  async decision(e) {
    const accept = e.currentTarget.dataset.accept === 'true';
    const reason = accept ? '' : await this.prompt('拒绝接单', '请填写拒单原因');
    if (reason === null || (!accept && !reason.trim())) return;
    try {
      await request(`/repair-orders/${this.data.id}/decision`, { method: 'POST', data: { accept, reason: reason || '' } });
      wx.showToast({ title: accept ? '已接单' : '已提交拒单' });
      this.load();
    } catch (error) { showError(error); }
  },
  async choosePhotos() {
    return new Promise((resolve, reject) => wx.chooseMedia({ count: 6, mediaType: ['image'], sourceType: ['album', 'camera'], success: result => resolve(result.tempFiles.map(file => file.tempFilePath)), fail: reject }));
  },
  async submitResult() {
    const result = await this.prompt('提交维修结果', '请填写维修处理过程和结果');
    if (result === null || !result.trim()) return;
    try {
      const paths = await this.choosePhotos();
      if (!paths.length) { wx.showToast({ title: '请上传完工现场照片', icon: 'none' }); return; }
      const fileIds = await Promise.all(paths.map(path => upload(path)));
      await request(`/repair-orders/${this.data.id}/result`, { method: 'POST', data: { result: result.trim(), fileIds } });
      wx.showToast({ title: '维修结果已提交' });
      this.load();
    } catch (error) { if (error.errMsg && error.errMsg.includes('cancel')) return; showError(error); }
  },
  async delay() {
    const reason = await this.prompt('申请维修延期', '请填写延期原因');
    if (reason === null || !reason.trim()) return;
    const expectedFinishAt = await this.prompt('预计完成时间', '格式：YYYY-MM-DD HH:mm:ss');
    if (expectedFinishAt === null || !expectedFinishAt.trim()) return;
    try {
      const paths = await this.choosePhotos();
      if (!paths.length) { wx.showToast({ title: '请上传维修现场照片', icon: 'none' }); return; }
      const fileIds = await Promise.all(paths.map(path => upload(path)));
      await request(`/repair-orders/${this.data.id}/delay`, { method: 'POST', data: { reason: reason.trim(), expectedFinishAt: expectedFinishAt.trim().replace(' ', 'T'), fileIds } });
      wx.showToast({ title: '延期申请已提交' });
      this.load();
    } catch (error) { if (error.errMsg && error.errMsg.includes('cancel')) return; showError(error); }
  },
  async delayReview(e) {
    const pass = e.currentTarget.dataset.pass === 'true';
    const reason = await this.prompt(pass ? '通过延期申请' : '驳回延期申请', pass ? '审核意见（可留空）' : '请填写驳回原因');
    if (reason === null || (!pass && !reason.trim())) return;
    try {
      await request(`/repair-orders/${this.data.id}/delay-review`, { method: 'POST', data: { pass, reason: reason.trim() } });
      wx.showToast({ title: pass ? '延期已通过' : '延期已驳回' });
      this.load();
    } catch (error) { showError(error); }
  },
  async evaluate() {
    const score = await new Promise(resolve => wx.showActionSheet({ itemList: ['5 分', '4 分', '3 分', '2 分', '1 分'], success: result => resolve(5 - result.tapIndex), fail: () => resolve(0) }));
    if (!score) return;
    const comment = await this.prompt('维修评价', '评价内容（可留空）');
    if (comment === null) return;
    try {
      await request(`/repair-orders/${this.data.id}/evaluation`, { method: 'POST', data: { score, comment } });
      wx.showToast({ title: '评价已提交' });
      this.load();
    } catch (error) { showError(error); }
  },
  async rework() {
    const reason = await this.prompt('申请重修', '请说明尚未解决的问题');
    if (reason === null || !reason.trim()) return;
    try {
      await request(`/repair-orders/${this.data.id}/rework`, { method: 'POST', data: { reason: reason.trim(), fileIds: [] } });
      wx.showToast({ title: '重修申请已提交' });
      this.load();
    } catch (error) { showError(error); }
  },
  preview(e) {
    const file = e.currentTarget.dataset.file;
    const url = `${require('../../utils/config').baseUrl}/files/${file.file_id}`;
    wx.downloadFile({ url, header: { Authorization: `Bearer ${getSession().token}` }, success: result => {
      if (file.content_type && file.content_type.startsWith('image/')) wx.previewImage({ urls: [result.tempFilePath] });
      else wx.openDocument({ filePath: result.tempFilePath, showMenu: true });
    }, fail: () => wx.showToast({ title: '文件暂时无法预览', icon: 'none' }) });
  }
});
