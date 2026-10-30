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
SELECT a.application_id, '测试数据：假期留宿', NOW()
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
SELECT a.application_id, v.version_id, 4, 'APPROVED', '测试数据：管理员补录直接通过'
FROM stay_application a
JOIN stay_version v ON v.application_id = a.application_id
WHERE a.batch_id = 1 AND a.source = 'ADMIN_ADDED'
  AND NOT EXISTS (SELECT 1 FROM stay_review review WHERE review.application_id = a.application_id);

-- Adds active repair requests with both draft and review-pending states.
INSERT INTO repair_order(order_no, student_id, room_id, category_id, title, description, current_status, rule_id)
SELECT CONCAT('WXTEST', LPAD(s.student_id, 8, '0')), s.student_id, a.room_id,
       CASE WHEN MOD(s.student_id, 5) = 0 THEN 5 ELSE 1 + MOD(s.student_id, 5) END,
       CASE MOD(s.student_id, 4)
           WHEN 0 THEN '测试报修：宿舍灯具异常'
           WHEN 1 THEN '测试报修：水龙头渗漏'
           WHEN 2 THEN '测试报修：门锁需要检修'
           ELSE '测试报修：家具部件松动'
       END,
       '用于系统功能联调的样例报修记录。',
       IF(MOD(s.student_id, 3) = 0, 'DRAFT', 'PENDING_REVIEW'), 1
FROM student s
JOIN v_accommodation_current a ON a.student_id = s.student_id
WHERE s.student_id <= 30
  AND NOT EXISTS (
    SELECT 1 FROM repair_order existing
    WHERE existing.order_no = CONCAT('WXTEST', LPAD(s.student_id, 8, '0'))
)
ORDER BY s.student_id
LIMIT 20;
