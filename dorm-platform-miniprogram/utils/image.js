function extensionFromImageData(data) {
  if (typeof data === 'string') {
    const encoded = (data.includes(',') ? data.slice(data.indexOf(',') + 1) : data).replace(/\s/g, '');
    if (encoded.startsWith('iVBORw0KGgo')) return 'png';
    if (encoded.startsWith('/9j/')) return 'jpg';
  }
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null;
  if (!bytes) return '';
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return isPng ? 'png' : isJpeg ? 'jpg' : '';
}

function normalizeImage(filePath, prefix = 'image') {
  return new Promise((resolve, reject) => wx.compressImage({
    src: filePath,
    quality: 85,
    success: compressed => {
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath: compressed.tempFilePath,
        encoding: 'base64',
        success: result => {
          const extension = extensionFromImageData(result.data);
          if (!extension) {
            reject(new Error('压缩后的图片不是有效的 JPG 或 PNG，请重新选择图片'));
            return;
          }
          const path = `${wx.env.USER_DATA_PATH}/${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
          fs.copyFile({
            srcPath: compressed.tempFilePath,
            destPath: path,
            success: () => resolve(path),
            fail: reject
          });
        },
        fail: reject
      });
    },
    fail: reject
  }));
}

module.exports = { normalizeImage, extensionFromImageData };
