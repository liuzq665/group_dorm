-- Apply migration-v11.sql before this fixture to create notification target tables.
USE dorm_platform;
START TRANSACTION;

-- Historical leave batches used by year and vacation filters.
INSERT INTO stay_batch (
    batch_code, batch_name, academic_year, vacation_type,
    open_start_date, open_end_date, application_deadline,
    instructions, current_status
)
VALUES
    ('WINTER-2024', '2024 寒假留宿', 2024, 'WINTER', '2025-01-10', '2025-02-15', '2024-12-25 23:59:59', '寒假留宿安排及住宿管理记录。', 'CLOSED'),
    ('SUMMER-2025', '2025 暑假留宿', 2025, 'SUMMER', '2025-07-01', '2025-08-31', '2025-06-15 23:59:59', '暑假留宿安排及住宿管理记录。', 'CLOSED'),
    ('WINTER-2025', '2025 寒假留宿', 2025, 'WINTER', '2026-01-10', '2026-02-15', '2025-12-25 23:59:59', '寒假留宿安排及住宿管理记录。', 'CLOSED'),
    ('SUMMER-2026', '2026 暑假留宿', 2026, 'SUMMER', '2026-07-01', '2026-08-31', '2026-06-15 23:59:59', '暑假留宿安排及住宿管理记录。', 'CLOSED') AS incoming
ON DUPLICATE KEY UPDATE batch_code = incoming.batch_code;

UPDATE stay_batch SET instructions = CASE vacation_type
    WHEN 'SUMMER' THEN '暑假留宿安排及住宿管理记录。'
    ELSE '寒假留宿安排及住宿管理记录。'
END
WHERE batch_code IN ('WINTER-2024', 'SUMMER-2025', 'WINTER-2025', 'SUMMER-2026');

INSERT IGNORE INTO stay_building_rule (batch_id, building_id, application_deadline, auto_lock, published_at)
SELECT b.batch_id, d.building_id, b.application_deadline, 1, DATE_SUB(b.application_deadline, INTERVAL 1 DAY)
FROM stay_batch b
CROSS JOIN building d
WHERE b.batch_code IN ('WINTER-2024', 'SUMMER-2025', 'WINTER-2025', 'SUMMER-2026');

-- Add 12 completed applications to winter 2024 and 8 per cohort to each later batch.
INSERT INTO stay_application (
    batch_id, student_id, current_status, review_reason, created_at, updated_at,
    reviewer_user_id, reviewed_at, building_id, source, archived_at, archive_reason
)
SELECT b.batch_id, s.student_id, 'COMPLETED', '假期留宿申请已完成审核。',
       DATE_SUB(b.open_start_date, INTERVAL 14 DAY), DATE_ADD(b.open_end_date, INTERVAL 1 DAY),
       (SELECT user_id FROM v_user_identity WHERE role_code = 'ADMIN' ORDER BY user_id LIMIT 1),
       DATE_SUB(b.open_start_date, INTERVAL 8 DAY), s.building_id, 'ADMIN_ADDED',
       DATE_ADD(b.open_end_date, INTERVAL 1 DAY), '留宿结束'
FROM stay_batch b
JOIN (
    SELECT p.student_id, a.building_id, p.enrollment_year,
           ROW_NUMBER() OVER (PARTITION BY p.enrollment_year ORDER BY p.student_id) cohort_no
    FROM v_student_profile p
    JOIN v_accommodation_current a ON a.student_id = p.student_id
    WHERE p.enrollment_year IN (2024, 2025)
) s ON (
    (b.batch_code = 'WINTER-2024' AND s.enrollment_year = 2024 AND s.cohort_no <= 12)
    OR (b.batch_code IN ('SUMMER-2025', 'WINTER-2025', 'SUMMER-2026') AND s.cohort_no <= 8)
)
WHERE b.batch_code IN ('WINTER-2024', 'SUMMER-2025', 'WINTER-2025', 'SUMMER-2026')
  AND NOT EXISTS (
      SELECT 1 FROM stay_application existing
      WHERE existing.batch_id = b.batch_id AND existing.student_id = s.student_id
  );

INSERT INTO stay_version (application_id, reason, saved_at, submitted_at)
SELECT a.application_id, CONCAT(b.academic_year, '年', IF(b.vacation_type='SUMMER','暑假','寒假'), '留宿申请'), a.created_at,
       DATE_ADD(a.created_at, INTERVAL 1 DAY)
FROM stay_application a
JOIN stay_batch b ON b.batch_id = a.batch_id
WHERE b.batch_code IN ('WINTER-2024', 'SUMMER-2025', 'WINTER-2025', 'SUMMER-2026')
  AND NOT EXISTS (SELECT 1 FROM stay_version v WHERE v.application_id = a.application_id);

INSERT INTO stay_date_range (version_id, start_date, end_date)
SELECT v.version_id,
       DATE_ADD(b.open_start_date, INTERVAL 7 DAY),
       DATE_ADD(b.open_start_date, INTERVAL 9 DAY)
FROM stay_version v
JOIN stay_application a ON a.application_id = v.application_id
JOIN stay_batch b ON b.batch_id = a.batch_id
WHERE b.batch_code IN ('WINTER-2024', 'SUMMER-2025', 'WINTER-2025', 'SUMMER-2026')
  AND NOT EXISTS (SELECT 1 FROM stay_date_range r WHERE r.version_id = v.version_id);

INSERT INTO stay_review (application_id, version_id, reviewer_user_id, result, reason, reviewed_at)
SELECT a.application_id, v.version_id,
       (SELECT user_id FROM v_user_identity WHERE role_code = 'ADMIN' ORDER BY user_id LIMIT 1),
       'APPROVED', '留宿日期与住宿信息已核对，通过申请。', a.reviewed_at
FROM stay_application a
JOIN stay_batch b ON b.batch_id = a.batch_id
JOIN stay_version v ON v.application_id = a.application_id
WHERE b.batch_code IN ('WINTER-2024', 'SUMMER-2025', 'WINTER-2025', 'SUMMER-2026')
  AND NOT EXISTS (SELECT 1 FROM stay_review r WHERE r.application_id = a.application_id);

-- Add non-overlapping accommodation history before the current 2026 assignments.
INSERT INTO accommodation_assignment (student_id, bed_id, check_in_date, check_out_date, assignment_type)
SELECT history.student_id, history.bed_id, history.check_in_date, history.check_out_date, 'ASSIGN'
FROM (
    SELECT s.student_id, a.bed_id, DATE('2024-09-01') check_in_date, DATE('2025-07-01') check_out_date
    FROM (
        SELECT p.student_id, p.enrollment_year,
               ROW_NUMBER() OVER (PARTITION BY p.enrollment_year ORDER BY p.student_id) cohort_no
        FROM v_student_profile p
        JOIN v_accommodation_current a ON a.student_id = p.student_id
        WHERE p.enrollment_year = 2024
    ) s
    JOIN v_accommodation_current a ON a.student_id = s.student_id
    WHERE s.cohort_no <= 12
    UNION ALL
    SELECT s.student_id, a.bed_id, DATE('2025-09-01'), DATE('2026-07-01')
    FROM (
        SELECT p.student_id, p.enrollment_year,
               ROW_NUMBER() OVER (PARTITION BY p.enrollment_year ORDER BY p.student_id) cohort_no
        FROM v_student_profile p
        JOIN v_accommodation_current a ON a.student_id = p.student_id
        WHERE p.enrollment_year IN (2024, 2025)
    ) s
    JOIN v_accommodation_current a ON a.student_id = s.student_id
    WHERE s.cohort_no <= 12
) history
WHERE NOT EXISTS (
    SELECT 1 FROM accommodation_assignment existing
    WHERE existing.student_id = history.student_id
      AND existing.bed_id = history.bed_id
      AND existing.check_in_date = history.check_in_date
);

-- Add 15 archived repair orders per calendar year, with dispatch and result records.
UPDATE repair_order
SET order_no = CONCAT('WX', DATE_FORMAT(created_at, '%Y%m%d'), LPAD(order_id, 4, '0')),
    title = REPLACE(REPLACE(title, '历史测试：', ''), '测试报修：', '')
WHERE order_no NOT REGEXP '^WX[0-9]{12}$' OR title LIKE '历史测试：%' OR title LIKE '测试报修：%';

INSERT INTO repair_order (
    order_no, student_id, room_id, category_id, title, description, urgent,
    current_status, created_at, updated_at, rule_id, archived_at, archive_reason
)
SELECT CONCAT('WX', DATE_FORMAT(DATE_ADD(STR_TO_DATE(CONCAT(years.repair_year, '-03-01'), '%Y-%m-%d'), INTERVAL homes.sample_no DAY), '%Y%m%d'), LPAD(homes.sample_no, 4, '0')),
       homes.student_id, homes.room_id, 1 + MOD(homes.sample_no - 1, 5),
       CASE MOD(homes.sample_no - 1, 4)
           WHEN 0 THEN '宿舍灯具故障'
           WHEN 1 THEN '水龙头渗漏'
           WHEN 2 THEN '门锁检修'
           ELSE '插座无电'
       END,
       '故障已检查并完成维修，通电及使用状态正常。', MOD(homes.sample_no, 4) = 0,
       'ARCHIVED',
       DATE_ADD(STR_TO_DATE(CONCAT(years.repair_year, '-03-01'), '%Y-%m-%d'), INTERVAL homes.sample_no DAY),
       DATE_ADD(STR_TO_DATE(CONCAT(years.repair_year, '-03-01'), '%Y-%m-%d'), INTERVAL (homes.sample_no + 3) DAY),
       1,
       DATE_ADD(STR_TO_DATE(CONCAT(years.repair_year, '-03-01'), '%Y-%m-%d'), INTERVAL (homes.sample_no + 3) DAY),
       '维修完成并归档'
FROM (
    SELECT current_home.student_id, current_home.room_id,
           ROW_NUMBER() OVER (ORDER BY current_home.student_id) sample_no
    FROM (SELECT DISTINCT student_id, room_id FROM v_accommodation_current) current_home
) homes
CROSS JOIN (SELECT 2024 repair_year UNION ALL SELECT 2025 UNION ALL SELECT 2026) years
WHERE homes.sample_no <= 15
  AND NOT EXISTS (
      SELECT 1 FROM repair_order existing
      WHERE existing.order_no = CONCAT('WX', DATE_FORMAT(DATE_ADD(STR_TO_DATE(CONCAT(years.repair_year, '-03-01'), '%Y-%m-%d'), INTERVAL homes.sample_no DAY), '%Y%m%d'), LPAD(homes.sample_no, 4, '0'))
  );

INSERT INTO repair_dispatch (
    order_id, repairer_user_id, dispatch_mode, dispatch_status, created_at, decided_at, repair_deadline
)
SELECT o.order_id,
       workers.repairer_user_id,
       'MANUAL', 'ACCEPTED', o.created_at,
       DATE_ADD(o.created_at, INTERVAL 1 HOUR), DATE_ADD(o.created_at, INTERVAL 2 DAY)
FROM repair_order o
JOIN (
    SELECT repairer_user_id,
           ROW_NUMBER() OVER (ORDER BY repairer_user_id) worker_no
    FROM repairer_profile
    WHERE enabled = 1
) workers ON workers.worker_no = 1 + MOD(CAST(RIGHT(o.order_no, 4) AS UNSIGNED) - 1,
    (SELECT COUNT(*) FROM repairer_profile WHERE enabled = 1))
WHERE o.title IN ('宿舍灯具故障','水龙头渗漏','门锁检修','插座无电') AND YEAR(o.created_at) BETWEEN 2024 AND 2026
  AND NOT EXISTS (SELECT 1 FROM repair_dispatch d WHERE d.order_id = o.order_id);

INSERT INTO repair_result (order_id, repairer_user_id, result_text, expected_finish_at, created_at)
SELECT o.order_id, d.repairer_user_id, '故障已修复并完成现场复测。',
       DATE_ADD(o.created_at, INTERVAL 2 DAY), DATE_ADD(o.created_at, INTERVAL 2 DAY)
FROM repair_order o
JOIN repair_dispatch d ON d.order_id = o.order_id
WHERE o.title IN ('宿舍灯具故障','水龙头渗漏','门锁检修','插座无电') AND YEAR(o.created_at) BETWEEN 2024 AND 2026
  AND NOT EXISTS (SELECT 1 FROM repair_result r WHERE r.order_id = o.order_id);

INSERT IGNORE INTO repair_evaluation (order_id, score, comment, created_at)
SELECT o.order_id, 1 + MOD(CAST(RIGHT(o.order_no, 4) AS UNSIGNED) + YEAR(o.created_at), 5),
       '维修结果符合要求，现场复测正常。', DATE_ADD(o.created_at, INTERVAL 3 DAY)
FROM repair_order o
WHERE o.title IN ('宿舍灯具故障','水龙头渗漏','门锁检修','插座无电') AND YEAR(o.created_at) BETWEEN 2024 AND 2026;

INSERT IGNORE INTO repair_evaluation (order_id, score, comment, created_at)
SELECT o.order_id, 5, '维修完成后未在期限内评价，系统按规则记为5分。', COALESCE(c.confirmed_at, o.archived_at, o.updated_at)
FROM repair_order o
LEFT JOIN repair_confirmation c ON c.order_id = o.order_id
WHERE o.current_status IN ('ARCHIVED','CLOSED')
  AND EXISTS (SELECT 1 FROM repair_result r WHERE r.order_id = o.order_id);

INSERT INTO repair_audit (order_id, reviewer_user_id, result, reason, created_at)
SELECT o.order_id,
       (SELECT user_id FROM v_user_identity WHERE role_code = 'ADMIN' ORDER BY user_id LIMIT 1),
       'APPROVED', '故障信息和宿舍位置已核实，同意维修。', DATE_ADD(o.created_at, INTERVAL 1 HOUR)
FROM repair_order o
WHERE o.title IN ('宿舍灯具故障','水龙头渗漏','门锁检修','插座无电')
  AND YEAR(o.created_at) BETWEEN 2024 AND 2026
  AND NOT EXISTS (SELECT 1 FROM repair_audit a WHERE a.order_id = o.order_id);

INSERT INTO repair_delay_request (order_id, repairer_user_id, reason, expected_finish_at, current_status, reviewer_user_id, review_reason, reviewed_at, created_at)
SELECT o.order_id, d.repairer_user_id, '配件需要从仓库调取，申请顺延一个工作日。',
       DATE_ADD(o.created_at, INTERVAL 3 DAY), 'APPROVED',
       (SELECT user_id FROM v_user_identity WHERE role_code = 'ADMIN' ORDER BY user_id LIMIT 1),
       '延期原因明确，同意顺延。', DATE_ADD(o.created_at, INTERVAL 1 DAY), DATE_ADD(o.created_at, INTERVAL 12 HOUR)
FROM repair_order o JOIN repair_dispatch d ON d.order_id = o.order_id
WHERE o.title IN ('宿舍灯具故障','水龙头渗漏','门锁检修','插座无电')
  AND YEAR(o.created_at) BETWEEN 2024 AND 2026 AND MOD(o.order_id, 3) = 0
  AND NOT EXISTS (SELECT 1 FROM repair_delay_request x WHERE x.order_id = o.order_id);

INSERT INTO site_message (target_role, title, content, created_at, publisher_user_id, publish_at, delivered_at)
SELECT 'BUILDINGS',
       seed.notice_title,
       seed.notice_content,
       seed.notice_at, manager.manager_user_id, seed.notice_at, seed.notice_at
FROM (SELECT DISTINCT manager_user_id FROM manager_building_scope) manager
CROSS JOIN (
    SELECT 2023 notice_year, '2023-09-05 09:00:00' notice_at, '2023秋季开学住宿核对' notice_title, '请于9月8日前核对本楼住宿学生名单与床位调整信息；发现变更请及时更新。' notice_content
    UNION ALL SELECT 2024, '2024-03-12 14:30:00', '2024春季消防与用电检查', '本周将检查消防通道、灭火器和宿舍用电情况，请提醒学生清理通道并规范使用电器。'
    UNION ALL SELECT 2025, '2025-06-18 10:15:00', '2025暑期留校及离校登记', '请核实暑期留校学生名单，并提醒离校学生完成门窗、水电和钥匙检查。'
    UNION ALL SELECT 2026, '2026-10-08 16:20:00', '2026秋季宿舍设施巡查', '请在本周完成公共区域、门锁和供水设施巡查，发现需要维修的项目及时提交报修。'
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM site_message m
    WHERE m.publisher_user_id = manager.manager_user_id
      AND m.title = seed.notice_title
      AND m.created_at = seed.notice_at
);

INSERT IGNORE INTO message_building_target (message_id, building_id)
SELECT m.message_id, scope.building_id
FROM site_message m
JOIN manager_building_scope scope ON scope.manager_user_id = m.publisher_user_id
WHERE m.title IN ('2023秋季开学住宿核对','2024春季消防与用电检查','2025暑期留校及离校登记','2026秋季宿舍设施巡查');

INSERT IGNORE INTO message_target (message_id, user_id)
SELECT m.message_id, home.student_id
FROM site_message m
JOIN message_building_target target ON target.message_id = m.message_id
JOIN v_accommodation_current home ON home.building_id = target.building_id
WHERE m.title IN ('2023秋季开学住宿核对','2024春季消防与用电检查','2025暑期留校及离校登记','2026秋季宿舍设施巡查');

INSERT IGNORE INTO message_receipt (message_id, user_id, read_at)
SELECT target.message_id, target.user_id, IF(identity.role_code='ADMIN', NOW(), NULL)
FROM message_target target
JOIN site_message m ON m.message_id = target.message_id
JOIN v_user_identity identity ON identity.user_id = target.user_id
WHERE m.title IN ('2023秋季开学住宿核对','2024春季消防与用电检查','2025暑期留校及离校登记','2026秋季宿舍设施巡查');

UPDATE site_message
SET title = '宿舍事务通知', content = '请查看相关宿舍事务的处理进度。'
WHERE title = '测试';

UPDATE repair_order
SET description = '宿舍设施经检查需要维修，维修完成后已复测正常。'
WHERE description LIKE '%测试%';

UPDATE stay_application a JOIN stay_batch b ON b.batch_id = a.batch_id
SET a.review_reason = '假期留宿申请已完成审核。'
WHERE b.batch_code IN ('WINTER-2024', 'SUMMER-2025', 'WINTER-2025', 'SUMMER-2026')
  AND a.review_reason LIKE '%测试%';

UPDATE stay_version v JOIN stay_application a ON a.application_id = v.application_id
JOIN stay_batch b ON b.batch_id = a.batch_id
SET v.reason = CONCAT(b.academic_year, '年', IF(b.vacation_type='SUMMER','暑假','寒假'), '留宿申请')
WHERE b.batch_code IN ('WINTER-2024', 'SUMMER-2025', 'WINTER-2025', 'SUMMER-2026')
  AND v.reason LIKE '%测试%';

UPDATE stay_review r JOIN stay_application a ON a.application_id = r.application_id
JOIN stay_batch b ON b.batch_id = a.batch_id
SET r.reason = '留宿日期与住宿信息已核对，通过申请。'
WHERE b.batch_code IN ('WINTER-2024', 'SUMMER-2025', 'WINTER-2025', 'SUMMER-2026')
  AND r.reason LIKE '%测试%';

COMMIT;
