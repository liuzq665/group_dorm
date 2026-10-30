-- ============================================================
-- 宿舍事务平台 数据库迁移 v10（MySQL 8.0）
-- 依据测试反馈优化：
--   1. 性别选项去掉“其他(OTHER)”，仅保留男/女；历史 OTHER 统一置空；
--   2. 学号/工号改为系统硬格式，历史手工录入的不规范编号按规则回填：
--        学生：入学年份(4位) + 人员序号(6位)        例 2024000008
--        宿管：DM + 人员序号(6位)                    例 DM000002
--        维修：RP + 人员序号(6位)                    例 RP000003
--        管理员：SA + 人员序号(6位)                  例 SA000004
-- 适用：v9 -> v10。执行：
--   mysql -uroot -p --default-character-set=utf8mb4 dorm_platform < migration-v10.sql
-- ============================================================

-- 1. 性别枚举收敛为男/女
UPDATE student SET gender=NULL WHERE gender='OTHER';
UPDATE dorm_manager_profile SET gender=NULL WHERE gender='OTHER';
UPDATE repairer_profile SET gender=NULL WHERE gender='OTHER';
UPDATE system_admin_profile SET gender=NULL WHERE gender='OTHER';

ALTER TABLE student DROP CHECK chk_student_gender;
ALTER TABLE student ADD CONSTRAINT chk_student_gender CHECK (gender IS NULL OR gender IN ('MALE','FEMALE'));

ALTER TABLE dorm_manager_profile DROP CHECK chk_dorm_manager_gender;
ALTER TABLE dorm_manager_profile ADD CONSTRAINT chk_dorm_manager_gender CHECK (gender IS NULL OR gender IN ('MALE','FEMALE'));

ALTER TABLE repairer_profile DROP CHECK chk_repairer_gender;
ALTER TABLE repairer_profile ADD CONSTRAINT chk_repairer_gender CHECK (gender IS NULL OR gender IN ('MALE','FEMALE'));

ALTER TABLE system_admin_profile DROP CHECK chk_system_admin_gender;
ALTER TABLE system_admin_profile ADD CONSTRAINT chk_system_admin_gender CHECK (gender IS NULL OR gender IN ('MALE','FEMALE'));

-- 2. 学号/工号硬格式回填（仅修正不符合硬格式的历史值）
UPDATE student SET student_no=CONCAT(YEAR(created_at),LPAD(student_id,6,'0'))
 WHERE student_no IS NULL OR student_no NOT REGEXP '^[0-9]{10}$';

UPDATE dorm_manager_profile SET employee_no=CONCAT('DM',LPAD(manager_user_id,6,'0'))
 WHERE employee_no IS NULL OR employee_no NOT REGEXP '^DM[0-9]{6}$';

UPDATE repairer_profile SET employee_no=CONCAT('RP',LPAD(repairer_user_id,6,'0'))
 WHERE employee_no IS NULL OR employee_no NOT REGEXP '^RP[0-9]{6}$';

UPDATE system_admin_profile SET employee_no=CONCAT('SA',LPAD(admin_user_id,6,'0'))
 WHERE employee_no IS NULL OR employee_no NOT REGEXP '^SA[0-9]{6}$';

-- 3. 记录版本
INSERT INTO schema_version(version_no) VALUES (10)
 ON DUPLICATE KEY UPDATE installed_at=CURRENT_TIMESTAMP;
