-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: dorm_platform_test
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accommodation_assignment`
--

LOCK TABLES `accommodation_assignment` WRITE;
/*!40000 ALTER TABLE `accommodation_assignment` DISABLE KEYS */;
INSERT INTO `accommodation_assignment` VALUES (1,1,1,'2026-09-01',NULL,'INITIAL');
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
INSERT INTO `backup_task` VALUES (1,4,'BACKUP','SUCCESS','2026-10-15 11:01:09','2026-10-15 11:01:11','2026-10-15 11:01:13',NULL),(2,4,'BACKUP','RUNNING','2026-10-15 11:16:34','2026-10-15 11:16:36',NULL,NULL);
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
INSERT INTO `backup_task_file` VALUES (1,60,'BACKUP_OUTPUT');
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
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `file_resource`
--

LOCK TABLES `file_resource` WRITE;
/*!40000 ALTER TABLE `file_resource` DISABLE KEYS */;
INSERT INTO `file_resource` VALUES (19,3,'evidence.png','7c84105a-19b2-4a6f-bd1f-85a06f3f6aae','image/png',68,'2026-10-15 10:10:56'),(20,3,'evidence.png','8f4f5017-c725-480e-babb-cb3e5b28a516','image/png',68,'2026-10-15 10:13:31'),(21,3,'evidence.png','1f70c67d-8123-445f-94b3-b036a53adf08','image/png',68,'2026-10-15 10:15:57'),(22,3,'evidence.png','b4aaae8f-b9b3-4fce-8c70-90818378eae1','image/png',68,'2026-10-15 10:17:12'),(44,3,'evidence.png','55e3fccf-aa32-417e-adf7-025346527bac','image/png',68,'2026-10-15 10:54:05'),(56,3,'evidence.png','382c5edf-3b20-4ec5-8251-b6b60020c7e1','image/png',68,'2026-10-15 11:01:02'),(57,4,'users.json','9bda8996-fc1a-4587-931c-573e25ea71d5','application/json',913,'2026-10-15 11:01:05'),(58,4,'import.json','b10c0353-166a-4599-a3b7-5a6b251d8d2f','application/json',105,'2026-10-15 11:01:06'),(59,4,'import.json','51f0d0de-7ac2-436a-8e47-204374812904','application/json',191,'2026-10-15 11:01:07'),(60,4,'dorm-backup.sql','5c5c19e9-ec55-4967-967f-baee42b07db1','application/sql',81943,'2026-10-15 11:01:13'),(72,3,'evidence.png','2999e87b-827d-46c5-a6cf-58aad9afa991','image/png',68,'2026-10-15 11:16:28'),(73,4,'users.json','6ae4a3cb-c948-4b10-bb49-b102b6a54173','application/json',1145,'2026-10-15 11:16:30'),(74,4,'import.json','5d458162-d6a5-4b64-9a10-e0d7b7caa036','application/json',105,'2026-10-15 11:16:31'),(75,4,'import.json','6e7fc837-5cd9-4ee4-b0c5-7cfd0dfa3ee3','application/json',191,'2026-10-15 11:16:33');
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_export_task`
--

LOCK TABLES `import_export_task` WRITE;
/*!40000 ALTER TABLE `import_export_task` DISABLE KEYS */;
INSERT INTO `import_export_task` VALUES (5,4,'EXPORT','users','SUCCESS','2026-10-15 11:01:04','2026-10-15 11:01:05','2026-10-15 11:01:05',NULL),(6,4,'IMPORT','users','SUCCESS','2026-10-15 11:01:06','2026-10-15 11:01:07','2026-10-15 11:01:07',NULL),(7,4,'IMPORT','users','FAILED','2026-10-15 11:01:07','2026-10-15 11:01:09','2026-10-15 11:01:09','第2条导入失败，整批未保存：PreparedStatementCallback; Duplicate entry \'student1\' for key \'sys_user.login_account\''),(10,4,'EXPORT','users','SUCCESS','2026-10-15 11:16:30','2026-10-15 11:16:30','2026-10-15 11:16:30',NULL),(11,4,'IMPORT','users','SUCCESS','2026-10-15 11:16:31','2026-10-15 11:16:32','2026-10-15 11:16:32',NULL),(12,4,'IMPORT','users','FAILED','2026-10-15 11:16:33','2026-10-15 11:16:34','2026-10-15 11:16:34','第2条导入失败，整批未保存：PreparedStatementCallback; Duplicate entry \'student1\' for key \'sys_user.login_account\'');
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
INSERT INTO `import_export_task_file` VALUES (5,57,'OUTPUT'),(6,58,'INPUT'),(7,59,'INPUT'),(10,73,'OUTPUT'),(11,74,'INPUT'),(12,75,'INPUT');
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
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_log`
--

LOCK TABLES `login_log` WRITE;
/*!40000 ALTER TABLE `login_log` DISABLE KEYS */;
INSERT INTO `login_log` VALUES (5,1,'student1',1,'2026-10-15 10:54:00'),(6,2,'manager1',1,'2026-10-15 10:54:01'),(7,3,'repair1',1,'2026-10-15 10:54:02'),(8,4,'admin',1,'2026-10-15 10:54:03'),(11,1,'student1',1,'2026-10-15 11:00:58'),(12,2,'manager1',1,'2026-10-15 11:00:59'),(13,3,'repair1',1,'2026-10-15 11:01:00'),(14,4,'admin',1,'2026-10-15 11:01:01'),(17,1,'student1',1,'2026-10-15 11:16:24'),(18,2,'manager1',1,'2026-10-15 11:16:25'),(19,3,'repair1',1,'2026-10-15 11:16:26'),(20,4,'admin',1,'2026-10-15 11:16:27');
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
INSERT INTO `message_receipt` VALUES (1,1,NULL),(1,2,NULL),(1,3,NULL),(1,4,NULL),(2,1,NULL),(3,2,NULL),(4,3,NULL),(159,2,NULL),(160,1,NULL),(161,3,NULL),(162,1,NULL),(163,1,NULL),(164,1,NULL),(165,2,NULL),(166,1,NULL),(167,3,NULL),(168,1,NULL),(169,1,NULL),(170,1,NULL),(171,3,NULL),(172,1,NULL),(173,2,NULL),(174,1,NULL),(175,2,NULL),(176,1,NULL),(177,3,NULL),(178,1,NULL),(179,1,NULL),(180,1,NULL),(181,3,NULL),(182,1,NULL),(183,2,NULL),(184,1,NULL),(185,2,NULL),(186,1,NULL),(187,3,NULL),(188,1,NULL),(189,1,NULL),(190,1,NULL),(191,3,NULL),(192,1,NULL),(193,2,NULL),(194,1,NULL),(395,2,NULL),(396,1,NULL),(397,3,NULL),(398,1,NULL),(399,1,NULL),(400,1,NULL),(401,3,NULL),(402,1,NULL),(403,2,NULL),(404,1,NULL),(405,1,NULL),(507,2,NULL),(508,1,NULL),(509,3,NULL),(510,1,NULL),(511,1,NULL),(512,1,NULL),(513,3,NULL),(514,1,NULL),(515,2,NULL),(516,1,NULL),(517,1,'2026-10-15 11:01:04'),(625,2,NULL),(626,1,NULL),(627,3,NULL),(628,1,NULL),(629,1,NULL),(630,1,NULL),(631,3,NULL),(632,1,NULL),(633,2,NULL),(634,1,NULL),(635,1,'2026-10-15 11:16:30'),(635,33,NULL);
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
INSERT INTO `message_target` VALUES (405,1),(517,1),(635,1),(635,33);
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
) ENGINE=InnoDB AUTO_INCREMENT=744 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operation_log`
--

LOCK TABLES `operation_log` WRITE;
/*!40000 ALTER TABLE `operation_log` DISABLE KEYS */;
INSERT INTO `operation_log` VALUES (169,1,'repair','create',28,'SUCCESS','2026-10-15 10:10:56'),(170,1,'repair','submit',28,'SUCCESS','2026-10-15 10:10:56'),(171,2,'repair','review',28,'SUCCESS','2026-10-15 10:10:56'),(172,3,'repair','accept',28,'SUCCESS','2026-10-15 10:10:56'),(173,3,'repair','result',28,'SUCCESS','2026-10-15 10:10:56'),(174,1,'repair','create',29,'SUCCESS','2026-10-15 10:13:31'),(175,1,'repair','submit',29,'SUCCESS','2026-10-15 10:13:31'),(176,2,'repair','review',29,'SUCCESS','2026-10-15 10:13:31'),(177,3,'repair','accept',29,'SUCCESS','2026-10-15 10:13:31'),(178,3,'repair','result',29,'SUCCESS','2026-10-15 10:13:31'),(179,1,'repair','evaluate',29,'SUCCESS','2026-10-15 10:13:31'),(180,4,'stay','configure_batch',8,'SUCCESS','2026-10-15 10:13:32'),(181,2,'stay','publish',8,'SUCCESS','2026-10-15 10:13:32'),(182,1,'stay','save',7,'SUCCESS','2026-10-15 10:13:32'),(183,1,'stay','submit',7,'SUCCESS','2026-10-15 10:13:32'),(184,2,'stay','lock',7,'SUCCESS','2026-10-15 10:13:32'),(185,2,'stay','review',7,'SUCCESS','2026-10-15 10:13:32'),(186,1,'repair','create',30,'SUCCESS','2026-10-15 10:15:56'),(187,1,'repair','submit',30,'SUCCESS','2026-10-15 10:15:56'),(188,2,'repair','review',30,'SUCCESS','2026-10-15 10:15:57'),(189,3,'repair','accept',30,'SUCCESS','2026-10-15 10:15:57'),(190,3,'repair','result',30,'SUCCESS','2026-10-15 10:15:57'),(191,1,'repair','evaluate',30,'SUCCESS','2026-10-15 10:15:57'),(192,4,'stay','configure_batch',9,'SUCCESS','2026-10-15 10:15:57'),(193,2,'stay','publish',9,'SUCCESS','2026-10-15 10:15:57'),(194,1,'stay','save',8,'SUCCESS','2026-10-15 10:15:57'),(195,1,'stay','submit',8,'SUCCESS','2026-10-15 10:15:57'),(196,2,'stay','lock',8,'SUCCESS','2026-10-15 10:15:58'),(197,2,'stay','review',8,'SUCCESS','2026-10-15 10:15:58'),(198,1,'repair','create',31,'SUCCESS','2026-10-15 10:17:12'),(199,1,'repair','submit',31,'SUCCESS','2026-10-15 10:17:12'),(200,2,'repair','review',31,'SUCCESS','2026-10-15 10:17:12'),(201,3,'repair','accept',31,'SUCCESS','2026-10-15 10:17:12'),(202,3,'repair','result',31,'SUCCESS','2026-10-15 10:17:12'),(203,1,'repair','evaluate',31,'SUCCESS','2026-10-15 10:17:13'),(204,4,'stay','configure_batch',10,'SUCCESS','2026-10-15 10:17:13'),(205,2,'stay','publish',10,'SUCCESS','2026-10-15 10:17:13'),(206,1,'stay','save',9,'SUCCESS','2026-10-15 10:17:13'),(207,1,'stay','submit',9,'SUCCESS','2026-10-15 10:17:13'),(208,2,'stay','lock',9,'SUCCESS','2026-10-15 10:17:13'),(209,2,'stay','review',9,'SUCCESS','2026-10-15 10:17:13'),(445,1,'repair','create',60,'SUCCESS','2026-10-15 10:54:04'),(446,1,'repair','submit',60,'SUCCESS','2026-10-15 10:54:04'),(447,2,'repair','review',60,'SUCCESS','2026-10-15 10:54:04'),(448,3,'repair','accept',60,'SUCCESS','2026-10-15 10:54:05'),(449,3,'repair','result',60,'SUCCESS','2026-10-15 10:54:05'),(450,1,'repair','evaluate',60,'SUCCESS','2026-10-15 10:54:05'),(451,4,'stay','configure_batch',23,'SUCCESS','2026-10-15 10:54:05'),(452,2,'stay','publish',23,'SUCCESS','2026-10-15 10:54:06'),(453,1,'stay','save',22,'SUCCESS','2026-10-15 10:54:06'),(454,1,'stay','submit',22,'SUCCESS','2026-10-15 10:54:06'),(455,2,'stay','lock',22,'SUCCESS','2026-10-15 10:54:06'),(456,2,'stay','review',22,'SUCCESS','2026-10-15 10:54:06'),(457,4,'notice','publish',405,'SUCCESS','2026-10-15 10:54:06'),(577,1,'repair','create',75,'SUCCESS','2026-10-15 11:01:02'),(578,1,'repair','submit',75,'SUCCESS','2026-10-15 11:01:02'),(579,2,'repair','review',75,'SUCCESS','2026-10-15 11:01:02'),(580,3,'repair','accept',75,'SUCCESS','2026-10-15 11:01:02'),(581,3,'repair','result',75,'SUCCESS','2026-10-15 11:01:02'),(582,1,'repair','evaluate',75,'SUCCESS','2026-10-15 11:01:03'),(583,4,'stay','configure_batch',30,'SUCCESS','2026-10-15 11:01:03'),(584,2,'stay','publish',30,'SUCCESS','2026-10-15 11:01:03'),(585,1,'stay','save',29,'SUCCESS','2026-10-15 11:01:03'),(586,1,'stay','submit',29,'SUCCESS','2026-10-15 11:01:03'),(587,2,'stay','lock',29,'SUCCESS','2026-10-15 11:01:03'),(588,2,'stay','review',29,'SUCCESS','2026-10-15 11:01:03'),(589,4,'notice','publish',517,'SUCCESS','2026-10-15 11:01:04'),(590,4,'system','data_task_success',5,'SUCCESS','2026-10-15 11:01:05'),(591,4,'auth','create',33,'SUCCESS','2026-10-15 11:01:07'),(592,4,'system','data_task_success',6,'SUCCESS','2026-10-15 11:01:07'),(594,4,'system','database_backup',0,'SUCCESS','2026-10-15 11:01:13'),(727,1,'repair','create',90,'SUCCESS','2026-10-15 11:16:28'),(728,1,'repair','submit',90,'SUCCESS','2026-10-15 11:16:28'),(729,2,'repair','review',90,'SUCCESS','2026-10-15 11:16:28'),(730,3,'repair','accept',90,'SUCCESS','2026-10-15 11:16:28'),(731,3,'repair','result',90,'SUCCESS','2026-10-15 11:16:28'),(732,1,'repair','evaluate',90,'SUCCESS','2026-10-15 11:16:29'),(733,4,'stay','configure_batch',39,'SUCCESS','2026-10-15 11:16:29'),(734,2,'stay','publish',39,'SUCCESS','2026-10-15 11:16:29'),(735,1,'stay','save',38,'SUCCESS','2026-10-15 11:16:29'),(736,1,'stay','submit',38,'SUCCESS','2026-10-15 11:16:29'),(737,2,'stay','lock',38,'SUCCESS','2026-10-15 11:16:29'),(738,2,'stay','review',38,'SUCCESS','2026-10-15 11:16:29'),(739,4,'notice','publish',635,'SUCCESS','2026-10-15 11:16:30'),(740,4,'system','data_task_success',10,'SUCCESS','2026-10-15 11:16:30'),(741,4,'auth','create',43,'SUCCESS','2026-10-15 11:16:32'),(742,4,'system','data_task_success',11,'SUCCESS','2026-10-15 11:16:32');
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
INSERT INTO `repair_attachment` VALUES (28,19,'RESULT'),(29,20,'RESULT'),(30,21,'RESULT'),(31,22,'RESULT'),(60,44,'RESULT'),(75,56,'RESULT'),(90,72,'RESULT');
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
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_audit`
--

LOCK TABLES `repair_audit` WRITE;
/*!40000 ALTER TABLE `repair_audit` DISABLE KEYS */;
INSERT INTO `repair_audit` VALUES (23,28,2,'APPROVED','','2026-10-15 10:10:56'),(24,29,2,'APPROVED','','2026-10-15 10:13:31'),(25,30,2,'APPROVED','','2026-10-15 10:15:57'),(26,31,2,'APPROVED','','2026-10-15 10:17:12'),(55,60,2,'APPROVED','','2026-10-15 10:54:04'),(70,75,2,'APPROVED','','2026-10-15 11:01:02'),(85,90,2,'APPROVED','','2026-10-15 11:16:28');
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
INSERT INTO `repair_confirmation` VALUES (28,'STUDENT','2026-10-15 10:10:56'),(29,'STUDENT','2026-10-15 10:13:31'),(30,'STUDENT','2026-10-15 10:15:57'),(31,'STUDENT','2026-10-15 10:17:12'),(60,'STUDENT','2026-10-15 10:54:05'),(75,'STUDENT','2026-10-15 11:01:03'),(90,'STUDENT','2026-10-15 11:16:29');
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
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  KEY `order_id` (`order_id`),
  KEY `idx_dispatch_worker_status` (`repairer_user_id`,`dispatch_status`),
  CONSTRAINT `repair_dispatch_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`),
  CONSTRAINT `repair_dispatch_ibfk_2` FOREIGN KEY (`repairer_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_dispatch`
--

LOCK TABLES `repair_dispatch` WRITE;
/*!40000 ALTER TABLE `repair_dispatch` DISABLE KEYS */;
INSERT INTO `repair_dispatch` VALUES (1,2,3,'MANUAL','ACCEPTED',NULL,'2026-10-15 09:48:24',NULL,'2026-10-15 11:48:24','2026-10-16 09:48:24'),(2,3,3,'AUTO','ACCEPTED',NULL,'2026-10-15 09:48:24',NULL,'2026-10-15 11:48:24','2026-10-16 09:48:24'),(27,28,3,'AUTO','ACCEPTED','','2026-10-15 10:10:56','2026-10-15 10:10:56','2026-10-15 12:10:56','2026-10-16 10:10:56'),(28,29,3,'AUTO','ACCEPTED','','2026-10-15 10:13:31','2026-10-15 10:13:31','2026-10-15 12:13:31','2026-10-16 10:13:32'),(29,30,3,'AUTO','ACCEPTED','','2026-10-15 10:15:57','2026-10-15 10:15:57','2026-10-15 12:15:57','2026-10-16 10:15:57'),(30,31,3,'AUTO','ACCEPTED','','2026-10-15 10:17:12','2026-10-15 10:17:12','2026-10-15 12:17:12','2026-10-16 10:17:13'),(59,60,3,'AUTO','ACCEPTED','','2026-10-15 10:54:04','2026-10-15 10:54:05','2026-10-15 12:54:05','2026-10-16 10:54:05'),(74,75,3,'AUTO','ACCEPTED','','2026-10-15 11:01:02','2026-10-15 11:01:02','2026-10-15 13:01:03','2026-10-16 11:01:03'),(89,90,3,'AUTO','ACCEPTED','','2026-10-15 11:16:28','2026-10-15 11:16:28','2026-10-15 13:16:28','2026-10-16 11:16:29');
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_evaluation`
--

LOCK TABLES `repair_evaluation` WRITE;
/*!40000 ALTER TABLE `repair_evaluation` DISABLE KEYS */;
INSERT INTO `repair_evaluation` VALUES (3,29,1,5,'Completed successfully.','2026-10-15 10:13:31'),(4,30,1,5,'Completed successfully.','2026-10-15 10:15:57'),(5,31,1,5,'Completed successfully.','2026-10-15 10:17:13'),(8,60,1,5,'Completed successfully.','2026-10-15 10:54:05'),(10,75,1,5,'Completed successfully.','2026-10-15 11:01:03'),(12,90,1,5,'Completed successfully.','2026-10-15 11:16:29');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  KEY `room_id` (`room_id`),
  KEY `category_id` (`category_id`),
  KEY `rule_id` (`rule_id`),
  KEY `idx_repair_student_status` (`student_user_id`,`current_status`),
  CONSTRAINT `repair_order_ibfk_1` FOREIGN KEY (`student_user_id`) REFERENCES `sys_user` (`user_id`),
  CONSTRAINT `repair_order_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `dorm_room` (`room_id`),
  CONSTRAINT `repair_order_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `fault_category` (`category_id`),
  CONSTRAINT `repair_order_ibfk_4` FOREIGN KEY (`rule_id`) REFERENCES `repair_rule` (`rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_order`
--

LOCK TABLES `repair_order` WRITE;
/*!40000 ALTER TABLE `repair_order` DISABLE KEYS */;
INSERT INTO `repair_order` VALUES (1,'WX20261014001',1,1,2,'203 室北侧插座无电','床位 A 左侧插座无法使用，已确认其他插座正常。',0,'PENDING_REVIEW',0,NULL,'2026-10-15 09:48:24','2026-10-15 09:48:24',NULL,1,NULL,NULL),(2,'WX20261013018',1,1,3,'书桌上方灯具闪烁','晚间使用时频繁闪烁，存在安全隐患。',1,'ACCEPTED',0,NULL,'2026-10-15 09:48:24','2026-10-15 09:48:25',NULL,1,NULL,NULL),(3,'WX20261008007',1,1,5,'衣柜门合页松动','衣柜门下垂，开合不顺畅。',0,'REPAIRED',0,NULL,'2026-10-15 09:48:24','2026-10-15 09:48:24',NULL,1,NULL,NULL),(28,'WXf2f0b46a7a274dcaaa4e',1,1,2,'Browser acceptance 1792030255814','Socket at bed A is broken.',0,'CONFIRMED',0,'','2026-10-15 10:10:56','2026-10-15 10:10:56',NULL,1,NULL,NULL),(29,'WXdbb424cd8aae412faded',1,1,2,'Browser acceptance 1792030410990','Socket at bed A is broken.',0,'ARCHIVED',0,'','2026-10-15 10:13:31','2026-10-15 10:13:31',NULL,1,'2026-10-15 10:13:31','EVALUATED'),(30,'WX16b4fe0cf80d4d5ea996',1,1,2,'Browser acceptance 1792030556674','Socket at bed A is broken.',0,'ARCHIVED',0,'','2026-10-15 10:15:56','2026-10-15 10:15:57',NULL,1,'2026-10-15 10:15:57','EVALUATED'),(31,'WXd315c735736b48d0b8d9',1,1,2,'Browser acceptance 1792030632096','Socket at bed A is broken.',0,'ARCHIVED',0,'','2026-10-15 10:17:12','2026-10-15 10:17:13',NULL,1,'2026-10-15 10:17:13','EVALUATED'),(60,'WXf0dd707158cb44e8a7f6',1,1,2,'Browser acceptance 1792032844531','Socket at bed A is broken.',0,'ARCHIVED',0,'','2026-10-15 10:54:04','2026-10-15 10:54:05',NULL,1,'2026-10-15 10:54:05','EVALUATED'),(75,'WXcbeb63f62da64631a588',1,1,2,'Browser acceptance 1792033262188','Socket at bed A is broken.',0,'ARCHIVED',0,'','2026-10-15 11:01:02','2026-10-15 11:01:03',NULL,1,'2026-10-15 11:01:03','EVALUATED'),(90,'WX1010f34a7ceb40c6960b',1,1,2,'Browser acceptance 1792034187948','Socket at bed A is broken.',0,'ARCHIVED',0,'','2026-10-15 11:16:28','2026-10-15 11:16:29',NULL,1,'2026-10-15 11:16:29','EVALUATED');
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
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_result`
--

LOCK TABLES `repair_result` WRITE;
/*!40000 ALTER TABLE `repair_result` DISABLE KEYS */;
INSERT INTO `repair_result` VALUES (1,3,3,'已更换衣柜门合页，现场开合测试正常。',NULL,'2026-10-15 09:48:24'),(12,28,3,'Replaced socket and verified with tester.',NULL,'2026-10-15 10:10:56'),(13,29,3,'Replaced socket and verified with tester.',NULL,'2026-10-15 10:13:31'),(14,30,3,'Replaced socket and verified with tester.',NULL,'2026-10-15 10:15:57'),(15,31,3,'Replaced socket and verified with tester.',NULL,'2026-10-15 10:17:12'),(28,60,3,'Replaced socket and verified with tester.',NULL,'2026-10-15 10:54:05'),(35,75,3,'Replaced socket and verified with tester.',NULL,'2026-10-15 11:01:02'),(42,90,3,'Replaced socket and verified with tester.',NULL,'2026-10-15 11:16:28');
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_rule`
--

LOCK TABLES `repair_rule` WRITE;
/*!40000 ALTER TABLE `repair_rule` DISABLE KEYS */;
INSERT INTO `repair_rule` VALUES (1,120,1440,360,7,7,NULL,'2026-10-15 09:48:24');
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
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_submission_version`
--

LOCK TABLES `repair_submission_version` WRITE;
/*!40000 ALTER TABLE `repair_submission_version` DISABLE KEYS */;
INSERT INTO `repair_submission_version` VALUES (25,28,'Browser acceptance 1792030255814','Socket at bed A is broken.',2,'2026-10-15 10:10:56'),(26,29,'Browser acceptance 1792030410990','Socket at bed A is broken.',2,'2026-10-15 10:13:31'),(27,30,'Browser acceptance 1792030556674','Socket at bed A is broken.',2,'2026-10-15 10:15:56'),(28,31,'Browser acceptance 1792030632096','Socket at bed A is broken.',2,'2026-10-15 10:17:12'),(59,60,'Browser acceptance 1792032844531','Socket at bed A is broken.',2,'2026-10-15 10:54:04'),(75,75,'Browser acceptance 1792033262188','Socket at bed A is broken.',2,'2026-10-15 11:01:02'),(91,90,'Browser acceptance 1792034187948','Socket at bed A is broken.',2,'2026-10-15 11:16:28');
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
INSERT INTO `schema_version` VALUES (1,'2026-10-15 09:48:24'),(2,'2026-10-15 09:48:24'),(3,'2026-10-15 09:48:25'),(4,'2026-10-15 10:29:15');
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
) ENGINE=InnoDB AUTO_INCREMENT=636 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_message`
--

LOCK TABLES `site_message` WRITE;
/*!40000 ALTER TABLE `site_message` DISABLE KEYS */;
INSERT INTO `site_message` VALUES (1,'ALL','宿舍事务通知','请在对应角色工作台查看待办与业务通知。','2026-10-15 09:48:24',NULL,'2026-10-15 09:48:25','2026-10-15 09:48:24'),(2,'STUDENT','宿舍事务通知','请在对应角色工作台查看待办与业务通知。','2026-10-15 09:48:24',NULL,'2026-10-15 09:48:25','2026-10-15 09:48:24'),(3,'DORM_MANAGER','宿舍事务通知','请在对应角色工作台查看待办与业务通知。','2026-10-15 09:48:24',NULL,'2026-10-15 09:48:25','2026-10-15 09:48:24'),(4,'REPAIRER','宿舍事务通知','请在对应角色工作台查看待办与业务通知。','2026-10-15 09:48:24',NULL,'2026-10-15 09:48:25','2026-10-15 09:48:24'),(159,'DIRECT','报修待审核','WXf2f0b46a7a274dcaaa4e','2026-10-15 10:10:56',NULL,'2026-10-15 10:10:56','2026-10-15 10:10:56'),(160,'DIRECT','报修进度','WXf2f0b46a7a274dcaaa4e：审核通过','2026-10-15 10:10:56',NULL,'2026-10-15 10:10:56','2026-10-15 10:10:56'),(161,'DIRECT','新的维修派单','WXf2f0b46a7a274dcaaa4e','2026-10-15 10:10:56',NULL,'2026-10-15 10:10:56','2026-10-15 10:10:56'),(162,'DIRECT','报修进度','WXf2f0b46a7a274dcaaa4e：维修人员已接单','2026-10-15 10:10:56',NULL,'2026-10-15 10:10:56','2026-10-15 10:10:56'),(163,'DIRECT','报修进度','WXf2f0b46a7a274dcaaa4e：维修完成，请确认或申请重修','2026-10-15 10:10:56',NULL,'2026-10-15 10:10:56','2026-10-15 10:10:56'),(164,'DIRECT','报修进度','WXf2f0b46a7a274dcaaa4e：已确认维修，可提交评价','2026-10-15 10:10:56',NULL,'2026-10-15 10:10:56','2026-10-15 10:10:56'),(165,'DIRECT','报修待审核','WXdbb424cd8aae412faded','2026-10-15 10:13:31',NULL,'2026-10-15 10:13:31','2026-10-15 10:13:31'),(166,'DIRECT','报修进度','WXdbb424cd8aae412faded：审核通过','2026-10-15 10:13:31',NULL,'2026-10-15 10:13:31','2026-10-15 10:13:31'),(167,'DIRECT','新的维修派单','WXdbb424cd8aae412faded','2026-10-15 10:13:31',NULL,'2026-10-15 10:13:31','2026-10-15 10:13:31'),(168,'DIRECT','报修进度','WXdbb424cd8aae412faded：维修人员已接单','2026-10-15 10:13:31',NULL,'2026-10-15 10:13:31','2026-10-15 10:13:31'),(169,'DIRECT','报修进度','WXdbb424cd8aae412faded：维修完成，请确认或申请重修','2026-10-15 10:13:31',NULL,'2026-10-15 10:13:31','2026-10-15 10:13:31'),(170,'DIRECT','报修进度','WXdbb424cd8aae412faded：已确认维修，可提交评价','2026-10-15 10:13:31',NULL,'2026-10-15 10:13:31','2026-10-15 10:13:31'),(171,'DIRECT','收到维修评价','WXdbb424cd8aae412faded：5分','2026-10-15 10:13:31',NULL,'2026-10-15 10:13:31','2026-10-15 10:13:31'),(172,'DIRECT','留宿申请已开放','UI holiday 1792030412111；申请截止：2026-12-20T23:59','2026-10-15 10:13:32',NULL,'2026-10-15 10:13:32','2026-10-15 10:13:32'),(173,'DIRECT','留宿申请已提交','申请编号：7','2026-10-15 10:13:32',NULL,'2026-10-15 10:13:32','2026-10-15 10:13:32'),(174,'DIRECT','留宿审核结果','留宿申请已通过','2026-10-15 10:13:32',NULL,'2026-10-15 10:13:32','2026-10-15 10:13:32'),(175,'DIRECT','报修待审核','WX16b4fe0cf80d4d5ea996','2026-10-15 10:15:56',NULL,'2026-10-15 10:15:56','2026-10-15 10:15:56'),(176,'DIRECT','报修进度','WX16b4fe0cf80d4d5ea996：审核通过','2026-10-15 10:15:57',NULL,'2026-10-15 10:15:57','2026-10-15 10:15:57'),(177,'DIRECT','新的维修派单','WX16b4fe0cf80d4d5ea996','2026-10-15 10:15:57',NULL,'2026-10-15 10:15:57','2026-10-15 10:15:57'),(178,'DIRECT','报修进度','WX16b4fe0cf80d4d5ea996：维修人员已接单','2026-10-15 10:15:57',NULL,'2026-10-15 10:15:57','2026-10-15 10:15:57'),(179,'DIRECT','报修进度','WX16b4fe0cf80d4d5ea996：维修完成，请确认或申请重修','2026-10-15 10:15:57',NULL,'2026-10-15 10:15:57','2026-10-15 10:15:57'),(180,'DIRECT','报修进度','WX16b4fe0cf80d4d5ea996：已确认维修，可提交评价','2026-10-15 10:15:57',NULL,'2026-10-15 10:15:57','2026-10-15 10:15:57'),(181,'DIRECT','收到维修评价','WX16b4fe0cf80d4d5ea996：5分','2026-10-15 10:15:57',NULL,'2026-10-15 10:15:57','2026-10-15 10:15:57'),(182,'DIRECT','留宿申请已开放','UI holiday 1792030557621；申请截止：2026-12-20T23:59','2026-10-15 10:15:57',NULL,'2026-10-15 10:15:57','2026-10-15 10:15:57'),(183,'DIRECT','留宿申请已提交','申请编号：8','2026-10-15 10:15:57',NULL,'2026-10-15 10:15:57','2026-10-15 10:15:57'),(184,'DIRECT','留宿审核结果','留宿申请已通过','2026-10-15 10:15:58',NULL,'2026-10-15 10:15:58','2026-10-15 10:15:58'),(185,'DIRECT','报修待审核','WXd315c735736b48d0b8d9','2026-10-15 10:17:12',NULL,'2026-10-15 10:17:12','2026-10-15 10:17:12'),(186,'DIRECT','报修进度','WXd315c735736b48d0b8d9：审核通过','2026-10-15 10:17:12',NULL,'2026-10-15 10:17:12','2026-10-15 10:17:12'),(187,'DIRECT','新的维修派单','WXd315c735736b48d0b8d9','2026-10-15 10:17:12',NULL,'2026-10-15 10:17:12','2026-10-15 10:17:12'),(188,'DIRECT','报修进度','WXd315c735736b48d0b8d9：维修人员已接单','2026-10-15 10:17:12',NULL,'2026-10-15 10:17:12','2026-10-15 10:17:12'),(189,'DIRECT','报修进度','WXd315c735736b48d0b8d9：维修完成，请确认或申请重修','2026-10-15 10:17:12',NULL,'2026-10-15 10:17:12','2026-10-15 10:17:12'),(190,'DIRECT','报修进度','WXd315c735736b48d0b8d9：已确认维修，可提交评价','2026-10-15 10:17:12',NULL,'2026-10-15 10:17:12','2026-10-15 10:17:12'),(191,'DIRECT','收到维修评价','WXd315c735736b48d0b8d9：5分','2026-10-15 10:17:13',NULL,'2026-10-15 10:17:13','2026-10-15 10:17:13'),(192,'DIRECT','留宿申请已开放','UI holiday 1792030633177；申请截止：2026-12-20T23:59','2026-10-15 10:17:13',NULL,'2026-10-15 10:17:13','2026-10-15 10:17:13'),(193,'DIRECT','留宿申请已提交','申请编号：9','2026-10-15 10:17:13',NULL,'2026-10-15 10:17:13','2026-10-15 10:17:13'),(194,'DIRECT','留宿审核结果','留宿申请已通过','2026-10-15 10:17:13',NULL,'2026-10-15 10:17:13','2026-10-15 10:17:13'),(395,'DIRECT','报修待审核','WXf0dd707158cb44e8a7f6','2026-10-15 10:54:04',NULL,'2026-10-15 10:54:04','2026-10-15 10:54:04'),(396,'DIRECT','报修进度','WXf0dd707158cb44e8a7f6：审核通过','2026-10-15 10:54:04',NULL,'2026-10-15 10:54:04','2026-10-15 10:54:04'),(397,'DIRECT','新的维修派单','WXf0dd707158cb44e8a7f6','2026-10-15 10:54:04',NULL,'2026-10-15 10:54:04','2026-10-15 10:54:04'),(398,'DIRECT','报修进度','WXf0dd707158cb44e8a7f6：维修人员已接单','2026-10-15 10:54:05',NULL,'2026-10-15 10:54:05','2026-10-15 10:54:05'),(399,'DIRECT','报修进度','WXf0dd707158cb44e8a7f6：维修完成，请确认或申请重修','2026-10-15 10:54:05',NULL,'2026-10-15 10:54:05','2026-10-15 10:54:05'),(400,'DIRECT','报修进度','WXf0dd707158cb44e8a7f6：已确认维修，可提交评价','2026-10-15 10:54:05',NULL,'2026-10-15 10:54:05','2026-10-15 10:54:05'),(401,'DIRECT','收到维修评价','WXf0dd707158cb44e8a7f6：5分','2026-10-15 10:54:05',NULL,'2026-10-15 10:54:05','2026-10-15 10:54:05'),(402,'DIRECT','留宿申请已开放','UI holiday 1792032845814；申请截止：2026-12-20T23:59','2026-10-15 10:54:06',NULL,'2026-10-15 10:54:06','2026-10-15 10:54:06'),(403,'DIRECT','留宿申请已提交','申请编号：22','2026-10-15 10:54:06',NULL,'2026-10-15 10:54:06','2026-10-15 10:54:06'),(404,'DIRECT','留宿审核结果','留宿申请已通过','2026-10-15 10:54:06',NULL,'2026-10-15 10:54:06','2026-10-15 10:54:06'),(405,'DIRECT','Role message 1792032846556','All students receive this announcement.','2026-10-15 10:54:06',4,'2026-10-15 10:54:07','2026-10-15 10:54:12'),(507,'DIRECT','报修待审核','WXcbeb63f62da64631a588','2026-10-15 11:01:02',NULL,'2026-10-15 11:01:02','2026-10-15 11:01:02'),(508,'DIRECT','报修进度','WXcbeb63f62da64631a588：审核通过','2026-10-15 11:01:02',NULL,'2026-10-15 11:01:02','2026-10-15 11:01:02'),(509,'DIRECT','新的维修派单','WXcbeb63f62da64631a588','2026-10-15 11:01:02',NULL,'2026-10-15 11:01:02','2026-10-15 11:01:02'),(510,'DIRECT','报修进度','WXcbeb63f62da64631a588：维修人员已接单','2026-10-15 11:01:02',NULL,'2026-10-15 11:01:02','2026-10-15 11:01:02'),(511,'DIRECT','报修进度','WXcbeb63f62da64631a588：维修完成，请确认或申请重修','2026-10-15 11:01:02',NULL,'2026-10-15 11:01:02','2026-10-15 11:01:02'),(512,'DIRECT','报修进度','WXcbeb63f62da64631a588：已确认维修，可提交评价','2026-10-15 11:01:03',NULL,'2026-10-15 11:01:03','2026-10-15 11:01:03'),(513,'DIRECT','收到维修评价','WXcbeb63f62da64631a588：5分','2026-10-15 11:01:03',NULL,'2026-10-15 11:01:03','2026-10-15 11:01:03'),(514,'DIRECT','留宿申请已开放','UI holiday 1792033263418；申请截止：2026-12-20T23:59','2026-10-15 11:01:03',NULL,'2026-10-15 11:01:03','2026-10-15 11:01:03'),(515,'DIRECT','留宿申请已提交','申请编号：29','2026-10-15 11:01:03',NULL,'2026-10-15 11:01:03','2026-10-15 11:01:03'),(516,'DIRECT','留宿审核结果','留宿申请已通过','2026-10-15 11:01:03',NULL,'2026-10-15 11:01:03','2026-10-15 11:01:03'),(517,'DIRECT','Role message 1792033264133','All students receive this announcement.','2026-10-15 11:01:04',4,'2026-10-15 11:01:04','2026-10-15 11:01:04'),(625,'DIRECT','报修待审核','WX1010f34a7ceb40c6960b','2026-10-15 11:16:28',NULL,'2026-10-15 11:16:28','2026-10-15 11:16:28'),(626,'DIRECT','报修进度','WX1010f34a7ceb40c6960b：审核通过','2026-10-15 11:16:28',NULL,'2026-10-15 11:16:28','2026-10-15 11:16:28'),(627,'DIRECT','新的维修派单','WX1010f34a7ceb40c6960b','2026-10-15 11:16:28',NULL,'2026-10-15 11:16:28','2026-10-15 11:16:28'),(628,'DIRECT','报修进度','WX1010f34a7ceb40c6960b：维修人员已接单','2026-10-15 11:16:28',NULL,'2026-10-15 11:16:28','2026-10-15 11:16:28'),(629,'DIRECT','报修进度','WX1010f34a7ceb40c6960b：维修完成，请确认或申请重修','2026-10-15 11:16:28',NULL,'2026-10-15 11:16:28','2026-10-15 11:16:28'),(630,'DIRECT','报修进度','WX1010f34a7ceb40c6960b：已确认维修，可提交评价','2026-10-15 11:16:29',NULL,'2026-10-15 11:16:29','2026-10-15 11:16:29'),(631,'DIRECT','收到维修评价','WX1010f34a7ceb40c6960b：5分','2026-10-15 11:16:29',NULL,'2026-10-15 11:16:29','2026-10-15 11:16:29'),(632,'DIRECT','留宿申请已开放','UI holiday 1792034189267；申请截止：2026-12-20T23:59','2026-10-15 11:16:29',NULL,'2026-10-15 11:16:29','2026-10-15 11:16:29'),(633,'DIRECT','留宿申请已提交','申请编号：38','2026-10-15 11:16:29',NULL,'2026-10-15 11:16:29','2026-10-15 11:16:29'),(634,'DIRECT','留宿审核结果','留宿申请已通过','2026-10-15 11:16:29',NULL,'2026-10-15 11:16:29','2026-10-15 11:16:29'),(635,'DIRECT','Role message 1792034190002','All students receive this announcement.','2026-10-15 11:16:30',4,'2026-10-15 11:16:30','2026-10-15 11:16:30');
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
  KEY `student_user_id` (`student_user_id`),
  KEY `idx_stay_building_status` (`building_id`,`current_status`),
  CONSTRAINT `stay_application_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `stay_batch` (`batch_id`),
  CONSTRAINT `stay_application_ibfk_2` FOREIGN KEY (`student_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_application`
--

LOCK TABLES `stay_application` WRITE;
/*!40000 ALTER TABLE `stay_application` DISABLE KEYS */;
INSERT INTO `stay_application` VALUES (7,8,1,'APPROVED','','2026-10-15 10:13:32','2026-10-15 10:13:32',2,'2026-10-15 10:13:32',1,'NORMAL',NULL,NULL,NULL),(8,9,1,'APPROVED','','2026-10-15 10:15:57','2026-10-15 10:15:58',2,'2026-10-15 10:15:58',1,'NORMAL',NULL,NULL,NULL),(9,10,1,'APPROVED','','2026-10-15 10:17:13','2026-10-15 10:17:13',2,'2026-10-15 10:17:13',1,'NORMAL',NULL,NULL,NULL),(22,23,1,'APPROVED','','2026-10-15 10:54:06','2026-10-15 10:54:06',2,'2026-10-15 10:54:06',1,'NORMAL',NULL,NULL,NULL),(29,30,1,'APPROVED','','2026-10-15 11:01:03','2026-10-15 11:01:03',2,'2026-10-15 11:01:03',1,'NORMAL',NULL,NULL,NULL),(38,39,1,'APPROVED','','2026-10-15 11:16:29','2026-10-15 11:16:29',2,'2026-10-15 11:16:29',1,'NORMAL',NULL,NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_batch`
--

LOCK TABLES `stay_batch` WRITE;
/*!40000 ALTER TABLE `stay_batch` DISABLE KEYS */;
INSERT INTO `stay_batch` VALUES (1,'WINTER-2026','2026 寒假留宿','2027-01-10','2027-02-20','2026-12-20 23:59:59','请按连续开放区间填写留宿日期，提交后等待宿管审核。','OPEN'),(8,'UI-1792030412111','UI holiday 1792030412111','2027-01-01','2027-03-01','2027-01-01 00:00:00','UI acceptance holiday','OPEN'),(9,'UI-1792030557621','UI holiday 1792030557621','2027-01-01','2027-03-01','2027-01-01 00:00:00','UI acceptance holiday','OPEN'),(10,'UI-1792030633177','UI holiday 1792030633177','2027-01-01','2027-03-01','2027-01-01 00:00:00','UI acceptance holiday','OPEN'),(23,'UI-1792032845814','UI holiday 1792032845814','2027-01-01','2027-03-01','2027-01-01 00:00:00','UI acceptance holiday','OPEN'),(30,'UI-1792033263418','UI holiday 1792033263418','2027-01-01','2027-03-01','2027-01-01 00:00:00','UI acceptance holiday','OPEN'),(39,'UI-1792034189267','UI holiday 1792034189267','2027-01-01','2027-03-01','2027-01-01 00:00:00','UI acceptance holiday','OPEN');
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
INSERT INTO `stay_building_rule` VALUES (1,1,'2026-12-20 23:59:59',1,'2026-10-15 09:48:25'),(1,2,'2026-12-20 23:59:59',1,'2026-10-15 09:48:25'),(1,3,'2026-12-20 23:59:59',1,'2026-10-15 09:48:25'),(8,1,'2026-12-20 23:59:00',1,'2026-10-15 10:13:32'),(9,1,'2026-12-20 23:59:00',1,'2026-10-15 10:15:57'),(10,1,'2026-12-20 23:59:00',1,'2026-10-15 10:17:13'),(23,1,'2026-12-20 23:59:00',1,'2026-10-15 10:54:06'),(30,1,'2026-12-20 23:59:00',1,'2026-10-15 11:01:03'),(39,1,'2026-12-20 23:59:00',1,'2026-10-15 11:16:29');
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
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_date_range`
--

LOCK TABLES `stay_date_range` WRITE;
/*!40000 ALTER TABLE `stay_date_range` DISABLE KEYS */;
INSERT INTO `stay_date_range` VALUES (21,11,'2027-01-05','2027-01-10'),(22,12,'2027-01-05','2027-01-10'),(23,13,'2027-01-05','2027-01-10'),(62,32,'2027-01-05','2027-01-10'),(82,42,'2027-01-05','2027-01-10'),(106,54,'2027-01-05','2027-01-10');
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
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_review`
--

LOCK TABLES `stay_review` WRITE;
/*!40000 ALTER TABLE `stay_review` DISABLE KEYS */;
INSERT INTO `stay_review` VALUES (9,7,11,2,'APPROVED','','2026-10-15 10:13:32'),(10,8,12,2,'APPROVED','','2026-10-15 10:15:58'),(11,9,13,2,'APPROVED','','2026-10-15 10:17:13'),(24,22,32,2,'APPROVED','','2026-10-15 10:54:06'),(31,29,42,2,'APPROVED','','2026-10-15 11:01:03'),(40,38,54,2,'APPROVED','','2026-10-15 11:16:29');
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
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_version`
--

LOCK TABLES `stay_version` WRITE;
/*!40000 ALTER TABLE `stay_version` DISABLE KEYS */;
INSERT INTO `stay_version` VALUES (11,7,'Study on campus.','2026-10-15 10:13:32','2026-10-15 10:13:32'),(12,8,'Study on campus.','2026-10-15 10:15:57','2026-10-15 10:15:57'),(13,9,'Study on campus.','2026-10-15 10:17:13','2026-10-15 10:17:13'),(32,22,'Study on campus.','2026-10-15 10:54:06','2026-10-15 10:54:06'),(42,29,'Study on campus.','2026-10-15 11:01:03','2026-10-15 11:01:03'),(54,38,'Study on campus.','2026-10-15 11:16:29','2026-10-15 11:16:29');
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
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_user`
--

LOCK TABLES `sys_user` WRITE;
/*!40000 ALTER TABLE `sys_user` DISABLE KEYS */;
INSERT INTO `sys_user` VALUES (1,'student1','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','张三','13800000001','STUDENT',1,'2026-10-15 09:48:24','2026-10-15 09:54:42'),(2,'manager1','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','李老师','13800000002','DORM_MANAGER',1,'2026-10-15 09:48:24','2026-10-15 09:54:42'),(3,'repair1','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','王师傅','13800000003','REPAIRER',1,'2026-10-15 09:48:24','2026-10-15 09:54:42'),(4,'admin','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','系统管理员','13800000004','ADMIN',1,'2026-10-15 09:48:24','2026-10-15 09:54:42'),(33,'ui-student-1792033266068','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','UI Student','','STUDENT',1,'2026-10-15 11:01:07','2026-10-15 11:01:07'),(43,'ui-student-1792034191424','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','UI Student','','STUDENT',1,'2026-10-15 11:16:32','2026-10-15 11:16:32');
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

-- Dump completed on 2026-10-15 11:16:38
