/**
 * 只刷新验收最常用的两张工单夹具（不重建留宿数据）：
 *  - pendingReview：学生提交后的待审核工单
 *  - pendingAccept：宿管审核通过、自动派单给王师傅1 的待接单工单
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { apiLogin } = require('./lib');

const BASE = 'http://127.0.0.1:8080/api/v1';
const ROOT = path.resolve(__dirname, '..', '..');
const FILE = path.join(ROOT, 'test-results', 'acceptance-fixtures.json');
const MYSQL = 'D:\\software\\MySQL-8.0.46\\bin\\mysql.exe';

function pinRepairer(orderId, repairerId) {
  execFileSync(MYSQL, ['-uroot', '-p123456', '-D', 'dorm_platform', '-e',
    `UPDATE repair_dispatch SET repairer_user_id=${repairerId} WHERE order_id=${orderId} AND dispatch_status='PENDING';`],
    { stdio: 'pipe' });
}

async function api(token, method, url, body) {
  const response = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json = {};
  try { json = JSON.parse(text); } catch (error) { json = { raw: text }; }
  if (!response.ok) throw new Error(`${method} ${url} -> ${response.status} ${text.slice(0, 200)}`);
  return json.data;
}

async function createOrder(token, title) {
  const created = await api(token, 'POST', '/repair-orders', {
    title, categoryId: 1, description: '小程序端验收夹具：状态流转与页面交互验证。', location: '明德二号楼 102', urgent: false
  });
  await api(token, 'POST', `/repair-orders/${created.orderId}/submit`, {});
  return created.orderId;
}

(async () => {
  const fixtures = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const student = await apiLogin('student1');
  const manager = await apiLogin('manager3');

  const pendingReview = await createOrder(student.token, '验收-待审核');
  const pendingAccept = await createOrder(student.token, '验收-待接单');
  await api(manager.token, 'POST', `/repair-orders/${pendingAccept}/review`, { pass: true, reason: '验收夹具审核通过' });
  // 自动派单会按负荷轮转，可能落到新增的演示维修工身上；验收脚本固定用 repair1(3) 登录，这里把派单钉到 repair1
  pinRepairer(pendingAccept, 3);

  const detail = await api(student.token, 'GET', `/repair-orders/${pendingAccept}`);
  const assigned = (detail.dispatches || []).find(row => row.dispatch_status === 'PENDING');
  if (!assigned || Number(assigned.repairer_user_id) !== 3) {
    throw new Error(`待接单夹具未派给 repair1：${JSON.stringify(detail.dispatches || [])}`);
  }
  fixtures.generatedAt = new Date().toISOString();
  fixtures.pendingReview = pendingReview;
  fixtures.pendingAccept = pendingAccept;
  fs.writeFileSync(FILE, `${JSON.stringify(fixtures, null, 2)}\n`, 'utf8');
  console.log(`已刷新夹具：pendingReview = ${pendingReview}（PENDING_REVIEW）、pendingAccept = ${pendingAccept}（${detail.current_status}，派给 repair${assigned.repairer_user_id}）`);
  console.log('delayed =', fixtures.delayed, 'repaired =', fixtures.repaired);
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
