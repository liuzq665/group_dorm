# 宿舍事务平台交付与验收记录

更新日期：2026-10-15。

## 当前结论

当前交付的是**可以启动、前后端可联调、核心业务闭环已通过自动化验证的版本**，不是只有登录页面的演示。

**尚不能声明全部满足 thinking3 或完成最终验收**。数据库恢复、接口契约及数据库/静态结构设计逐项对齐、非功能性验收仍未完成，详见文末。测试通过仅证明列出的场景，不代表所有设计要求都已实现。

## 访问与角色

本地交付环境：

- 登录：`http://localhost:5173/login`
- 后端：`http://localhost:8080/api/v1`
- 数据库：`dorm_platform`；本机 MySQL 3306，账号 `root`，密码 `123456`。
- 浏览器经前端同源 `/api/v1` 代理请求后端，无需手动改前端接口地址。

| 角色 | 账号 | 密码 | 操作范围 |
| --- | --- | --- | --- |
| 学生 | student1 | 123456 | 本人住宿、舍友、报修、确认评价、留宿、消息 |
| 宿管 | manager1 | 123456 | 负责楼栋的住宿、报修审核派单、延期审核、留宿审核、楼栋通知 |
| 维修人员 | repair1 | 123456 | 本人派单与历史、接拒单、延期、维修结果及照片 |
| 系统管理员 | admin | 123456 | 账号、基础资料、住宿分配、规则、开放区间、全校查询、数据任务、备份 |

四角色共用登录入口，但登录后的菜单、操作权限和后端数据权限不同。宿管演示账号当前负责楼栋 1、2、3；维修人员演示账号具备三个工种及三个楼栋范围，均可由管理员调整。越权测试另建只负责楼栋 2 的宿管，验证其不能查看或审核楼栋 1 的业务。不要将本地演示密码和当前配置直接用于公网部署。

## 工程位置与实际实现

- `dorm-platform-backend/`：Java 17、Spring Boot、Spring JDBC、MySQL；Controller、Service、权限检查和定时任务。
- `dorm-platform-frontend/`：独立 ES Modules 页面，Node HTTP 静态服务和同源代理；四角色视图。
- `scripts/`：数据库初始化、启动和停止脚本。
- `tools/test-platform-ui.cjs`：Playwright 跨角色浏览器验收。
- `tools/test-live-smoke.cjs`：交付环境四角色只读接口、权限与退出验证。
- `test-results/`：浏览器结果、运行检查结果和桌面/移动端截图。
- `thinking/thinking3/`：需求和设计依据，未为了配合现有代码而修改。

没有修改提供作参考的 cool-admin-midway / cool-admin-vue。当前实现也不是恢复旧 backend/frontend 脚手架。实际技术栈和部分包/数据结构尚不完全对应设计文档，不能把此差异默认为用户批准。

## 启停方式

前提：Java 17、Maven、Node、MySQL 8 服务可用；`java`、`mvn.cmd`、`node`、`npm.cmd`、`mysql`、`mysqldump` 可从 PATH 调用。备份需要 mysqldump。

在项目根目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Project.ps1 -Database dorm_platform -FrontendPort 5173 -BackendPort 8080 -Build
```

启动脚本会初始化新库或应用未执行的迁移，再启动服务。不会清空现有业务数据；空库会写入演示账号和初始业务。已构建时可省略 `-Build`。端口被占用会直接报错，不会终止未知进程。

停止本次脚本记录的交付进程：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Stop-Project.ps1 -FrontendPort 5173
```

停止前检查 PID、进程名及启动时间，避免 PID 复用导致误停。运行信息记录在 `.runtime-5173.json`；日志在前后端目录的 `backend-8080*.log` 和 `frontend-5173*.log`。

## 已执行的验证

### 后端：26 项通过

命令：在 `dorm-platform-backend` 执行 `mvn.cmd -q package`。结果：26 tests，0 failures，0 errors，0 skipped。

原始报告：`dorm-platform-backend/target/surefire-reports/com.dorm.platform.WorkflowIntegrationTest.txt`。

覆盖：

- 报修跨角色闭环；结果照片必填；确认评价归档。
- 审核退回、编辑重交、提交版本；重修上限、重修手动派单、父单归档。
- 拒单原因、三次失败异常化、无合适人员转人工、强制派单不可拒绝。
- 延期通过/拒绝、审核期间暂停超时处理、拒绝已到期延期后重新派单。
- 接单超时、自动确认、待修改到期关闭及重复扫描幂等。
- 留宿草稿与已提交版本隔离、撤回再提交、提前锁定、自动锁定。
- 修改重交立即锁定、重交截止后复审、逾期归档、结束后完成归档。
- 留宿日期边界重叠、开放区间变更复核、逾期补录。
- 宿管楼栋及学生本人权限、附件访问、消息访问、HTTP 403。
- 停用账号和退出后令牌失效；即时消息和定时消息不重复投递。
- 数据导出任务执行及待执行任务取消。
- 新学生无住宿时返回空列表；留宿人数去重而非按申请条数计人。

### 浏览器：17 组检查通过

命令：`node tools/test-platform-ui.cjs`，默认测试地址 `http://localhost:5174`。

结果：`test-results/browser-results.json`，包含实际执行时间、地址、通过项和错误列表。最新完整测试在独立数据库 `dorm_platform_test` 上运行，页面脚本错误列表为空。

- 四角色登录后界面不同。
- 学生报修 → 宿管审核 → 维修人员接单 → 上传照片并提交结果 → 学生确认评价。
- 管理员设置开放区间 → 宿管发布 → 学生提交 → 宿管锁定审核 → 学生查看通过结果。
- 管理员按角色发消息 → 学生收取及已读 → 非接收角色不可见。
- 异步账号导出并下载，检查结果不包含密码哈希。
- 导入账号成功；重复账号导致整批失败，前面的合法行也未落库。
- 数据库备份任务成功；下载内容包含业务表和视图。
- 新学生无住宿页面 → 管理员分配床位 → 学生/宿管可见 → 退宿与历史。
- 联系方式、修改密码、管理员重置密码、停用账号与旧令牌失效。
- 新建并删除无业务历史的账号。
- 四角色全部菜单在桌面及 390px 手机视口访问，页面无横向溢出。
- 越权 403，退出后 401。

测试会新增业务记录、临时账号和备份；完整浏览器测试请使用测试库，不要直接在有真实业务的正式库执行。

### 交付环境检查

命令：`node tools/test-live-smoke.cjs`。结果：`test-results/live-smoke.json`。

在 5173 的同源代理入口，学生 10、宿管 12、维修人员 6、管理员 16，共 44 个 GET 接口均返回成功。另检查登录、非管理员禁止访问账号管理，以及退出后的令牌失效。此检查不创建报修、留宿或住宿分配；登录会正常记录日志。

## 重跑测试

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Initialize-Database.ps1 -Database dorm_platform_test
Push-Location .\dorm-platform-backend
mvn.cmd -q package
Pop-Location
Push-Location .\dorm-platform-frontend
npm.cmd run build
Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Project.ps1 -Database dorm_platform_test -FrontendPort 5174 -BackendPort 8081
node .\tools\test-platform-ui.cjs
node .\tools\test-live-smoke.cjs
```

先停止已有测试服务再启动。Java 集成测试使用测试库，绝不指向正式库；不要在同一测试库同时执行集成测试和浏览器写入流程。浏览器测试使用已有的 `tools/er-drawio-runtime/node_modules/playwright-core` 和本机 Edge。

## 尚未满足最终验收的事项

1. **数据库恢复未实现**：目前只有备份创建/下载；`RESTORE` 会被拒绝。设计文档要求的恢复二次确认、任务互斥、完整性检查和恢复审计尚未交付。不能把备份成功等同于恢复验证通过。
2. **接口契约未完全一致**：已统一登录请求为 `loginAccount`；但如文档中的 `/me`、`/stay-applications`、`/repair-dispatches/{dispatchId}/decision`、分页响应和 camelCase 字段等，与当前 `/auth/me`、`/stay/applications`、按工单操作及部分数据库字段返回仍不同。下一步应同步修改前后端和测试，直接以文档契约为准，不加旧接口兼容层。
3. **数据库和静态结构设计未逐项对齐**：目前有基本表及派生查询视图，但与 thinking3 的实体表、联系表、虚实体和包/类模型没有完整一致性验证；现有 JdbcTemplate/Map 与建议的 Mapper/Entity/DTO 分层也有差异。应按设计逐项核对，而不是通过改文档隐藏差异。
4. **非功能性验收未完成**：未执行并发压力、容量、长时间可用性与灾难恢复测试。当前密码仍为 SHA-256 哈希、默认演示密码且无登录限流，不能宣称已达到生产安全标准。
5. **测试范围边界**：异常派单、延期、重修和归档已由后端集成测试覆盖，但并非每一条异常分支都做了浏览器点击回归；统计暂为基础汇总，不能当作所有维度报表均已验收。

下一阶段按：接口与数据/静态模型对齐 → 补齐恢复及剩余报表 → 非功能性和完整跨角色验收，逐项关闭。只有这些要求均有实现和证据，才标记最终交付完成。
