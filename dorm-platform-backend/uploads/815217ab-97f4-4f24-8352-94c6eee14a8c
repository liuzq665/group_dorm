-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: dorm_platform_share_verify_3469d0f7
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accommodation_assignment`
--

DROP TABLE IF EXISTS `accommodation_assignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accommodation_assignment` (
  `assignment_id` bigint NOT NULL AUTO_INCREMENT,
  `student_user_id` bigint NOT NULL,
  `bed_id` bigint NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date DEFAULT NULL,
  `assignment_type` varchar(20) NOT NULL DEFAULT 'INITIAL',
  PRIMARY KEY (`assignment_id`),
  KEY `student_user_id` (`student_user_id`),
  KEY `bed_id` (`bed_id`),
  CONSTRAINT `accommodation_assignment_ibfk_1` FOREIGN KEY (`student_user_id`) REFERENCES `sys_user` (`user_id`),
  CONSTRAINT `accommodation_assignment_ibfk_2` FOREIGN KEY (`bed_id`) REFERENCES `bed` (`bed_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accommodation_assignment`
--

LOCK TABLES `accommodation_assignment` WRITE;
/*!40000 ALTER TABLE `accommodation_assignment` DISABLE KEYS */;
INSERT INTO `accommodation_assignment` VALUES (1,1,1,'2026-10-15',NULL,'INITIAL'),(2,5,2,'2026-10-15','2026-10-15','ASSIGN');
/*!40000 ALTER TABLE `accommodation_assignment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backup_task`
--

DROP TABLE IF EXISTS `backup_task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_task` (
  `task_id` bigint NOT NULL AUTO_INCREMENT,
  `initiated_by_user_id` bigint NOT NULL,
  `task_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WAITING',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `result_description` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`task_id`),
  KEY `initiated_by_user_id` (`initiated_by_user_id`),
  CONSTRAINT `backup_task_ibfk_1` FOREIGN KEY (`initiated_by_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_task`
--

LOCK TABLES `backup_task` WRITE;
/*!40000 ALTER TABLE `backup_task` DISABLE KEYS */;
INSERT INTO `backup_task` VALUES (1,4,'BACKUP','SUCCESS','2026-10-15 12:05:07','2026-10-15 12:05:09','2026-10-15 12:05:11',NULL),(2,4,'BACKUP','RUNNING','2026-10-15 12:07:59','2026-10-15 12:08:00',NULL,NULL);
/*!40000 ALTER TABLE `backup_task` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backup_task_file`
--

DROP TABLE IF EXISTS `backup_task_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_task_file` (
  `task_id` bigint NOT NULL,
  `file_id` bigint NOT NULL,
  `file_purpose` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`task_id`,`file_id`),
  KEY `file_id` (`file_id`),
  CONSTRAINT `backup_task_file_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `backup_task` (`task_id`),
  CONSTRAINT `backup_task_file_ibfk_2` FOREIGN KEY (`file_id`) REFERENCES `file_resource` (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_task_file`
--

LOCK TABLES `backup_task_file` WRITE;
/*!40000 ALTER TABLE `backup_task_file` DISABLE KEYS */;
INSERT INTO `backup_task_file` VALUES (1,5,'BACKUP_OUTPUT');
/*!40000 ALTER TABLE `backup_task_file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bed`
--

DROP TABLE IF EXISTS `bed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bed` (
  `bed_id` bigint NOT NULL AUTO_INCREMENT,
  `room_id` bigint NOT NULL,
  `bed_no` varchar(20) NOT NULL,
  `management_status` varchar(20) NOT NULL DEFAULT 'AVAILABLE',
  PRIMARY KEY (`bed_id`),
  UNIQUE KEY `uq_bed` (`room_id`,`bed_no`),
  CONSTRAINT `bed_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `dorm_room` (`room_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bed`
--

LOCK TABLES `bed` WRITE;
/*!40000 ALTER TABLE `bed` DISABLE KEYS */;
INSERT INTO `bed` VALUES (1,1,'A','AVAILABLE'),(2,1,'B','AVAILABLE'),(3,1,'C','AVAILABLE'),(4,1,'D','AVAILABLE'),(5,2,'A','AVAILABLE'),(6,2,'B','AVAILABLE'),(7,3,'A','AVAILABLE'),(8,3,'B','AVAILABLE'),(9,4,'A','AVAILABLE');
/*!40000 ALTER TABLE `bed` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `building`
--

DROP TABLE IF EXISTS `building`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `building` (
  `building_id` bigint NOT NULL AUTO_INCREMENT,
  `building_code` varchar(30) NOT NULL,
  `building_name` varchar(80) NOT NULL,
  `address` varchar(200) NOT NULL,
  `gender_limit` varchar(20) NOT NULL,
  `usage_status` varchar(20) NOT NULL DEFAULT 'IN_USE',
  PRIMARY KEY (`building_id`),
  UNIQUE KEY `building_code` (`building_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `building`
--

LOCK TABLES `building` WRITE;
/*!40000 ALTER TABLE `building` DISABLE KEYS */;
INSERT INTO `building` VALUES (1,'A-01','知行一号楼','东区宿舍组团 1 号','男生','IN_USE'),(2,'B-02','知行二号楼','东区宿舍组团 2 号','女生','IN_USE'),(3,'C-03','明德三号楼','西区宿舍组团 3 号','混合','IN_USE');
/*!40000 ALTER TABLE `building` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dorm_room`
--

DROP TABLE IF EXISTS `dorm_room`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dorm_room` (
  `room_id` bigint NOT NULL AUTO_INCREMENT,
  `building_id` bigint NOT NULL,
  `room_no` varchar(30) NOT NULL,
  `floor_no` int NOT NULL,
  `design_capacity` int NOT NULL,
  `usage_status` varchar(20) NOT NULL DEFAULT 'IN_USE',
  PRIMARY KEY (`room_id`),
  UNIQUE KEY `uq_room` (`building_id`,`room_no`),
  CONSTRAINT `dorm_room_ibfk_1` FOREIGN KEY (`building_id`) REFERENCES `building` (`building_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dorm_room`
--

LOCK TABLES `dorm_room` WRITE;
/*!40000 ALTER TABLE `dorm_room` DISABLE KEYS */;
INSERT INTO `dorm_room` VALUES (1,1,'203',2,4,'IN_USE'),(2,1,'204',2,4,'IN_USE'),(3,2,'406',4,4,'IN_USE'),(4,3,'108',1,6,'IN_USE');
/*!40000 ALTER TABLE `dorm_room` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fault_category`
--

DROP TABLE IF EXISTS `fault_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fault_category` (
  `category_id` bigint NOT NULL AUTO_INCREMENT,
  `work_type_id` bigint NOT NULL,
  `category_name` varchar(80) NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`category_id`),
  KEY `work_type_id` (`work_type_id`),
  CONSTRAINT `fault_category_ibfk_1` FOREIGN KEY (`work_type_id`) REFERENCES `repair_work_type` (`work_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fault_category`
--

LOCK TABLES `fault_category` WRITE;
/*!40000 ALTER TABLE `fault_category` DISABLE KEYS */;
INSERT INTO `fault_category` VALUES (1,1,'水龙头漏水',1),(2,2,'插座无电',1),(3,2,'灯具故障',1),(4,3,'门锁损坏',1),(5,3,'家具损坏',1);
/*!40000 ALTER TABLE `fault_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `file_resource`
--

DROP TABLE IF EXISTS `file_resource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_resource` (
  `file_id` bigint NOT NULL AUTO_INCREMENT,
  `uploader_user_id` bigint NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_type` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`),
  UNIQUE KEY `storage_name` (`storage_name`),
  KEY `uploader_user_id` (`uploader_user_id`),
  CONSTRAINT `file_resource_ibfk_1` FOREIGN KEY (`uploader_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `file_resource`
--

LOCK TABLES `file_resource` WRITE;
/*!40000 ALTER TABLE `file_resource` DISABLE KEYS */;
INSERT INTO `file_resource` VALUES (1,3,'evidence.png','0fe3c33b-60e3-462b-8235-848f9ad79904','image/png',68,'2026-10-15 12:04:59'),(2,4,'users.json','5a02cf32-dfb7-4afa-85fd-f82eaea1074b','application/json',913,'2026-10-15 12:05:03'),(3,4,'import.json','8a01e7be-58f0-46d9-8b55-247b2bc3e3e6','application/json',105,'2026-10-15 12:05:03'),(4,4,'import.json','91faed00-7b5c-4559-8d7d-6f2158bdf00e','application/json',191,'2026-10-15 12:05:05'),(5,4,'dorm-backup.sql','84a1600b-acb0-462a-93b1-dc8f55d2b519','application/sql',64059,'2026-10-15 12:05:11'),(6,3,'evidence.png','4030ab2d-e5c7-4140-a315-4253221c4cdc','image/png',68,'2026-10-15 12:07:51'),(7,4,'users.json','2516fb26-07a3-4822-8ec8-7ad964fabc85','application/json',1155,'2026-10-15 12:07:54'),(8,4,'import.json','56251d86-b83a-42d2-ae92-062a6ac879b1','application/json',105,'2026-10-15 12:07:55'),(9,4,'import.json','de48611a-d03f-4b04-a6d9-6ca8c8f4712c','application/json',191,'2026-10-15 12:07:56');
/*!40000 ALTER TABLE `file_resource` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `import_export_task`
--

DROP TABLE IF EXISTS `import_export_task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_export_task` (
  `task_id` bigint NOT NULL AUTO_INCREMENT,
  `initiated_by_user_id` bigint NOT NULL,
  `task_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WAITING',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `result_description` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`task_id`),
  KEY `initiated_by_user_id` (`initiated_by_user_id`),
  CONSTRAINT `import_export_task_ibfk_1` FOREIGN KEY (`initiated_by_user_id`) REFERENCES `sys_user` (`user_id`),
  CONSTRAINT `import_export_task_chk_1` CHECK ((`task_type` in (_utf8mb4'IMPORT',_utf8mb4'EXPORT'))),
  CONSTRAINT `import_export_task_chk_2` CHECK ((`task_status` in (_utf8mb4'WAITING',_utf8mb4'RUNNING',_utf8mb4'SUCCESS',_utf8mb4'FAILED',_utf8mb4'CANCELLED')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_export_task`
--

LOCK TABLES `import_export_task` WRITE;
/*!40000 ALTER TABLE `import_export_task` DISABLE KEYS */;
INSERT INTO `import_export_task` VALUES (1,4,'EXPORT','users','SUCCESS','2026-10-15 12:05:01','2026-10-15 12:05:02','2026-10-15 12:05:03',NULL),(2,4,'IMPORT','users','SUCCESS','2026-10-15 12:05:03','2026-10-15 12:05:05','2026-10-15 12:05:05',NULL),(3,4,'IMPORT','users','FAILED','2026-10-15 12:05:05','2026-10-15 12:05:07','2026-10-15 12:05:07','第2条导入失败，整批未保存：PreparedStatementCallback; Duplicate entry \'student1\' for key \'sys_user.login_account\''),(4,4,'EXPORT','users','SUCCESS','2026-10-15 12:07:53','2026-10-15 12:07:54','2026-10-15 12:07:54',NULL),(5,4,'IMPORT','users','SUCCESS','2026-10-15 12:07:55','2026-10-15 12:07:56','2026-10-15 12:07:56',NULL),(6,4,'IMPORT','users','FAILED','2026-10-15 12:07:56','2026-10-15 12:07:58','2026-10-15 12:07:58','第2条导入失败，整批未保存：PreparedStatementCallback; Duplicate entry \'student1\' for key \'sys_user.login_account\'');
/*!40000 ALTER TABLE `import_export_task` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `import_export_task_file`
--

DROP TABLE IF EXISTS `import_export_task_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_export_task_file` (
  `task_id` bigint NOT NULL,
  `file_id` bigint NOT NULL,
  `file_purpose` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`task_id`,`file_id`),
  KEY `file_id` (`file_id`),
  CONSTRAINT `import_export_task_file_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `import_export_task` (`task_id`),
  CONSTRAINT `import_export_task_file_ibfk_2` FOREIGN KEY (`file_id`) REFERENCES `file_resource` (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_export_task_file`
--

LOCK TABLES `import_export_task_file` WRITE;
/*!40000 ALTER TABLE `import_export_task_file` DISABLE KEYS */;
INSERT INTO `import_export_task_file` VALUES (1,2,'OUTPUT'),(2,3,'INPUT'),(3,4,'INPUT'),(4,7,'OUTPUT'),(5,8,'INPUT'),(6,9,'INPUT');
/*!40000 ALTER TABLE `import_export_task_file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_log`
--

DROP TABLE IF EXISTS `login_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_log` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `account` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `success` tinyint NOT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_log`
--

LOCK TABLES `login_log` WRITE;
/*!40000 ALTER TABLE `login_log` DISABLE KEYS */;
INSERT INTO `login_log` VALUES (1,1,'student1',1,'2026-10-15 12:04:54'),(2,2,'manager1',1,'2026-10-15 12:04:55'),(3,3,'repair1',1,'2026-10-15 12:04:56'),(4,4,'admin',1,'2026-10-15 12:04:57'),(5,5,'ui-student-1792037103756',1,'2026-10-15 12:05:13'),(6,5,'ui-student-1792037103756',1,'2026-10-15 12:05:14'),(7,5,'ui-student-1792037103756',1,'2026-10-15 12:05:15'),(8,1,'student1',1,'2026-10-15 12:07:47'),(9,2,'manager1',1,'2026-10-15 12:07:48'),(10,3,'repair1',1,'2026-10-15 12:07:49'),(11,4,'admin',1,'2026-10-15 12:07:50');
/*!40000 ALTER TABLE `login_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `manager_building_scope`
--

DROP TABLE IF EXISTS `manager_building_scope`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `manager_building_scope` (
  `manager_user_id` bigint NOT NULL,
  `building_id` bigint NOT NULL,
  PRIMARY KEY (`manager_user_id`,`building_id`),
  KEY `building_id` (`building_id`),
  CONSTRAINT `manager_building_scope_ibfk_1` FOREIGN KEY (`manager_user_id`) REFERENCES `sys_user` (`user_id`),
  CONSTRAINT `manager_building_scope_ibfk_2` FOREIGN KEY (`building_id`) REFERENCES `building` (`building_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `manager_building_scope`
--

LOCK TABLES `manager_building_scope` WRITE;
/*!40000 ALTER TABLE `manager_building_scope` DISABLE KEYS */;
INSERT INTO `manager_building_scope` VALUES (2,1),(2,2),(2,3);
/*!40000 ALTER TABLE `manager_building_scope` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_receipt`
--

DROP TABLE IF EXISTS `message_receipt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_receipt` (
  `message_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`message_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `message_receipt_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `site_message` (`message_id`),
  CONSTRAINT `message_receipt_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_receipt`
--

LOCK TABLES `message_receipt` WRITE;
/*!40000 ALTER TABLE `message_receipt` DISABLE KEYS */;
INSERT INTO `message_receipt` VALUES (1,1,NULL),(1,2,NULL),(1,3,NULL),(1,4,NULL),(2,2,NULL),(3,1,NULL),(4,3,NULL),(5,1,NULL),(6,1,NULL),(7,1,NULL),(8,3,NULL),(9,1,NULL),(10,2,NULL),(11,1,NULL),(12,1,'2026-10-15 12:05:00'),(13,2,NULL),(14,1,NULL),(15,3,NULL),(16,1,NULL),(17,1,NULL),(18,1,NULL),(19,3,NULL),(20,1,NULL),(21,2,NULL),(22,1,NULL),(23,1,'2026-10-15 12:07:52');
/*!40000 ALTER TABLE `message_receipt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_target`
--

DROP TABLE IF EXISTS `message_target`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_target` (
  `message_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`message_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `message_target_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `site_message` (`message_id`),
  CONSTRAINT `message_target_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_target`
--

LOCK TABLES `message_target` WRITE;
/*!40000 ALTER TABLE `message_target` DISABLE KEYS */;
INSERT INTO `message_target` VALUES (1,1),(12,1),(23,1),(1,2),(1,3),(1,4);
/*!40000 ALTER TABLE `message_target` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `operation_log`
--

DROP TABLE IF EXISTS `operation_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operation_log` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `operator_user_id` bigint DEFAULT NULL,
  `module` varchar(40) NOT NULL,
  `action` varchar(80) NOT NULL,
  `business_id` bigint DEFAULT NULL,
  `result` varchar(20) NOT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operation_log`
--

LOCK TABLES `operation_log` WRITE;
/*!40000 ALTER TABLE `operation_log` DISABLE KEYS */;
INSERT INTO `operation_log` VALUES (1,1,'repair','create',1,'SUCCESS','2026-10-15 12:04:58'),(2,1,'repair','submit',1,'SUCCESS','2026-10-15 12:04:58'),(3,2,'repair','review',1,'SUCCESS','2026-10-15 12:04:59'),(4,3,'repair','accept',1,'SUCCESS','2026-10-15 12:04:59'),(5,3,'repair','result',1,'SUCCESS','2026-10-15 12:04:59'),(6,1,'repair','evaluate',1,'SUCCESS','2026-10-15 12:04:59'),(7,4,'stay','configure_batch',2,'SUCCESS','2026-10-15 12:05:00'),(8,2,'stay','publish',2,'SUCCESS','2026-10-15 12:05:00'),(9,1,'stay','save',1,'SUCCESS','2026-10-15 12:05:00'),(10,1,'stay','submit',1,'SUCCESS','2026-10-15 12:05:00'),(11,2,'stay','lock',1,'SUCCESS','2026-10-15 12:05:00'),(12,2,'stay','review',1,'SUCCESS','2026-10-15 12:05:00'),(13,4,'notice','publish',12,'SUCCESS','2026-10-15 12:05:00'),(14,4,'system','data_task_success',1,'SUCCESS','2026-10-15 12:05:03'),(15,4,'auth','create',5,'SUCCESS','2026-10-15 12:05:05'),(16,4,'system','data_task_success',2,'SUCCESS','2026-10-15 12:05:05'),(18,4,'system','database_backup',0,'SUCCESS','2026-10-15 12:05:11'),(19,4,'dorm','assign',2,'SUCCESS','2026-10-15 12:05:13'),(20,4,'dorm','checkout',2,'SUCCESS','2026-10-15 12:05:14'),(21,5,'auth','profile',5,'SUCCESS','2026-10-15 12:05:14'),(22,5,'auth','password',5,'SUCCESS','2026-10-15 12:05:14'),(23,4,'auth','update',5,'SUCCESS','2026-10-15 12:05:15'),(24,4,'auth','disable',5,'SUCCESS','2026-10-15 12:05:15'),(25,1,'repair','create',2,'SUCCESS','2026-10-15 12:07:51'),(26,1,'repair','submit',2,'SUCCESS','2026-10-15 12:07:51'),(27,2,'repair','review',2,'SUCCESS','2026-10-15 12:07:51'),(28,3,'repair','accept',2,'SUCCESS','2026-10-15 12:07:51'),(29,3,'repair','result',2,'SUCCESS','2026-10-15 12:07:51'),(30,1,'repair','evaluate',2,'SUCCESS','2026-10-15 12:07:51'),(31,4,'stay','configure_batch',3,'SUCCESS','2026-10-15 12:07:52'),(32,2,'stay','publish',3,'SUCCESS','2026-10-15 12:07:52'),(33,1,'stay','save',2,'SUCCESS','2026-10-15 12:07:52'),(34,1,'stay','submit',2,'SUCCESS','2026-10-15 12:07:52'),(35,2,'stay','lock',2,'SUCCESS','2026-10-15 12:07:52'),(36,2,'stay','review',2,'SUCCESS','2026-10-15 12:07:52'),(37,4,'notice','publish',23,'SUCCESS','2026-10-15 12:07:52'),(38,4,'system','data_task_success',4,'SUCCESS','2026-10-15 12:07:54'),(39,4,'auth','create',8,'SUCCESS','2026-10-15 12:07:56'),(40,4,'system','data_task_success',5,'SUCCESS','2026-10-15 12:07:56');
/*!40000 ALTER TABLE `operation_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_attachment`
--

DROP TABLE IF EXISTS `repair_attachment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_attachment` (
  `order_id` bigint NOT NULL,
  `file_id` bigint NOT NULL,
  `purpose` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`order_id`,`file_id`),
  KEY `file_id` (`file_id`),
  CONSTRAINT `repair_attachment_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`),
  CONSTRAINT `repair_attachment_ibfk_2` FOREIGN KEY (`file_id`) REFERENCES `file_resource` (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_attachment`
--

LOCK TABLES `repair_attachment` WRITE;
/*!40000 ALTER TABLE `repair_attachment` DISABLE KEYS */;
INSERT INTO `repair_attachment` VALUES (1,1,'RESULT'),(2,6,'RESULT');
/*!40000 ALTER TABLE `repair_attachment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_audit`
--

DROP TABLE IF EXISTS `repair_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_audit` (
  `audit_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `reviewer_user_id` bigint NOT NULL,
  `result` varchar(20) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `order_id` (`order_id`),
  KEY `reviewer_user_id` (`reviewer_user_id`),
  CONSTRAINT `repair_audit_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`),
  CONSTRAINT `repair_audit_ibfk_2` FOREIGN KEY (`reviewer_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_audit`
--

LOCK TABLES `repair_audit` WRITE;
/*!40000 ALTER TABLE `repair_audit` DISABLE KEYS */;
INSERT INTO `repair_audit` VALUES (1,1,2,'APPROVED','','2026-10-15 12:04:59'),(2,2,2,'APPROVED','','2026-10-15 12:07:51');
/*!40000 ALTER TABLE `repair_audit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_confirmation`
--

DROP TABLE IF EXISTS `repair_confirmation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_confirmation` (
  `order_id` bigint NOT NULL,
  `confirmation_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `confirmed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  CONSTRAINT `repair_confirmation_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_confirmation`
--

LOCK TABLES `repair_confirmation` WRITE;
/*!40000 ALTER TABLE `repair_confirmation` DISABLE KEYS */;
INSERT INTO `repair_confirmation` VALUES (1,'STUDENT','2026-10-15 12:04:59'),(2,'STUDENT','2026-10-15 12:07:51');
/*!40000 ALTER TABLE `repair_confirmation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_delay_attachment`
--

DROP TABLE IF EXISTS `repair_delay_attachment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_delay_attachment` (
  `request_id` bigint NOT NULL,
  `file_id` bigint NOT NULL,
  PRIMARY KEY (`request_id`,`file_id`),
  KEY `file_id` (`file_id`),
  CONSTRAINT `repair_delay_attachment_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `repair_delay_request` (`request_id`),
  CONSTRAINT `repair_delay_attachment_ibfk_2` FOREIGN KEY (`file_id`) REFERENCES `file_resource` (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_delay_attachment`
--

LOCK TABLES `repair_delay_attachment` WRITE;
/*!40000 ALTER TABLE `repair_delay_attachment` DISABLE KEYS */;
/*!40000 ALTER TABLE `repair_delay_attachment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_delay_request`
--

DROP TABLE IF EXISTS `repair_delay_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_delay_request` (
  `request_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `repairer_user_id` bigint NOT NULL,
  `reason` varchar(500) NOT NULL,
  `expected_finish_at` datetime NOT NULL,
  `current_status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `reviewer_user_id` bigint DEFAULT NULL,
  `review_reason` varchar(500) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  KEY `order_id` (`order_id`),
  KEY `repairer_user_id` (`repairer_user_id`),
  KEY `reviewer_user_id` (`reviewer_user_id`),
  CONSTRAINT `repair_delay_request_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`),
  CONSTRAINT `repair_delay_request_ibfk_2` FOREIGN KEY (`repairer_user_id`) REFERENCES `sys_user` (`user_id`),
  CONSTRAINT `repair_delay_request_ibfk_3` FOREIGN KEY (`reviewer_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_delay_request`
--

LOCK TABLES `repair_delay_request` WRITE;
/*!40000 ALTER TABLE `repair_delay_request` DISABLE KEYS */;
/*!40000 ALTER TABLE `repair_delay_request` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_dispatch`
--

DROP TABLE IF EXISTS `repair_dispatch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_dispatch` (
  `dispatch_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `repairer_user_id` bigint NOT NULL,
  `dispatch_mode` varchar(20) NOT NULL,
  `dispatch_status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `decision_reason` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_at` datetime DEFAULT NULL,
  `accept_deadline` datetime DEFAULT NULL,
  `repair_deadline` datetime DEFAULT NULL,
  PRIMARY KEY (`dispatch_id`),
  KEY `idx_dispatch_worker_status` (`repairer_user_id`,`dispatch_status`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `repair_dispatch_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`),
  CONSTRAINT `repair_dispatch_ibfk_2` FOREIGN KEY (`repairer_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_dispatch`
--

LOCK TABLES `repair_dispatch` WRITE;
/*!40000 ALTER TABLE `repair_dispatch` DISABLE KEYS */;
INSERT INTO `repair_dispatch` VALUES (1,1,3,'AUTO','ACCEPTED','','2026-10-15 12:04:59','2026-10-15 12:04:59','2026-10-15 14:04:59','2026-10-16 12:04:59'),(2,2,3,'AUTO','ACCEPTED','','2026-10-15 12:07:51','2026-10-15 12:07:51','2026-10-15 14:07:51','2026-10-16 12:07:52');
/*!40000 ALTER TABLE `repair_dispatch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_evaluation`
--

DROP TABLE IF EXISTS `repair_evaluation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_evaluation` (
  `evaluation_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `student_user_id` bigint NOT NULL,
  `score` int NOT NULL,
  `comment` varchar(1000) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`evaluation_id`),
  UNIQUE KEY `order_id` (`order_id`),
  KEY `student_user_id` (`student_user_id`),
  CONSTRAINT `repair_evaluation_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`),
  CONSTRAINT `repair_evaluation_ibfk_2` FOREIGN KEY (`student_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_evaluation`
--

LOCK TABLES `repair_evaluation` WRITE;
/*!40000 ALTER TABLE `repair_evaluation` DISABLE KEYS */;
INSERT INTO `repair_evaluation` VALUES (1,1,1,5,'Completed successfully.','2026-10-15 12:04:59'),(2,2,1,5,'Completed successfully.','2026-10-15 12:07:51');
/*!40000 ALTER TABLE `repair_evaluation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_exception`
--

DROP TABLE IF EXISTS `repair_exception`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_exception` (
  `exception_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `dispatch_id` bigint DEFAULT NULL,
  `exception_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`exception_id`),
  KEY `order_id` (`order_id`),
  KEY `dispatch_id` (`dispatch_id`),
  CONSTRAINT `repair_exception_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`),
  CONSTRAINT `repair_exception_ibfk_2` FOREIGN KEY (`dispatch_id`) REFERENCES `repair_dispatch` (`dispatch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_exception`
--

LOCK TABLES `repair_exception` WRITE;
/*!40000 ALTER TABLE `repair_exception` DISABLE KEYS */;
/*!40000 ALTER TABLE `repair_exception` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_order`
--

DROP TABLE IF EXISTS `repair_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_order` (
  `order_id` bigint NOT NULL AUTO_INCREMENT,
  `order_no` varchar(40) NOT NULL,
  `student_user_id` bigint NOT NULL,
  `room_id` bigint DEFAULT NULL,
  `category_id` bigint DEFAULT NULL,
  `title` varchar(120) NOT NULL,
  `description` text NOT NULL,
  `urgent` tinyint NOT NULL DEFAULT '0',
  `current_status` varchar(30) NOT NULL,
  `abnormal` tinyint NOT NULL DEFAULT '0',
  `reject_reason` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `parent_order_id` bigint DEFAULT NULL,
  `rule_id` bigint NOT NULL DEFAULT '1',
  `archived_at` datetime DEFAULT NULL,
  `archive_reason` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `idx_repair_student_status` (`student_user_id`,`current_status`),
  KEY `room_id` (`room_id`),
  KEY `category_id` (`category_id`),
  KEY `rule_id` (`rule_id`),
  CONSTRAINT `repair_order_ibfk_1` FOREIGN KEY (`student_user_id`) REFERENCES `sys_user` (`user_id`),
  CONSTRAINT `repair_order_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `dorm_room` (`room_id`),
  CONSTRAINT `repair_order_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `fault_category` (`category_id`),
  CONSTRAINT `repair_order_ibfk_4` FOREIGN KEY (`rule_id`) REFERENCES `repair_rule` (`rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_order`
--

LOCK TABLES `repair_order` WRITE;
/*!40000 ALTER TABLE `repair_order` DISABLE KEYS */;
INSERT INTO `repair_order` VALUES (1,'WXc9b6ab6755d649c39a37',1,1,2,'Browser acceptance 1792037098660','Socket at bed A is broken.',0,'ARCHIVED',0,'','2026-10-15 12:04:58','2026-10-15 12:04:59',NULL,1,'2026-10-15 12:04:59','EVALUATED'),(2,'WX4cba9aa481614484bc0f',1,1,2,'Browser acceptance 1792037270961','Socket at bed A is broken.',0,'ARCHIVED',0,'','2026-10-15 12:07:51','2026-10-15 12:07:51',NULL,1,'2026-10-15 12:07:51','EVALUATED');
/*!40000 ALTER TABLE `repair_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_order_relation`
--

DROP TABLE IF EXISTS `repair_order_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_order_relation` (
  `parent_order_id` bigint NOT NULL,
  `child_order_id` bigint NOT NULL,
  `relation_type` varchar(30) NOT NULL,
  PRIMARY KEY (`child_order_id`),
  KEY `parent_order_id` (`parent_order_id`),
  CONSTRAINT `repair_order_relation_ibfk_1` FOREIGN KEY (`parent_order_id`) REFERENCES `repair_order` (`order_id`),
  CONSTRAINT `repair_order_relation_ibfk_2` FOREIGN KEY (`child_order_id`) REFERENCES `repair_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_order_relation`
--

LOCK TABLES `repair_order_relation` WRITE;
/*!40000 ALTER TABLE `repair_order_relation` DISABLE KEYS */;
/*!40000 ALTER TABLE `repair_order_relation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_result`
--

DROP TABLE IF EXISTS `repair_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_result` (
  `result_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `repairer_user_id` bigint NOT NULL,
  `result_text` varchar(1000) NOT NULL,
  `expected_finish_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`result_id`),
  UNIQUE KEY `order_id` (`order_id`),
  KEY `repairer_user_id` (`repairer_user_id`),
  CONSTRAINT `repair_result_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`),
  CONSTRAINT `repair_result_ibfk_2` FOREIGN KEY (`repairer_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_result`
--

LOCK TABLES `repair_result` WRITE;
/*!40000 ALTER TABLE `repair_result` DISABLE KEYS */;
INSERT INTO `repair_result` VALUES (1,1,3,'Replaced socket and verified with tester.',NULL,'2026-10-15 12:04:59'),(2,2,3,'Replaced socket and verified with tester.',NULL,'2026-10-15 12:07:51');
/*!40000 ALTER TABLE `repair_result` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_rule`
--

DROP TABLE IF EXISTS `repair_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_rule` (
  `rule_id` bigint NOT NULL AUTO_INCREMENT,
  `accept_minutes` int NOT NULL,
  `normal_minutes` int NOT NULL,
  `urgent_minutes` int NOT NULL,
  `confirm_days` int NOT NULL,
  `edit_days` int NOT NULL,
  `max_rework_count` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_rule`
--

LOCK TABLES `repair_rule` WRITE;
/*!40000 ALTER TABLE `repair_rule` DISABLE KEYS */;
INSERT INTO `repair_rule` VALUES (1,120,1440,360,7,7,NULL,'2026-10-15 12:02:12');
/*!40000 ALTER TABLE `repair_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_submission_version`
--

DROP TABLE IF EXISTS `repair_submission_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_submission_version` (
  `version_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `title` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` bigint NOT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`version_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `repair_submission_version_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_submission_version`
--

LOCK TABLES `repair_submission_version` WRITE;
/*!40000 ALTER TABLE `repair_submission_version` DISABLE KEYS */;
INSERT INTO `repair_submission_version` VALUES (1,1,'Browser acceptance 1792037098660','Socket at bed A is broken.',2,'2026-10-15 12:04:58'),(2,2,'Browser acceptance 1792037270961','Socket at bed A is broken.',2,'2026-10-15 12:07:51');
/*!40000 ALTER TABLE `repair_submission_version` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repair_work_type`
--

DROP TABLE IF EXISTS `repair_work_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_work_type` (
  `work_type_id` bigint NOT NULL AUTO_INCREMENT,
  `work_type_code` varchar(30) NOT NULL,
  `work_type_name` varchar(80) NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`work_type_id`),
  UNIQUE KEY `work_type_code` (`work_type_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_work_type`
--

LOCK TABLES `repair_work_type` WRITE;
/*!40000 ALTER TABLE `repair_work_type` DISABLE KEYS */;
INSERT INTO `repair_work_type` VALUES (1,'WATER','水暖维修',1),(2,'ELECTRIC','电气维修',1),(3,'GENERAL','综合维修',1);
/*!40000 ALTER TABLE `repair_work_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repairer_building_scope`
--

DROP TABLE IF EXISTS `repairer_building_scope`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repairer_building_scope` (
  `repairer_user_id` bigint NOT NULL,
  `building_id` bigint NOT NULL,
  PRIMARY KEY (`repairer_user_id`,`building_id`),
  KEY `building_id` (`building_id`),
  CONSTRAINT `repairer_building_scope_ibfk_1` FOREIGN KEY (`repairer_user_id`) REFERENCES `sys_user` (`user_id`),
  CONSTRAINT `repairer_building_scope_ibfk_2` FOREIGN KEY (`building_id`) REFERENCES `building` (`building_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repairer_building_scope`
--

LOCK TABLES `repairer_building_scope` WRITE;
/*!40000 ALTER TABLE `repairer_building_scope` DISABLE KEYS */;
INSERT INTO `repairer_building_scope` VALUES (3,1),(3,2),(3,3);
/*!40000 ALTER TABLE `repairer_building_scope` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repairer_profile`
--

DROP TABLE IF EXISTS `repairer_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repairer_profile` (
  `repairer_user_id` bigint NOT NULL,
  `on_duty` tinyint NOT NULL DEFAULT '1',
  `max_active_orders` int DEFAULT NULL,
  PRIMARY KEY (`repairer_user_id`),
  CONSTRAINT `repairer_profile_ibfk_1` FOREIGN KEY (`repairer_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repairer_profile`
--

LOCK TABLES `repairer_profile` WRITE;
/*!40000 ALTER TABLE `repairer_profile` DISABLE KEYS */;
INSERT INTO `repairer_profile` VALUES (3,1,NULL);
/*!40000 ALTER TABLE `repairer_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repairer_work_type`
--

DROP TABLE IF EXISTS `repairer_work_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repairer_work_type` (
  `repairer_user_id` bigint NOT NULL,
  `work_type_id` bigint NOT NULL,
  PRIMARY KEY (`repairer_user_id`,`work_type_id`),
  KEY `work_type_id` (`work_type_id`),
  CONSTRAINT `repairer_work_type_ibfk_1` FOREIGN KEY (`repairer_user_id`) REFERENCES `sys_user` (`user_id`),
  CONSTRAINT `repairer_work_type_ibfk_2` FOREIGN KEY (`work_type_id`) REFERENCES `repair_work_type` (`work_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repairer_work_type`
--

LOCK TABLES `repairer_work_type` WRITE;
/*!40000 ALTER TABLE `repairer_work_type` DISABLE KEYS */;
INSERT INTO `repairer_work_type` VALUES (3,1),(3,2),(3,3);
/*!40000 ALTER TABLE `repairer_work_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schema_version`
--

DROP TABLE IF EXISTS `schema_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_version` (
  `version_no` int NOT NULL,
  `installed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`version_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schema_version`
--

LOCK TABLES `schema_version` WRITE;
/*!40000 ALTER TABLE `schema_version` DISABLE KEYS */;
INSERT INTO `schema_version` VALUES (1,'2026-10-15 12:02:12'),(2,'2026-10-15 12:02:12'),(3,'2026-10-15 12:02:12'),(4,'2026-10-15 12:02:12');
/*!40000 ALTER TABLE `schema_version` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_message`
--

DROP TABLE IF EXISTS `site_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_message` (
  `message_id` bigint NOT NULL AUTO_INCREMENT,
  `target_role` varchar(30) NOT NULL,
  `title` varchar(150) NOT NULL,
  `content` varchar(2000) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `publisher_user_id` bigint DEFAULT NULL,
  `publish_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` datetime DEFAULT NULL,
  PRIMARY KEY (`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_message`
--

LOCK TABLES `site_message` WRITE;
/*!40000 ALTER TABLE `site_message` DISABLE KEYS */;
INSERT INTO `site_message` VALUES (1,'ALL','宿舍事务平台初始化完成','请在对应角色工作台处理住宿、报修和假期留宿业务。','2026-10-15 12:02:12',4,'2026-10-15 12:02:12','2026-10-15 12:02:12'),(2,'DIRECT','报修待审核','WXc9b6ab6755d649c39a37','2026-10-15 12:04:58',NULL,'2026-10-15 12:04:58','2026-10-15 12:04:58'),(3,'DIRECT','报修进度','WXc9b6ab6755d649c39a37：审核通过','2026-10-15 12:04:59',NULL,'2026-10-15 12:04:59','2026-10-15 12:04:59'),(4,'DIRECT','新的维修派单','WXc9b6ab6755d649c39a37','2026-10-15 12:04:59',NULL,'2026-10-15 12:04:59','2026-10-15 12:04:59'),(5,'DIRECT','报修进度','WXc9b6ab6755d649c39a37：维修人员已接单','2026-10-15 12:04:59',NULL,'2026-10-15 12:04:59','2026-10-15 12:04:59'),(6,'DIRECT','报修进度','WXc9b6ab6755d649c39a37：维修完成，请确认或申请重修','2026-10-15 12:04:59',NULL,'2026-10-15 12:04:59','2026-10-15 12:04:59'),(7,'DIRECT','报修进度','WXc9b6ab6755d649c39a37：已确认维修，可提交评价','2026-10-15 12:04:59',NULL,'2026-10-15 12:04:59','2026-10-15 12:04:59'),(8,'DIRECT','收到维修评价','WXc9b6ab6755d649c39a37：5分','2026-10-15 12:04:59',NULL,'2026-10-15 12:04:59','2026-10-15 12:04:59'),(9,'DIRECT','留宿申请已开放','UI holiday 1792037100041；申请截止：2026-12-20T23:59','2026-10-15 12:05:00',NULL,'2026-10-15 12:05:00','2026-10-15 12:05:00'),(10,'DIRECT','留宿申请已提交','申请编号：1','2026-10-15 12:05:00',NULL,'2026-10-15 12:05:00','2026-10-15 12:05:00'),(11,'DIRECT','留宿审核结果','留宿申请已通过','2026-10-15 12:05:00',NULL,'2026-10-15 12:05:00','2026-10-15 12:05:00'),(12,'DIRECT','Role message 1792037100798','All students receive this announcement.','2026-10-15 12:05:00',4,'2026-10-15 12:05:00','2026-10-15 12:05:00'),(13,'DIRECT','报修待审核','WX4cba9aa481614484bc0f','2026-10-15 12:07:51',NULL,'2026-10-15 12:07:51','2026-10-15 12:07:51'),(14,'DIRECT','报修进度','WX4cba9aa481614484bc0f：审核通过','2026-10-15 12:07:51',NULL,'2026-10-15 12:07:51','2026-10-15 12:07:51'),(15,'DIRECT','新的维修派单','WX4cba9aa481614484bc0f','2026-10-15 12:07:51',NULL,'2026-10-15 12:07:51','2026-10-15 12:07:51'),(16,'DIRECT','报修进度','WX4cba9aa481614484bc0f：维修人员已接单','2026-10-15 12:07:51',NULL,'2026-10-15 12:07:51','2026-10-15 12:07:51'),(17,'DIRECT','报修进度','WX4cba9aa481614484bc0f：维修完成，请确认或申请重修','2026-10-15 12:07:51',NULL,'2026-10-15 12:07:51','2026-10-15 12:07:51'),(18,'DIRECT','报修进度','WX4cba9aa481614484bc0f：已确认维修，可提交评价','2026-10-15 12:07:51',NULL,'2026-10-15 12:07:51','2026-10-15 12:07:51'),(19,'DIRECT','收到维修评价','WX4cba9aa481614484bc0f：5分','2026-10-15 12:07:51',NULL,'2026-10-15 12:07:51','2026-10-15 12:07:51'),(20,'DIRECT','留宿申请已开放','UI holiday 1792037272070；申请截止：2026-12-20T23:59','2026-10-15 12:07:52',NULL,'2026-10-15 12:07:52','2026-10-15 12:07:52'),(21,'DIRECT','留宿申请已提交','申请编号：2','2026-10-15 12:07:52',NULL,'2026-10-15 12:07:52','2026-10-15 12:07:52'),(22,'DIRECT','留宿审核结果','留宿申请已通过','2026-10-15 12:07:52',NULL,'2026-10-15 12:07:52','2026-10-15 12:07:52'),(23,'DIRECT','Role message 1792037272823','All students receive this announcement.','2026-10-15 12:07:52',4,'2026-10-15 12:07:52','2026-10-15 12:07:52');
/*!40000 ALTER TABLE `site_message` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stay_application`
--

DROP TABLE IF EXISTS `stay_application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stay_application` (
  `application_id` bigint NOT NULL AUTO_INCREMENT,
  `batch_id` bigint NOT NULL,
  `student_user_id` bigint NOT NULL,
  `current_status` varchar(20) NOT NULL DEFAULT 'DRAFT',
  `review_reason` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reviewer_user_id` bigint DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `building_id` bigint DEFAULT NULL,
  `source` varchar(30) NOT NULL DEFAULT 'NORMAL',
  `resubmit_deadline` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  `archive_reason` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uq_student_batch` (`batch_id`,`student_user_id`),
  KEY `idx_stay_building_status` (`building_id`,`current_status`),
  KEY `student_user_id` (`student_user_id`),
  CONSTRAINT `stay_application_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `stay_batch` (`batch_id`),
  CONSTRAINT `stay_application_ibfk_2` FOREIGN KEY (`student_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_application`
--

LOCK TABLES `stay_application` WRITE;
/*!40000 ALTER TABLE `stay_application` DISABLE KEYS */;
INSERT INTO `stay_application` VALUES (1,2,1,'APPROVED','','2026-10-15 12:05:00','2026-10-15 12:05:00',2,'2026-10-15 12:05:00',1,'NORMAL',NULL,NULL,NULL),(2,3,1,'APPROVED','','2026-10-15 12:07:52','2026-10-15 12:07:52',2,'2026-10-15 12:07:52',1,'NORMAL',NULL,NULL,NULL);
/*!40000 ALTER TABLE `stay_application` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stay_batch`
--

DROP TABLE IF EXISTS `stay_batch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stay_batch` (
  `batch_id` bigint NOT NULL AUTO_INCREMENT,
  `batch_code` varchar(40) NOT NULL,
  `batch_name` varchar(100) NOT NULL,
  `open_start_date` date NOT NULL,
  `open_end_date` date NOT NULL,
  `application_deadline` datetime NOT NULL,
  `instructions` varchar(1000) DEFAULT NULL,
  `current_status` varchar(20) NOT NULL DEFAULT 'OPEN',
  PRIMARY KEY (`batch_id`),
  UNIQUE KEY `batch_code` (`batch_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_batch`
--

LOCK TABLES `stay_batch` WRITE;
/*!40000 ALTER TABLE `stay_batch` DISABLE KEYS */;
INSERT INTO `stay_batch` VALUES (1,'DEMO-HOLIDAY','假期留宿演示批次','2026-11-14','2026-12-14','2026-10-29 00:00:00','按开放区间填写留宿日期，提交后等待宿管锁定和审核。','OPEN'),(2,'UI-1792037100041','UI holiday 1792037100041','2027-01-01','2027-03-01','2027-01-01 00:00:00','UI acceptance holiday','OPEN'),(3,'UI-1792037272070','UI holiday 1792037272070','2027-01-01','2027-03-01','2027-01-01 00:00:00','UI acceptance holiday','OPEN');
/*!40000 ALTER TABLE `stay_batch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stay_building_rule`
--

DROP TABLE IF EXISTS `stay_building_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stay_building_rule` (
  `batch_id` bigint NOT NULL,
  `building_id` bigint NOT NULL,
  `application_deadline` datetime NOT NULL,
  `auto_lock` tinyint NOT NULL DEFAULT '0',
  `published_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_id`,`building_id`),
  KEY `building_id` (`building_id`),
  CONSTRAINT `stay_building_rule_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `stay_batch` (`batch_id`),
  CONSTRAINT `stay_building_rule_ibfk_2` FOREIGN KEY (`building_id`) REFERENCES `building` (`building_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_building_rule`
--

LOCK TABLES `stay_building_rule` WRITE;
/*!40000 ALTER TABLE `stay_building_rule` DISABLE KEYS */;
INSERT INTO `stay_building_rule` VALUES (1,1,'2026-10-29 00:00:00',1,'2026-10-15 12:02:12'),(1,2,'2026-10-29 00:00:00',1,'2026-10-15 12:02:12'),(1,3,'2026-10-29 00:00:00',1,'2026-10-15 12:02:12'),(2,1,'2026-12-20 23:59:00',1,'2026-10-15 12:05:00'),(3,1,'2026-12-20 23:59:00',1,'2026-10-15 12:07:52');
/*!40000 ALTER TABLE `stay_building_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stay_date_range`
--

DROP TABLE IF EXISTS `stay_date_range`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stay_date_range` (
  `range_id` bigint NOT NULL AUTO_INCREMENT,
  `version_id` bigint NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  PRIMARY KEY (`range_id`),
  KEY `version_id` (`version_id`),
  CONSTRAINT `stay_date_range_ibfk_1` FOREIGN KEY (`version_id`) REFERENCES `stay_version` (`version_id`),
  CONSTRAINT `stay_date_range_chk_1` CHECK ((`end_date` >= `start_date`))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_date_range`
--

LOCK TABLES `stay_date_range` WRITE;
/*!40000 ALTER TABLE `stay_date_range` DISABLE KEYS */;
INSERT INTO `stay_date_range` VALUES (1,1,'2027-01-05','2027-01-10'),(2,2,'2027-01-05','2027-01-10');
/*!40000 ALTER TABLE `stay_date_range` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stay_review`
--

DROP TABLE IF EXISTS `stay_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stay_review` (
  `review_id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `version_id` bigint NOT NULL,
  `reviewer_user_id` bigint NOT NULL,
  `result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  KEY `application_id` (`application_id`),
  KEY `version_id` (`version_id`),
  KEY `reviewer_user_id` (`reviewer_user_id`),
  CONSTRAINT `stay_review_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `stay_application` (`application_id`),
  CONSTRAINT `stay_review_ibfk_2` FOREIGN KEY (`version_id`) REFERENCES `stay_version` (`version_id`),
  CONSTRAINT `stay_review_ibfk_3` FOREIGN KEY (`reviewer_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_review`
--

LOCK TABLES `stay_review` WRITE;
/*!40000 ALTER TABLE `stay_review` DISABLE KEYS */;
INSERT INTO `stay_review` VALUES (1,1,1,2,'APPROVED','','2026-10-15 12:05:00'),(2,2,2,2,'APPROVED','','2026-10-15 12:07:52');
/*!40000 ALTER TABLE `stay_review` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stay_version`
--

DROP TABLE IF EXISTS `stay_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stay_version` (
  `version_id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saved_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`version_id`),
  KEY `application_id` (`application_id`),
  CONSTRAINT `stay_version_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `stay_application` (`application_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_version`
--

LOCK TABLES `stay_version` WRITE;
/*!40000 ALTER TABLE `stay_version` DISABLE KEYS */;
INSERT INTO `stay_version` VALUES (1,1,'Study on campus.','2026-10-15 12:05:00','2026-10-15 12:05:00'),(2,2,'Study on campus.','2026-10-15 12:07:52','2026-10-15 12:07:52');
/*!40000 ALTER TABLE `stay_version` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_user`
--

DROP TABLE IF EXISTS `sys_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `login_account` varchar(60) NOT NULL,
  `password_hash` varchar(128) NOT NULL,
  `real_name` varchar(80) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `role_code` varchar(30) NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `login_account` (`login_account`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_user`
--

LOCK TABLES `sys_user` WRITE;
/*!40000 ALTER TABLE `sys_user` DISABLE KEYS */;
INSERT INTO `sys_user` VALUES (1,'student1','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','张三','13800000001','STUDENT',1,'2026-10-15 12:02:12','2026-10-15 12:02:12'),(2,'manager1','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','李老师','13800000002','DORM_MANAGER',1,'2026-10-15 12:02:12','2026-10-15 12:02:12'),(3,'repair1','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','王师傅','13800000003','REPAIRER',1,'2026-10-15 12:02:12','2026-10-15 12:02:12'),(4,'admin','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','系统管理员','13800000004','ADMIN',1,'2026-10-15 12:02:12','2026-10-15 12:02:12'),(5,'ui-student-1792037103756','f8a496efe9597de6b7d93459008afb03240235b0fee0f02068177332a426efed','UI Student','13900000000','STUDENT',0,'2026-10-15 12:05:05','2026-10-15 12:05:15'),(8,'ui-student-1792037275251','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','UI Student','','STUDENT',1,'2026-10-15 12:07:56','2026-10-15 12:07:56');
/*!40000 ALTER TABLE `sys_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_accommodation_current`
--

DROP TABLE IF EXISTS `v_accommodation_current`;
/*!50001 DROP VIEW IF EXISTS `v_accommodation_current`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_accommodation_current` AS SELECT 
 1 AS `assignment_id`,
 1 AS `student_user_id`,
 1 AS `student_name`,
 1 AS `phone`,
 1 AS `building_id`,
 1 AS `building_name`,
 1 AS `room_id`,
 1 AS `room_no`,
 1 AS `bed_id`,
 1 AS `bed_no`,
 1 AS `check_in_date`,
 1 AS `check_out_date`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_repair_order_dashboard`
--

DROP TABLE IF EXISTS `v_repair_order_dashboard`;
/*!50001 DROP VIEW IF EXISTS `v_repair_order_dashboard`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_repair_order_dashboard` AS SELECT 
 1 AS `order_id`,
 1 AS `order_no`,
 1 AS `student_user_id`,
 1 AS `room_id`,
 1 AS `category_id`,
 1 AS `title`,
 1 AS `description`,
 1 AS `urgent`,
 1 AS `current_status`,
 1 AS `abnormal`,
 1 AS `reject_reason`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `parent_order_id`,
 1 AS `rule_id`,
 1 AS `archived_at`,
 1 AS `archive_reason`,
 1 AS `student_name`,
 1 AS `building_id`,
 1 AS `room_no`,
 1 AS `building_name`,
 1 AS `category_name`,
 1 AS `work_type_id`,
 1 AS `work_type_name`,
 1 AS `dispatch_id`,
 1 AS `repairer_user_id`,
 1 AS `repairer_name`,
 1 AS `accept_deadline`,
 1 AS `repair_deadline`,
 1 AS `result_text`,
 1 AS `score`,
 1 AS `comment`,
 1 AS `reject_count`,
 1 AS `accept_timeout_count`,
 1 AS `repair_timeout_count`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_stay_application`
--

DROP TABLE IF EXISTS `v_stay_application`;
/*!50001 DROP VIEW IF EXISTS `v_stay_application`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_stay_application` AS SELECT 
 1 AS `application_id`,
 1 AS `batch_id`,
 1 AS `student_user_id`,
 1 AS `current_status`,
 1 AS `review_reason`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `reviewer_user_id`,
 1 AS `reviewed_at`,
 1 AS `building_id`,
 1 AS `source`,
 1 AS `resubmit_deadline`,
 1 AS `archived_at`,
 1 AS `archive_reason`,
 1 AS `student_name`,
 1 AS `batch_name`,
 1 AS `building_name`,
 1 AS `version_id`,
 1 AS `reason`,
 1 AS `submitted_at`,
 1 AS `start_date`,
 1 AS `end_date`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `v_accommodation_current`
--

/*!50001 DROP VIEW IF EXISTS `v_accommodation_current`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_accommodation_current` AS select `a`.`assignment_id` AS `assignment_id`,`a`.`student_user_id` AS `student_user_id`,`u`.`real_name` AS `student_name`,`u`.`phone` AS `phone`,`b`.`building_id` AS `building_id`,`b`.`building_name` AS `building_name`,`r`.`room_id` AS `room_id`,`r`.`room_no` AS `room_no`,`bd`.`bed_id` AS `bed_id`,`bd`.`bed_no` AS `bed_no`,`a`.`check_in_date` AS `check_in_date`,`a`.`check_out_date` AS `check_out_date` from ((((`accommodation_assignment` `a` join `sys_user` `u` on((`u`.`user_id` = `a`.`student_user_id`))) join `bed` `bd` on((`bd`.`bed_id` = `a`.`bed_id`))) join `dorm_room` `r` on((`r`.`room_id` = `bd`.`room_id`))) join `building` `b` on((`b`.`building_id` = `r`.`building_id`))) where ((`a`.`check_in_date` <= curdate()) and ((`a`.`check_out_date` is null) or (curdate() < `a`.`check_out_date`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_repair_order_dashboard`
--

/*!50001 DROP VIEW IF EXISTS `v_repair_order_dashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_repair_order_dashboard` AS select `ro`.`order_id` AS `order_id`,`ro`.`order_no` AS `order_no`,`ro`.`student_user_id` AS `student_user_id`,`ro`.`room_id` AS `room_id`,`ro`.`category_id` AS `category_id`,`ro`.`title` AS `title`,`ro`.`description` AS `description`,`ro`.`urgent` AS `urgent`,`ro`.`current_status` AS `current_status`,`ro`.`abnormal` AS `abnormal`,`ro`.`reject_reason` AS `reject_reason`,`ro`.`created_at` AS `created_at`,`ro`.`updated_at` AS `updated_at`,`ro`.`parent_order_id` AS `parent_order_id`,`ro`.`rule_id` AS `rule_id`,`ro`.`archived_at` AS `archived_at`,`ro`.`archive_reason` AS `archive_reason`,`u`.`real_name` AS `student_name`,`r`.`building_id` AS `building_id`,`r`.`room_no` AS `room_no`,`b`.`building_name` AS `building_name`,`c`.`category_name` AS `category_name`,`c`.`work_type_id` AS `work_type_id`,`w`.`work_type_name` AS `work_type_name`,`rd`.`dispatch_id` AS `dispatch_id`,`rd`.`repairer_user_id` AS `repairer_user_id`,`ru`.`real_name` AS `repairer_name`,`rd`.`accept_deadline` AS `accept_deadline`,`rd`.`repair_deadline` AS `repair_deadline`,`rr`.`result_text` AS `result_text`,`ev`.`score` AS `score`,`ev`.`comment` AS `comment`,(select count(0) from `repair_dispatch` `x` where ((`x`.`order_id` = `ro`.`order_id`) and (`x`.`dispatch_status` = 'REJECTED'))) AS `reject_count`,(select count(0) from `repair_dispatch` `x` where ((`x`.`order_id` = `ro`.`order_id`) and (`x`.`dispatch_status` = 'TIMEOUT'))) AS `accept_timeout_count`,(select count(0) from `repair_exception` `x` where ((`x`.`order_id` = `ro`.`order_id`) and (`x`.`exception_type` = 'REPAIR_TIMEOUT'))) AS `repair_timeout_count` from (((((((((`repair_order` `ro` join `sys_user` `u` on((`u`.`user_id` = `ro`.`student_user_id`))) join `dorm_room` `r` on((`r`.`room_id` = `ro`.`room_id`))) join `building` `b` on((`b`.`building_id` = `r`.`building_id`))) left join `fault_category` `c` on((`c`.`category_id` = `ro`.`category_id`))) left join `repair_work_type` `w` on((`w`.`work_type_id` = `c`.`work_type_id`))) left join `repair_dispatch` `rd` on((`rd`.`dispatch_id` = (select max(`x`.`dispatch_id`) from `repair_dispatch` `x` where ((`x`.`order_id` = `ro`.`order_id`) and (`x`.`dispatch_status` in ('PENDING','ACCEPTED'))))))) left join `sys_user` `ru` on((`ru`.`user_id` = `rd`.`repairer_user_id`))) left join `repair_result` `rr` on((`rr`.`order_id` = `ro`.`order_id`))) left join `repair_evaluation` `ev` on((`ev`.`order_id` = `ro`.`order_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_stay_application`
--

/*!50001 DROP VIEW IF EXISTS `v_stay_application`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_stay_application` AS select `a`.`application_id` AS `application_id`,`a`.`batch_id` AS `batch_id`,`a`.`student_user_id` AS `student_user_id`,`a`.`current_status` AS `current_status`,`a`.`review_reason` AS `review_reason`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at`,`a`.`reviewer_user_id` AS `reviewer_user_id`,`a`.`reviewed_at` AS `reviewed_at`,`a`.`building_id` AS `building_id`,`a`.`source` AS `source`,`a`.`resubmit_deadline` AS `resubmit_deadline`,`a`.`archived_at` AS `archived_at`,`a`.`archive_reason` AS `archive_reason`,`u`.`real_name` AS `student_name`,`b`.`batch_name` AS `batch_name`,`bl`.`building_name` AS `building_name`,`v`.`version_id` AS `version_id`,`v`.`reason` AS `reason`,`v`.`submitted_at` AS `submitted_at`,(select min(`d`.`start_date`) from `stay_date_range` `d` where (`d`.`version_id` = `v`.`version_id`)) AS `start_date`,(select max(`d`.`end_date`) from `stay_date_range` `d` where (`d`.`version_id` = `v`.`version_id`)) AS `end_date` from ((((`stay_application` `a` join `sys_user` `u` on((`u`.`user_id` = `a`.`student_user_id`))) join `stay_batch` `b` on((`b`.`batch_id` = `a`.`batch_id`))) left join `building` `bl` on((`bl`.`building_id` = `a`.`building_id`))) left join `stay_version` `v` on((`v`.`version_id` = (select max(`x`.`version_id`) from `stay_version` `x` where ((`x`.`application_id` = `a`.`application_id`) and (`x`.`submitted_at` is not null)))))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-15 12:08:02
