const { test } = require('node:test');
const assert = require('node:assert/strict');
const pager = require('../utils/pager');

const rows = Array.from({ length: 23 }, (_, index) => ({ id: index + 1 }));

test('分页：默认每页 10 条，页码越界自动收敛', () => {
  const first = pager.paginate(rows, 1, 10);
  assert.equal(first.page, 1);
  assert.equal(first.pageCount, 3);
  assert.equal(first.total, 23);
  assert.equal(first.items.length, 10);
  assert.equal(first.items[0].id, 1);

  const last = pager.paginate(rows, 3, 10);
  assert.equal(last.items.length, 3);
  assert.equal(last.items[0].id, 21);

  const overflow = pager.paginate(rows, 99, 10);
  assert.equal(overflow.page, 3, '页码越界应收敛到最后一页');
  const negative = pager.paginate(rows, -2, 10);
  assert.equal(negative.page, 1, '页码小于 1 应收敛到第一页');
});

test('分页：空列表仍返回第 1 页，避免页码显示 0 / 0', () => {
  const empty = pager.paginate([], 1, 10);
  assert.equal(empty.page, 1);
  assert.equal(empty.pageCount, 1);
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.items, []);
  assert.equal(pager.paginate(null, 2, 10).page, 1);
});

test('翻页步进不会越界', () => {
  assert.equal(pager.stepPage(1, 3, -1), 1);
  assert.equal(pager.stepPage(2, 3, 1), 3);
  assert.equal(pager.stepPage(3, 3, 1), 3);
  assert.equal(pager.stepPage(1, 1, 1), 1);
});

test('按年/月过滤记录支持多种时间格式', () => {
  assert.equal(pager.inYearMonth('2026-11-10T10:00:00', '2026', '11'), true);
  assert.equal(pager.inYearMonth('2026-11-10 10:00:00', '2026', ''), true);
  assert.equal(pager.inYearMonth('2026/11/10', '', '11'), true);
  assert.equal(pager.inYearMonth('2026-01-10', '2026', '11'), false);
  assert.equal(pager.inYearMonth('2025-11-10', '2026', ''), false);
  assert.equal(pager.inYearMonth(null, '2026', ''), false);
});

test('年份/月份选项包含“全部”并覆盖近 6 年', () => {
  const years = pager.yearOptions(2026, 6);
  assert.equal(years[0].label, '全部年份');
  assert.deepEqual(years.slice(1).map(item => item.key), ['2026', '2025', '2024', '2023', '2022', '2021']);
  const months = pager.monthOptions();
  assert.equal(months.length, 13);
  assert.equal(months[12].label, '12月');
});
