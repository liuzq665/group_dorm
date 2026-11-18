/**
 * 验收夹具：通过真实接口创建各状态的报修/留宿数据，供小程序页面级验收使用。
 * 只创建本次验收需要的数据，不改动既有数据。
 */
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'http://127.0.0.1:8080/api/v1';
const IMAGE = path.join(__dirname, '..', '..', 'test-results', 'visual', '通用', 'login.png');

async function login(account, password = '123456') {
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loginAccount: account, password })
  });
  const body = await response.json();
  if (body.code !== 0) throw new Error(`登录 ${account} 失败：${body.message}`);
  return body.data;
}

async function call(session, method, apiPath, data) {
  const response = await fetch(`${BASE}${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.token}`,
      ...(data === undefined ? {} : { 'content-type': 'application/json' })
    },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  const body = await response.json().catch(() => ({}));
  if (body.code !== 0) throw new Error(`${method} ${apiPath} 失败（${response.status}）：${body.message || JSON.stringify(body)}`);
  return body.data;
}

async function upload(session, apiPath = '/files') {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(IMAGE)], { type: 'image/png' }), 'acceptance.png');
  const response = await fetch(`${BASE}${apiPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}` },
    body: form
  });
  const body = await response.json();
  if (body.code !== 0) throw new Error(`上传失败：${body.message}`);
  return body.data.fileId ?? body.data.id;
}

function plusMinutes(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString().slice(0, 19).replace('T', ' ');
}

/** 新建报修并提交审核，返回 orderId */
async function createSubmittedOrder(student, { title, categoryId = null, fileIds = [] } = {}) {
  const catalog = await call(student, 'GET', '/repair-catalog');
  const category = categoryId || (catalog.categories[0] && catalog.categories[0].id);
  const created = await call(student, 'POST', '/repair-orders', {
    title: title || `验收夹具 ${Date.now() % 100000}`,
    description: '小程序端系统性验收自动创建，用于验证状态流转与页面交互。',
    categoryId: category,
    fileIds
  });
  const orderId = created.orderId;
  await call(student, 'POST', `/repair-orders/${orderId}/submit`);
  return orderId;
}

/** 宿管审核通过（触发自动派单）；返回订单详情 */
async function reviewPass(manager, orderId) {
  await call(manager, 'POST', `/repair-orders/${orderId}/review`, { pass: true, reason: '验收审核通过' });
  return call(manager, 'GET', `/repair-orders/${orderId}`);
}

/** 若自动派单没有落到 repair1，则由宿管强制派单给 repair1 */
async function ensureAssignedTo(manager, orderId, repairerUserId, detail) {
  const current = detail || (await call(manager, 'GET', `/repair-orders/${orderId}`));
  if (['PENDING_ACCEPT', 'ACCEPTED', 'DELAYED', 'REPAIRED'].includes(current.current_status)) return current;
  if (!['PENDING_ASSIGN', 'PENDING_MANUAL'].includes(current.current_status)) return current;
  const candidates = await call(manager, 'GET', `/repair-orders/${orderId}/candidates`);
  const target = candidates.find(row => Number(row.repairer_user_id ?? row.repairerUserId ?? row.id) === Number(repairerUserId)) || candidates[0];
  if (!target) throw new Error(`工单 ${orderId} 无可派维修人员`);
  await call(manager, 'POST', `/repair-orders/${orderId}/dispatch`, {
    repairerUserId: target.repairer_user_id ?? target.repairerUserId ?? target.id
  });
  return call(manager, 'GET', `/repair-orders/${orderId}`);
}

/** 维修人员接单 */
async function acceptOrder(repairer, orderId) {
  await call(repairer, 'POST', `/repair-orders/${orderId}/decision`, { accept: true, reason: '' });
  return call(repairer, 'GET', `/repair-orders/${orderId}`);
}

async function submitResult(repairer, orderId, fileId) {
  await call(repairer, 'POST', `/repair-orders/${orderId}/result`, {
    result: '验收：已更换配件并测试正常',
    fileIds: [fileId]
  });
  return call(repairer, 'GET', `/repair-orders/${orderId}`);
}

async function requestDelay(repairer, orderId, fileId) {
  const detail = await call(repairer, 'GET', `/repair-orders/${orderId}`);
  const deadline = detail.repair_deadline || detail.dispatch_repair_deadline;
  const expected = new Date(Math.max(Date.now() + 26 * 3600_000, new Date(deadline).getTime() + 26 * 3600_000));
  await call(repairer, 'POST', `/repair-orders/${orderId}/delay`, {
    reason: '验收：等待厂家配件到货',
    expectedFinishAt: expected.toISOString().slice(0, 19).replace('T', ' '),
    fileIds: [fileId]
  });
  return call(repairer, 'GET', `/repair-orders/${orderId}`);
}

/** 学生留宿：在指定批次创建草稿 */
async function createStayDraft(student, batchId) {
  const batches = await call(student, 'GET', '/stay/current');
  const batch = batches.find(row => Number(row.batch_id) === Number(batchId)) || batches[0];
  if (!batch) throw new Error('没有开放中的留宿批次');
  const start = new Date(new Date(batch.open_start_date || batch.openStartDate).getTime() + 24 * 3600_000);
  const end = new Date(start.getTime() + 2 * 24 * 3600_000);
  const fileId = await upload(student, '/stay/applications/files');
  const created = await call(student, 'POST', '/stay/applications', {
    batchId: batch.batch_id,
    reason: '小程序端验收自动创建（留宿闭环）',
    dateRanges: [{
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    }],
    fileIds: [fileId]
  });
  return { applicationId: created.applicationId ?? created.application_id, batch };
}

async function submitStay(student, applicationId) {
  await call(student, 'POST', `/stay/applications/${applicationId}/submit`);
  return call(student, 'GET', `/stay/applications/${applicationId}`);
}

async function main() {
  const [student, manager, repairer, admin] = await Promise.all([
    login('student1'), login('manager3'), login('repair1'), login('admin')
  ]);
  const out = { generatedAt: new Date().toISOString() };
  const photo = await upload(repairer);

  // 1) 待接单（维修人员接单/拒单弹层）
  let order = await createSubmittedOrder(student, { title: '验收-待接单' });
  let detail = await reviewPass(manager, order);
  detail = await ensureAssignedTo(manager, order, 3, detail);
  out.pendingAccept = detail.order_id;

  // 2) 已延期（宿管延期复核）
  order = await createSubmittedOrder(student, { title: '验收-延期' });
  detail = await ensureAssignedTo(manager, order, 3, await reviewPass(manager, order));
  await acceptOrder(repairer, order);
  detail = await requestDelay(repairer, order, photo);
  out.delayed = detail.order_id;

  // 3) 已维修（学生确认/申请重修弹层）
  order = await createSubmittedOrder(student, { title: '验收-待确认' });
  detail = await ensureAssignedTo(manager, order, 3, await reviewPass(manager, order));
  await acceptOrder(repairer, order);
  detail = await submitResult(repairer, order, photo);
  out.repaired = detail.order_id;

  // 4) 待审核（学生撤销、宿管审核）
  order = await createSubmittedOrder(student, { title: '验收-待审核' });
  out.pendingReview = order;

  // 5) 留宿：待审核（宿管“进入审核”）+ 新建草稿（学生可编辑）
  const stay = await createStayDraft(student, 41);
  out.stayDraft = stay.applicationId;
  const submitted = await submitStay(student, stay.applicationId);
  out.stayPendingReview = submitted.application_id;
  const draft = await createStayDraft(student, 41);
  out.stayEditDraft = draft.applicationId;

  // 6) 管理员侧：待人工派单（强制派单弹窗？列表操作）
  out.admin = { ok: true };
  fs.writeFileSync(path.join(__dirname, '..', '..', 'test-results', 'acceptance-fixtures.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exit(1); });
module.exports = { login, call, upload, createSubmittedOrder, reviewPass, ensureAssignedTo, acceptOrder, submitResult, requestDelay, createStayDraft, submitStay, IMAGE };
