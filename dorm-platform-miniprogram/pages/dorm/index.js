const { request, showError, getSession } = require('../../utils/request');

Page({
  data: { loading: true, role: '', tab: 'buildings', buildings: [], rooms: [], beds: [], students: [] },
  onShow() {
    const role = getSession()?.user?.role;
    if (getApp().requireRole(['DORM_MANAGER', 'ADMIN'])) { this.setData({ role }); this.load(); }
  },
  async load() {
    this.setData({ loading: true });
    try {
      const [buildings, rooms, beds] = await Promise.all([request('/buildings'), request('/rooms'), request('/beds')]);
      this.setData({ buildings, rooms, beds });
    } catch (error) { showError(error); } finally { this.setData({ loading: false }); }
  },
  selectTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); },
  showDetail(e) {
    const row = e.currentTarget.dataset.row;
    const text = this.data.tab === 'buildings'
      ? `${row.address || ''}\n宿舍：${row.room_count || 0} 间\n总床位：${row.bed_count || 0} · 空闲：${row.available_bed_count || 0}`
      : this.data.tab === 'rooms'
        ? `${row.building_name} ${row.room_no}\n楼层：${row.floor_no}\n性别限制：${row.gender_limit}\n床位：${row.bed_count || 0} · 空闲：${row.available_bed_count || 0}`
        : `${row.building_name} ${row.room_no} ${row.bed_no}\n状态：${row.management_status === 'AVAILABLE' ? '启用' : '停用'}\n入住学生：${row.student_name || '空床'}`;
    wx.showModal({ title: this.data.tab === 'buildings' ? row.building_name : this.data.tab === 'rooms' ? `${row.building_name} ${row.room_no}` : `床位 ${row.bed_no}`, content: text, showCancel: false });
  },
  async create() {
    const type = this.data.tab;
    const form = type === 'buildings'
      ? { buildingCode: await this.ask('楼栋编码'), buildingName: await this.ask('楼栋名称'), address: await this.ask('楼栋地址'), genderLimit: await this.chooseGender() }
      : type === 'rooms'
        ? { buildingId: await this.ask('所属楼栋 ID'), roomNo: await this.ask('宿舍号'), floorNo: Number(await this.ask('楼层')), designCapacity: Number(await this.ask('床位容量')), genderLimit: await this.chooseGender(true) }
        : { roomId: await this.ask('所属宿舍 ID'), bedNo: await this.ask('床位号'), managementStatus: 'AVAILABLE' };
    if (Object.values(form).some(value => value === null || value === '')) return;
    try { await request(`/admin/resources/${type}`, { method: 'POST', data: form }); wx.showToast({ title: '已新增' }); this.load(); } catch (error) { showError(error); }
  },
  ask(title) { return new Promise(resolve => wx.showModal({ title, editable: true, success: result => resolve(result.confirm ? result.content.trim() : null) })); },
  chooseGender(room = false) {
    const options = room ? ['男生', '女生'] : ['男生', '女生', '混合'];
    return new Promise(resolve => wx.showActionSheet({ itemList: options, success: result => resolve(options[result.tapIndex]), fail: () => resolve(null) }));
  },
  async assign() {
    const studentId = await this.ask('学生用户 ID');
    if (studentId === null) return;
    const bedId = await this.ask('目标床位 ID');
    if (bedId === null) return;
    try { await request('/admin/assignments', { method: 'POST', data: { studentId: Number(studentId), bedId: Number(bedId) } }); wx.showToast({ title: '住宿已分配' }); this.load(); } catch (error) { showError(error); }
  }
});
