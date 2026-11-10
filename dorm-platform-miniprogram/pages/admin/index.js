const { request, showError, getSession } = require('../../utils/request');

const roleOptions = [['STUDENT', '学生'], ['DORM_MANAGER', '宿管'], ['REPAIRER', '维修人员'], ['ADMIN', '系统管理员']];
Page({
  data: { loading: true, tab: 'people', roleFilter: 'STUDENT', roleIndex: 0, roleLabels: ['学生', '宿管', '维修人员', '系统管理员'], keyword: '', users: [], buildings: [], config: null, logs: [], backups: [], modules: ['auth', 'dorm', 'repair', 'stay', 'notice', 'system'] },
  onLoad(query) { if (['people', 'repair', 'logs', 'backup'].includes(query.tab)) this.setData({ tab: query.tab }); },
  onShow() { if (getApp().requireRole(['ADMIN'])) { this.setData({ selfUserId: getSession().user.id }); this.load(); } },
  async load() {
    this.setData({ loading: true });
    try {
      if (this.data.tab === 'people') {
        const base = `roleCode=${this.data.roleFilter}`;
        const keyword = this.data.keyword.trim();
        const userRequest = keyword ? Promise.all([request(`/admin/users?${base}&realName=${encodeURIComponent(keyword)}`), request(`/admin/users?${base}&account=${encodeURIComponent(keyword)}`)]).then(([byName, byAccount]) => [...new Map([...byName, ...byAccount].map(user => [user.user_id, user])).values()]) : request(`/admin/users?${base}`);
        const [users, buildings] = await Promise.all([userRequest, request('/buildings')]);
        this.setData({ users, buildings });
      } else if (this.data.tab === 'repair') {
        const [config, buildings] = await Promise.all([request('/admin/repair-config'), request('/buildings')]);
        this.setData({ config, buildings });
      } else if (this.data.tab === 'backup') {
        this.setData({ backups: await request('/admin/backup-tasks') });
      } else {
        this.setData({ logs: await request('/admin/logs') });
      }
    } catch (error) { showError(error); } finally { this.setData({ loading: false }); }
  },
  selectTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); this.load(); },
  async createBackup(e) {
    const businessType = e.currentTarget.dataset.type;
    const labels = { roles: '角色管理', repairs: '报修管理', stays: '留宿管理', dorm: '宿舍管理' };
    const confirmed = await new Promise(resolve => wx.showModal({ title: '创建数据库备份', content: `将创建${labels[businessType]}备份，任务将在后台执行。`, success: result => resolve(result.confirm) }));
    if (!confirmed) return;
    try { await request('/admin/backup-tasks', { method: 'POST', data: { taskType: 'BACKUP', businessType } }); wx.showToast({ title: '备份任务已提交' }); await this.load(); } catch (error) { showError(error); }
  },
  async deleteBackup(e) {
    const id = Number(e.currentTarget.dataset.id);
    const confirmed = await new Promise(resolve => wx.showModal({ title: '删除备份记录', content: '删除后无法恢复，确定继续吗？', success: result => resolve(result.confirm) }));
    if (!confirmed) return;
    try { await request('/admin/backup-tasks', { method: 'DELETE', data: { ids: [id] } }); wx.showToast({ title: '备份记录已删除' }); await this.load(); } catch (error) { showError(error); }
  },
  async downloadBackup(e) {
    const id = Number(e.currentTarget.dataset.id);
    const session = getSession();
    wx.showLoading({ title: '正在准备备份' });
    wx.request({
      url: `${require('../../utils/config').baseUrl}/admin/backup-tasks/download`,
      method: 'POST', responseType: 'arraybuffer', data: { ids: [id] },
      header: { 'content-type': 'application/json', Authorization: `Bearer ${session.token}` },
      success: result => {
        if (result.statusCode < 200 || result.statusCode >= 300) { wx.hideLoading(); showError(new Error('备份下载失败')); return; }
        const filePath = `${wx.env.USER_DATA_PATH}/dorm-backup-${id}.zip`;
        wx.getFileSystemManager().writeFile({ filePath, data: result.data, success: () => { wx.hideLoading(); wx.shareFileMessage({ filePath, fileName: `宿舍系统备份-${id}.zip`, fail: () => wx.showToast({ title: '备份文件已保存到小程序临时目录', icon: 'none' }) }); }, fail: () => { wx.hideLoading(); wx.showToast({ title: '无法保存备份文件', icon: 'none' }); } });
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '无法连接备份服务', icon: 'none' }); }
    });
  },
  roleChange(e) { const roleIndex = Number(e.detail.value); this.setData({ roleIndex, roleFilter: roleOptions[roleIndex][0] }); this.load(); },
  keyword(e) { this.setData({ keyword: e.detail.value }); },
  search() { this.load(); },
  async userDetail(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const user = await request(`/admin/users/${id}`);
      const rows = [`姓名：${user.real_name}`, `账号：${user.login_account}`, `编号：${user.student_no || user.employee_no || '-'}`, `电话：${user.phone || '-'}`, `性别：${user.gender || '-'}`, `状态：${user.enabled ? '启用' : '禁用'}`];
      if (user.role_code === 'STUDENT') rows.push(`学院：${user.department_name || '-'}\n专业：${user.major_name || '-'}\n班级：${user.class_name || '-'}\n住宿：${user.current_building || '未分配'} ${user.current_room || ''} ${user.current_bed || ''}`);
      if (user.role_code === 'DORM_MANAGER') rows.push(`负责楼栋：${user.manager_buildings || '未分配'}`);
      if (user.role_code === 'REPAIRER') rows.push(`工种：${user.work_types || '未配置'}\n负责楼栋：${user.repairer_buildings || '未配置'}`);
      wx.showModal({ title: '人员详情', content: rows.join('\n'), showCancel: false });
    } catch (error) { showError(error); }
  },
  async editUser(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const user = await request(`/admin/users/${id}`);
      const realName = await this.ask('姓名', user.real_name), account = realName === null ? null : await this.ask('登录账号', user.login_account);
      const phone = account === null ? null : await this.ask('电话', user.phone || '');
      if (realName === null || account === null || phone === null) return;
      const genderItems = ['不修改', '男', '女'];
      const genderIndex = await new Promise(resolve => wx.showActionSheet({ itemList: genderItems, success: result => resolve(result.tapIndex), fail: () => resolve(-1) }));
      if (genderIndex < 0) return;
      const payload = { roleCode: user.role_code, realName, account, phone, studentNo: user.student_no || '', employeeNo: user.employee_no || '', gender: genderIndex === 0 ? user.gender || '' : genderIndex === 1 ? 'MALE' : 'FEMALE', birthDate: user.birth_date || '' };
      if (user.role_code === 'STUDENT') Object.assign(payload, { classId: user.class_id || '', enrollmentStatus: user.enrollment_status || 'UNKNOWN' });
      else Object.assign(payload, { hireDate: user.hire_date || '' });
      await request(`/admin/users/${id}`, { method: 'PUT', data: payload });
      wx.showToast({ title: '人员资料已更新' }); this.load();
    } catch (error) { showError(error); }
  },
  async enabled(e) {
    const id = e.currentTarget.dataset.id, enabled = e.currentTarget.dataset.enabled !== 'true';
    try { await request(`/admin/users/${id}/enabled`, { method: 'PUT', data: { enabled } }); wx.showToast({ title: enabled ? '账号已启用' : '账号已禁用' }); this.load(); } catch (error) { showError(error); }
  },
  async createUser() {
    const roleIndex = await new Promise(resolve => wx.showActionSheet({ itemList: roleOptions.map(x => x[1]), success: result => resolve(result.tapIndex), fail: () => resolve(-1) }));
    if (roleIndex < 0) return;
    const roleCode = roleOptions[roleIndex][0];
    const realName = await this.ask('姓名'), account = realName === null ? null : await this.ask('登录账号');
    const password = account === null ? null : await this.ask('初始密码（至少6位）');
    if (!realName || !account || !password) return;
    let classId = '';
    if (roleCode === 'STUDENT') { classId = await this.ask('班级 ID（可留空）'); if (classId === null) return; }
    const genderIndex = await new Promise(resolve => wx.showActionSheet({ itemList: ['未填写', '男', '女'], success: result => resolve(result.tapIndex), fail: () => resolve(-1) }));
    if (genderIndex < 0) return;
    try {
      const number = await request(`/admin/users/next-number?roleCode=${roleCode}${classId ? `&classId=${classId}` : ''}`);
      const payload = { roleCode, realName, account, password, gender: ['', 'MALE', 'FEMALE'][genderIndex], phone: '', ...(roleCode === 'STUDENT' ? { classId: classId || '' } : {}) };
      await request('/admin/users', { method: 'POST', data: payload });
      wx.showModal({ title: '人员已创建', content: `${number.label}：${number.number}`, showCancel: false }); this.load();
    } catch (error) { showError(error); }
  },
  ask(title, value = '') { return new Promise(resolve => wx.showModal({ title, content: value, editable: true, success: result => resolve(result.confirm ? result.content.trim() : null) })); },
  async configureScope(e) {
    const user = e.currentTarget.dataset.user;
    const buildingIds = this.data.buildings.map(x => String(x.building_id));
    const ids = await this.ask(`负责楼栋 ID（逗号分隔）：${this.data.buildings.map(x => `${x.building_id} ${x.building_name}`).join('；')}`);
    if (ids === null) return;
    try {
      if (user.role_code === 'DORM_MANAGER') {
        const selected = ids.split(',').map(x => x.trim()).filter(Boolean);
        if (selected.length > 1) throw new Error('宿管只能负责一栋楼');
        await request(`/admin/managers/${user.user_id}/buildings`, { method: 'PUT', data: { buildingId: selected[0] || '' } });
      } else {
        const config = this.data.config || await request('/admin/repair-config');
        const worker = (config.workers || []).find(x => String(x.repairer_user_id) === String(user.user_id));
        const workTypeIdsRaw = await this.ask(`维修工种 ID（逗号分隔）：${config.workTypes.map(x => `${x.work_type_id} ${x.work_type_name}`).join('；')}`);
        if (workTypeIdsRaw === null) return;
        await request(`/admin/repairers/${user.user_id}`, { method: 'PUT', data: { onDuty: true, maxActiveOrders: worker?.max_active_orders || '', buildingIds: this.parseIds(ids, buildingIds), workTypeIds: this.parseIds(workTypeIdsRaw, config.workTypes.map(x => String(x.work_type_id))) } });
      }
      wx.showToast({ title: '负责范围已保存' }); this.load();
    } catch (error) { showError(error); }
  },
  parseIds(value, validIds) { return value.split(',').map(item => item.trim()).filter(Boolean).map(item => { if (!validIds.includes(item)) throw new Error(`无效编号：${item}`); return Number(item); }); },
  ruleInput(e) { this.setData({ [`config.rule.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  async saveRule() {
    try { await request('/admin/repair-rules', { method: 'POST', data: this.data.config.rule }); wx.showToast({ title: '维修规则已保存' }); this.load(); } catch (error) { showError(error); }
  },
  async deleteUser(e) {
    const id = e.currentTarget.dataset.id;
    const ok = await new Promise(resolve => wx.showModal({ title: '删除人员', content: '有关联业务记录时系统会保留记录并禁用账号。确定继续吗？', success: result => resolve(result.confirm) }));
    if (!ok) return;
    try { await request(`/admin/users/${id}`, { method: 'DELETE' }); wx.showToast({ title: '处理完成' }); this.load(); } catch (error) { showError(error); }
  }
});
