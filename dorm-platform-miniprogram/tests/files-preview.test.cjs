const { test } = require('node:test');
const assert = require('node:assert/strict');

const { previewAttachment, attachmentExtension, isImageAttachment } = require('../utils/files');

function createEnv(download = { statusCode: 200, tempFilePath: 'http://tmp/download-no-extension' }) {
  const calls = { previewImage: [], openDocument: [], copyFile: [], toast: [] };
  const original = { wx: global.wx };
  global.wx = {
    env: { USER_DATA_PATH: '/user-data' },
    downloadFile(options) { options.success(download); },
    previewImage(options) { calls.previewImage.push(options.urls[0]); },
    openDocument(options) { calls.openDocument.push(options.filePath); },
    showToast(options) { calls.toast.push(options.title); },
    getFileSystemManager() {
      return {
        copyFile(options) { calls.copyFile.push(options.destPath); options.success(); }
      };
    }
  };
  return { calls, original };
}

function restore(env) { Object.assign(global, env.original); }

test('attachmentExtension prefers the original file name and falls back to content type', () => {
  assert.equal(attachmentExtension({ original_name: '现场照片.PNG' }), 'png');
  assert.equal(attachmentExtension({ original_name: '验收报告.docx' }), 'docx');
  assert.equal(attachmentExtension({ original_name: '附件', content_type: 'application/pdf' }), 'pdf');
  assert.equal(attachmentExtension({ content_type: 'image/jpeg' }), 'jpg');
  assert.equal(attachmentExtension({ content_type: 'text/csv' }), 'csv');
  assert.equal(attachmentExtension({}), '');
});

test('isImageAttachment tolerates records without content_type', () => {
  assert.equal(isImageAttachment({ content_type: 'image/jpeg' }), true);
  assert.equal(isImageAttachment({ original_name: 'a.jpg' }), true);
  assert.equal(isImageAttachment({ original_name: 'a.pdf' }), false);
  assert.equal(isImageAttachment({}), false);
});

test('previewAttachment previews images when content_type is missing', () => {
  const env = createEnv();
  try {
    previewAttachment({ file_id: 9, original_name: 'a.jpg' }, 'token');
    assert.deepEqual(env.calls.previewImage, ['http://tmp/download-no-extension']);
    assert.deepEqual(env.calls.openDocument, []);
  } finally { restore(env); }
});

test('previewAttachment copies documents to a path with extension before opening', async () => {
  const env = createEnv();
  try {
    previewAttachment({ file_id: 9, original_name: '验收报告.pdf' }, 'token');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(env.calls.copyFile.length, 1);
    assert.match(env.calls.copyFile[0], /^\/user-data\/preview-9-\d+\.pdf$/);
    assert.deepEqual(env.calls.openDocument, env.calls.copyFile);
    assert.deepEqual(env.calls.previewImage, []);
  } finally { restore(env); }
});

test('previewAttachment keeps the existing error messages for missing and forbidden files', () => {
  const missing = createEnv({ statusCode: 404, tempFilePath: '' });
  try {
    previewAttachment({ file_id: 8, original_name: 'a.jpg' }, 'token');
    assert.deepEqual(missing.calls.toast, ['附件文件已丢失，请让上传人重新提交']);
  } finally { restore(missing); }
  const forbidden = createEnv({ statusCode: 403, tempFilePath: '' });
  try {
    previewAttachment({ file_id: 8, original_name: 'a.jpg' }, 'token');
    assert.deepEqual(forbidden.calls.toast, ['无权查看该附件']);
  } finally { restore(forbidden); }
  const failed = createEnv({ statusCode: 500, tempFilePath: '' });
  try {
    previewAttachment({ file_id: 8, original_name: 'a.jpg' }, 'token');
    assert.deepEqual(failed.calls.toast, ['附件下载失败（500）']);
  } finally { restore(failed); }
});
