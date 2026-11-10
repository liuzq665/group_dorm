const { test } = require('node:test');
const assert = require('node:assert/strict');

let definition;
const requestModule = require('../utils/request');
const originalRequest = requestModule.request;
const originalPage = global.Page;

global.Page = value => { definition = value; };
requestModule.request = async path => {
  if (path.startsWith('/repair-orders')) return [
    { order_id: 1, current_status: 'PENDING_ACCEPT' },
    { order_id: 2, current_status: 'ACCEPTED' },
    { order_id: 3, current_status: 'DELAYED' },
    { order_id: 4, current_status: 'REPAIRED' },
    { order_id: 5, current_status: 'CONFIRMED' },
    { order_id: 6, current_status: 'PENDING_MANUAL' }
  ];
  return { statuses: [] };
};
requestModule.getSession = () => ({ user: { role: 'REPAIRER' } });
requestModule.showError = error => { throw error; };
require('../pages/repairs/index');

function pageFor(tab) {
  const page = {
    data: { tab, page: 1, pageSize: 10, filters: { keyword: '' } },
    setData(values) { Object.assign(this.data, values); }
  };
  return page;
}

test('repairer confirmation and completed categories retain their own statuses', async () => {
  const confirm = pageFor('confirm');
  await definition.load.call(confirm);
  assert.deepEqual(confirm.data.items.map(row => row.current_status), ['REPAIRED']);

  const completed = pageFor('completed');
  await definition.load.call(completed);
  assert.deepEqual(completed.data.items.map(row => row.current_status), ['CONFIRMED']);
});

test('repairer all category includes only statuses in the repair workflow', async () => {
  const page = pageFor('all');
  await definition.load.call(page);
  assert.deepEqual(page.data.items.map(row => row.current_status), ['PENDING_ACCEPT', 'ACCEPTED', 'DELAYED', 'REPAIRED', 'CONFIRMED']);
});

test.after(() => {
  requestModule.request = originalRequest;
  global.Page = originalPage;
});
