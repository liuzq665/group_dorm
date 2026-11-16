CREATE TABLE IF NOT EXISTS message_attachment (
  message_id BIGINT NOT NULL,
  file_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, file_id),
  KEY idx_message_attachment_file (file_id),
  CONSTRAINT fk_message_attachment_message FOREIGN KEY (message_id) REFERENCES site_message(message_id),
  CONSTRAINT fk_message_attachment_file FOREIGN KEY (file_id) REFERENCES file_resource(file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS message_building_target (
  message_id BIGINT NOT NULL,
  building_id BIGINT NOT NULL,
  PRIMARY KEY (message_id, building_id),
  KEY idx_message_building_target_building (building_id),
  CONSTRAINT fk_message_building_target_message FOREIGN KEY (message_id) REFERENCES site_message(message_id),
  CONSTRAINT fk_message_building_target_building FOREIGN KEY (building_id) REFERENCES building(building_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stay_batch_material (
  material_id BIGINT NOT NULL AUTO_INCREMENT,
  batch_id BIGINT NOT NULL,
  file_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (material_id),
  UNIQUE KEY uq_stay_batch_material (batch_id, file_id),
  KEY idx_stay_batch_material_file (file_id),
  CONSTRAINT fk_stay_batch_material_batch FOREIGN KEY (batch_id) REFERENCES stay_batch(batch_id),
  CONSTRAINT fk_stay_batch_material_file FOREIGN KEY (file_id) REFERENCES file_resource(file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE message_receipt ADD COLUMN IF NOT EXISTS deleted_at DATETIME DEFAULT NULL;
ALTER TABLE site_message ADD COLUMN IF NOT EXISTS withdrawn_at DATETIME DEFAULT NULL COMMENT '消息撤回时间';

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
