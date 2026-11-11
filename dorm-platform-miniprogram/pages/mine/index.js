const { request, clearSession, showError, getSession } = require('../../utils/request');
const { orDash, formatDate } = require('../../utils/format');

const roleLabels = { STUDENT: '学生', REPAIRER: '维修人员', DORM_MANAGER: '宿管', ADMIN: '系统管理员' };
const genderOptions = ['未填写', '男', '女'];

Page({
  data: {
    loading: true,
    role: '',
    roleLabel: '',
    profile: {},
    rows: [],
    editing: false,
    form: {},
    genderOptions,
    genderIndex: 0,
    oldPassword: '',
    newPassword: '',
    actionBusy: false
  },
  onShow() {
    if (getApp().requireRole(['STUDENT', 'DORM_MANAGER', 'REPAIRER', 'ADMIN'])) {
      this.setData({ role: getSession().user.role, roleLabel: roleLabels[getSession().user.role] || '' });
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
      const profile = await request('/profile');
      const genderIndex = Math.max(0, ['MALE', 'FEMALE'].indexOf(profile.gender) + 1);
      this.setData({
        profile,
        rows: this.buildRows(profile),
        form: { phone: profile.phone || '', gender: profile.gender || '', birthDate: profile.birth_date || '' },
        genderIndex
      });
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  buildRows(profile) {
    const role = this.data.role;
    const rows = [
      { label: '登录账号', value: orDash(profile.login_account) },
      { label: '姓名', value: orDash(profile.real_name) },
      { label: '联系电话', value: orDash(profile.phone) },
      { label: '性别', value: profile.gender === 'MALE' ? '男' : profile.gender === 'FEMALE' ? '女' : '-' },
      { label: '出生日期', value: profile.birth_date ? formatDate(profile.birth_date) : '-' }
    ];
    if (role === 'STUDENT') {
      rows.splice(2, 0, { label: '学号', value: orDash(profile.student_no) });
      rows.push(
        { label: '学院', value: orDash(profile.department_name) },
        { label: '专业', value: orDash(profile.major_name) },
        { label: '班级', value: orDash(profile.class_name) },
        { label: '学籍状态', value: orDash(profile.enrollment_status) }
      );
    } else {
      rows.splice(2, 0, { label: '工号', value: orDash(profile.employee_no) });
      if (role === 'REPAIRER') {
        rows.push(
          { label: '维修工种', value: orDash(profile.work_types) },
          { label: '负责楼栋', value: orDash(profile.repairer_buildings) },
          { label: '在岗状态', value: profile.on_duty ? '在岗' : '休息' },
          { label: '在办工单', value: orDash(profile.active_orders) }
        );
      }
      if (role === 'DORM_MANAGER') rows.push({ label: '负责楼栋', value: orDash(profile.manager_buildings) });
    }
    return rows;
  },
  input(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  toggleEdit() {
    this.setData({ editing: true });
  },
  cancelEdit() {
    this.setData({ editing: false });
  },
  genderChange(event) {
    const index = Number(event.detail.value);
    this.setData({ genderIndex: index, 'form.gender': ['', 'MALE', 'FEMALE'][index] });
  },
  birthChange(event) {
    this.setData({ 'form.birthDate': event.detail.value });
  },
  passwordInput(event) {
    this.setData({ [event.currentTarget.dataset.key]: event.detail.value });
  },
  async save() {
    if (this.data.actionBusy) return;
    this.setData({ actionBusy: true });
    try {
      await request('/profile', { method: 'PUT', data: this.data.form });
      wx.showToast({ title: '资料已保存' });
      this.setData({ editing: false });
      await this.load();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ actionBusy: false });
    }
  },
  async changePassword() {
    const { oldPassword, newPassword } = this.data;
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      wx.showToast({ title: '请输入原密码和至少 6 位新密码', icon: 'none' });
      return;
    }
    try {
      await request('/profile/password', { method: 'PUT', data: { oldPassword, newPassword } });
      wx.showToast({ title: '密码已修改，请重新登录', icon: 'none' });
      clearSession();
      setTimeout(() => wx.reLaunch({ url: '/pages/login/index' }), 800);
    } catch (error) {
      showError(error);
    }
  },
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号吗？',
      success: async result => {
        if (!result.confirm) return;
        try {
          await request('/auth/logout', { method: 'POST' });
        } catch (error) {
          /* 退出接口失败也要清理本地会话 */
        } finally {
          clearSession();
          wx.reLaunch({ url: '/pages/login/index' });
        }
      }
    });
  }
});
