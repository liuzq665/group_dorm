const { test } = require('node:test');
const assert = require('node:assert/strict');

const requestModule = require('../utils/request');
const original = { request: requestModule.request, getSession: requestModule.getSession, showError: requestModule.showError, Page: global.Page };

const active = [
  { order_id: 1, title: '水龙头漏水', current_status: 'PENDING_REVIEW', order_no: 'WX1', updated_at: '2026-11-10T10:00:00' },
  { order_id: 2, title: '灯管损坏', current_status: 'PENDING_MANUAL', order_no: 'WX2', updated_at: '2026-11-10T11:00:00' },
  { order_id: 3, title: '门锁损坏', current_status: 'PENDING_ACCEPT', order_no: 'WX3', updated_at: '2026-11-10T12:00:00' },
  { order_id: 4, title: '水管漏水', current_status: 'ACCEPTED', order_no: 'WX4', updated_at: '2026-11-10T13:00:00' },
  { order_id: 5, title: '马桶堵塞', current_status: 'DELAYED', order_no: 'WX5', updated_at: '2026-11-10T14:00:00' },
  { order_id: 6, title: '空调不制冷', current_status: 'REPAIRED', order_no: 'WX6', updated_at: '2026-11-10T15:00:00' },
  { order_id: 7, title: '草稿报修', current_status: 'DRAFT', order_no: 'WX7', updated_at: '2026-11-10T09:00:00' }
];
const history = [
  { order_id: 8, title: '已归档工单', current_status: 'ARCHIVED', order_no: 'WX8', updated_at: '2026-10-01T10:00:00' }
];

function loadPage(role) {
  delete require.cache[require.resolve('../pages/repairs/index')];
  requestModule.request = async path => {
    if (path.startsWith('/repair-history')) return history;
    if (path.startsWith('/repair-orders')) return active;
    throw new Error(`未知请求 ${path}`);
  };
  requestModule.getSession = () => ({ user: { role } });
  requestModule.showError = error => { throw error; };
  let definition;
  global.Page = value => { definition = value; };
  require('../pages/repairs/index');
  const page = {
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(values) { Object.assign(this.data, values); }
  };
  for (const [key, value] of Object.entries(definition)) {
    if (typeof value === 'function') page[key] = value;
  }
  return { definition, page };
}

test('学生端分类固定展示，包含待审核/待人工处理/待接单/已接单/待确认/已完成/历史记录', async () => {
  const { definition, page } = loadPage('STUDENT');
  await definition.load.call(page);
  const labels = page.data.tabs.map(tab => tab.label);
  assert.deepEqual(labels, ['全部', '待审核', '待人工处理', '待接单', '已接单', '待确认', '已完成', '历史记录']);
  const counts = Object.fromEntries(page.data.tabs.map(tab => [tab.key, tab.count]));
  assert.equal(counts.review, 1);
  assert.equal(counts.manual, 1);
  assert.equal(counts.accept, 1);
  assert.equal(counts.accepted, 2, '已接单应同时包含 ACCEPTED 与 DELAYED');
  assert.equal(counts.confirm, 1);
  assert.equal(counts.history, 1, '历史分类数量来自 /repair-history');
});

test('全部分类不包含历史归档工单，历史分类只包含归档工单', async () => {
  const { definition, page } = loadPage('STUDENT');
  await definition.load.call(page);
  assert.equal(page.data.items.some(item => item.current_status === 'ARCHIVED'), false);
  definition.chooseTab.call(page, { currentTarget: { dataset: { tab: 'history' } } });
  assert.deepEqual(page.data.items.map(item => item.current_status), ['ARCHIVED']);
});

test('状态文案使用统一口径：REPAIRED 显示“待确认”，ACCEPTED 显示“已接单”', async () => {
  const { definition, page } = loadPage('STUDENT');
  await definition.load.call(page);
  const byStatus = Object.fromEntries(page.data.items.map(item => [item.current_status, item.statusLabel]));
  assert.equal(byStatus.REPAIRED, '待确认');
  assert.equal(byStatus.ACCEPTED, '已接单');
  assert.equal(byStatus.PENDING_MANUAL, '待人工处理');
});

test('维修端分类包含待接单/维修中/延期/待确认，且不出现学生端分类', async () => {
  const { definition, page } = loadPage('REPAIRER');
  await definition.load.call(page);
  const labels = page.data.tabs.map(tab => tab.label);
  assert.deepEqual(labels, ['全部', '待接单', '维修中', '延期', '待确认', '已确认', '历史记录']);
});

test('分页每页 10 条，超过一页时页码稳定', async () => {
  const { definition, page } = loadPage('STUDENT');
  page.data.pageSize = 2;
  await definition.load.call(page);
  assert.equal(page.data.pageCount, Math.ceil(page.data.items.length / 2));
  assert.equal(page.data.pageItems.length, 2);
  definition.changePage.call(page, { currentTarget: { dataset: { delta: '1' } } });
  assert.equal(page.data.page, 2);
  assert.equal(page.data.pageItems.length, 2);
  assert.notEqual(page.data.pageItems[0].order_id, active[6].order_id);
});

test.after(() => {
  requestModule.request = original.request;
  requestModule.getSession = original.getSession;
  requestModule.showError = original.showError;
  global.Page = original.Page;
});
