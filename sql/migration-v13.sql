USE dorm_platform;

ALTER TABLE message_receipt
    ADD COLUMN deleted_at DATETIME NULL AFTER read_at;

START TRANSACTION;

UPDATE site_message m
JOIN v_user_identity publisher ON publisher.user_id = m.publisher_user_id
SET m.title = CASE YEAR(m.created_at)
        WHEN 2023 THEN '2023秋季开学住宿核对'
        WHEN 2024 THEN '2024春季消防与用电检查'
        WHEN 2025 THEN '2025暑期留校及离校登记'
        WHEN 2026 THEN '2026秋季宿舍设施巡查'
    END,
    m.content = CASE YEAR(m.created_at)
        WHEN 2023 THEN '请于9月8日前核对本楼住宿学生名单与床位调整信息；发现变更请及时更新。'
        WHEN 2024 THEN '本周将检查消防通道、灭火器和宿舍用电情况，请提醒学生清理通道并规范使用电器。'
        WHEN 2025 THEN '请核实暑期留校学生名单，并提醒离校学生完成门窗、水电和钥匙检查。'
        WHEN 2026 THEN '请在本周完成公共区域、门锁和供水设施巡查，发现需要维修的项目及时提交报修。'
    END
WHERE publisher.role_code = 'DORM_MANAGER'
  AND m.title LIKE '宿管通知-%'
  AND YEAR(m.created_at) BETWEEN 2023 AND 2026;

UPDATE site_message
SET title = '宿舍事务通知',
    content = '请查看相关宿舍事务的处理进度。'
WHERE title = '测试';

INSERT INTO site_message (target_role, title, content, created_at, publisher_user_id, publish_at, delivered_at)
SELECT 'BUILDINGS', seed.notice_title, seed.notice_content,
       seed.notice_at, manager.manager_user_id, seed.notice_at, seed.notice_at
FROM (SELECT DISTINCT manager_user_id FROM manager_building_scope) manager
CROSS JOIN (
    SELECT 2023 notice_year, '2023-09-05 09:00:00' notice_at, '2023秋季开学住宿核对' notice_title, '请于9月8日前核对本楼住宿学生名单与床位调整信息；发现变更请及时更新。' notice_content
    UNION ALL SELECT 2024, '2024-03-12 14:30:00', '2024春季消防与用电检查', '本周将检查消防通道、灭火器和宿舍用电情况，请提醒学生清理通道并规范使用电器。'
    UNION ALL SELECT 2025, '2025-06-18 10:15:00', '2025暑期留校及离校登记', '请核实暑期留校学生名单，并提醒离校学生完成门窗、水电和钥匙检查。'
    UNION ALL SELECT 2026, '2026-10-08 16:20:00', '2026秋季宿舍设施巡查', '请在本周完成公共区域、门锁和供水设施巡查，发现需要维修的项目及时提交报修。'
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM site_message existing
    WHERE existing.publisher_user_id = manager.manager_user_id
      AND existing.title = seed.notice_title
      AND existing.created_at = seed.notice_at
);

INSERT IGNORE INTO message_building_target (message_id, building_id)
SELECT m.message_id, scope.building_id
FROM site_message m
JOIN manager_building_scope scope ON scope.manager_user_id = m.publisher_user_id
WHERE m.title IN ('2023秋季开学住宿核对','2024春季消防与用电检查','2025暑期留校及离校登记','2026秋季宿舍设施巡查');

INSERT IGNORE INTO message_target (message_id, user_id)
SELECT DISTINCT m.message_id, home.student_id
FROM site_message m
JOIN message_building_target target ON target.message_id = m.message_id
JOIN v_accommodation_current home ON home.building_id = target.building_id
WHERE m.title IN ('2023秋季开学住宿核对','2024春季消防与用电检查','2025暑期留校及离校登记','2026秋季宿舍设施巡查');

INSERT IGNORE INTO message_receipt (message_id, user_id, read_at)
SELECT target.message_id, target.user_id, NULL
FROM message_target target
JOIN site_message m ON m.message_id = target.message_id
WHERE m.title IN ('2023秋季开学住宿核对','2024春季消防与用电检查','2025暑期留校及离校登记','2026秋季宿舍设施巡查');

INSERT IGNORE INTO schema_version (version_no) VALUES (13);

COMMIT;
