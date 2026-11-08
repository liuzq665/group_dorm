const labels = { DRAFT:'草稿', PENDING_REVIEW:'待审核', PENDING_EDIT:'待修改', UNDER_REVIEW:'审核中', PENDING_ASSIGN:'待派单', PENDING_ACCEPT:'待接单', ACCEPTED:'已接单', DELAYED:'维修延期', REPAIRED:'已维修', CONFIRMED:'已确认', ARCHIVED:'已归档', APPROVED:'已通过', COMPLETED:'已完成', CANCELLED:'已撤销', CLOSED:'已关闭', PENDING_MANUAL:'待人工处理' };
function statusText(value) { return labels[value] || value || '-'; }
function statusClass(value) { return ['ARCHIVED','APPROVED','COMPLETED','CONFIRMED'].includes(value) ? 'done' : ['PENDING_EDIT','PENDING_MANUAL','CANCELLED','CLOSED'].includes(value) ? 'danger' : ['PENDING_REVIEW','PENDING_ASSIGN','PENDING_ACCEPT','UNDER_REVIEW','REPAIRED'].includes(value) ? 'warning' : ''; }
function ranges(items = []) { return items.map(item => `${item.startDate || item.start_date} 至 ${item.endDate || item.end_date}`).join('；'); }
module.exports = { statusText, statusClass, ranges };
