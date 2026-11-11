# 宿舍事务微信小程序

原生微信小程序复用宿舍平台 Spring Boot `/api/v1` API 和 Bearer Token 认证。登录后按服务端角色显示学生、宿管、维修人员或系统管理员各自的工作台、业务入口和可执行操作；数据权限仍由后端校验。

小程序界面遵循统一规范：[`docs/小程序布局与交互设计规范.md`](../docs/小程序布局与交互设计规范.md)。公共样式在 `app.wxss`（设计令牌 + 组件类），公共模板在 `templates/ui.wxml`，状态与文案口径在 `utils/format.js`，分页在 `utils/pager.js`。

## 启动

1. 在项目根目录启动 Spring Boot 后端，默认地址为 `http://127.0.0.1:8080`。
2. 后端当前配置文件为 `../dorm-platform-backend/src/main/resources/application.yml`，默认连接 `dorm_platform`，MySQL 用户 `root`。数据库必须已按项目 SQL 初始化；不要为了启动小程序重置现有库。
3. 在微信开发者工具导入本目录。`project.config.json` 已填写 AppID，也可替换为测试号。
4. 开发者工具本地调试需允许本地 HTTP 请求。真机请将 `utils/config.js` 的地址改成电脑可访问的局域网 IP 或 HTTPS 地址。

## 角色业务

- 学生：住宿管理与住宿历史、个人报修的创建/修改/提交/撤销/重新提交、处理进度、完工确认（评分 + 文字评价，评分默认 5 分）、重修申请、留宿申请、附件与审核结果、消息（来源：全部/系统通知/系统管理员发布/宿管发布）和个人资料。
- 宿管：负责楼栋范围的报修审核、强制派单、延期复核，留宿批次截止时间、锁定与审核，楼栋/宿舍/床位查询，面向负责楼栋发布通知。
- 维修人员：本人派单、接单/拒单（拒单必须填写原因）、提交维修结果和完工照片、申请延期、维修记录（拒单/接单超时/超时未修好/延期/重修记录、个人工单记录与评价，支持按年/月筛选）和消息（含楼栋筛选）。
- 系统管理员：人员账号与角色资料、宿管/维修人员负责范围、楼栋/宿舍/床位和住宿分配、全校报修派单与审核、留宿批次配置/发布/补录、维修规则、消息发布和操作日志。

## 验证

在仓库根目录执行：

```powershell
# 静态检查：JS 语法、JSON、WXML 标签闭合、模板引用、事件处理函数、布局禁止项
node tools/check-miniprogram.cjs

# 官方编译器校验：调用微信开发者工具自带 wcc/wcsc 编译全部 WXML/WXSS（未安装则 SKIP）
node tools/compile-miniprogram.cjs

# 单元测试：状态口径、消息来源、分页、维修分类与列表分页、表单上传
cd dorm-platform-miniprogram
node --test "tests/*.test.cjs"
cd ..

# 接口级四端流程验证（需后端已启动；写入少量验证数据）
pwsh -File tools/verify-b-scope.ps1
```

验证结果写入 `test-results/b-scope-verification.json`（接口逐项 PASS/FAIL 与证据）与 `test-results/miniprogram-compile.json`（官方编译器结果）。

## 视觉级验收（需微信开发者工具）

1. 用微信扫码登录微信开发者工具（2.02.x），打开本目录项目。
2. 以调试端口启动开发者工具（关闭后重新启动，登录态会保留）：

```powershell
& 'C:\Program Files (x86)\Tencent\微信web开发者工具\微信开发者工具.exe' --remote-debugging-port=9222
```

3. 在仓库根目录执行：

```powershell
# 逐页截图 + 横向溢出/元素越界/按钮换行/文本裁切/标题重叠自动检查
node tools/cdp-harness/visual-acceptance.js
# 待接单/待确认/待审核操作区、页面底部分页补充截图
node tools/cdp-harness/extra-shots.js
# 375/320 窄屏布局检查
node tools/cdp-harness/narrow-check.js
```

截图与报告输出到 `test-results/visual/`。视觉脚本会构造标题前缀为 `视觉验收-` 的临时工单，用于检查操作区。

微信开发者工具完整模拟器需要微信扫码登录，本环境仅使用其官方 `wcc/wcsc` 编译器做 WXML/WXSS 编译校验；真机渲染与视觉遮挡需登录开发者工具后按设计规范 §10 复核。
