const { test } = require('node:test');
const assert = require('node:assert/strict');

test('saving a repair uploads every photo to /files and submits their IDs', async () => {
  let page;
  const uploads = [], requests = [];
  const original = { wx: global.wx, Page: global.Page, setTimeout: global.setTimeout };
  global.Page = value => { page = value; };
  global.setTimeout = () => 0;
  global.wx = {
    getStorageSync: () => ({ token: 'test-session' }),
    showLoading() {}, hideLoading() {},
    showToast(value) { assert.notEqual(value.icon, 'none', value.title); },
    uploadFile(options) {
      uploads.push(options);
      options.success({ statusCode: 200, data: JSON.stringify({ code: 0, data: { fileId: uploads.length } }) });
    },
    request(options) {
      requests.push(options);
      options.success({ statusCode: 200, data: { code: 0, data: { orderId: 10 } } });
    }
  };
  try {
    require('../pages/repair-form/index');
    page.data = { ...page.data, files: ['first.jpg', 'second.jpg'], form: { title: '漏水', description: '水龙头漏水', categoryId: '1' } };
    await page.save({ currentTarget: { dataset: { submit: 'true' } } });
    assert.equal(uploads.length, 2);
    for (const upload of uploads) {
      assert.ok(upload.url.endsWith('/api/v1/files'), upload.url);
      assert.equal(upload.header.Authorization, 'Bearer test-session');
    }
    assert.deepEqual(requests[0].data.fileIds, [1, 2]);
    assert.ok(requests[1].url.endsWith('/repair-orders/10/submit'));
  } finally {
    Object.assign(global, original);
  }
});
