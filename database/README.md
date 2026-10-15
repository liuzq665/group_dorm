# 共享项目数据库快照

`dorm_platform.sql` 是当前项目 `dorm_platform` 数据库在导出时的完整快照，不是只有表结构的空库脚本。它包含 41 张业务表、3 个视图、当前账号、住宿、报修、消息、规则及其他业务数据，并包含 `schema_version` 记录。

视图定义已去除本机 `root@localhost` 定义者，改为 `SQL SECURITY INVOKER`，便于其他本地 MySQL 执行。其他人导入后得到的是**导出时刻的当前数据状态**；你本机后续新增或修改的数据不会自动进入文件，需要共享最新状态时重新导出。

## 导入前提

- MySQL 8.0，建议 8.0.16 或更高版本；
- 账号需要创建数据库、建表、创建视图和写入数据的权限；
- 建议导入到空的 `dorm_platform` 数据库。

该文件包含 `DROP TABLE IF EXISTS` 和视图重建语句。不要在已有业务库上直接执行，以免覆盖同名表。需要保留已有数据库时，先把 SQL 中的 `dorm_platform` 全部替换为新的库名。

## DataGrip 导入

1. 添加 MySQL 数据源：Host `localhost`，Port `3306`，User `root`，填写本机密码。
2. 打开 `database/dorm_platform.sql`。
3. 将文件关联到该数据源，执行整个文件。
4. 刷新数据源，在 Schemas 中勾选 `dorm_platform`。
5. 展开 `Tables` 查看 41 张表，展开 `Views` 查看 3 个视图。

也可以在 DataGrip 的 Query Console 执行，路径替换为对方本机路径：

```sql
SOURCE E:/workspace/group_dorm/database/dorm_platform.sql;
```

Windows 路径在 `SOURCE` 中使用 `/`。

## MySQL 命令行导入

```powershell
mysql --user=root --password --default-character-set=utf8mb4 < .\database\dorm_platform.sql
```

然后输入本机 MySQL 密码。也可以进入 MySQL 后执行：

```sql
SOURCE E:/workspace/group_dorm/database/dorm_platform.sql;
```

## 导入后核对

```sql
USE dorm_platform;

SELECT table_type, COUNT(*)
FROM information_schema.tables
WHERE table_schema = DATABASE()
GROUP BY table_type;

SELECT version_no FROM schema_version ORDER BY version_no;
SELECT login_account, real_name, role_code, enabled FROM sys_user ORDER BY user_id;
SHOW FULL TABLES;
```

当前快照应包含 41 个 `BASE TABLE`、3 个 `VIEW`，版本号应包含 1、2、3、4。业务数据行数以导出时刻为准。

## 重新生成共享文件

在项目根目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Export-Database.ps1 `
  -Database dorm_platform `
  -Password 123456 `
  -OutputPath .\database\dorm_platform.sql
```

导出脚本使用 `mysqldump` 一致性事务快照，包含数据、表结构、索引、外键和视图；关闭 GTID、表空间和列统计信息，减少环境依赖，并去除机器相关的视图定义者信息。

不要把 `dorm_platform_test` 导出为共享正式库文件，它可能包含测试账号、测试工单和临时数据。

## 当前演示账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 学生 | `student1` | `123456` |
| 宿管 | `manager1` | `123456` |
| 维修人员 | `repair1` | `123456` |
| 系统管理员 | `admin` | `123456` |

项目默认连接本机 `localhost:3306` 的 `dorm_platform`，密码为 `123456`。其他人密码不同，需要修改后端配置或启动参数。
