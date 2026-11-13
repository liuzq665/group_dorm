CREATE TABLE stay_version_attachment (
  version_id BIGINT NOT NULL,
  file_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version_id, file_id),
  KEY idx_stay_version_attachment_file (file_id),
  CONSTRAINT fk_stay_version_attachment_version FOREIGN KEY (version_id) REFERENCES stay_version(version_id),
  CONSTRAINT fk_stay_version_attachment_file FOREIGN KEY (file_id) REFERENCES file_resource(file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
