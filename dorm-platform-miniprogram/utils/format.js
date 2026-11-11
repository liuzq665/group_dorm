/**
 * 状态、来源、时间与空值口径 —— 四端统一的唯一来源。
 * 规范：docs/小程序布局与交互设计规范.md 第 7 节。
 * 页面不得自行写死状态文案或来源文案。
 */

// 报修/留宿/业务通用状态文案。REPAIRED 统一为“待确认”：
// “已完成/已维修”表示维修人员完工但学生尚未确认，与“待确认”含义一致（问题四版、问题九版）。
const statusLabels = {
  DRAFT: '草稿',
  PENDING_EDIT: '待修改',
  PENDING_REVIEW: '待审核',
  UNDER_REVIEW: '审核中',
  PENDING_ASSIGN: '待派单',
  PENDING_MANUAL: '待人工处理',
  PENDING_ACCEPT: '待接单',
  ACCEPTED: '已接单',
  DELAYED: '维修延期',
  REPAIRED: '待确认',
  CONFIRMED: '已确认',
  APPROVED: '已通过',
  COMPLETED: '已完成',
  ARCHIVED: '已归档',
  CLOSED: '已关闭',
  CANCELLED: '已撤销',
  REJECTED: '已驳回',
  RETURNED: '已退回',
  TIMEOUT: '已超时',
  AUTO: '自动派单',
  MANUAL: '人工派单',
  PENDING: '待处理',
  SUCCESS: '成功',
  FAILED: '失败'
};

// 状态 -> 标签语义类（对应 app.wxss 的 .tag-*）
const toneByStatus = {
  PENDING_ACCEPT: 'tag-warning',
  DELAYED: 'tag-warning',
  REPAIRED: 'tag-warning',
  PENDING_REVIEW: 'tag-info',
  UNDER_REVIEW: 'tag-info',
  PENDING_ASSIGN: 'tag-info',
  ACCEPTED: 'tag-info',
  PENDING_EDIT: 'tag-danger',
  PENDING_MANUAL: 'tag-danger',
  CANCELLED: 'tag-muted',
  CONFIRMED: 'tag-done',
  APPROVED: 'tag-done',
  COMPLETED: 'tag-done',
  DRAFT: 'tag-muted',
  ARCHIVED: 'tag-muted',
  CLOSED: 'tag-muted',
  REJECTED: 'tag-danger',
  RETURNED: 'tag-danger'
};

// 派单方式/状态、审核结果等业务枚举的中文文案（禁止把技术枚举直接展示给用户）
const dispatchStatusLabels = {
  PENDING: '待接单',
  ACCEPTED: '已接单',
  REJECTED: '已拒单',
  TIMEOUT: '接单超时',
  REPAIR_TIMEOUT: '维修超时',
  REWORK_CLOSED: '重修关闭'
};

const resultLabels = {
  APPROVED: '已通过',
  REJECTED: '已驳回',
  RETURNED: '已退回',
  PENDING: '待处理'
};

// 消息来源（四端统一）——宿管端/管理员端可含“我发布的”，学生/维修端不含。
const sourceLabels = {
  ALL: '全部',
  SYSTEM: '系统通知',
  ADMIN: '系统管理员发布',
  DORM_MANAGER: '宿管发布',
  MINE: '我发布的'
};

const sourceOptionsByRole = {
  STUDENT: ['ALL', 'SYSTEM', 'ADMIN', 'DORM_MANAGER'],
  REPAIRER: ['ALL', 'SYSTEM', 'ADMIN', 'DORM_MANAGER'],
  DORM_MANAGER: ['ALL', 'SYSTEM', 'ADMIN', 'DORM_MANAGER', 'MINE'],
  ADMIN: ['ALL', 'SYSTEM', 'DORM_MANAGER', 'MINE']
};

function statusText(value) {
  return statusLabels[value] || value || '-';
}

/** 旧版语义类，保留给既有页面使用（'' / warning / done / danger）。 */
function statusClass(value) {
  if (['ARCHIVED', 'APPROVED', 'COMPLETED', 'CONFIRMED'].includes(value)) return 'done';
  if (['PENDING_EDIT', 'PENDING_MANUAL', 'CANCELLED', 'CLOSED', 'REJECTED'].includes(value)) return 'danger';
  if (['PENDING_REVIEW', 'PENDING_ASSIGN', 'PENDING_ACCEPT', 'UNDER_REVIEW', 'REPAIRED', 'DELAYED', 'ACCEPTED'].includes(value)) return 'warning';
  return '';
}

/** 新版标签语义类，对应 app.wxss 的 .tag-*。 */
function statusTone(value) {
  return toneByStatus[value] || 'tag-muted';
}

/** 统一空值：任何空字段显示 “-”。 */
function orDash(value) {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  return text === '' || text === 'null' || text === 'undefined' ? '-' : text;
}

/** 派单状态文案 */
function dispatchText(value) {
  return dispatchStatusLabels[value] || value || '-';
}

/** 审核/延期/评价处理结果文案 */
function resultText(value) {
  return resultLabels[value] || statusLabels[value] || value || '-';
}

/** 后端返回 ISO（2026-11-10T20:07:35）或 2026/11/10 20:07:35，列表展示到分钟。 */
function formatDateTime(value, withSeconds = false) {
  if (!value) return '-';
  const text = String(value).replace('T', ' ').replace(/\//g, '-').trim();
  if (withSeconds) return text.length >= 19 ? text.slice(0, 19) : text;
  return text.length >= 16 ? text.slice(0, 16) : text;
}

function formatDate(value) {
  if (!value) return '-';
  const text = String(value).replace('T', ' ');
  return text.slice(0, 10);
}

function ranges(items = []) {
  return items
    .map(item => `${item.startDate || item.start_date || '-'} 至 ${item.endDate || item.end_date || '-'}`)
    .join('；');
}

function sourceOptions(role) {
  return (sourceOptionsByRole[role] || sourceOptionsByRole.STUDENT).map(key => ({ key, label: sourceLabels[key] }));
}

/** 消息来源标签（与后端 source_label 对齐，作为兜底）。 */
function sourceText(publisherRole, isMine) {
  if (isMine) return sourceLabels.MINE;
  if (publisherRole === 'DORM_MANAGER') return sourceLabels.DORM_MANAGER;
  if (publisherRole === 'ADMIN') return sourceLabels.ADMIN;
  return sourceLabels.SYSTEM;
}

module.exports = {
  statusLabels,
  statusText,
  statusClass,
  statusTone,
  dispatchStatusLabels,
  resultLabels,
  dispatchText,
  resultText,
  sourceLabels,
  sourceOptions,
  sourceText,
  orDash,
  formatDateTime,
  formatDate,
  ranges
};
