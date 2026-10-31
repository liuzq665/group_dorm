USE dorm_platform;

CREATE TABLE IF NOT EXISTS stay_version_attachment (
    version_id BIGINT NOT NULL,
    file_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (version_id, file_id),
    KEY idx_stay_version_attachment_file (file_id),
    CONSTRAINT fk_stay_version_attachment_version
        FOREIGN KEY (version_id) REFERENCES stay_version (version_id),
    CONSTRAINT fk_stay_version_attachment_file
        FOREIGN KEY (file_id) REFERENCES file_resource (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

UPDATE repair_order ro
JOIN (
    SELECT order_id, MAX(dispatch_id) AS dispatch_id
    FROM repair_dispatch
    WHERE dispatch_status IN ('PENDING', 'ACCEPTED')
    GROUP BY order_id
) latest_dispatch ON latest_dispatch.order_id = ro.order_id
JOIN repair_dispatch d ON d.dispatch_id = latest_dispatch.dispatch_id
SET ro.current_status = 'ACCEPTED'
WHERE ro.current_status = 'PENDING_REVIEW'
  AND d.dispatch_mode = 'MANUAL'
  AND d.dispatch_status = 'ACCEPTED'
  AND EXISTS (
      SELECT 1 FROM repair_audit a
      WHERE a.order_id = ro.order_id AND a.result = 'APPROVED'
  );

INSERT IGNORE INTO schema_version (version_no) VALUES (14);
