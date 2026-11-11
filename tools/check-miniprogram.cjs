#!/usr/bin/env node
/**
 * 小程序静态检查（对应《小程序布局与交互设计规范》第 10 节验收清单）
 *   node tools/check-miniprogram.cjs
 * 检查项：
 *   1. 所有 .js 语法可解析
 *   2. 所有 .json 可解析，app.json 注册页面文件齐全
 *   3. 所有 WXML 标签闭合、模板定义/引用一致
 *   4. WXML 事件处理函数在对应页面 JS 中存在
 *   5. 布局禁止项：横向滚动、操作按钮换行、长文本 nowrap
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dorm-platform-miniprogram');
const errors = [];
const warnings = [];
const stats = { js: 0, json: 0, wxml: 0, wxss: 0 };

const VOID_TAGS = new Set(['input', 'image', 'icon', 'progress', 'checkbox', 'radio', 'switch', 'slider', 'import', 'include', 'wxs']);

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else output.push(full);
  }
  return output;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function addError(file, message) {
  errors.push(`${rel(file)}: ${message}`);
}

const files = walk(root);

/* ------------------------------- 1. JS 语法 ------------------------------- */
for (const file of files.filter(item => item.endsWith('.js'))) {
  stats.js += 1;
  const source = fs.readFileSync(file, 'utf8');
  try {
    // eslint-disable-next-line no-new-func
    new Function(source);
  } catch (error) {
    addError(file, `JS 语法错误：${error.message}`);
  }
}

/* ------------------------------- 2. JSON --------------------------------- */
for (const file of files.filter(item => item.endsWith('.json'))) {
  stats.json += 1;
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    addError(file, `JSON 解析失败：${error.message}`);
  }
}

let appConfig = null;
try {
  appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
} catch (error) {
  errors.push(`app.json: 解析失败：${error.message}`);
}
if (appConfig) {
  for (const page of appConfig.pages || []) {
    for (const extension of ['.js', '.wxml', '.json']) {
      const target = path.join(root, `${page}${extension}`);
      if (!fs.existsSync(target)) errors.push(`app.json: 页面 ${page} 缺少 ${extension} 文件`);
    }
  }
  for (const tab of appConfig.tabBar?.list || []) {
    if (!(appConfig.pages || []).includes(tab.pagePath)) errors.push(`app.json: tabBar 页面 ${tab.pagePath} 未在 pages 注册`);
  }
}

/* --------------------------- 3. WXML 标签与模板 --------------------------- */
function parseWxml(source, file) {
  const text = source.replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  const tagPattern = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let match;
  const usedTemplates = [];
  const usedHandlers = [];
  while ((match = tagPattern.exec(text)) !== null) {
    const [, closing, tag, attributes, selfClosing] = match;
    if (!closing) {
      for (const handler of attributes.matchAll(/(?:bind|catch)(?::)?[a-z]+="([A-Za-z_$][\w$]*)"/g)) usedHandlers.push(handler[1]);
      if (tag === 'template' && /\bis="([^"]+)"/.test(attributes)) usedTemplates.push(/\bis="([^"]+)"/.exec(attributes)[1]);
      if (tag === 'template' && /\bname="([^"]+)"/.test(attributes)) usedTemplates.push(null);
      const isSelfClosing = selfClosing === '/' || VOID_TAGS.has(tag);
      if (!isSelfClosing) stack.push({ tag, index: match.index });
    } else {
      const top = stack.pop();
      if (!top) addError(file, `多余的结束标签 </${tag}>`);
      else if (top.tag !== tag) addError(file, `标签未正确闭合：<${top.tag}> 被 </${tag}> 关闭`);
    }
    if (tag === 'scroll-view' && /\bscroll-x\b/.test(attributes)) addError(file, '禁止使用 scroll-view scroll-x（G-03 禁止横向滚动）');
  }
  for (const item of stack) addError(file, `标签 <${item.tag}> 未闭合`);
  return { usedTemplates: usedTemplates.filter(Boolean), usedHandlers, text };
}

const templateDefinitions = new Map();
const templateFiles = files.filter(item => item.endsWith('.wxml'));
const parsed = new Map();
for (const file of templateFiles) {
  stats.wxml += 1;
  const result = parseWxml(fs.readFileSync(file, 'utf8'), file);
  parsed.set(file, result);
  if (rel(file).startsWith('templates/')) {
    for (const item of fs.readFileSync(file, 'utf8').matchAll(/<template\s+name="([^"]+)"/g)) {
      templateDefinitions.set(item[1], file);
    }
  }
}

// 模板引用必须在被 import 的模板文件中定义
for (const [file, result] of parsed) {
  if (rel(file).startsWith('templates/')) continue;
  const isTemplatePage = /<template\s+is=/.test(result.text);
  if (!isTemplatePage) continue;
  const source = result.text;
  const importsTemplates = /<import\s+src="[^"]*templates\/ui\.wxml"\s*\/?>/.test(source);
  if (!importsTemplates) addError(file, '使用了公共模板但未 import ../../templates/ui.wxml');
  for (const name of result.usedTemplates) {
    if (!templateDefinitions.has(name)) addError(file, `引用了未定义的模板 ${name}`);
  }
}

/* ------------------------- 4. 事件处理函数存在性 ------------------------- */
for (const file of templateFiles) {
  const result = parsed.get(file);
  if (!result.usedHandlers.length) continue;
  const isTemplateFile = rel(file).startsWith('templates/');
  if (isTemplateFile) continue; // 模板内的 handler 由使用页面提供
  const jsFile = file.replace(/\.wxml$/, '.js');
  if (!fs.existsSync(jsFile)) { addError(file, '缺少同名页面 JS'); continue; }
  const jsSource = fs.readFileSync(jsFile, 'utf8');
  for (const handler of new Set(result.usedHandlers)) {
    const pattern = new RegExp(`(^|[^\\w$.])${handler}\\s*(\\(|:)`, 'm');
    if (!pattern.test(jsSource)) addError(file, `事件处理函数 ${handler} 未在 ${rel(jsFile)} 中定义`);
  }
  // 模板内引用的事件处理函数同样需要在使用页面定义
  for (const name of result.usedTemplates) {
    const definition = templateDefinitions.get(name);
    if (!definition) continue;
    const definitionSource = fs.readFileSync(definition, 'utf8');
    const block = new RegExp(`<template\\s+name="${name}"[\\s\\S]*?</template>`).exec(definitionSource);
    if (!block) continue;
    for (const handler of block[0].matchAll(/(?:bind|catch)(?::)?[a-z]+="([A-Za-z_$][\w$]*)"/g)) {
      const handlerPattern = new RegExp(`(^|[^\\w$.])${handler[1]}\\s*(\\(|:)`, 'm');
      if (!handlerPattern.test(jsSource)) addError(file, `模板 ${name} 的事件 ${handler[1]} 未在 ${rel(jsFile)} 中定义`);
    }
  }
}

/* ----------------------------- 5. WXSS 禁止项 ----------------------------- */
const appWxssFile = path.join(root, 'app.wxss');
const appWxss = fs.existsSync(appWxssFile) ? fs.readFileSync(appWxssFile, 'utf8') : '';
if (!/overflow-x:\s*hidden/.test(appWxss)) errors.push('app.wxss: 缺少 page { overflow-x: hidden }（G-03）');
if (!/\.action-bar[^{]*\{[^}]*flex-wrap:\s*nowrap/.test(appWxss)) errors.push('app.wxss: .action-bar 缺少 flex-wrap: nowrap（G-04）');
for (const file of files.filter(item => item.endsWith('.wxss'))) {
  stats.wxss += 1;
  const source = fs.readFileSync(file, 'utf8');
  if (/overflow-x:\s*(auto|scroll)/.test(source)) addError(file, '禁止横向滚动容器（G-03）');
  if (/\.(record-title|record-meta|detail-value)[^{]*\{[^}]*white-space:\s*nowrap/.test(source)) {
    addError(file, '长文本不得 white-space: nowrap（G-01/G-03）');
  }
}

/* --------------------------------- 输出 --------------------------------- */
const summary = `检查文件：JS ${stats.js} 个、JSON ${stats.json} 个、WXML ${stats.wxml} 个、WXSS ${stats.wxss} 个`;
console.log(summary);
if (warnings.length) {
  console.log(`\n警告 ${warnings.length} 条：`);
  for (const warning of warnings) console.log(`  - ${warning}`);
}
if (errors.length) {
  console.error(`\n错误 ${errors.length} 条：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('静态检查通过：语法、页面注册、标签闭合、模板引用、事件处理函数、布局禁止项均符合规范。');
