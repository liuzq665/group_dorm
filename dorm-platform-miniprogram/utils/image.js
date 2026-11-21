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

function targetPath(extension, prefix) {
  return `${wx.env.USER_DATA_PATH}/${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
}

function unsupportedFormatError() {
  return new Error('图片不是有效的 JPG 或 PNG，请在相册中转换为 JPG/PNG 后重新选择');
}

/** 把已确认是 JPG/PNG 的本地文件转存到用户目录，返回带扩展名的新路径 */
function copyIntoUserData(srcPath, prefix, resolve, reject) {
  const fs = wx.getFileSystemManager();
  fs.readFile({
    filePath: srcPath,
    encoding: 'base64',
    success: result => {
      const extension = extensionFromImageData(result.data);
      if (!extension) {
        reject(unsupportedFormatError());
        return;
      }
      const path = targetPath(extension, prefix);
      fs.copyFile({ srcPath, destPath: path, success: () => resolve(path), fail: reject });
    },
    fail: reject
  });
}

/**
 * 压缩并转存到用户目录，返回可上传的本地路径。
 * 压缩失败时不再直接放弃：原图本身就是 JPG/PNG 就按原图转存，避免“选了图却没有附件”。
 */
function normalizeImage(filePath, prefix = 'image') {
  return new Promise((resolve, reject) => {
    const fallback = () => copyIntoUserData(filePath, prefix, resolve, reject);
    wx.compressImage({
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
              reject(unsupportedFormatError());
              return;
            }
            const path = targetPath(extension, prefix);
            fs.copyFile({ srcPath: compressed.tempFilePath, destPath: path, success: () => resolve(path), fail: fallback });
          },
          fail: fallback
        });
      },
      fail: fallback
    });
  });
}

module.exports = { normalizeImage, extensionFromImageData };
