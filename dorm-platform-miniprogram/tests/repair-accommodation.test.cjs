const { test } = require('node:test');
const assert = require('node:assert/strict');

test('repair form accepts the accommodation list returned by the API', async () => {
  let page;
  let modalCount = 0;
  const requestModule = require('../utils/request');
  const originalRequest = requestModule.request;
  const original = { wx: global.wx, Page: global.Page, getApp: global.getApp };

  requestModule.request = async path => {
    assert.equal(path, '/accommodations/current');
    return [{ room_id: 101, building_id: 1 }];
  };
  global.Page = value => { page = value; };
  global.getApp = () => ({ requireStudent: () => true });
  global.wx = { showModal() { modalCount += 1; } };

  try {
    delete require.cache[require.resolve('../pages/repair-form/index')];
    require('../pages/repair-form/index');
    await page.checkAccommodation.call({ data: { editing: false } });
    assert.equal(modalCount, 0);
  } finally {
    requestModule.request = originalRequest;
    Object.assign(global, original);
    delete require.cache[require.resolve('../pages/repair-form/index')];
  }
});
