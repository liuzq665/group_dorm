CREATE TABLE IF NOT EXISTS repair_rework_request (
  request_id BIGINT NOT NULL AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  requester_user_id BIGINT NULL,
  reason VARCHAR(500) NOT NULL,
  request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  reviewer_user_id BIGINT NULL,
  review_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  PRIMARY KEY (request_id),
  KEY idx_repair_rework_order_status (order_id, request_status),
  CONSTRAINT fk_repair_rework_order FOREIGN KEY (order_id) REFERENCES repair_order(order_id),
  CONSTRAINT fk_repair_rework_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES dorm_manager_profile(manager_user_id)
);

SET @requester_column_exists=(SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='repair_rework_request' AND column_name='requester_user_id');
SET @requester_column_sql=IF(@requester_column_exists=0,'ALTER TABLE repair_rework_request ADD COLUMN requester_user_id BIGINT NULL AFTER order_id','SELECT 1');
PREPARE requester_column_statement FROM @requester_column_sql;
EXECUTE requester_column_statement;
DEALLOCATE PREPARE requester_column_statement;
UPDATE repair_rework_request request JOIN repair_order orders ON orders.order_id=request.order_id SET request.requester_user_id=orders.student_id WHERE request.requester_user_id IS NULL;
ALTER TABLE repair_rework_request MODIFY requester_user_id BIGINT NOT NULL;
SET @requester_fk_exists=(SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name='repair_rework_request' AND constraint_name='fk_repair_rework_requester');
SET @requester_fk_sql=IF(@requester_fk_exists=0,'ALTER TABLE repair_rework_request ADD CONSTRAINT fk_repair_rework_requester FOREIGN KEY (requester_user_id) REFERENCES student(student_id)','SELECT 1');
PREPARE requester_fk_statement FROM @requester_fk_sql;
EXECUTE requester_fk_statement;
DEALLOCATE PREPARE requester_fk_statement;

SET @result_index_exists=(SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='repair_result' AND index_name='idx_repair_result_order_created');
SET @result_index_sql=IF(@result_index_exists=0,'ALTER TABLE repair_result ADD KEY idx_repair_result_order_created (order_id, created_at, result_id)','SELECT 1');
PREPARE result_index_statement FROM @result_index_sql;
EXECUTE result_index_statement;
DEALLOCATE PREPARE result_index_statement;
ALTER TABLE repair_result DROP INDEX order_id;

CREATE OR REPLACE VIEW v_repair_order_dashboard AS
SELECT ro.order_id,ro.order_no,ro.student_id,ro.room_id,ro.category_id,ro.title,ro.description,
       ro.urgent,ro.current_status,ro.abnormal,ro.reject_reason,ro.created_at,ro.updated_at,
       ro.parent_order_id,ro.rule_id,ro.archived_at,ro.archive_reason,
       s.student_name,r.building_id,r.room_no,b.building_name,c.category_name,c.work_type_id,w.work_type_name,
       rd.dispatch_id,rd.repairer_user_id,rp.repairer_name,rd.accept_deadline,rd.repair_deadline,
       rr.result_text,ev.score,ev.comment,
       (SELECT COUNT(*) FROM repair_dispatch x WHERE x.order_id=ro.order_id AND x.dispatch_status='REJECTED') reject_count,
       (SELECT COUNT(*) FROM repair_dispatch x WHERE x.order_id=ro.order_id AND x.dispatch_status='TIMEOUT') accept_timeout_count,
       (SELECT COUNT(*) FROM repair_exception x WHERE x.order_id=ro.order_id AND x.exception_type='REPAIR_TIMEOUT') repair_timeout_count
  FROM repair_order ro
  JOIN student s ON s.student_id=ro.student_id
  JOIN dorm_room r ON r.room_id=ro.room_id
  JOIN building b ON b.building_id=r.building_id
  LEFT JOIN fault_category c ON c.category_id=ro.category_id
  LEFT JOIN repair_work_type w ON w.work_type_id=c.work_type_id
  LEFT JOIN repair_dispatch rd ON rd.dispatch_id=(SELECT MAX(x.dispatch_id) FROM repair_dispatch x WHERE x.order_id=ro.order_id AND x.dispatch_status IN ('PENDING','ACCEPTED'))
  LEFT JOIN repairer_profile rp ON rp.repairer_user_id=rd.repairer_user_id
  LEFT JOIN repair_result rr ON rr.result_id=(SELECT MAX(x.result_id) FROM repair_result x WHERE x.order_id=ro.order_id)
  LEFT JOIN repair_evaluation ev ON ev.order_id=ro.order_id;
