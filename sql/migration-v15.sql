-- ============================================================
-- 宿舍事务平台 数据库迁移 v15（MySQL 8.0）
-- 对应《测试事项整改清单》：
--   A5  待人工处理原因字段
--   B9  留宿截止提醒发送标记
--   B11 撤回记录字段
--   C3  性别枚举恢复为男/女（合并回退修复）
-- 适用：v14 -> v15。执行：
--   mysql -uroot -p --default-character-set=utf8mb4 dorm_platform < migration-v15.sql
-- ============================================================

ALTER TABLE repair_order
  ADD COLUMN manual_reason VARCHAR(40) NULL COMMENT '待人工处理原因：NO_MATCH/OVERLOAD/NO_CANDIDATE/MANUAL_ONLY' AFTER archive_reason;

ALTER TABLE stay_application
  ADD COLUMN withdrawn_at DATETIME NULL COMMENT '最近一次撤回时间',
  ADD COLUMN withdraw_count INT NOT NULL DEFAULT 0 COMMENT '撤回次数';

ALTER TABLE stay_building_rule
  ADD COLUMN reminder_sent_at DATETIME NULL COMMENT '申请截止提醒发送时间';

-- 合并回退修复：性别只保留男/女
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

INSERT INTO schema_version(version_no) VALUES (15)
 ON DUPLICATE KEY UPDATE installed_at=CURRENT_TIMESTAMP;

-- 视图同步（新增字段供列表/详情使用）
CREATE OR REPLACE VIEW v_repair_order_dashboard AS
select ro.order_id,ro.order_no,ro.student_id,ro.room_id,ro.category_id,ro.title,ro.description,ro.urgent,ro.current_status,ro.abnormal,
 ro.reject_reason,ro.created_at,ro.updated_at,ro.parent_order_id,ro.rule_id,ro.archived_at,ro.archive_reason,ro.manual_reason,
 s.student_name,r.building_id,r.room_no,b.building_name,c.category_name,c.work_type_id,w.work_type_name,
 rd.dispatch_id,rd.repairer_user_id,rp.repairer_name,rd.accept_deadline,rd.repair_deadline,
 rr.result_text,ev.score,ev.comment,
 (select count(0) from repair_dispatch x where x.order_id=ro.order_id and x.dispatch_status='REJECTED') reject_count,
 (select count(0) from repair_dispatch x where x.order_id=ro.order_id and x.dispatch_status='TIMEOUT') accept_timeout_count,
 (select count(0) from repair_exception x where x.order_id=ro.order_id and x.exception_type='REPAIR_TIMEOUT') repair_timeout_count
from repair_order ro
join student s on s.student_id=ro.student_id
join dorm_room r on r.room_id=ro.room_id
join building b on b.building_id=r.building_id
left join fault_category c on c.category_id=ro.category_id
left join repair_work_type w on w.work_type_id=c.work_type_id
left join repair_dispatch rd on rd.dispatch_id=(select max(x.dispatch_id) from repair_dispatch x where x.order_id=ro.order_id and x.dispatch_status in ('PENDING','ACCEPTED'))
left join repairer_profile rp on rp.repairer_user_id=rd.repairer_user_id
left join repair_result rr on rr.order_id=ro.order_id
left join repair_evaluation ev on ev.order_id=ro.order_id;

CREATE OR REPLACE VIEW v_stay_application AS
select a.application_id,a.batch_id,a.student_id,a.current_status,a.review_reason,a.created_at,a.updated_at,a.reviewer_user_id,a.reviewed_at,
 a.building_id,a.source,a.resubmit_deadline,a.archived_at,a.archive_reason,a.withdrawn_at,a.withdraw_count,
 s.student_name,b.batch_name,bl.building_name,
 v.version_id,v.reason,v.submitted_at,
 (select min(d.start_date) from stay_date_range d where d.version_id=v.version_id) start_date,
 (select max(d.end_date) from stay_date_range d where d.version_id=v.version_id) end_date
from stay_application a
join student s on s.student_id=a.student_id
join stay_batch b on b.batch_id=a.batch_id
left join building bl on bl.building_id=a.building_id
left join stay_version v on v.version_id=(select max(x.version_id) from stay_version x where x.application_id=a.application_id and x.submitted_at is not null);

