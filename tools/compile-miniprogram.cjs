#!/usr/bin/env node
/**
 * 使用微信开发者工具官方编译器校验小程序 WXML/WXSS（不需登录 IDE）。
 *   node tools/compile-miniprogram.cjs
 * 说明：调用开发者工具自带的 wcc.exe（WXML 编译器）与 wcsc.exe（WXSS 编译器），
 *      可发现标签未闭合、属性/表达式非法、WXSS 语法错误等静态脚本无法覆盖的问题。
 * 若本机未安装开发者工具，则输出 SKIP 并以 0 退出（不阻断流水线）。
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.join(__dirname, '..', 'dorm-platform-miniprogram');
const candidates = [
  'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\resources\\app.asar.unpacked\\node_modules\\wcc-exec',
  'C:\\Program Files\\Tencent\\微信web开发者工具\\resources\\app.asar.unpacked\\node_modules\\wcc-exec'
];
const compilerDir = candidates.find(directory => fs.existsSync(path.join(directory, 'wcc.exe')));

if (!compilerDir) {
  console.log('SKIP：未找到微信开发者工具编译器（wcc.exe/wcsc.exe），跳过编译校验。');
  process.exit(0);
}

const wcc = path.join(compilerDir, 'wcc.exe');
const wcsc = path.join(compilerDir, 'wcsc.exe');
const outputDir = path.join(projectRoot, '..', 'test-results', 'miniprogram-compile');
fs.mkdirSync(outputDir, { recursive: true });

function walk(directory) {
  const list = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) list.push(...walk(full));
    else list.push(full);
  }
  return list;
}

const files = walk(projectRoot);
const wxmlFiles = files.filter(file => file.endsWith('.wxml'));
const wxssFiles = files.filter(file => file.endsWith('.wxss'));
const relative = file => path.relative(projectRoot, file).replace(/\\/g, '/');
const errors = [];
let compiledWxml = 0;
let compiledWxss = 0;

/* ------------------------------ WXML 编译 ------------------------------ */
// 一次性编译全部 WXML：wcc 会校验标签闭合、属性语法、表达式与模板引用语法。
{
  const output = path.join(outputDir, 'all-wxml.js');
  const args = ['-o', output, ...wxmlFiles.map(relative)];
  const result = spawnSync(wcc, args, { cwd: projectRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const stderr = `${result.stderr || ''}`.trim();
  const stdout = `${result.stdout || ''}`.trim();
  if (result.status !== 0) {
    errors.push(`WXML 编译失败（wcc 退出码 ${result.status}）：\n${stderr || stdout}`);
  } else {
    compiledWxml = wxmlFiles.length;
  }
}

/* ------------------------------ WXSS 编译 ------------------------------ */
// app.wxss 单独编译，页面 wxss 逐个编译（页面样式不依赖 app.wxss 的编译结果）。
for (const file of wxssFiles) {
  const name = relative(file).replace(/[\\/]/g, '_').replace(/\.wxss$/, '.css');
  const output = path.join(outputDir, name);
  const result = spawnSync(wcsc, ['-o', output, relative(file)], { cwd: projectRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const stderr = `${result.stderr || ''}`.trim();
  const stdout = `${result.stdout || ''}`.trim();
  if (result.status !== 0) {
    errors.push(`WXSS 编译失败：${relative(file)}\n${stderr || stdout}`);
  } else {
    compiledWxss += 1;
  }
}

/* --------------------------------- 输出 --------------------------------- */
const summary = {
  tool: 'WeChat DevTools wcc/wcsc',
  compilerDir,
  wxmlFiles: wxmlFiles.length,
  wxssFiles: wxssFiles.length,
  compiledWxml,
  compiledWxss,
  passed: errors.length === 0,
  errors,
  checkedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(projectRoot, '..', 'test-results', 'miniprogram-compile.json'), JSON.stringify(summary, null, 2), 'utf8');

console.log(`官方编译器校验：WXML ${compiledWxml}/${wxmlFiles.length} 个、WXSS ${compiledWxss}/${wxssFiles.length} 个`);
if (errors.length) {
  console.error(`编译错误 ${errors.length} 条：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('WXML/WXSS 官方编译器校验通过（无语法、标签闭合与表达式错误）。');
