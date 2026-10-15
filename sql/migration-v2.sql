USE dorm_platform;

ALTER TABLE repair_order ADD COLUMN parent_order_id BIGINT NULL;
ALTER TABLE stay_application ADD COLUMN reviewer_user_id BIGINT NULL;
ALTER TABLE stay_application ADD COLUMN reviewed_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS manager_building_scope (
  manager_user_id BIGINT NOT NULL,
  building_id BIGINT NOT NULL,
  PRIMARY KEY (manager_user_id, building_id),
  FOREIGN KEY (manager_user_id) REFERENCES sys_user(user_id),
  FOREIGN KEY (building_id) REFERENCES building(building_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_order_relation (
  parent_order_id BIGINT NOT NULL,
  child_order_id BIGINT NOT NULL PRIMARY KEY,
  relation_type VARCHAR(30) NOT NULL,
  FOREIGN KEY (parent_order_id) REFERENCES repair_order(order_id),
  FOREIGN KEY (child_order_id) REFERENCES repair_order(order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_delay_request (
  request_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  repairer_user_id BIGINT NOT NULL,
  reason VARCHAR(500) NOT NULL,
  expected_finish_at DATETIME NOT NULL,
  current_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  reviewer_user_id BIGINT NULL,
  review_reason VARCHAR(500),
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES repair_order(order_id),
  FOREIGN KEY (repairer_user_id) REFERENCES sys_user(user_id),
  FOREIGN KEY (reviewer_user_id) REFERENCES sys_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO manager_building_scope(manager_user_id, building_id)
SELECT 2, building_id FROM building;

CREATE OR REPLACE VIEW v_repair_order_dashboard AS
SELECT ro.order_id, ro.order_no, ro.parent_order_id, ro.current_status, ro.urgent, ro.abnormal,
       ro.title, ro.description, ro.student_user_id, ro.room_id, ro.category_id, ro.reject_reason,
       ro.created_at, ro.updated_at, u.real_name AS student_name,
       c.category_name, w.work_type_name, rd.repairer_user_id, ru.real_name AS repairer_name,
       rr.result_text, ev.score
FROM repair_order ro
JOIN sys_user u ON u.user_id=ro.student_user_id
LEFT JOIN fault_category c ON c.category_id=ro.category_id
LEFT JOIN repair_work_type w ON w.work_type_id=c.work_type_id
LEFT JOIN repair_dispatch rd ON rd.dispatch_id=(
  SELECT MAX(x.dispatch_id) FROM repair_dispatch x
  WHERE x.order_id=ro.order_id AND x.dispatch_status IN ('PENDING','ACCEPTED')
)
LEFT JOIN sys_user ru ON ru.user_id=rd.repairer_user_id
LEFT JOIN repair_result rr ON rr.order_id=ro.order_id
LEFT JOIN repair_evaluation ev ON ev.order_id=ro.order_id;
