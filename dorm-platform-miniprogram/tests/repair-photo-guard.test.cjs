const { test } = require('node:test');
const assert = require('node:assert/strict');

function setup(options = {}) {
  const page = { current: null };
  const modals = [];
  const requests = [];
  const original = { wx: global.wx, Page: global.Page, setTimeout: global.setTimeout };
  global.Page = value => { page.current = value; };
  global.setTimeout = () => 0;
  global.wx = {
    env: { USER_DATA_PATH: '/user-data' },
    getStorageSync: () => ({ token: 'test-session' }),
    showLoading() {},
    hideLoading() {},
    showToast() {},
    showModal(value) { modals.push(value); value.success({ confirm: options.confirm !== false, cancel: options.confirm === false }); },
    chooseMedia(value) { value.success({ tempFiles: [] }); },
    uploadFile(value) { value.success({ statusCode: 200, data: JSON.stringify({ code: 0, data: { fileId: 1 } }) }); },
    request(value) {
      requests.push(value);
      value.success({ statusCode: 200, data: { code: 0, data: { orderId: 21 } } });
    }
  };
  return { page, modals, requests, original };
}

function mountRepairForm(env, data) {
  require('../pages/repair-form/index');
  const page = env.page.current;
  page.data = {
    ...page.data,
    categories: [{ id: 1, name: '水暖维修' }],
    categoryIndex: 0,
    categoryName: '水暖维修',
    categoryChosen: true,
    form: { title: '漏水', description: '水龙头漏水' },
    files: [],
    existing: [],
    ...data
  };
  page.setData = function setData(values) { Object.assign(this.data, values); };
  page.load = async () => {};
  return page;
}

test('submitting a repair without photos asks for confirmation first', async () => {
  const env = setup({ confirm: true });
  try {
    const page = mountRepairForm(env);
    await page.save({ currentTarget: { dataset: { submit: 'true' } } });
    assert.equal(env.modals.length, 1);
    assert.equal(env.modals[0].title, '还没有现场照片');
    assert.equal(env.modals[0].confirmText, '继续提交');
    assert.equal(env.modals[0].cancelText, '去选照片');
    const created = env.requests.find(item => item.url.endsWith('/repair-orders') && item.method === 'POST');
    assert.ok(created, 'confirming without photos still creates the order');
    assert.deepEqual(created.data.fileIds, []);
  } finally {
    Object.assign(global, env.original);
    delete require.cache[require.resolve('../pages/repair-form/index')];
  }
});

test('cancelling the empty-photo confirmation opens the picker instead of submitting', async () => {
  const env = setup({ confirm: false });
  try {
    const page = mountRepairForm(env);
    let picked = 0;
    page.choose = () => { picked += 1; };
    await page.save({ currentTarget: { dataset: { submit: 'true' } } });
    assert.equal(picked, 1);
    assert.equal(env.requests.length, 0);
  } finally {
    Object.assign(global, env.original);
    delete require.cache[require.resolve('../pages/repair-form/index')];
  }
});

test('existing attachments skip the empty-photo confirmation', async () => {
  const env = setup({ confirm: true });
  try {
    const page = mountRepairForm(env, { editing: true, orderId: '8', existing: [{ file_id: 5, original_name: 'a.png' }] });
    await page.save({ currentTarget: { dataset: { submit: 'true' } } });
    assert.equal(env.modals.length, 0);
    assert.ok(env.requests.some(item => item.url.endsWith('/repair-orders/8')));
  } finally {
    Object.assign(global, env.original);
    delete require.cache[require.resolve('../pages/repair-form/index')];
  }
});
