const { test } = require('node:test');
const assert = require('node:assert/strict');
const format = require('../utils/format');

test('状态文案统一：REPAIRED 为“待确认”，不存在“已维修/已完成”混用', () => {
  assert.equal(format.statusText('REPAIRED'), '待确认');
  assert.equal(format.statusText('CONFIRMED'), '已确认');
  assert.equal(format.statusText('ACCEPTED'), '已接单');
  assert.equal(format.statusText('DELAYED'), '维修延期');
  assert.equal(format.statusText('PENDING_MANUAL'), '待人工处理');
  assert.equal(format.statusText('ARCHIVED'), '已归档');
  assert.equal(format.statusText(null), '-');
});

test('状态标签语义类覆盖待处理、完成、异常与中性', () => {
  assert.equal(format.statusTone('PENDING_ACCEPT'), 'tag-warning');
  assert.equal(format.statusTone('REPAIRED'), 'tag-warning');
  assert.equal(format.statusTone('APPROVED'), 'tag-done');
  assert.equal(format.statusTone('PENDING_MANUAL'), 'tag-danger');
  assert.equal(format.statusTone('ARCHIVED'), 'tag-muted');
  assert.equal(format.statusTone('UNKNOWN_STATUS'), 'tag-muted');
});

test('消息来源分类：学生/维修端不含“我发布的”，宿管/管理员端包含', () => {
  assert.deepEqual(format.sourceOptions('STUDENT').map(item => item.label), ['全部', '系统通知', '系统管理员发布', '宿管发布']);
  assert.deepEqual(format.sourceOptions('REPAIRER').map(item => item.label), ['全部', '系统通知', '系统管理员发布', '宿管发布']);
  assert.ok(format.sourceOptions('DORM_MANAGER').some(item => item.label === '我发布的'));
  assert.ok(format.sourceOptions('ADMIN').some(item => item.label === '我发布的'));
  assert.equal(format.sourceLabels.ALL, '全部');
});

test('发布人来源兜底：系统通知=系统，宿管发布=宿管发布', () => {
  assert.equal(format.sourceText(null, false), '系统通知');
  assert.equal(format.sourceText('DORM_MANAGER', false), '宿管发布');
  assert.equal(format.sourceText('ADMIN', false), '系统管理员发布');
  assert.equal(format.sourceText('ADMIN', true), '我发布的');
});

test('空值统一显示 “-”，时间按 YYYY-MM-DD HH:mm 输出', () => {
  assert.equal(format.orDash(null), '-');
  assert.equal(format.orDash(''), '-');
  assert.equal(format.orDash('  '), '-');
  assert.equal(format.orDash('A栋'), 'A栋');
  assert.equal(format.formatDateTime('2026-11-10T20:07:35'), '2026-11-10 20:07');
  assert.equal(format.formatDateTime('2026-11-10T20:07:35', true), '2026-11-10 20:07:35');
  assert.equal(format.formatDateTime(null), '-');
  assert.equal(format.formatDate('2026-11-10 20:07:35'), '2026-11-10');
});

test('留宿日期段格式统一', () => {
  assert.equal(
    format.ranges([
      { startDate: '2026-01-10', endDate: '2026-01-12' },
      { startDate: '2026-01-20', endDate: '2026-01-22' }
    ]),
    '2026-01-10 至 2026-01-12；2026-01-20 至 2026-01-22'
  );
  assert.equal(format.ranges([]), '');
});
