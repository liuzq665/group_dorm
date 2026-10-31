USE dorm_platform;

-- Adds approved winter-stay entries for the active sample batch.
INSERT INTO stay_application(batch_id, student_id, building_id, source, current_status, reviewer_user_id, reviewed_at)
SELECT 1, a.student_id, a.building_id, 'ADMIN_ADDED', 'APPROVED', 4, NOW()
FROM v_accommodation_current a
WHERE a.student_id <= 20
  AND NOT EXISTS (
    SELECT 1 FROM stay_application existing
    WHERE existing.batch_id = 1 AND existing.student_id = a.student_id
)
ORDER BY a.student_id
LIMIT 15;

INSERT INTO stay_version(application_id, reason, submitted_at)
SELECT a.application_id, '假期留宿申请', NOW()
FROM stay_application a
WHERE a.batch_id = 1 AND a.source = 'ADMIN_ADDED'
  AND NOT EXISTS (SELECT 1 FROM stay_version v WHERE v.application_id = a.application_id);

INSERT INTO stay_date_range(version_id, start_date, end_date)
SELECT v.version_id, '2027-01-26', '2027-01-28'
FROM stay_version v
JOIN stay_application a ON a.application_id = v.application_id
WHERE a.batch_id = 1 AND a.source = 'ADMIN_ADDED'
  AND NOT EXISTS (SELECT 1 FROM stay_date_range r WHERE r.version_id = v.version_id);

INSERT INTO stay_review(application_id, version_id, reviewer_user_id, result, reason)
SELECT a.application_id, v.version_id, 4, 'APPROVED', '管理员已核对申请信息并完成补录。'
FROM stay_application a
JOIN stay_version v ON v.application_id = a.application_id
WHERE a.batch_id = 1 AND a.source = 'ADMIN_ADDED'
  AND NOT EXISTS (SELECT 1 FROM stay_review review WHERE review.application_id = a.application_id);

UPDATE stay_version v
JOIN stay_application a ON a.application_id = v.application_id
SET v.reason = '假期留宿申请'
WHERE a.batch_id = 1 AND a.source = 'ADMIN_ADDED' AND v.reason LIKE '%测试%';

UPDATE stay_review review
JOIN stay_application a ON a.application_id = review.application_id
SET review.reason = '管理员已核对申请信息并完成补录。'
WHERE a.batch_id = 1 AND a.source = 'ADMIN_ADDED' AND review.reason LIKE '%测试%';

-- Adds active repair requests with both draft and review-pending states.
INSERT INTO repair_order(order_no, student_id, room_id, category_id, title, description, current_status, rule_id, created_at, updated_at)
SELECT CONCAT('WX20261030', LPAD(s.student_id, 4, '0')), s.student_id, a.room_id,
       CASE WHEN MOD(s.student_id, 5) = 0 THEN 5 ELSE 1 + MOD(s.student_id, 5) END,
       CASE MOD(s.student_id, 4)
           WHEN 0 THEN '宿舍灯具异常'
           WHEN 1 THEN '水龙头渗漏'
           WHEN 2 THEN '门锁需要检修'
           ELSE '家具部件松动'
       END,
       '检查宿舍设施时发现异常，请安排维修人员现场核查。',
       IF(MOD(s.student_id, 3) = 0, 'DRAFT', 'PENDING_REVIEW'), 1,
       DATE_ADD('2026-10-30 22:47:19', INTERVAL s.student_id SECOND),
       DATE_ADD('2026-10-30 22:47:19', INTERVAL s.student_id SECOND)
FROM student s
JOIN v_accommodation_current a ON a.student_id = s.student_id
WHERE s.student_id <= 30
  AND NOT EXISTS (
    SELECT 1 FROM repair_order existing
    WHERE existing.order_no = CONCAT('WX20261030', LPAD(s.student_id, 4, '0'))
       OR (existing.student_id = s.student_id AND existing.description IN (
           '用于系统功能联调的样例报修记录。',
           '检查宿舍设施时发现异常，请安排维修人员现场核查。'
       ))
)
ORDER BY s.student_id
LIMIT 20;
