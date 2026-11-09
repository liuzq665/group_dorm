CREATE TABLE IF NOT EXISTS repair_rework_request (
    request_id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewer_user_id BIGINT DEFAULT NULL,
    review_reason VARCHAR(1000) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME DEFAULT NULL,
    PRIMARY KEY (request_id),
    KEY idx_rework_order_status (order_id, request_status),
    CONSTRAINT fk_rework_request_order FOREIGN KEY (order_id) REFERENCES repair_order (order_id),
    CONSTRAINT fk_rework_request_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES person (person_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS repair_result_history (
    history_id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    round_no INT NOT NULL,
    repairer_user_id BIGINT NOT NULL,
    result_text VARCHAR(1000) NOT NULL,
    expected_finish_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (history_id),
    UNIQUE KEY uq_repair_result_round (order_id, round_no),
    CONSTRAINT fk_repair_result_history_order FOREIGN KEY (order_id) REFERENCES repair_order (order_id),
    CONSTRAINT fk_repair_result_history_worker FOREIGN KEY (repairer_user_id) REFERENCES repairer_profile (repairer_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO schema_version (version_no, installed_at) VALUES (18, NOW());
