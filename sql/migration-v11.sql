USE dorm_platform;
START TRANSACTION;

CREATE TABLE IF NOT EXISTS message_building_target (
    message_id BIGINT NOT NULL,
    building_id BIGINT NOT NULL,
    PRIMARY KEY (message_id, building_id),
    KEY idx_message_building_target_building (building_id),
    CONSTRAINT fk_message_building_target_message FOREIGN KEY (message_id) REFERENCES site_message (message_id),
    CONSTRAINT fk_message_building_target_building FOREIGN KEY (building_id) REFERENCES building (building_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_attachment (
    message_id BIGINT NOT NULL,
    file_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, file_id),
    KEY idx_message_attachment_file (file_id),
    CONSTRAINT fk_message_attachment_message FOREIGN KEY (message_id) REFERENCES site_message (message_id),
    CONSTRAINT fk_message_attachment_file FOREIGN KEY (file_id) REFERENCES file_resource (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_version (version_no) VALUES (11);
COMMIT;
