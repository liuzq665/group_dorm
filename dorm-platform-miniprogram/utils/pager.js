/**
 * 分页工具 —— 统一列表分页口径（规范 C-10、G-08）。
 * 纯函数，便于单元测试；页面只负责把结果 setData。
 */

const DEFAULT_PAGE_SIZE = 10;

/** 计算页码与当前页数据，页码越界时自动收敛到有效范围。 */
function paginate(items = [], page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const list = Array.isArray(items) ? items : [];
  const size = Number(pageSize) > 0 ? Number(pageSize) : DEFAULT_PAGE_SIZE;
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Number(page) || 1), pageCount);
  return {
    total,
    pageSize: size,
    pageCount,
    page: current,
    items: list.slice((current - 1) * size, current * size)
  };
}

/** 上一页/下一页，返回合法页码。 */
function stepPage(page, pageCount, delta) {
  const next = (Number(page) || 1) + Number(delta || 0);
  return Math.min(Math.max(1, next), Math.max(1, Number(pageCount) || 1));
}

/** 按年份/月份过滤记录（value 支持 2026-11-10 / 2026/11/10 / 2026-11-10T10:00）。 */
function inYearMonth(value, year, month) {
  if (!value) return false;
  const text = String(value).replace('T', ' ').replace(/\//g, '-');
  const match = /^(\d{4})-(\d{2})/.exec(text);
  if (!match) return false;
  if (year && Number(match[1]) !== Number(year)) return false;
  if (month && Number(match[2]) !== Number(month)) return false;
  return true;
}

/** 年份下拉选项（近 N 年，默认包含全部年份）。 */
function yearOptions(currentYear, count = 6) {
  const list = [{ key: '', label: '全部年份' }];
  for (let index = 0; index < count; index += 1) {
    const year = Number(currentYear) - index;
    list.push({ key: String(year), label: `${year}年` });
  }
  return list;
}

function monthOptions() {
  const list = [{ key: '', label: '全部月份' }];
  for (let month = 1; month <= 12; month += 1) list.push({ key: String(month), label: `${month}月` });
  return list;
}

module.exports = { DEFAULT_PAGE_SIZE, paginate, stepPage, inYearMonth, yearOptions, monthOptions };
