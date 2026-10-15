CREATE DATABASE IF NOT EXISTS dorm_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sys_user (
  user_id BIGINT PRIMARY KEY AUTO_INCREMENT, login_account VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL, real_name VARCHAR(80) NOT NULL, phone VARCHAR(30),
  role_code VARCHAR(30) NOT NULL, enabled TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS building (
  building_id BIGINT PRIMARY KEY AUTO_INCREMENT, building_code VARCHAR(30) NOT NULL UNIQUE,
  building_name VARCHAR(80) NOT NULL, address VARCHAR(200) NOT NULL, gender_limit VARCHAR(20) NOT NULL,
  usage_status VARCHAR(20) NOT NULL DEFAULT 'IN_USE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS dorm_room (
  room_id BIGINT PRIMARY KEY AUTO_INCREMENT, building_id BIGINT NOT NULL, room_no VARCHAR(30) NOT NULL,
  floor_no INT NOT NULL, design_capacity INT NOT NULL, usage_status VARCHAR(20) NOT NULL DEFAULT 'IN_USE',
  UNIQUE KEY uq_room (building_id, room_no), FOREIGN KEY (building_id) REFERENCES building(building_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS bed (
  bed_id BIGINT PRIMARY KEY AUTO_INCREMENT, room_id BIGINT NOT NULL, bed_no VARCHAR(20) NOT NULL,
  management_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', UNIQUE KEY uq_bed (room_id, bed_no),
  FOREIGN KEY (room_id) REFERENCES dorm_room(room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS accommodation_assignment (
  assignment_id BIGINT PRIMARY KEY AUTO_INCREMENT, student_user_id BIGINT NOT NULL, bed_id BIGINT NOT NULL,
  check_in_date DATE NOT NULL, check_out_date DATE NULL, assignment_type VARCHAR(20) NOT NULL DEFAULT 'INITIAL',
  FOREIGN KEY (student_user_id) REFERENCES sys_user(user_id), FOREIGN KEY (bed_id) REFERENCES bed(bed_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS repair_work_type (
  work_type_id BIGINT PRIMARY KEY AUTO_INCREMENT, work_type_code VARCHAR(30) UNIQUE NOT NULL, work_type_name VARCHAR(80) NOT NULL, enabled TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS fault_category (
  category_id BIGINT PRIMARY KEY AUTO_INCREMENT, work_type_id BIGINT NOT NULL, category_name VARCHAR(80) NOT NULL, enabled TINYINT NOT NULL DEFAULT 1,
  FOREIGN KEY (work_type_id) REFERENCES repair_work_type(work_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS repair_order (
  order_id BIGINT PRIMARY KEY AUTO_INCREMENT, order_no VARCHAR(40) UNIQUE NOT NULL, student_user_id BIGINT NOT NULL,
  room_id BIGINT NULL, category_id BIGINT NULL, title VARCHAR(120) NOT NULL, description TEXT NOT NULL,
  urgent TINYINT NOT NULL DEFAULT 0, current_status VARCHAR(30) NOT NULL, abnormal TINYINT NOT NULL DEFAULT 0,
  reject_reason VARCHAR(500), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_user_id) REFERENCES sys_user(user_id), FOREIGN KEY (room_id) REFERENCES dorm_room(room_id), FOREIGN KEY (category_id) REFERENCES fault_category(category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS repair_audit (
  audit_id BIGINT PRIMARY KEY AUTO_INCREMENT, order_id BIGINT NOT NULL, reviewer_user_id BIGINT NOT NULL,
  result VARCHAR(20) NOT NULL, reason VARCHAR(500), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES repair_order(order_id), FOREIGN KEY (reviewer_user_id) REFERENCES sys_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS repair_dispatch (
  dispatch_id BIGINT PRIMARY KEY AUTO_INCREMENT, order_id BIGINT NOT NULL, repairer_user_id BIGINT NOT NULL,
  dispatch_mode VARCHAR(20) NOT NULL, dispatch_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', decision_reason VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, decided_at DATETIME NULL,
  FOREIGN KEY (order_id) REFERENCES repair_order(order_id), FOREIGN KEY (repairer_user_id) REFERENCES sys_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS repair_result (
  result_id BIGINT PRIMARY KEY AUTO_INCREMENT, order_id BIGINT NOT NULL UNIQUE, repairer_user_id BIGINT NOT NULL,
  result_text VARCHAR(1000) NOT NULL, expected_finish_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES repair_order(order_id), FOREIGN KEY (repairer_user_id) REFERENCES sys_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS repair_evaluation (
  evaluation_id BIGINT PRIMARY KEY AUTO_INCREMENT, order_id BIGINT NOT NULL UNIQUE, student_user_id BIGINT NOT NULL,
  score INT NOT NULL, comment VARCHAR(1000), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES repair_order(order_id), FOREIGN KEY (student_user_id) REFERENCES sys_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS stay_batch (
  batch_id BIGINT PRIMARY KEY AUTO_INCREMENT, batch_code VARCHAR(40) UNIQUE NOT NULL, batch_name VARCHAR(100) NOT NULL,
  open_start_date DATE NOT NULL, open_end_date DATE NOT NULL, application_deadline DATETIME NOT NULL,
  instructions VARCHAR(1000), current_status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS stay_application (
  application_id BIGINT PRIMARY KEY AUTO_INCREMENT, batch_id BIGINT NOT NULL, student_user_id BIGINT NOT NULL,
  start_date DATE NOT NULL, end_date DATE NOT NULL, reason VARCHAR(500), current_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  review_reason VARCHAR(500), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_batch (batch_id, student_user_id), FOREIGN KEY (batch_id) REFERENCES stay_batch(batch_id), FOREIGN KEY (student_user_id) REFERENCES sys_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_message (
  message_id BIGINT PRIMARY KEY AUTO_INCREMENT, target_role VARCHAR(30) NOT NULL, title VARCHAR(150) NOT NULL,
  content VARCHAR(2000) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS message_receipt (
  message_id BIGINT NOT NULL, user_id BIGINT NOT NULL, read_at DATETIME NULL, PRIMARY KEY(message_id,user_id),
  FOREIGN KEY(message_id) REFERENCES site_message(message_id), FOREIGN KEY(user_id) REFERENCES sys_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS operation_log (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT, operator_user_id BIGINT, module VARCHAR(40) NOT NULL, action VARCHAR(80) NOT NULL,
  business_id BIGINT, result VARCHAR(20) NOT NULL, occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE OR REPLACE VIEW v_accommodation_current AS
SELECT a.assignment_id, a.student_user_id, u.real_name AS student_name, b.building_name, r.room_no, bd.bed_no,
       a.check_in_date, a.check_out_date
FROM accommodation_assignment a JOIN sys_user u ON u.user_id=a.student_user_id
JOIN bed bd ON bd.bed_id=a.bed_id JOIN dorm_room r ON r.room_id=bd.room_id JOIN building b ON b.building_id=r.building_id
WHERE a.check_in_date <= CURRENT_DATE() AND (a.check_out_date IS NULL OR CURRENT_DATE() < a.check_out_date);
CREATE OR REPLACE VIEW v_repair_order_dashboard AS
SELECT ro.order_id, ro.order_no, ro.current_status, ro.urgent, ro.abnormal, ro.title, ro.student_user_id,
       u.real_name AS student_name, c.category_name, w.work_type_name, rd.repairer_user_id, ru.real_name AS repairer_name,
       rr.result_text, ev.score
FROM repair_order ro JOIN sys_user u ON u.user_id=ro.student_user_id
LEFT JOIN fault_category c ON c.category_id=ro.category_id LEFT JOIN repair_work_type w ON w.work_type_id=c.work_type_id
LEFT JOIN repair_dispatch rd ON rd.dispatch_id=(SELECT MAX(x.dispatch_id) FROM repair_dispatch x WHERE x.order_id=ro.order_id AND x.dispatch_status IN ('PENDING','ACCEPTED'))
LEFT JOIN sys_user ru ON ru.user_id=rd.repairer_user_id LEFT JOIN repair_result rr ON rr.order_id=ro.order_id LEFT JOIN repair_evaluation ev ON ev.order_id=ro.order_id;
