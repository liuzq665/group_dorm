/**
 * 只刷新验收最常用的两张工单夹具（不重建留宿数据）：
 *  - pendingReview：学生提交后的待审核工单
 *  - pendingAccept：宿管审核通过、自动派单给王师傅1 的待接单工单
 */
const fs = require('fs');
const path = require('path');
const { apiLogin } = require('./lib');

const BASE = 'http://127.0.0.1:8080/api/v1';
const ROOT = path.resolve(__dirname, '..', '..');
const FILE = path.join(ROOT, 'test-results', 'acceptance-fixtures.json');

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

  const detail = await api(student.token, 'GET', `/repair-orders/${pendingAccept}`);
  fixtures.generatedAt = new Date().toISOString();
  fixtures.pendingReview = pendingReview;
  fixtures.pendingAccept = pendingAccept;
  fs.writeFileSync(FILE, `${JSON.stringify(fixtures, null, 2)}\n`, 'utf8');
  console.log('已刷新夹具：pendingReview =', pendingReview, '（', detail.current_status, '）pendingAccept =', pendingAccept, '（', detail.current_status, '）');
  console.log('delayed =', fixtures.delayed, 'repaired =', fixtures.repaired);
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
