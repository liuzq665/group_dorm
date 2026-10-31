USE dorm_platform;
START TRANSACTION;

-- Keep every residence block populated across six floors with at least two rooms per floor.
INSERT INTO dorm_room(building_id, room_no, floor_no, design_capacity, gender_limit)
SELECT candidate.building_id,
       CONCAT(candidate.floor_no, LPAD(candidate.slot_no, 2, '0')),
       candidate.floor_no,
       4,
       candidate.room_gender
FROM (
    SELECT b.building_id, f.floor_no, s.slot_no,
           CASE WHEN b.gender_limit = '混合'
                THEN IF(MOD(f.floor_no, 2) = 1, '男生', '女生')
                ELSE b.gender_limit END room_gender,
           ROW_NUMBER() OVER (
               PARTITION BY b.building_id, f.floor_no
               ORDER BY EXISTS (
                   SELECT 1 FROM dorm_room named
                   WHERE named.building_id = b.building_id
                     AND named.room_no = CONCAT(f.floor_no, LPAD(s.slot_no, 2, '0'))
               ), s.slot_no
           ) slot_rank,
           (SELECT COUNT(*) FROM dorm_room existing
            WHERE existing.building_id = b.building_id AND existing.floor_no = f.floor_no) room_count
    FROM building b
    CROSS JOIN (SELECT 1 floor_no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) f
    CROSS JOIN (SELECT 1 slot_no UNION ALL SELECT 2) s
) candidate
WHERE candidate.slot_rank <= GREATEST(2 - candidate.room_count, 0)
  AND NOT EXISTS (
      SELECT 1 FROM dorm_room existing
      WHERE existing.building_id = candidate.building_id
        AND existing.room_no = CONCAT(candidate.floor_no, LPAD(candidate.slot_no, 2, '0'))
  );

INSERT INTO bed(room_id, bed_no, management_status)
SELECT r.room_id, CAST(n.bed_no AS CHAR), 'AVAILABLE'
FROM dorm_room r
CROSS JOIN (SELECT 1 bed_no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) n
WHERE n.bed_no <= r.design_capacity
  AND NOT EXISTS (SELECT 1 FROM bed existing WHERE existing.room_id = r.room_id AND existing.bed_no = CAST(n.bed_no AS CHAR));

UPDATE repair_order
SET archive_reason = '维修完成，工单按流程归档。'
WHERE archive_reason LIKE '%测试%';

UPDATE repair_result
SET result_text = CASE
    WHEN order_id = 3 THEN '已更换衣柜门合页，现场开合顺畅。'
    ELSE '故障已修复，现场运行正常。'
END
WHERE result_text LIKE '%测试%';

UPDATE repair_evaluation
SET comment = CASE MOD(evaluation_id, 5)
    WHEN 0 THEN '维修人员按约完成维修，设施恢复正常。'
    WHEN 1 THEN '处理及时，维修后使用正常。'
    WHEN 2 THEN '故障已排除，现场清理整洁。'
    WHEN 3 THEN '维修过程规范，结果符合预期。'
    ELSE '沟通清楚，设备运行状态良好。'
END
WHERE comment LIKE '%测试%';

-- Seed administrator notices against real, currently unassigned repair orders.
INSERT INTO site_message(target_role, title, content, publisher_user_id, created_at, publish_at, delivered_at)
SELECT 'DIRECT', '维修工单待人工处理提醒',
       CONCAT(o.order_no, '：', o.building_name, ' ', o.room_no, '，', o.title, '，请安排人工审核或派单。'),
       NULL, reminder.reminder_at, reminder.reminder_at, reminder.reminder_at
FROM v_repair_order_dashboard o
CROSS JOIN (
    SELECT CAST('2026-10-28 09:15:00' AS DATETIME) reminder_at UNION ALL
    SELECT '2026-10-29 14:20:00' UNION ALL
    SELECT '2026-10-30 10:40:00' UNION ALL
    SELECT '2026-10-31 08:30:00'
) reminder
WHERE o.current_status = 'PENDING_MANUAL'
  AND EXISTS (SELECT 1 FROM v_user_identity a WHERE a.role_code = 'ADMIN' AND a.enabled = 1)
  AND NOT EXISTS (
      SELECT 1 FROM site_message existing
      WHERE existing.publisher_user_id IS NULL
        AND existing.title = '维修工单待人工处理提醒'
        AND existing.content = CONCAT(o.order_no, '：', o.building_name, ' ', o.room_no, '，', o.title, '，请安排人工审核或派单。')
        AND existing.created_at = reminder.reminder_at
  );

INSERT IGNORE INTO message_target(message_id, user_id)
SELECT m.message_id, a.user_id
FROM site_message m
CROSS JOIN v_user_identity a
WHERE m.title = '维修工单待人工处理提醒'
  AND m.publisher_user_id IS NULL
  AND a.role_code = 'ADMIN'
  AND a.enabled = 1;

INSERT IGNORE INTO message_building_target(message_id, building_id)
SELECT m.message_id, o.building_id
FROM site_message m
JOIN v_repair_order_dashboard o
  ON m.content LIKE CONCAT(o.order_no, '：%')
WHERE m.title = '维修工单待人工处理提醒'
  AND m.publisher_user_id IS NULL;

INSERT IGNORE INTO message_receipt(message_id, user_id, read_at)
SELECT m.message_id, a.user_id,
       CASE WHEN DAY(m.created_at) IN (28, 30) THEN DATE_ADD(m.created_at, INTERVAL 35 MINUTE) ELSE NULL END
FROM site_message m
CROSS JOIN v_user_identity a
WHERE m.title = '维修工单待人工处理提醒'
  AND m.publisher_user_id IS NULL
  AND a.role_code = 'ADMIN'
  AND a.enabled = 1;

UPDATE message_receipt r
JOIN site_message m ON m.message_id = r.message_id
JOIN v_user_identity a ON a.user_id = r.user_id
SET r.read_at = CASE WHEN DAY(m.created_at) IN (28, 30)
                     THEN DATE_ADD(m.created_at, INTERVAL 35 MINUTE)
                     ELSE NULL END
WHERE m.title = '维修工单待人工处理提醒'
  AND m.publisher_user_id IS NULL
  AND a.role_code = 'ADMIN'
  AND a.enabled = 1;

INSERT IGNORE INTO schema_version (version_no) VALUES (12);

COMMIT;
