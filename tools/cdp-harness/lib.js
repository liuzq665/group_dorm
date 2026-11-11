/**
 * 微信开发者工具 CDP 轻量封装（不依赖登录态之外的自动化协议）
 * 用途：以 Chrome DevTools Protocol 直接操作开发者工具内的“小程序逻辑层/渲染层”，
 *      进行页面导航、数据注入、截图与布局度量，从而实现视觉级验收。
 */
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const CDP_HOST = process.env.CDP_HOST || 'http://127.0.0.1:9222';
const SESSION_KEY = 'dorm_student_session';

async function targets() {
  const response = await fetch(`${CDP_HOST}/json/list`);
  return response.json();
}

function pick(targetsList, matcher) {
  return targetsList.find(target => matcher(String(target.title || ''), target));
}

async function appserviceTarget() {
  const list = await targets();
  const target = pick(list, title => title === '小程序逻辑层');
  if (!target) throw new Error('未找到“小程序逻辑层”目标，请确认开发者工具已打开项目且已编译');
  return target;
}

async function pageTarget(pagePath) {
  const list = await targets();
  const matches = list.filter(item => String(item.title || '').startsWith('Webview: ') && (!pagePath || String(item.title).includes(pagePath) || String(item.url || '').includes(pagePath)));
  const target = matches[matches.length - 1];
  if (!target) throw new Error(`未找到页面渲染目标：${pagePath || '(任意页面)'}`);
  return target;
}

class Client {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl, { perMessageDeflate: false });
      this.ws.on('open', () => resolve(this));
      this.ws.on('error', reject);
      this.ws.on('message', raw => {
        let message;
        try { message = JSON.parse(raw.toString()); } catch { return; }
        if (message.id && this.pending.has(message.id)) {
          const { resolve: done, reject: fail } = this.pending.get(message.id);
          this.pending.delete(message.id);
          if (message.error) fail(new Error(`${message.error.message || 'CDP 调用失败'}（${message.error.code}）`));
          else done(message.result);
        }
      });
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression, { awaitPromise = true } = {}) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
      allowUnsafeEvalBlockedByCSP: true
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails;
      throw new Error(`JS 执行异常：${detail.exception?.description || detail.text}`);
    }
    return result.result?.value;
  }
  async screenshot(outputPath) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
    return outputPath;
  }
  /** 整页截图（含视口外内容），用于检查长页面折叠/底部操作区 */
  async screenshotFull(outputPath, maxHeight = 4000) {
    const metrics = await this.send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize || metrics.contentSize || { width: 390, height: 753 };
    const width = Math.ceil(size.width || 390);
    const height = Math.min(maxHeight, Math.ceil(size.height || 753));
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 }
    });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
    return outputPath;
  }
  close() {
    try { this.ws.close(); } catch { /* ignore */ }
  }
}

async function connectApp() {
  const target = await appserviceTarget();
  const client = new Client(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Runtime.enable').catch(() => {});
  return client;
}

async function connectPage(pagePath) {
  const target = await pageTarget(pagePath);
  const client = new Client(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Runtime.enable').catch(() => {});
  await client.send('Page.enable').catch(() => {});
  return client;
}

async function apiLogin(account, password = '123456') {
  const response = await fetch('http://127.0.0.1:8080/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loginAccount: account, password })
  });
  const body = await response.json();
  if (body.code !== 0) throw new Error(`登录失败：${body.message}`);
  return body.data;
}

/** 注入登录态并跳转页面（在逻辑层执行） */
async function goto(app, url, session, { wait = 1600 } = {}) {
  if (session) {
    const payload = JSON.stringify(session);
    await app.evaluate(`wx.setStorageSync(${JSON.stringify(SESSION_KEY)}, ${payload}); true`);
  }
  const expression = `new Promise((resolve) => {
    const target = ${JSON.stringify(url)};
    const finish = (result) => setTimeout(() => resolve(result), 300);
    const isTab = ['/pages/home/index','/pages/repairs/index','/pages/stays/index','/pages/messages/index','/pages/mine/index'].includes(target.split('?')[0]);
    if (isTab) wx.switchTab({ url: target, success: () => finish('switchTab'), fail: () => wx.reLaunch({ url: target, success: () => finish('reLaunch'), fail: (e) => finish('fail:' + e.errMsg) }) });
    else wx.navigateTo({ url: target, success: () => finish('navigateTo'), fail: () => wx.reLaunch({ url: target, success: () => finish('reLaunch'), fail: (e) => finish('fail:' + e.errMsg) }) });
  })`;
  const result = await app.evaluate(expression);
  await new Promise(resolve => setTimeout(resolve, wait));
  return result;
}

function safeName(value) {
  return String(value).replace(/[^\w一-龥.-]+/g, '_');
}

module.exports = {
  SESSION_KEY,
  targets,
  appserviceTarget,
  pageTarget,
  connectApp,
  connectPage,
  apiLogin,
  goto,
  safeName,
  CDP_HOST
};
