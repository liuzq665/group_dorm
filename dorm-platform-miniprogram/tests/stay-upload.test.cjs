const { test } = require('node:test');
const assert = require('node:assert/strict');

test('saving a stay application normalizes selected images and submits uploaded file IDs', async () => {
  let page;
  const uploads = [], requests = [];
  const original = { wx: global.wx, Page: global.Page, setTimeout: global.setTimeout };
  global.Page = value => { page = value; };
  global.setTimeout = () => 0;
  global.wx = {
    env: { USER_DATA_PATH: '/user-data' },
    getStorageSync: () => ({ token: 'test-session' }),
    showLoading() {}, hideLoading() {},
    showToast(value) { assert.notEqual(value.icon, 'none', value.title); },
    compressImage(options) { options.success({ tempFilePath: `${options.src}.compressed` }); },
    getFileSystemManager() { return {
      readFile(options) { assert.equal(options.encoding, 'base64'); options.success({ data: 'iVBORw0KGgoAAAANSUhEUg==' }); },
      copyFile(options) { assert.ok(options.destPath.endsWith('.png')); options.success(); }
    }; },
    uploadFile(options) {
      uploads.push(options);
      options.success({ statusCode: 200, data: JSON.stringify({ code: 0, data: { fileId: 31 } }) });
    },
    request(options) {
      requests.push(options);
      options.success({ statusCode: 200, data: { code: 0, data: { applicationId: 12 } } });
    }
  };
  try {
    require('../pages/stay-form/index');
    page.data = {
      ...page.data,
      batchId: '2', reason: '家庭原因', ranges: [{ startDate: '2026-12-01', endDate: '2026-12-02' }],
      batch: { open_start_date: '2026-11-01', open_end_date: '2026-12-31' },
      files: ['photo.heic'], existing: []
    };
    page.setData = function setData(values) { Object.assign(this.data, values); };
    assert.match(await page.normalizeImage('photo.heic'), /^\/user-data\/stay-\d+-[\da-f]+\.png$/);
    await page.save({ currentTarget: { dataset: { submit: 'true' } } });
    assert.equal(uploads.length, 1);
    assert.ok(uploads[0].url.endsWith('/api/v1/stay/applications/files'));
    assert.deepEqual(requests[0].data.fileIds, [31]);
    assert.ok(requests[1].url.endsWith('/stay/applications/12/submit'));
  } finally {
    Object.assign(global, original);
    delete require.cache[require.resolve('../pages/stay-form/index')];
  }
});
