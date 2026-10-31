USE dorm_platform;
START TRANSACTION;

-- Add a current winter batch with working application deadlines for student and manager flows.
INSERT INTO stay_batch (
    batch_code, batch_name, academic_year, vacation_type, open_start_date, open_end_date,
    application_deadline, instructions, current_status
)
VALUES (
    'WINTER-2026-FLOW', '2026 寒假留宿申请', 2026, 'WINTER', '2027-01-10', '2027-02-20',
    '2026-12-20 23:59:59', '请按实际留宿日期填写申请并上传家长知情材料，提交后由负责楼栋宿管审核。', 'OPEN'
)
ON DUPLICATE KEY UPDATE batch_code=VALUES(batch_code);

SET @flow_batch_id=(SELECT batch_id FROM stay_batch WHERE batch_code='WINTER-2026-FLOW');
INSERT INTO stay_building_rule(batch_id,building_id,application_deadline,auto_lock,published_at)
SELECT @flow_batch_id,b.building_id,'2026-12-20 23:59:59',1,NOW()
FROM building b
JOIN manager_building_scope scope ON scope.building_id=b.building_id
JOIN v_user_identity manager ON manager.user_id=scope.manager_user_id AND manager.enabled=1
ON DUPLICATE KEY UPDATE application_deadline=VALUES(application_deadline),auto_lock=1;

-- Select accommodated students covered by an enabled manager and create varied workflow states.
INSERT INTO stay_application(batch_id,student_id,current_status,review_reason,created_at,updated_at,reviewer_user_id,reviewed_at,building_id,source,resubmit_deadline)
SELECT @flow_batch_id, candidates.student_id, candidates.sample_status,
       CASE candidates.sample_status WHEN 'PENDING_EDIT' THEN '请补充家长知情材料并确认离校日期。' ELSE NULL END,
       candidates.created_at,candidates.created_at,
       CASE WHEN candidates.sample_status IN ('PENDING_EDIT','APPROVED') THEN candidates.manager_id ELSE NULL END,
       CASE WHEN candidates.sample_status='APPROVED' THEN DATE_ADD(candidates.created_at,INTERVAL 2 HOUR) ELSE NULL END,
       candidates.building_id,'NORMAL',
       CASE WHEN candidates.sample_status='PENDING_EDIT' THEN '2026-11-10 23:59:59' ELSE NULL END
FROM (
    SELECT eligible.student_id,eligible.building_id,eligible.manager_id,
           CASE WHEN MOD(eligible.sample_no-1,30)+1<=6 THEN 'DRAFT'
                WHEN MOD(eligible.sample_no-1,30)+1<=12 THEN 'PENDING_REVIEW'
                WHEN MOD(eligible.sample_no-1,30)+1<=18 THEN 'UNDER_REVIEW'
                WHEN MOD(eligible.sample_no-1,30)+1<=23 THEN 'PENDING_EDIT' ELSE 'APPROVED' END sample_status,
           DATE_SUB(NOW(),INTERVAL (MOD(eligible.sample_no,240)+3) HOUR) created_at,
           eligible.sample_no
    FROM (
      SELECT s.student_id,home.building_id,manager.user_id manager_id,
             ROW_NUMBER() OVER(ORDER BY s.student_id) sample_no
      FROM v_accommodation_current home
      JOIN student s ON s.student_id=home.student_id AND s.enabled=1 AND s.enrollment_status='ENROLLED'
      JOIN manager_building_scope scope ON scope.building_id=home.building_id
      JOIN v_user_identity manager ON manager.user_id=scope.manager_user_id AND manager.enabled=1
    ) eligible
    WHERE eligible.sample_no<=300
) candidates
WHERE NOT EXISTS(SELECT 1 FROM stay_application old WHERE old.batch_id=@flow_batch_id AND old.student_id=candidates.student_id);

UPDATE stay_application a
SET a.created_at=DATE_SUB(NOW(),INTERVAL (MOD(a.student_id,240)+3) HOUR),
    a.updated_at=DATE_SUB(NOW(),INTERVAL (MOD(a.student_id,240)+3) HOUR),
    a.reviewed_at=IF(a.current_status IN ('APPROVED','PENDING_EDIT'),DATE_SUB(NOW(),INTERVAL (MOD(a.student_id,240)+1) HOUR),NULL)
WHERE a.batch_id=@flow_batch_id;

INSERT INTO stay_version(application_id,reason,saved_at,submitted_at)
SELECT a.application_id,
       CASE MOD(a.student_id,4) WHEN 0 THEN '寒假留宿，因课程实验需留校。' WHEN 1 THEN '寒假留宿，参加校内科研项目。' WHEN 2 THEN '寒假留宿，承担实验室值班安排。' ELSE '寒假留宿，需完成毕业设计实验。' END,
       a.created_at,
       CASE WHEN a.current_status='DRAFT' THEN NULL ELSE DATE_ADD(a.created_at,INTERVAL 30 MINUTE) END
FROM stay_application a
WHERE a.batch_id=@flow_batch_id
  AND NOT EXISTS(SELECT 1 FROM stay_version v WHERE v.application_id=a.application_id);

UPDATE stay_version v
JOIN stay_application a ON a.application_id=v.application_id
SET v.saved_at=a.created_at,
    v.submitted_at=IF(a.current_status='DRAFT',NULL,DATE_ADD(a.created_at,INTERVAL 30 MINUTE))
WHERE a.batch_id=@flow_batch_id;

INSERT INTO stay_date_range(version_id,start_date,end_date)
SELECT v.version_id,
       DATE_ADD('2027-01-10',INTERVAL MOD(a.student_id,25) DAY),
       DATE_ADD(DATE_ADD('2027-01-10',INTERVAL MOD(a.student_id,25) DAY),INTERVAL 2+MOD(a.student_id,4) DAY)
FROM stay_version v JOIN stay_application a ON a.application_id=v.application_id
WHERE a.batch_id=@flow_batch_id
  AND NOT EXISTS(SELECT 1 FROM stay_date_range r WHERE r.version_id=v.version_id);

INSERT INTO stay_review(application_id,version_id,reviewer_user_id,result,reason,reviewed_at)
SELECT a.application_id,v.version_id,a.reviewer_user_id,
       IF(a.current_status='APPROVED','APPROVED','RETURNED'),
       IF(a.current_status='APPROVED','留宿时间与材料已核实，审核通过。','请补充申请材料并核对留宿日期。'),
       COALESCE(a.reviewed_at,DATE_ADD(a.created_at,INTERVAL 2 HOUR))
FROM stay_application a JOIN stay_version v ON v.application_id=a.application_id AND v.submitted_at IS NOT NULL
WHERE a.batch_id=@flow_batch_id AND a.current_status IN ('APPROVED','PENDING_EDIT')
  AND NOT EXISTS(SELECT 1 FROM stay_review r WHERE r.application_id=a.application_id);

UPDATE stay_review r
JOIN stay_application a ON a.application_id=r.application_id
SET r.reviewed_at=DATE_ADD(a.created_at,INTERVAL 2 HOUR)
WHERE a.batch_id=@flow_batch_id;

-- Select stable, already-scoped students and work types so the sample operations remain idempotent.
DROP TEMPORARY TABLE IF EXISTS workflow_repair_seed;
CREATE TEMPORARY TABLE workflow_repair_seed AS
SELECT numbered.sample_no,numbered.flow_no,numbered.student_id,numbered.room_id,numbered.building_id,
       numbered.manager_id,numbered.repairer_user_id,numbered.category_id,numbered.work_type_id,numbered.category_name,
       CONCAT('宿舍联调流程：',numbered.category_name) title,
       '宿舍设施需要检查，请按工单流程完成核实和维修。' description,
       CASE WHEN numbered.flow_no IN (5,6) THEN 1 ELSE 0 END urgent,
       CASE WHEN numbered.flow_no BETWEEN 7 AND 10 THEN 1 ELSE 0 END abnormal,
       CASE WHEN numbered.flow_no<=4 THEN 'PENDING_REVIEW'
            WHEN numbered.flow_no<=10 THEN 'PENDING_MANUAL'
            WHEN numbered.flow_no<=14 THEN 'PENDING_ACCEPT'
            WHEN numbered.flow_no<=17 THEN 'ACCEPTED'
            WHEN numbered.flow_no<=20 THEN 'DELAYED'
            WHEN numbered.flow_no<=23 THEN 'REPAIRED'
            WHEN numbered.flow_no<=26 THEN 'CONFIRMED' ELSE 'ARCHIVED' END current_status,
       IF(numbered.flow_no<=26,DATE_SUB(NOW(),INTERVAL (MOD(numbered.sample_no,180)+30) MINUTE),
          DATE_ADD('2024-01-01 08:00:00',INTERVAL numbered.sample_no DAY)) created_at,
       IF(numbered.sample_no<=29,
          CONCAT('WX',DATE_FORMAT(DATE_ADD('2026-10-01 08:00:00',INTERVAL numbered.sample_no DAY),'%Y%m%d'),LPAD(numbered.sample_no+9000,4,'0')),
          CONCAT('WX20261031',LPAD(numbered.sample_no+9000,4,'0'))) order_no
FROM (
  SELECT eligible.sample_no,MOD(eligible.sample_no-1,29)+1 flow_no,eligible.student_id,eligible.room_id,eligible.building_id,eligible.manager_id,eligible.repairer_user_id,
         eligible.category_id,eligible.work_type_id,eligible.category_name
  FROM (
    SELECT options.student_id,options.room_id,options.building_id,options.manager_id,options.repairer_user_id,
           options.category_id,options.work_type_id,options.category_name,options.category_rank,
           options.category_count,ROW_NUMBER() OVER(ORDER BY options.student_id) sample_no
    FROM (
      SELECT s.student_id,home.room_id,home.building_id,MIN(manager.user_id) manager_id,
             MIN(CASE WHEN worker.worker_rank=1+MOD(s.student_id,worker.worker_count) THEN worker.repairer_user_id END) repairer_user_id,
             cat.category_id,cat.work_type_id,cat.category_name,
             ROW_NUMBER() OVER(PARTITION BY s.student_id ORDER BY cat.category_id) category_rank,
             COUNT(*) OVER(PARTITION BY s.student_id) category_count
      FROM v_accommodation_current home
      JOIN student s ON s.student_id=home.student_id AND s.enabled=1 AND s.enrollment_status='ENROLLED'
      JOIN manager_building_scope scope ON scope.building_id=home.building_id
      JOIN v_user_identity manager ON manager.user_id=scope.manager_user_id AND manager.enabled=1
      JOIN fault_category cat ON cat.enabled=1
      JOIN (
        SELECT bs.building_id,wt.work_type_id,p.repairer_user_id,
               ROW_NUMBER() OVER(PARTITION BY bs.building_id,wt.work_type_id ORDER BY p.repairer_user_id) worker_rank,
               COUNT(*) OVER(PARTITION BY bs.building_id,wt.work_type_id) worker_count
        FROM repairer_building_scope bs
        JOIN repairer_work_type wt ON wt.repairer_user_id=bs.repairer_user_id
        JOIN repairer_profile p ON p.repairer_user_id=bs.repairer_user_id AND p.enabled=1 AND p.on_duty=1
      ) worker ON worker.building_id=home.building_id AND worker.work_type_id=cat.work_type_id
      GROUP BY s.student_id,home.room_id,home.building_id,cat.category_id,cat.work_type_id,cat.category_name
    ) options
    WHERE options.category_rank=1+MOD(options.student_id,options.category_count)
  ) eligible
  WHERE eligible.sample_no<=300
) numbered;

INSERT INTO repair_order(order_no,student_id,room_id,category_id,title,description,urgent,abnormal,current_status,created_at,updated_at,rule_id,archived_at,archive_reason)
SELECT seed.order_no,seed.student_id,seed.room_id,seed.category_id,seed.title,seed.description,seed.urgent,seed.abnormal,
       seed.current_status,seed.created_at,seed.created_at,1,
       IF(seed.current_status='ARCHIVED',DATE_ADD(seed.created_at,INTERVAL 4 HOUR),NULL),
       IF(seed.current_status='ARCHIVED','EVALUATED',NULL)
FROM workflow_repair_seed seed
WHERE NOT EXISTS(SELECT 1 FROM repair_order old WHERE old.order_no=seed.order_no);

INSERT INTO repair_audit(order_id,reviewer_user_id,result,reason,created_at)
SELECT o.order_id,seed.manager_id,'APPROVED','故障位置及学生住宿信息已核实。',DATE_ADD(seed.created_at,INTERVAL 20 MINUTE)
FROM workflow_repair_seed seed JOIN repair_order o ON o.order_no=seed.order_no
WHERE seed.current_status<>'PENDING_REVIEW'
  AND NOT EXISTS(SELECT 1 FROM repair_audit a WHERE a.order_id=o.order_id);

-- Two manual-handling orders show a previous refusal or timeout; the others await manager dispatch.
INSERT INTO repair_dispatch(order_id,repairer_user_id,dispatch_mode,dispatch_status,decision_reason,created_at,decided_at,accept_deadline,repair_deadline)
SELECT o.order_id,worker.repairer_user_id,'AUTO',IF(seed.flow_no=9,'REJECTED','TIMEOUT'),
       IF(seed.flow_no=9,'故障位置需要再次确认','接单期限内未响应'),DATE_ADD(seed.created_at,INTERVAL 30 MINUTE),
       DATE_ADD(seed.created_at,INTERVAL 1 HOUR),NULL,NULL
FROM workflow_repair_seed seed JOIN repair_order o ON o.order_no=seed.order_no
JOIN repairer_profile worker ON worker.repairer_user_id=seed.repairer_user_id
WHERE seed.flow_no IN (9,10)
  AND NOT EXISTS(SELECT 1 FROM repair_dispatch d WHERE d.order_id=o.order_id);

INSERT INTO repair_dispatch(order_id,repairer_user_id,dispatch_mode,dispatch_status,decision_reason,created_at,decided_at,accept_deadline,repair_deadline)
SELECT o.order_id,worker.repairer_user_id,
       IF(seed.current_status='PENDING_ACCEPT','AUTO','MANUAL'),
       IF(seed.current_status='PENDING_ACCEPT','PENDING','ACCEPTED'),
       IF(seed.current_status='PENDING_ACCEPT',NULL,'楼栋及工种匹配后完成派单'),
       DATE_ADD(seed.created_at,INTERVAL 30 MINUTE),
       IF(seed.current_status='PENDING_ACCEPT',NULL,DATE_ADD(seed.created_at,INTERVAL 45 MINUTE)),
       IF(seed.current_status='PENDING_ACCEPT',DATE_ADD(NOW(),INTERVAL 2 DAY),NULL),
       IF(seed.current_status='PENDING_ACCEPT',NULL,DATE_ADD(NOW(),INTERVAL 7 DAY))
FROM workflow_repair_seed seed JOIN repair_order o ON o.order_no=seed.order_no
JOIN repairer_profile worker ON worker.repairer_user_id=seed.repairer_user_id
WHERE seed.current_status IN ('PENDING_ACCEPT','ACCEPTED','DELAYED','REPAIRED','CONFIRMED','ARCHIVED')
  AND NOT EXISTS(SELECT 1 FROM repair_dispatch d WHERE d.order_id=o.order_id)
ORDER BY o.order_id,worker.repairer_user_id;

UPDATE repair_dispatch d
JOIN repair_order o ON o.order_id=d.order_id
JOIN workflow_repair_seed seed ON seed.order_no=o.order_no
SET d.repairer_user_id=seed.repairer_user_id;

INSERT INTO repair_delay_request(order_id,repairer_user_id,reason,expected_finish_at,current_status,created_at)
SELECT o.order_id,d.repairer_user_id,'待更换配件，申请延长维修时间。',DATE_ADD(NOW(),INTERVAL 3 DAY),'PENDING',DATE_ADD(seed.created_at,INTERVAL 1 HOUR)
FROM workflow_repair_seed seed JOIN repair_order o ON o.order_no=seed.order_no
JOIN repair_dispatch d ON d.order_id=o.order_id
WHERE seed.current_status='DELAYED'
  AND NOT EXISTS(SELECT 1 FROM repair_delay_request request WHERE request.order_id=o.order_id);

UPDATE repair_delay_request request
JOIN repair_order o ON o.order_id=request.order_id
JOIN workflow_repair_seed seed ON seed.order_no=o.order_no
SET request.repairer_user_id=seed.repairer_user_id;

INSERT INTO repair_result(order_id,repairer_user_id,result_text,expected_finish_at,created_at)
SELECT o.order_id,d.repairer_user_id,'故障部件已检修，供电及使用状态复测正常。',
       DATE_ADD(seed.created_at,INTERVAL 3 HOUR),
       IF(seed.flow_no BETWEEN 21 AND 23,DATE_SUB(NOW(),INTERVAL 30 MINUTE),DATE_ADD(seed.created_at,INTERVAL 2 HOUR))
FROM workflow_repair_seed seed JOIN repair_order o ON o.order_no=seed.order_no
JOIN repair_dispatch d ON d.order_id=o.order_id AND d.dispatch_status='ACCEPTED'
WHERE seed.current_status IN ('REPAIRED','CONFIRMED','ARCHIVED')
  AND NOT EXISTS(SELECT 1 FROM repair_result result WHERE result.order_id=o.order_id);

UPDATE repair_result result
JOIN repair_order o ON o.order_id=result.order_id
JOIN workflow_repair_seed seed ON seed.order_no=o.order_no
SET result.repairer_user_id=seed.repairer_user_id;

INSERT INTO repair_confirmation(order_id,confirmation_mode,confirmed_at)
SELECT o.order_id,'STUDENT',DATE_ADD(seed.created_at,INTERVAL 3 HOUR)
FROM workflow_repair_seed seed JOIN repair_order o ON o.order_no=seed.order_no
WHERE seed.current_status IN ('CONFIRMED','ARCHIVED')
  AND NOT EXISTS(SELECT 1 FROM repair_confirmation c WHERE c.order_id=o.order_id);

INSERT INTO repair_evaluation(order_id,score,comment,created_at)
SELECT o.order_id,1+MOD(seed.sample_no,5),'维修完成后已确认，评分用于记录不同维修体验。',DATE_ADD(seed.created_at,INTERVAL 4 HOUR)
FROM workflow_repair_seed seed JOIN repair_order o ON o.order_no=seed.order_no
WHERE seed.current_status='ARCHIVED'
  AND NOT EXISTS(SELECT 1 FROM repair_evaluation e WHERE e.order_id=o.order_id);

COMMIT;
