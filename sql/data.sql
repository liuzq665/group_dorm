INSERT IGNORE INTO sys_user(user_id,login_account,password_hash,real_name,phone,role_code) VALUES
(1,'student1',SHA2('123456',256),'张三','13800000001','STUDENT'),
(2,'manager1',SHA2('123456',256),'李老师','13800000002','DORM_MANAGER'),
(3,'repair1',SHA2('123456',256),'王师傅','13800000003','REPAIRER'),
(4,'admin',SHA2('123456',256),'系统管理员','13800000004','ADMIN');
INSERT IGNORE INTO building(building_id,building_code,building_name,address,gender_limit) VALUES (1,'A-01','知行一号楼','东区宿舍组团 1 号','男生'),(2,'B-02','知行二号楼','东区宿舍组团 2 号','女生'),(3,'C-03','明德三号楼','西区宿舍组团 3 号','混合');
INSERT IGNORE INTO dorm_room(room_id,building_id,room_no,floor_no,design_capacity) VALUES (1,1,'203',2,4),(2,1,'204',2,4),(3,2,'406',4,4),(4,3,'108',1,6);
INSERT IGNORE INTO bed(bed_id,room_id,bed_no) VALUES (1,1,'A'),(2,1,'B'),(3,1,'C'),(4,1,'D'),(5,2,'A'),(6,2,'B'),(7,3,'A'),(8,3,'B'),(9,4,'A');
INSERT IGNORE INTO accommodation_assignment(assignment_id,student_user_id,bed_id,check_in_date) VALUES (1,1,1,'2026-09-01');
INSERT IGNORE INTO repair_work_type(work_type_id,work_type_code,work_type_name) VALUES (1,'WATER','水暖维修'),(2,'ELECTRIC','电气维修'),(3,'GENERAL','综合维修');
INSERT IGNORE INTO fault_category(category_id,work_type_id,category_name) VALUES (1,1,'水龙头漏水'),(2,2,'插座无电'),(3,2,'灯具故障'),(4,3,'门锁损坏'),(5,3,'家具损坏');
INSERT IGNORE INTO stay_batch(batch_id,batch_code,batch_name,open_start_date,open_end_date,application_deadline,instructions) VALUES (1,'WINTER-2026','2026 寒假留宿','2027-01-10','2027-02-20','2026-12-20 23:59:59','请按连续开放区间填写留宿日期，提交后等待宿管审核。');
INSERT IGNORE INTO site_message(message_id,target_role,title,content) VALUES (1,'ALL','宿舍系统上线通知','报修、住宿查询和假期留宿申请已开放。请按角色进入对应操作台。'),(2,'STUDENT','报修流程提醒','提交报修后请关注审核、派单和维修结果，维修完成后及时确认评价。'),(3,'DORM_MANAGER','待办提醒','请及时处理待审核报修和留宿申请。'),(4,'REPAIRER','维修工作台提醒','请在接单后按时提交维修结果，无法按期完成时提交延期申请。');
INSERT IGNORE INTO repair_order(order_id,order_no,student_user_id,room_id,category_id,title,description,urgent,current_status,abnormal) VALUES (1,'WX20261014001',1,1,2,'203 室北侧插座无电','床位 A 左侧插座无法使用，已确认其他插座正常。',0,'PENDING_REVIEW',0),(2,'WX20261013018',1,1,3,'书桌上方灯具闪烁','晚间使用时频繁闪烁，存在安全隐患。',1,'REPAIRING',0),(3,'WX20261008007',1,1,5,'衣柜门合页松动','衣柜门下垂，开合不顺畅。',0,'REPAIRED',0);
INSERT IGNORE INTO repair_dispatch(dispatch_id,order_id,repairer_user_id,dispatch_mode,dispatch_status) VALUES (1,2,3,'MANUAL','ACCEPTED'),(2,3,3,'AUTO','ACCEPTED');
INSERT IGNORE INTO repair_result(order_id,repairer_user_id,result_text) VALUES (3,3,'已更换灯具驱动并完成线路检查，现场测试正常。');
