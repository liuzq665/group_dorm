USE dorm_platform;

ALTER TABLE stay_batch
    ADD COLUMN academic_year SMALLINT UNSIGNED NULL AFTER batch_name,
    ADD COLUMN vacation_type ENUM('SUMMER', 'WINTER') NULL AFTER academic_year;

UPDATE stay_batch
SET academic_year = CASE
        WHEN batch_code REGEXP '^[A-Z]+-[0-9]{4}$' THEN CAST(RIGHT(batch_code, 4) AS UNSIGNED)
        ELSE YEAR(open_start_date)
    END,
    vacation_type = CASE
        WHEN UPPER(batch_code) LIKE 'SUMMER%' THEN 'SUMMER'
        WHEN UPPER(batch_code) LIKE 'WINTER%' THEN 'WINTER'
        WHEN MONTH(open_start_date) BETWEEN 6 AND 8 THEN 'SUMMER'
        ELSE 'WINTER'
    END;

ALTER TABLE stay_batch
    MODIFY COLUMN academic_year SMALLINT UNSIGNED NOT NULL,
    MODIFY COLUMN vacation_type ENUM('SUMMER', 'WINTER') NOT NULL;

CREATE TABLE stay_batch_material (
    material_id BIGINT NOT NULL AUTO_INCREMENT,
    batch_id BIGINT NOT NULL,
    file_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (material_id),
    UNIQUE KEY uq_stay_batch_material (batch_id, file_id),
    KEY idx_stay_batch_material_file (file_id),
    CONSTRAINT fk_stay_batch_material_batch FOREIGN KEY (batch_id) REFERENCES stay_batch (batch_id),
    CONSTRAINT fk_stay_batch_material_file FOREIGN KEY (file_id) REFERENCES file_resource (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_version(version_no) VALUES (10);
