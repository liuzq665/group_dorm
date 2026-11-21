const { test } = require('node:test');
const assert = require('node:assert/strict');

function createMiniProgramEnv() {
  const page = { current: null };
  const uploads = [];
  const requests = [];
  const original = { wx: global.wx, Page: global.Page, setTimeout: global.setTimeout };
  global.Page = value => { page.current = value; };
  global.setTimeout = () => 0;
  global.wx = {
    env: { USER_DATA_PATH: '/user-data' },
    getStorageSync: () => ({ token: 'test-session' }),
    showLoading() {},
    hideLoading() {},
    showToast(value) { assert.notEqual(value.icon, 'none', value.title); },
    compressImage(options) { options.success({ tempFilePath: `${options.src}.compressed` }); },
    getFileSystemManager() {
      return {
        readFile(options) { options.success({ data: '/9j/4AAQSkZJRg==' }); },
        copyFile(options) { assert.ok(options.destPath.endsWith('.jpg'), options.destPath); options.success(); }
      };
    },
    chooseMedia(options) {
      options.success({ tempFiles: [{ tempFilePath: 'wxfile://tmp/camera-1.heic' }, { tempFilePath: 'wxfile://tmp/camera-2.heic' }] });
    },
    uploadFile(options) {
      uploads.push(options);
      options.success({ statusCode: 200, data: JSON.stringify({ code: 0, data: { fileId: uploads.length } }) });
    },
    request(options) {
      requests.push(options);
      options.success({ statusCode: 200, data: { code: 0, data: {} } });
    }
  };
  return { page, uploads, requests, original };
}

function mount(env) {
  require('../pages/repair-detail/index');
  const page = env.page.current;
  page.data = { ...page.data, id: '9', actionBusy: false, resultModal: true, resultFiles: [], delayFiles: [] };
  page.setData = function setData(values) { Object.assign(this.data, values); };
  page.load = async () => {};
  return page;
}

test('result photos are compressed, labeled and uploaded per file path', async () => {
  const env = createMiniProgramEnv();
  try {
    const page = mount(env);
    page.data.resultText = '已更换水龙头并试水正常';
    await page.chooseResultPhotos();
    assert.equal(page.data.resultFiles.length, 2);
    for (const file of page.data.resultFiles) {
      assert.match(file.path, /^\/user-data\/repair-\d+-[\da-f]+\.jpg$/, file.path);
    }
    assert.deepEqual(page.data.resultFiles.map(file => file.name), ['现场照片1', '现场照片2']);
    await page.submitResult();
    assert.equal(env.uploads.length, 2);
    assert.deepEqual(env.uploads.map(upload => upload.filePath), page.data.resultFiles.map(file => file.path));
    const submitted = env.requests.find(item => item.url.endsWith('/repair-orders/9/result'));
    assert.deepEqual(submitted.data.fileIds, [1, 2]);
    assert.equal(page.data.resultModal, false);
  } finally {
    Object.assign(global, env.original);
    delete require.cache[require.resolve('../pages/repair-detail/index')];
  }
});

test('delay photos reuse the compressed picker and keep numbering after existing entries', async () => {
  const env = createMiniProgramEnv();
  try {
    const page = mount(env);
    page.data.delayModal = true;
    page.data.delayFiles = [{ path: '/user-data/repair-1-aa.jpg', name: '现场照片1' }];
    page.data.delayForm = { reason: '配件未到货', date: '2026-12-01', time: '10:00' };
    await page.chooseDelayPhotos();
    assert.deepEqual(page.data.delayFiles.map(file => file.name), ['现场照片1', '现场照片2', '现场照片3']);
    await page.submitDelay();
    assert.equal(env.uploads.length, 3);
    const submitted = env.requests.find(item => item.url.endsWith('/repair-orders/9/delay'));
    assert.deepEqual(submitted.data.fileIds, [1, 2, 3]);
  } finally {
    Object.assign(global, env.original);
    delete require.cache[require.resolve('../pages/repair-detail/index')];
  }
});
