const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeImage, extensionFromImageData } = require('../utils/image');

test('normalized image extension follows the actual compressed image type', async () => {
  const originalWx = global.wx;
  let copied;
  global.wx = {
    env: { USER_DATA_PATH: '/user-data' },
    compressImage(options) { options.success({ tempFilePath: '/tmp/compressed' }); },
    getFileSystemManager() { return {
      readFile(options) { options.success({ data: 'iVBORw0KGgoAAAANSUhEUg==' }); },
      copyFile(options) { copied = options; options.success(); }
    }; }
  };
  try {
    const result = await normalizeImage('/tmp/source.heic', 'repair');
    assert.match(result, /^\/user-data\/repair-\d+-[\da-f]+\.png$/);
    assert.equal(copied.srcPath, '/tmp/compressed');
    assert.equal(copied.destPath, result);
  } finally {
    global.wx = originalWx;
  }
});

test('unsupported or unidentified compressed image types are rejected before upload', async () => {
  const originalWx = global.wx;
  global.wx = {
    env: { USER_DATA_PATH: '/user-data' },
    compressImage(options) { options.success({ tempFilePath: '/tmp/compressed' }); },
    getFileSystemManager() { return {
      readFile(options) { options.success({ data: 'UklGRgAAAAA=' }); },
      copyFile() { throw new Error('copy should not run for unsupported type'); }
    }; }
  };
  try {
    await assert.rejects(normalizeImage('/tmp/source.webp'), /不是有效的 JPG 或 PNG/);
  } finally {
    global.wx = originalWx;
  }
});

test('binary image signatures remain supported when a platform returns ArrayBuffer', () => {
  assert.equal(extensionFromImageData(Uint8Array.from([0xff, 0xd8, 0xff, 0]).buffer), 'jpg');
  assert.equal(extensionFromImageData('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='), 'png');
});
