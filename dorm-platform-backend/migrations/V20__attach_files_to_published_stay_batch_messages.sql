INSERT IGNORE INTO message_attachment(message_id, file_id)
SELECT m.message_id, material.file_id
FROM site_message m
JOIN stay_batch batch
  ON m.title = CONVERT(0xE58187E69C9FE79599E5AEBFE689B9E6ACA1E5B7B2E58F91E5B883 USING utf8mb4)
 AND m.content LIKE CONCAT('%', batch.batch_name, '%')
JOIN stay_batch_material material ON material.batch_id = batch.batch_id;

INSERT IGNORE INTO message_building_target(message_id, building_id)
SELECT DISTINCT m.message_id, building.building_id
FROM site_message m
JOIN stay_batch batch
  ON m.title = CONVERT(0xE58187E69C9FE79599E5AEBFE689B9E6ACA1E5B7B2E58F91E5B883 USING utf8mb4)
 AND m.content LIKE CONCAT('%', batch.batch_name, '%')
CROSS JOIN building;
