-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: dorm_platform
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
  `student_id` bigint NOT NULL,
  `bed_id` bigint NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date DEFAULT NULL,
  `assignment_type` varchar(20) NOT NULL DEFAULT 'INITIAL',
  PRIMARY KEY (`assignment_id`),
  KEY `bed_id` (`bed_id`),
  KEY `fk_accommodation_assignment_student` (`student_id`),
  CONSTRAINT `accommodation_assignment_ibfk_2` FOREIGN KEY (`bed_id`) REFERENCES `bed` (`bed_id`),
  CONSTRAINT `fk_accommodation_assignment_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accommodation_assignment`
--

LOCK TABLES `accommodation_assignment` WRITE;
/*!40000 ALTER TABLE `accommodation_assignment` DISABLE KEYS */;
INSERT INTO `accommodation_assignment` (`assignment_id`, `student_id`, `bed_id`, `check_in_date`, `check_out_date`, `assignment_type`) VALUES (1,1,1,'2026-09-01','2026-10-29','INITIAL'),(2,5,2,'2026-10-29',NULL,'ASSIGN'),(3,6,3,'2026-10-29','2026-10-30','ASSIGN'),(4,1,4,'2026-10-29','2026-10-29','ASSIGN'),(5,1,1,'2026-10-29','2026-10-30','ASSIGN'),(6,7,9,'2026-10-30',NULL,'ASSIGN'),(7,8,6,'2026-10-30',NULL,'ASSIGN'),(8,1,20,'2026-10-30',NULL,'ASSIGN'),(9,6,31,'2026-10-30',NULL,'ASSIGN');
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
  KEY `fk_backup_task_person` (`initiated_by_user_id`),
  CONSTRAINT `fk_backup_task_person` FOREIGN KEY (`initiated_by_user_id`) REFERENCES `person` (`person_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_task`
--

LOCK TABLES `backup_task` WRITE;
/*!40000 ALTER TABLE `backup_task` DISABLE KEYS */;
INSERT INTO `backup_task` (`task_id`, `initiated_by_user_id`, `task_type`, `task_status`, `created_at`, `started_at`, `finished_at`, `result_description`) VALUES (1,4,'BACKUP','SUCCESS','2026-10-15 19:59:15','2026-10-15 19:59:16','2026-10-15 19:59:16',NULL),(2,4,'BACKUP','SUCCESS','2026-10-15 19:59:20','2026-10-15 19:59:22','2026-10-15 19:59:23',NULL);
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
INSERT INTO `backup_task_file` (`task_id`, `file_id`, `file_purpose`) VALUES (1,1,'BACKUP_OUTPUT'),(2,2,'BACKUP_OUTPUT');
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
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bed`
--

LOCK TABLES `bed` WRITE;
/*!40000 ALTER TABLE `bed` DISABLE KEYS */;
INSERT INTO `bed` (`bed_id`, `room_id`, `bed_no`, `management_status`) VALUES (1,1,'A','AVAILABLE'),(2,1,'B','AVAILABLE'),(3,1,'C','AVAILABLE'),(4,1,'D','AVAILABLE'),(5,2,'A','AVAILABLE'),(6,2,'B','AVAILABLE'),(7,3,'A','AVAILABLE'),(8,3,'B','AVAILABLE'),(9,4,'A','AVAILABLE'),(10,5,'A','AVAILABLE'),(11,6,'A','AVAILABLE'),(12,7,'A','AVAILABLE'),(13,8,'A','AVAILABLE'),(14,9,'A','AVAILABLE'),(15,10,'A','AVAILABLE'),(16,11,'A','AVAILABLE'),(17,12,'A','AVAILABLE'),(18,13,'A','AVAILABLE'),(19,5,'B','AVAILABLE'),(20,6,'B','AVAILABLE'),(21,7,'B','AVAILABLE'),(22,8,'B','AVAILABLE'),(23,9,'B','AVAILABLE'),(24,10,'B','AVAILABLE'),(25,11,'B','AVAILABLE'),(26,12,'B','AVAILABLE'),(27,13,'B','AVAILABLE'),(28,5,'C','AVAILABLE'),(29,6,'C','AVAILABLE'),(30,7,'C','AVAILABLE'),(31,8,'C','AVAILABLE'),(32,9,'C','AVAILABLE'),(33,10,'C','AVAILABLE'),(34,11,'C','AVAILABLE'),(35,12,'C','AVAILABLE'),(36,13,'C','AVAILABLE'),(37,5,'D','AVAILABLE'),(38,6,'D','AVAILABLE'),(39,7,'D','AVAILABLE'),(40,8,'D','AVAILABLE'),(41,9,'D','AVAILABLE'),(42,10,'D','AVAILABLE'),(43,11,'D','AVAILABLE'),(44,12,'D','AVAILABLE'),(45,13,'D','AVAILABLE');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `building`
--

LOCK TABLES `building` WRITE;
/*!40000 ALTER TABLE `building` DISABLE KEYS */;
INSERT INTO `building` (`building_id`, `building_code`, `building_name`, `address`, `gender_limit`, `usage_status`) VALUES (1,'A-01','知行一号楼','东区宿舍组团 1 号','男生','IN_USE'),(2,'B-02','知行二号楼','东区宿舍组团 2 号','女生','IN_USE'),(3,'C-03','明德三号楼','西区宿舍组团 3 号','混合','IN_USE'),(4,'D-04','明德四号楼','西区宿舍组团 4 号','男生','IN_USE'),(5,'E-05','博雅五号楼','南区宿舍组团 5 号','女生','IN_USE'),(6,'F-06','博雅六号楼','南区宿舍组团 6 号','混合','IN_USE');
/*!40000 ALTER TABLE `building` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department` (
  `department_id` bigint NOT NULL AUTO_INCREMENT,
  `department_code` varchar(40) NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uk_department_code` (`department_code`),
  CONSTRAINT `chk_department_enabled` CHECK ((`enabled` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department`
--

LOCK TABLES `department` WRITE;
/*!40000 ALTER TABLE `department` DISABLE KEYS */;
INSERT INTO `department` (`department_id`, `department_code`, `department_name`, `enabled`, `created_at`, `updated_at`) VALUES (1,'ENG','工程学院',1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(2,'SCI','理学院',1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(3,'MGT','管理学院',1,'2026-10-29 19:53:36','2026-10-29 19:53:36');
/*!40000 ALTER TABLE `department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dorm_manager_profile`
--

DROP TABLE IF EXISTS `dorm_manager_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dorm_manager_profile` (
  `manager_user_id` bigint NOT NULL,
  `login_account` varchar(60) NOT NULL,
  `password_hash` char(64) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `employee_no` char(8) NOT NULL,
  `manager_name` varchar(80) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `on_duty` tinyint NOT NULL DEFAULT '1',
  `remark` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`manager_user_id`),
  UNIQUE KEY `uk_dorm_manager_login_account` (`login_account`),
  UNIQUE KEY `uk_dorm_manager_employee_no` (`employee_no`),
  CONSTRAINT `fk_dorm_manager_person` FOREIGN KEY (`manager_user_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `chk_dorm_manager_employee_no_format` CHECK (regexp_like(`employee_no`,_utf8mb4'^DM[0-9]{6}$')),
  CONSTRAINT `chk_dorm_manager_enabled` CHECK ((`enabled` in (0,1))),
  CONSTRAINT `chk_dorm_manager_gender` CHECK (((`gender` is null) or (`gender` in (_utf8mb4'MALE',_utf8mb4'FEMALE',_utf8mb4'OTHER')))),
  CONSTRAINT `chk_dorm_manager_on_duty` CHECK ((`on_duty` in (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dorm_manager_profile`
--

LOCK TABLES `dorm_manager_profile` WRITE;
/*!40000 ALTER TABLE `dorm_manager_profile` DISABLE KEYS */;
INSERT INTO `dorm_manager_profile` (`manager_user_id`, `login_account`, `password_hash`, `phone`, `enabled`, `employee_no`, `manager_name`, `gender`, `birth_date`, `hire_date`, `on_duty`, `remark`, `created_at`, `updated_at`) VALUES (2,'manager1','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13700000001',1,'DM000001','李老师1','FEMALE','1985-05-12','2018-09-01',1,NULL,'2026-10-15 07:58:05','2026-10-30 11:20:47'),(10,'manager2','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000003',1,'DM000002','李老师2','FEMALE','1979-10-16','2025-09-30',1,NULL,'2026-10-30 09:49:32','2026-10-30 11:20:47'),(14,'manager3','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000012',1,'DM000003','周老师','FEMALE','1987-03-15','2020-09-01',1,NULL,'2026-10-30 10:41:14','2026-10-30 11:20:47'),(15,'manager4','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000013',1,'DM000004','陈老师','FEMALE','1986-07-20','2021-09-01',1,NULL,'2026-10-30 10:41:14','2026-10-30 11:20:47');
/*!40000 ALTER TABLE `dorm_manager_profile` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dorm_room`
--

LOCK TABLES `dorm_room` WRITE;
/*!40000 ALTER TABLE `dorm_room` DISABLE KEYS */;
INSERT INTO `dorm_room` (`room_id`, `building_id`, `room_no`, `floor_no`, `design_capacity`, `usage_status`) VALUES (1,1,'203',2,4,'IN_USE'),(2,1,'204',2,4,'IN_USE'),(3,2,'406',4,4,'IN_USE'),(4,3,'108',1,6,'IN_USE'),(5,4,'101',1,4,'IN_USE'),(6,4,'102',1,4,'IN_USE'),(7,4,'201',2,4,'IN_USE'),(8,5,'301',3,4,'IN_USE'),(9,5,'302',3,4,'IN_USE'),(10,5,'401',4,4,'IN_USE'),(11,6,'101',1,4,'IN_USE'),(12,6,'201',2,4,'IN_USE'),(13,6,'301',3,4,'IN_USE');
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
INSERT INTO `fault_category` (`category_id`, `work_type_id`, `category_name`, `enabled`) VALUES (1,1,'水龙头漏水',1),(2,2,'插座无电',1),(3,2,'灯具故障',1),(4,3,'门锁损坏',1),(5,3,'家具损坏',1);
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
  KEY `fk_file_resource_person` (`uploader_user_id`),
  CONSTRAINT `fk_file_resource_person` FOREIGN KEY (`uploader_user_id`) REFERENCES `person` (`person_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `file_resource`
--

LOCK TABLES `file_resource` WRITE;
/*!40000 ALTER TABLE `file_resource` DISABLE KEYS */;
INSERT INTO `file_resource` (`file_id`, `uploader_user_id`, `original_name`, `storage_name`, `content_type`, `size_bytes`, `created_at`) VALUES (1,4,'dorm-backup.sql','3bc51ef5-9ea4-4c7a-b727-43771b20578b','application/sql',62055,'2026-10-15 19:59:16'),(2,4,'dorm-backup.sql','c47c45a9-2b35-47c3-b5a8-5d3695a52950','application/sql',62441,'2026-10-15 19:59:23');
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
  KEY `fk_import_export_task_person` (`initiated_by_user_id`),
  CONSTRAINT `fk_import_export_task_person` FOREIGN KEY (`initiated_by_user_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `import_export_task_chk_1` CHECK ((`task_type` in (_utf8mb4'IMPORT',_utf8mb4'EXPORT'))),
  CONSTRAINT `import_export_task_chk_2` CHECK ((`task_status` in (_utf8mb4'WAITING',_utf8mb4'RUNNING',_utf8mb4'SUCCESS',_utf8mb4'FAILED',_utf8mb4'CANCELLED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_export_task`
--

LOCK TABLES `import_export_task` WRITE;
/*!40000 ALTER TABLE `import_export_task` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_log`
--

LOCK TABLES `login_log` WRITE;
/*!40000 ALTER TABLE `login_log` DISABLE KEYS */;
INSERT INTO `login_log` (`log_id`, `user_id`, `account`, `success`, `occurred_at`) VALUES (1,1,'student1',1,'2026-10-15 11:22:04'),(2,2,'manager1',1,'2026-10-15 11:22:04'),(3,3,'repair1',1,'2026-10-15 11:22:04'),(4,4,'admin',1,'2026-10-15 11:22:04'),(5,NULL,'13800138000',0,'2026-10-15 11:23:17'),(6,1,'student1',1,'2026-10-15 11:31:20'),(7,2,'manager1',1,'2026-10-15 12:00:07'),(8,3,'repair1',1,'2026-10-15 12:01:43'),(9,4,'admin',1,'2026-10-15 12:02:38'),(10,4,'admin',1,'2026-10-15 12:53:38'),(11,4,'admin',1,'2026-10-15 13:01:53'),(12,3,'repair1',1,'2026-10-15 13:10:56'),(13,3,'repair1',1,'2026-10-15 13:11:15'),(14,1,'student1',1,'2026-10-15 13:14:08'),(15,2,'manager1',1,'2026-10-15 13:14:09'),(16,NULL,'repair1',0,'2026-10-15 13:14:09'),(17,4,'admin',1,'2026-10-15 13:14:55'),(18,1,'student1',1,'2026-10-15 13:17:22'),(19,1,'student1',1,'2026-10-15 15:16:54'),(20,1,'student1',1,'2026-10-15 15:18:54'),(21,NULL,'repair1',0,'2026-10-15 16:02:48'),(22,3,'repair1',1,'2026-10-15 16:02:55'),(23,4,'admin',1,'2026-10-15 16:03:26'),(24,3,'repair1',1,'2026-10-15 16:03:54'),(25,3,'repair1',1,'2026-10-15 19:58:58'),(26,4,'admin',1,'2026-10-15 19:59:08'),(27,1,'student1',1,'2026-10-15 19:59:51'),(28,2,'manager1',1,'2026-10-15 20:01:00'),(29,3,'repair1',1,'2026-10-15 20:01:42'),(30,2,'manager1',1,'2026-10-15 20:02:24'),(31,2,'manager1',1,'2026-10-16 15:00:33'),(32,3,'repair1',1,'2026-10-16 15:17:13'),(33,3,'repair1',1,'2026-10-29 14:47:44'),(34,NULL,'manager1',0,'2026-10-29 14:53:04'),(35,NULL,'repair1',0,'2026-10-29 14:53:20'),(36,2,'manager1',1,'2026-10-29 14:53:53'),(37,4,'admin',1,'2026-10-29 14:54:15'),(38,3,'repair1',1,'2026-10-29 15:48:29'),(39,1,'student1',1,'2026-10-29 15:48:58'),(40,2,'manager1',1,'2026-10-29 15:49:30'),(41,4,'admin',1,'2026-10-29 16:55:24'),(42,4,'admin',1,'2026-10-29 16:55:43'),(43,4,'admin',1,'2026-10-29 19:05:17'),(44,4,'admin',1,'2026-10-29 19:06:24'),(45,4,'admin',1,'2026-10-29 19:07:00'),(46,4,'admin',1,'2026-10-29 19:07:41'),(47,4,'admin',1,'2026-10-29 19:08:24'),(48,4,'admin',1,'2026-10-29 19:08:59'),(49,4,'admin',1,'2026-10-29 19:09:38'),(50,4,'admin',1,'2026-10-29 19:10:07'),(51,4,'admin',1,'2026-10-29 19:10:29'),(52,4,'admin',1,'2026-10-29 19:10:52'),(53,4,'admin',1,'2026-10-29 19:14:57'),(54,4,'admin',1,'2026-10-29 19:15:31'),(55,4,'admin',1,'2026-10-29 19:16:18'),(56,NULL,'repair1',0,'2026-10-29 19:18:13'),(57,4,'admin',1,'2026-10-29 19:18:40'),(58,4,'admin',1,'2026-10-29 20:00:06'),(59,4,'admin',1,'2026-10-29 20:00:18'),(60,1,'student1',1,'2026-10-29 20:00:32'),(61,4,'admin',1,'2026-10-29 20:01:28'),(62,1,'student1',1,'2026-10-29 20:01:28'),(63,4,'admin',1,'2026-10-29 20:02:18'),(64,1,'student1',1,'2026-10-29 20:02:19'),(65,2,'manager1',1,'2026-10-29 20:02:19'),(66,NULL,'repair1',0,'2026-10-29 20:02:19'),(67,4,'admin',1,'2026-10-29 20:03:29'),(68,1,'student1',1,'2026-10-29 20:03:29'),(69,2,'manager1',1,'2026-10-29 20:03:29'),(70,NULL,'repair1',0,'2026-10-29 20:03:29'),(71,4,'admin',1,'2026-10-29 20:05:00'),(72,4,'admin',1,'2026-10-29 20:05:01'),(73,1,'student1',1,'2026-10-29 20:05:02'),(74,2,'manager1',1,'2026-10-29 20:05:03'),(75,3,'repair1',1,'2026-10-29 20:05:04'),(76,4,'admin',1,'2026-10-29 20:09:12'),(77,1,'student1',1,'2026-10-29 20:09:12'),(78,2,'manager1',1,'2026-10-29 20:09:12'),(79,3,'repair1',1,'2026-10-29 20:09:12'),(80,4,'admin',1,'2026-10-29 20:18:56'),(81,NULL,'2024000007',0,'2026-10-30 09:15:37'),(82,NULL,'2024000007',0,'2026-10-30 09:15:37'),(83,NULL,'2024000006',0,'2026-10-30 09:15:41'),(84,NULL,'2024000007',0,'2026-10-30 09:15:42'),(85,NULL,'2024000007',0,'2026-10-30 09:15:45'),(86,4,'admin',1,'2026-10-30 09:22:23'),(87,4,'admin',1,'2026-10-30 10:21:41'),(88,4,'admin',1,'2026-10-30 10:24:35'),(89,4,'admin',1,'2026-10-30 10:25:37'),(90,4,'admin',1,'2026-10-30 10:26:19'),(91,4,'admin',1,'2026-10-30 10:26:44'),(92,4,'admin',1,'2026-10-30 10:29:50'),(93,4,'admin',1,'2026-10-30 10:29:52'),(94,NULL,'RP000001',0,'2026-10-30 10:31:12'),(95,4,'admin',1,'2026-10-30 10:31:20'),(96,4,'admin',1,'2026-10-30 10:43:53'),(97,18,'student9',1,'2026-10-30 10:45:57'),(98,14,'manager3',1,'2026-10-30 10:45:57'),(99,16,'repair3',1,'2026-10-30 10:45:57'),(100,4,'admin',1,'2026-10-30 10:45:59'),(101,4,'admin',1,'2026-10-30 11:12:58');
/*!40000 ALTER TABLE `login_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `major`
--

DROP TABLE IF EXISTS `major`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `major` (
  `major_id` bigint NOT NULL AUTO_INCREMENT,
  `department_id` bigint NOT NULL,
  `major_code` varchar(40) NOT NULL,
  `major_name` varchar(100) NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`major_id`),
  UNIQUE KEY `uk_major_code` (`major_code`),
  KEY `idx_major_department` (`department_id`),
  CONSTRAINT `fk_major_department` FOREIGN KEY (`department_id`) REFERENCES `department` (`department_id`),
  CONSTRAINT `chk_major_enabled` CHECK ((`enabled` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `major`
--

LOCK TABLES `major` WRITE;
/*!40000 ALTER TABLE `major` DISABLE KEYS */;
INSERT INTO `major` (`major_id`, `department_id`, `major_code`, `major_name`, `enabled`, `created_at`, `updated_at`) VALUES (1,1,'SOFT','软件工程',1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(2,1,'IOT','物联网工程',1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(3,3,'BIZ','工商管理',1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(4,2,'MATH','数学与应用数学',1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(5,2,'CHEM','应用化学',1,'2026-10-29 19:53:36','2026-10-29 19:53:36');
/*!40000 ALTER TABLE `major` ENABLE KEYS */;
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
  PRIMARY KEY (`manager_user_id`),
  UNIQUE KEY `uq_manager_building_scope_building` (`building_id`),
  CONSTRAINT `fk_manager_scope_profile` FOREIGN KEY (`manager_user_id`) REFERENCES `dorm_manager_profile` (`manager_user_id`),
  CONSTRAINT `manager_building_scope_ibfk_2` FOREIGN KEY (`building_id`) REFERENCES `building` (`building_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `manager_building_scope`
--

LOCK TABLES `manager_building_scope` WRITE;
/*!40000 ALTER TABLE `manager_building_scope` DISABLE KEYS */;
INSERT INTO `manager_building_scope` (`manager_user_id`, `building_id`) VALUES (2,1),(10,2),(14,4),(15,5);
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
  KEY `fk_message_receipt_person` (`user_id`),
  CONSTRAINT `fk_message_receipt_person` FOREIGN KEY (`user_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `message_receipt_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `site_message` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_receipt`
--

LOCK TABLES `message_receipt` WRITE;
/*!40000 ALTER TABLE `message_receipt` DISABLE KEYS */;
INSERT INTO `message_receipt` (`message_id`, `user_id`, `read_at`) VALUES (1,1,NULL),(1,2,NULL),(1,3,NULL),(1,4,'2026-10-15 12:53:44'),(2,1,NULL),(3,2,NULL),(4,3,NULL),(5,2,NULL),(6,1,NULL),(7,1,NULL),(7,2,NULL),(7,3,NULL),(7,4,NULL),(8,1,NULL),(9,3,NULL),(10,2,NULL),(11,2,NULL),(12,3,NULL),(13,1,NULL);
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
  KEY `fk_message_target_person` (`user_id`),
  CONSTRAINT `fk_message_target_person` FOREIGN KEY (`user_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `message_target_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `site_message` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_target`
--

LOCK TABLES `message_target` WRITE;
/*!40000 ALTER TABLE `message_target` DISABLE KEYS */;
INSERT INTO `message_target` (`message_id`, `user_id`) VALUES (7,1),(5,2),(7,2),(7,3),(7,4);
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
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operation_log`
--

LOCK TABLES `operation_log` WRITE;
/*!40000 ALTER TABLE `operation_log` DISABLE KEYS */;
INSERT INTO `operation_log` (`log_id`, `operator_user_id`, `module`, `action`, `business_id`, `result`, `occurred_at`) VALUES (1,4,'notice','publish',5,'SUCCESS','2026-10-15 12:54:19'),(2,4,'stay','supplement',2,'SUCCESS','2026-10-15 12:59:04'),(3,4,'stay','review',2,'SUCCESS','2026-10-15 12:59:23'),(4,3,'auth','password',3,'SUCCESS','2026-10-15 13:11:11'),(5,4,'notice','publish',7,'SUCCESS','2026-10-15 16:03:45'),(6,4,'system','database_backup',0,'SUCCESS','2026-10-15 19:59:16'),(7,4,'system','database_backup',0,'SUCCESS','2026-10-15 19:59:23'),(8,2,'repair','review',1,'SUCCESS','2026-10-15 20:01:27'),(9,3,'repair','reject',1,'SUCCESS','2026-10-15 20:02:14'),(10,4,'auth','disable',1,'SUCCESS','2026-10-29 14:58:40'),(11,4,'auth','enable',1,'SUCCESS','2026-10-29 14:58:41'),(12,4,'auth','create',5,'SUCCESS','2026-10-29 15:02:32'),(13,4,'auth','update',5,'SUCCESS','2026-10-29 15:02:48'),(14,4,'auth','create',6,'SUCCESS','2026-10-29 15:14:48'),(15,4,'dorm','assign',2,'SUCCESS','2026-10-29 15:29:44'),(16,4,'dorm','assign',3,'SUCCESS','2026-10-29 15:29:54'),(17,4,'dorm','assign',4,'SUCCESS','2026-10-29 15:59:37'),(18,4,'dorm','assign',5,'SUCCESS','2026-10-29 15:59:56'),(19,4,'auth','disable',1,'SUCCESS','2026-10-29 20:57:19'),(20,4,'auth','disable',5,'SUCCESS','2026-10-29 20:57:23'),(21,4,'dorm','manager_scope',2,'SUCCESS','2026-10-29 21:11:11'),(22,4,'repair','worker_scope',3,'SUCCESS','2026-10-29 21:14:26'),(23,4,'repair','worker_scope',3,'SUCCESS','2026-10-29 21:14:31'),(24,4,'auth','create',7,'SUCCESS','2026-10-29 22:37:49'),(25,4,'auth','enable',1,'SUCCESS','2026-10-29 22:46:40'),(26,4,'auth','update',3,'SUCCESS','2026-10-29 22:50:29'),(27,4,'repair','worker_scope',3,'SUCCESS','2026-10-29 22:50:46'),(28,4,'repair','worker_scope',3,'SUCCESS','2026-10-29 22:50:56'),(29,4,'repair','worker_scope',3,'SUCCESS','2026-10-29 22:51:04'),(30,4,'auth','update',3,'SUCCESS','2026-10-29 22:51:27'),(31,4,'auth','update',3,'SUCCESS','2026-10-29 22:51:32'),(32,4,'auth','update',2,'SUCCESS','2026-10-29 22:53:26'),(33,4,'auth','update',2,'SUCCESS','2026-10-29 22:53:34'),(34,4,'auth','update',1,'SUCCESS','2026-10-30 09:27:11'),(35,4,'auth','update',5,'SUCCESS','2026-10-30 09:27:31'),(36,4,'auth','update',6,'SUCCESS','2026-10-30 09:27:57'),(37,4,'dorm','assign',6,'SUCCESS','2026-10-30 09:28:52'),(38,4,'auth','update',7,'SUCCESS','2026-10-30 09:29:05'),(39,4,'auth','update',7,'SUCCESS','2026-10-30 09:35:14'),(40,4,'auth','create',8,'SUCCESS','2026-10-30 09:35:44'),(41,4,'auth','create',9,'SUCCESS','2026-10-30 09:36:20'),(42,4,'auth','update',8,'SUCCESS','2026-10-30 09:36:37'),(43,4,'dorm','assign',7,'SUCCESS','2026-10-30 09:37:14'),(44,4,'dorm','manager_scope',2,'SUCCESS','2026-10-30 09:48:43'),(45,4,'auth','update',2,'SUCCESS','2026-10-30 09:48:43'),(46,4,'dorm','manager_scope',10,'SUCCESS','2026-10-30 09:49:32'),(47,4,'auth','create',10,'SUCCESS','2026-10-30 09:49:32'),(48,4,'dorm','manager_scope',10,'SUCCESS','2026-10-30 09:50:24'),(49,4,'auth','update',10,'SUCCESS','2026-10-30 09:50:24'),(50,4,'dorm','manager_scope',2,'SUCCESS','2026-10-30 09:50:47'),(51,4,'repair','worker_scope',3,'SUCCESS','2026-10-30 09:56:09'),(52,4,'auth','update',3,'SUCCESS','2026-10-30 09:56:09'),(53,4,'repair','worker_scope',11,'SUCCESS','2026-10-30 09:58:38'),(54,4,'auth','create',11,'SUCCESS','2026-10-30 09:58:38'),(55,4,'repair','worker_scope',3,'SUCCESS','2026-10-30 09:58:46'),(56,4,'auth','update',3,'SUCCESS','2026-10-30 09:58:46'),(57,4,'auth','create',12,'SUCCESS','2026-10-30 10:33:51'),(58,4,'auth','create',13,'SUCCESS','2026-10-30 10:36:20'),(59,4,'dorm','assign',8,'SUCCESS','2026-10-30 10:44:54'),(60,4,'dorm','buildings',1,'SUCCESS','2026-10-30 11:00:09'),(61,4,'dorm','buildings',1,'SUCCESS','2026-10-30 11:00:13'),(62,4,'dorm','assign',9,'SUCCESS','2026-10-30 11:27:28'),(63,4,'repair','worker_scope',17,'SUCCESS','2026-10-30 11:34:08');
/*!40000 ALTER TABLE `operation_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `person`
--

DROP TABLE IF EXISTS `person`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `person` (
  `person_id` bigint NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`person_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `person`
--

LOCK TABLES `person` WRITE;
/*!40000 ALTER TABLE `person` DISABLE KEYS */;
INSERT INTO `person` (`person_id`) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19);
/*!40000 ALTER TABLE `person` ENABLE KEYS */;
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
  KEY `fk_repair_audit_person` (`reviewer_user_id`),
  CONSTRAINT `fk_repair_audit_person` FOREIGN KEY (`reviewer_user_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `repair_audit_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_audit`
--

LOCK TABLES `repair_audit` WRITE;
/*!40000 ALTER TABLE `repair_audit` DISABLE KEYS */;
INSERT INTO `repair_audit` (`audit_id`, `order_id`, `reviewer_user_id`, `result`, `reason`, `created_at`) VALUES (1,1,2,'APPROVED','','2026-10-15 20:01:27');
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
INSERT INTO `repair_confirmation` (`order_id`, `confirmation_mode`, `confirmed_at`) VALUES (3,'AUTO','2026-10-29 14:46:48');
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
  KEY `fk_repair_delay_profile` (`repairer_user_id`),
  KEY `fk_repair_delay_reviewer_person` (`reviewer_user_id`),
  CONSTRAINT `fk_repair_delay_profile` FOREIGN KEY (`repairer_user_id`) REFERENCES `repairer_profile` (`repairer_user_id`),
  CONSTRAINT `fk_repair_delay_reviewer_person` FOREIGN KEY (`reviewer_user_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `repair_delay_request_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`)
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
  KEY `order_id` (`order_id`),
  KEY `idx_dispatch_worker_status` (`repairer_user_id`,`dispatch_status`),
  CONSTRAINT `fk_repair_dispatch_profile` FOREIGN KEY (`repairer_user_id`) REFERENCES `repairer_profile` (`repairer_user_id`),
  CONSTRAINT `repair_dispatch_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_dispatch`
--

LOCK TABLES `repair_dispatch` WRITE;
/*!40000 ALTER TABLE `repair_dispatch` DISABLE KEYS */;
INSERT INTO `repair_dispatch` (`dispatch_id`, `order_id`, `repairer_user_id`, `dispatch_mode`, `dispatch_status`, `decision_reason`, `created_at`, `decided_at`, `accept_deadline`, `repair_deadline`) VALUES (1,2,3,'MANUAL','REPAIR_TIMEOUT',NULL,'2026-10-15 07:58:05',NULL,'2026-10-15 09:58:05','2026-10-16 07:58:05'),(2,3,3,'AUTO','ACCEPTED',NULL,'2026-10-15 07:58:05',NULL,'2026-10-15 09:58:05','2026-10-16 07:58:05'),(3,1,3,'AUTO','REJECTED','不想干','2026-10-15 20:01:27','2026-10-15 20:02:14','2026-10-15 22:01:27',NULL);
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
  `score` int NOT NULL,
  `comment` varchar(1000) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`evaluation_id`),
  UNIQUE KEY `order_id` (`order_id`),
  CONSTRAINT `repair_evaluation_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_evaluation`
--

LOCK TABLES `repair_evaluation` WRITE;
/*!40000 ALTER TABLE `repair_evaluation` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_exception`
--

LOCK TABLES `repair_exception` WRITE;
/*!40000 ALTER TABLE `repair_exception` DISABLE KEYS */;
INSERT INTO `repair_exception` (`exception_id`, `order_id`, `dispatch_id`, `exception_type`, `reason`, `created_at`) VALUES (1,2,1,'REPAIR_TIMEOUT','超过维修截止时间未完工','2026-10-16 10:37:35');
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
  `student_id` bigint NOT NULL,
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
  KEY `idx_repair_student_status` (`student_id`,`current_status`),
  CONSTRAINT `fk_repair_order_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`),
  CONSTRAINT `repair_order_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `dorm_room` (`room_id`),
  CONSTRAINT `repair_order_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `fault_category` (`category_id`),
  CONSTRAINT `repair_order_ibfk_4` FOREIGN KEY (`rule_id`) REFERENCES `repair_rule` (`rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_order`
--

LOCK TABLES `repair_order` WRITE;
/*!40000 ALTER TABLE `repair_order` DISABLE KEYS */;
INSERT INTO `repair_order` (`order_id`, `order_no`, `student_id`, `room_id`, `category_id`, `title`, `description`, `urgent`, `current_status`, `abnormal`, `reject_reason`, `created_at`, `updated_at`, `parent_order_id`, `rule_id`, `archived_at`, `archive_reason`) VALUES (1,'WX20261014001',1,1,2,'203 室北侧插座无电','床位 A 左侧插座无法使用，已确认其他插座正常。',0,'PENDING_MANUAL',0,'','2026-10-15 07:58:05','2026-10-15 20:02:14',NULL,1,NULL,NULL),(2,'WX20261013018',1,1,3,'书桌上方灯具闪烁','晚间使用时频繁闪烁，存在安全隐患。',1,'PENDING_MANUAL',1,NULL,'2026-10-15 07:58:05','2026-10-16 10:37:35',NULL,1,NULL,NULL),(3,'WX20261008007',1,1,5,'衣柜门合页松动','衣柜门下垂，开合不顺畅。',0,'ARCHIVED',0,NULL,'2026-10-15 07:58:05','2026-10-29 14:46:48',NULL,1,'2026-10-29 14:46:49',NULL);
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
  KEY `fk_repair_result_profile` (`repairer_user_id`),
  CONSTRAINT `fk_repair_result_profile` FOREIGN KEY (`repairer_user_id`) REFERENCES `repairer_profile` (`repairer_user_id`),
  CONSTRAINT `repair_result_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `repair_order` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_result`
--

LOCK TABLES `repair_result` WRITE;
/*!40000 ALTER TABLE `repair_result` DISABLE KEYS */;
INSERT INTO `repair_result` (`result_id`, `order_id`, `repairer_user_id`, `result_text`, `expected_finish_at`, `created_at`) VALUES (1,3,3,'已更换衣柜门合页，现场开合测试正常。',NULL,'2026-10-15 07:58:05');
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
INSERT INTO `repair_rule` (`rule_id`, `accept_minutes`, `normal_minutes`, `urgent_minutes`, `confirm_days`, `edit_days`, `max_rework_count`, `created_at`) VALUES (1,120,1440,360,7,7,NULL,'2026-10-15 09:28:07');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_submission_version`
--

LOCK TABLES `repair_submission_version` WRITE;
/*!40000 ALTER TABLE `repair_submission_version` DISABLE KEYS */;
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
INSERT INTO `repair_work_type` (`work_type_id`, `work_type_code`, `work_type_name`, `enabled`) VALUES (1,'WATER','水暖维修',1),(2,'ELECTRIC','电气维修',1),(3,'GENERAL','综合维修',1);
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
  CONSTRAINT `fk_repairer_building_scope_profile` FOREIGN KEY (`repairer_user_id`) REFERENCES `repairer_profile` (`repairer_user_id`),
  CONSTRAINT `repairer_building_scope_ibfk_2` FOREIGN KEY (`building_id`) REFERENCES `building` (`building_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repairer_building_scope`
--

LOCK TABLES `repairer_building_scope` WRITE;
/*!40000 ALTER TABLE `repairer_building_scope` DISABLE KEYS */;
INSERT INTO `repairer_building_scope` (`repairer_user_id`, `building_id`) VALUES (17,3),(16,4),(17,5),(16,6);
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
  `login_account` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `employee_no` char(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `repairer_name` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `on_duty` tinyint NOT NULL DEFAULT '1',
  `max_active_orders` int DEFAULT NULL,
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`repairer_user_id`),
  UNIQUE KEY `uk_repairer_login_account` (`login_account`),
  UNIQUE KEY `uk_repairer_employee_no` (`employee_no`),
  CONSTRAINT `fk_repairer_person` FOREIGN KEY (`repairer_user_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `chk_repairer_employee_no_format` CHECK (regexp_like(`employee_no`,_utf8mb4'^RP[0-9]{6}$')),
  CONSTRAINT `chk_repairer_enabled` CHECK ((`enabled` in (0,1))),
  CONSTRAINT `chk_repairer_gender` CHECK (((`gender` is null) or (`gender` in (_utf8mb4'MALE',_utf8mb4'FEMALE',_utf8mb4'OTHER'))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repairer_profile`
--

LOCK TABLES `repairer_profile` WRITE;
/*!40000 ALTER TABLE `repairer_profile` DISABLE KEYS */;
INSERT INTO `repairer_profile` (`repairer_user_id`, `login_account`, `password_hash`, `phone`, `enabled`, `employee_no`, `repairer_name`, `gender`, `birth_date`, `hire_date`, `on_duty`, `max_active_orders`, `remark`, `created_at`, `updated_at`) VALUES (3,'repair1','96cae35ce8a9b0244178bf28e4966c2ce1b8385723a96a6b838858cdd6ca0a1e','13800000001',1,'RP000001','王师傅1','MALE','1990-03-18','2019-04-01',1,NULL,NULL,'2026-10-15 07:58:05','2026-10-30 11:20:47'),(11,'repair2','96cae35ce8a9b0244178bf28e4966c2ce1b8385723a96a6b838858cdd6ca0a1e','13600000002',1,'RP000002','王师傅2','MALE','1979-10-16','2025-09-30',1,NULL,NULL,'2026-10-30 09:58:38','2026-10-30 11:20:47'),(16,'repair3','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13900000012',1,'RP000003','赵师傅','MALE','1988-02-11','2019-04-01',1,5,NULL,'2026-10-30 10:41:14','2026-10-30 11:20:47'),(17,'repair4','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13900000013',1,'RP000004','孙师傅','MALE','1989-10-08','2020-04-01',1,5,NULL,'2026-10-30 10:41:14','2026-10-30 11:20:47');
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
  CONSTRAINT `fk_repairer_work_type_profile` FOREIGN KEY (`repairer_user_id`) REFERENCES `repairer_profile` (`repairer_user_id`),
  CONSTRAINT `repairer_work_type_ibfk_2` FOREIGN KEY (`work_type_id`) REFERENCES `repair_work_type` (`work_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repairer_work_type`
--

LOCK TABLES `repairer_work_type` WRITE;
/*!40000 ALTER TABLE `repairer_work_type` DISABLE KEYS */;
INSERT INTO `repairer_work_type` (`repairer_user_id`, `work_type_id`) VALUES (16,1),(16,2),(17,2),(3,3),(17,3);
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
INSERT INTO `schema_version` (`version_no`, `installed_at`) VALUES (1,'2026-10-15 09:28:07'),(2,'2026-10-15 09:28:07'),(3,'2026-10-15 09:28:07'),(4,'2026-10-15 10:29:55'),(5,'2026-10-29 16:41:39'),(6,'2026-10-29 17:40:57'),(7,'2026-10-29 18:53:11'),(8,'2026-10-29 19:53:27'),(9,'2026-10-29 19:53:36');
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_message`
--

LOCK TABLES `site_message` WRITE;
/*!40000 ALTER TABLE `site_message` DISABLE KEYS */;
INSERT INTO `site_message` (`message_id`, `target_role`, `title`, `content`, `created_at`, `publisher_user_id`, `publish_at`, `delivered_at`) VALUES (1,'ALL','宿舍事务通知','请在对应角色工作台查看待办与业务通知。','2026-10-15 07:58:05',NULL,'2026-10-15 09:28:07','2026-10-15 07:58:05'),(2,'STUDENT','宿舍事务通知','请在对应角色工作台查看待办与业务通知。','2026-10-15 07:58:05',NULL,'2026-10-15 09:28:07','2026-10-15 07:58:05'),(3,'DORM_MANAGER','宿舍事务通知','请在对应角色工作台查看待办与业务通知。','2026-10-15 07:58:05',NULL,'2026-10-15 09:28:07','2026-10-15 07:58:05'),(4,'REPAIRER','宿舍事务通知','请在对应角色工作台查看待办与业务通知。','2026-10-15 07:58:05',NULL,'2026-10-15 09:28:07','2026-10-15 07:58:05'),(5,'DIRECT','假期留宿','暑假','2026-10-15 12:54:19',4,'2026-10-15 12:54:00','2026-10-15 12:54:19'),(6,'DIRECT','留宿审核结果','留宿申请已通过','2026-10-15 12:59:23',NULL,'2026-10-15 12:59:23','2026-10-15 12:59:23'),(7,'DIRECT','测试','1','2026-10-15 16:03:45',4,'2026-10-15 16:03:00','2026-10-15 16:03:45'),(8,'DIRECT','报修进度','WX20261014001：审核通过','2026-10-15 20:01:27',NULL,'2026-10-15 20:01:27','2026-10-15 20:01:27'),(9,'DIRECT','新的维修派单','WX20261014001','2026-10-15 20:01:27',NULL,'2026-10-15 20:01:27','2026-10-15 20:01:27'),(10,'DIRECT','暂无可派维修人员','WX20261014001','2026-10-15 20:02:14',NULL,'2026-10-15 20:02:14','2026-10-15 20:02:14'),(11,'DIRECT','维修超时待强制派单','WX20261013018','2026-10-16 10:37:35',NULL,'2026-10-16 10:37:35','2026-10-16 10:37:35'),(12,'DIRECT','维修超时','WX20261013018已解除负责关系','2026-10-16 10:37:35',NULL,'2026-10-16 10:37:35','2026-10-16 10:37:35'),(13,'DIRECT','报修进度','WX20261008007：已自动确认并归档','2026-10-29 14:46:48',NULL,'2026-10-29 14:46:48','2026-10-29 14:46:48');
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
  `student_id` bigint NOT NULL,
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
  UNIQUE KEY `uq_student_batch` (`batch_id`,`student_id`),
  KEY `idx_stay_building_status` (`building_id`,`current_status`),
  KEY `fk_stay_application_student` (`student_id`),
  CONSTRAINT `fk_stay_application_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`),
  CONSTRAINT `stay_application_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `stay_batch` (`batch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_application`
--

LOCK TABLES `stay_application` WRITE;
/*!40000 ALTER TABLE `stay_application` DISABLE KEYS */;
INSERT INTO `stay_application` (`application_id`, `batch_id`, `student_id`, `current_status`, `review_reason`, `created_at`, `updated_at`, `reviewer_user_id`, `reviewed_at`, `building_id`, `source`, `resubmit_deadline`, `archived_at`, `archive_reason`) VALUES (2,1,1,'APPROVED','1','2026-10-15 12:59:04','2026-10-15 12:59:23',4,'2026-10-15 12:59:23',1,'ADMIN_ADDED',NULL,NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_batch`
--

LOCK TABLES `stay_batch` WRITE;
/*!40000 ALTER TABLE `stay_batch` DISABLE KEYS */;
INSERT INTO `stay_batch` (`batch_id`, `batch_code`, `batch_name`, `open_start_date`, `open_end_date`, `application_deadline`, `instructions`, `current_status`) VALUES (1,'WINTER-2026','2026 寒假留宿','2027-01-10','2027-02-20','2026-12-20 23:59:59','请按连续开放区间填写留宿日期，提交后等待宿管审核。','OPEN');
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
INSERT INTO `stay_building_rule` (`batch_id`, `building_id`, `application_deadline`, `auto_lock`, `published_at`) VALUES (1,1,'2026-12-20 23:59:59',1,'2026-10-15 09:45:52'),(1,2,'2026-12-20 23:59:59',1,'2026-10-15 09:45:52'),(1,3,'2026-12-20 23:59:59',1,'2026-10-15 09:45:52');
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
INSERT INTO `stay_date_range` (`range_id`, `version_id`, `start_date`, `end_date`) VALUES (1,1,'2027-01-22','2027-01-23'),(2,1,'2027-01-24','2027-01-25');
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
  KEY `fk_stay_review_person` (`reviewer_user_id`),
  CONSTRAINT `fk_stay_review_person` FOREIGN KEY (`reviewer_user_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `stay_review_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `stay_application` (`application_id`),
  CONSTRAINT `stay_review_ibfk_2` FOREIGN KEY (`version_id`) REFERENCES `stay_version` (`version_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_review`
--

LOCK TABLES `stay_review` WRITE;
/*!40000 ALTER TABLE `stay_review` DISABLE KEYS */;
INSERT INTO `stay_review` (`review_id`, `application_id`, `version_id`, `reviewer_user_id`, `result`, `reason`, `reviewed_at`) VALUES (1,2,1,4,'APPROVED','1','2026-10-15 12:59:23');
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_version`
--

LOCK TABLES `stay_version` WRITE;
/*!40000 ALTER TABLE `stay_version` DISABLE KEYS */;
INSERT INTO `stay_version` (`version_id`, `application_id`, `reason`, `saved_at`, `submitted_at`) VALUES (1,2,'1','2026-10-15 12:59:04','2026-10-15 12:59:05');
/*!40000 ALTER TABLE `stay_version` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student`
--

DROP TABLE IF EXISTS `student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student` (
  `student_id` bigint NOT NULL,
  `login_account` varchar(60) NOT NULL,
  `password_hash` char(64) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `student_no` char(10) NOT NULL,
  `student_name` varchar(80) NOT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `class_id` bigint DEFAULT NULL,
  `enrollment_status` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `uk_student_login_account` (`login_account`),
  UNIQUE KEY `uk_student_no` (`student_no`),
  KEY `idx_student_class` (`class_id`),
  CONSTRAINT `fk_student_class` FOREIGN KEY (`class_id`) REFERENCES `student_class` (`class_id`),
  CONSTRAINT `fk_student_person` FOREIGN KEY (`student_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `chk_student_enabled` CHECK ((`enabled` in (0,1))),
  CONSTRAINT `chk_student_enrollment_status` CHECK ((`enrollment_status` in (_utf8mb4'ENROLLED',_utf8mb4'SUSPENDED',_utf8mb4'GRADUATED',_utf8mb4'WITHDRAWN',_utf8mb4'UNKNOWN'))),
  CONSTRAINT `chk_student_gender` CHECK (((`gender` is null) or (`gender` in (_utf8mb4'MALE',_utf8mb4'FEMALE',_utf8mb4'OTHER')))),
  CONSTRAINT `chk_student_no_format` CHECK (regexp_like(`student_no`,_utf8mb4'^[0-9]{10}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student`
--

LOCK TABLES `student` WRITE;
/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT INTO `student` (`student_id`, `login_account`, `password_hash`, `phone`, `enabled`, `student_no`, `student_name`, `gender`, `birth_date`, `class_id`, `enrollment_status`, `created_at`, `updated_at`) VALUES (1,'student1','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000001',1,'2024000001','张一','MALE','2004-03-14',5,'ENROLLED','2026-10-15 07:58:05','2026-10-30 09:27:11'),(5,'student2','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000002',0,'2024000002','张二','MALE','2004-12-31',5,'ENROLLED','2026-10-29 15:02:32','2026-10-30 09:27:31'),(6,'student3','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000003',1,'2024000003','张三','FEMALE','2005-03-14',5,'ENROLLED','2026-10-29 15:14:48','2026-10-30 09:27:57'),(7,'student4','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000004',1,'2024000004','张四','MALE',NULL,NULL,'ENROLLED','2026-10-29 22:37:49','2026-10-30 09:35:14'),(8,'student5','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000005',1,'2024000005','张五','MALE',NULL,2,'ENROLLED','2026-10-30 09:35:44','2026-10-30 09:36:37'),(9,'student6','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000006',1,'2024000006','张六','MALE',NULL,2,'ENROLLED','2026-10-30 09:36:20','2026-10-30 11:04:44'),(12,'student7','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000006',1,'2024000007','张七','FEMALE',NULL,NULL,'ENROLLED','2026-10-30 10:33:51','2026-10-30 11:04:44'),(13,'student8','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000008',1,'2024000008','张八','FEMALE',NULL,NULL,'ENROLLED','2026-10-30 10:36:20','2026-10-30 10:36:20'),(18,'student9','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13700000009',1,'2026000009','周宇航','MALE','2006-11-03',3,'ENROLLED','2026-10-30 10:41:14','2026-10-30 11:04:44'),(19,'student10','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13700000010',1,'2026000010','陈思远','FEMALE','2006-06-19',6,'ENROLLED','2026-10-30 10:41:14','2026-10-30 11:04:44');
/*!40000 ALTER TABLE `student` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_class`
--

DROP TABLE IF EXISTS `student_class`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_class` (
  `class_id` bigint NOT NULL AUTO_INCREMENT,
  `major_id` bigint NOT NULL,
  `class_code` varchar(40) NOT NULL,
  `class_name` varchar(100) NOT NULL,
  `enrollment_year` smallint unsigned DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`class_id`),
  UNIQUE KEY `uk_student_class_code` (`class_code`),
  KEY `idx_student_class_major` (`major_id`),
  CONSTRAINT `fk_student_class_major` FOREIGN KEY (`major_id`) REFERENCES `major` (`major_id`),
  CONSTRAINT `chk_student_class_enabled` CHECK ((`enabled` in (0,1))),
  CONSTRAINT `chk_student_class_year` CHECK (((`enrollment_year` is null) or (`enrollment_year` between 1900 and 2200)))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_class`
--

LOCK TABLES `student_class` WRITE;
/*!40000 ALTER TABLE `student_class` DISABLE KEYS */;
INSERT INTO `student_class` (`class_id`, `major_id`, `class_code`, `class_name`, `enrollment_year`, `enabled`, `created_at`, `updated_at`) VALUES (1,3,'BIZ-2024-1','工商管理2024级1班',2024,1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(2,5,'CHEM-2025-1','应用化学2025级1班',2025,1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(3,2,'IOT-2024-1','物联网工程2024级1班',2024,1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(4,4,'MATH-2024-1','数学与应用数学2024级1班',2024,1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(5,1,'SOFT-2024-1','软件工程2024级1班',2024,1,'2026-10-29 19:53:36','2026-10-29 19:53:36'),(6,1,'SOFT-2025-1','软件工程2025级1班',2025,1,'2026-10-29 19:53:36','2026-10-29 19:53:36');
/*!40000 ALTER TABLE `student_class` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_admin_profile`
--

DROP TABLE IF EXISTS `system_admin_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_admin_profile` (
  `admin_user_id` bigint NOT NULL,
  `login_account` varchar(60) NOT NULL,
  `password_hash` char(64) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `employee_no` char(8) NOT NULL,
  `admin_name` varchar(80) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_user_id`),
  UNIQUE KEY `uk_system_admin_login_account` (`login_account`),
  UNIQUE KEY `uk_system_admin_employee_no` (`employee_no`),
  CONSTRAINT `fk_system_admin_person` FOREIGN KEY (`admin_user_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `chk_system_admin_employee_no_format` CHECK (regexp_like(`employee_no`,_utf8mb4'^SA[0-9]{6}$')),
  CONSTRAINT `chk_system_admin_enabled` CHECK ((`enabled` in (0,1))),
  CONSTRAINT `chk_system_admin_gender` CHECK (((`gender` is null) or (`gender` in (_utf8mb4'MALE',_utf8mb4'FEMALE',_utf8mb4'OTHER'))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_admin_profile`
--

LOCK TABLES `system_admin_profile` WRITE;
/*!40000 ALTER TABLE `system_admin_profile` DISABLE KEYS */;
INSERT INTO `system_admin_profile` (`admin_user_id`, `login_account`, `password_hash`, `phone`, `enabled`, `employee_no`, `admin_name`, `gender`, `birth_date`, `hire_date`, `created_at`, `updated_at`) VALUES (4,'admin','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000004',1,'SA000001','系统管理员','OTHER','1988-08-08','2017-07-01','2026-10-15 07:58:05','2026-10-30 11:20:47');
/*!40000 ALTER TABLE `system_admin_profile` ENABLE KEYS */;
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
 1 AS `student_id`,
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
-- Temporary view structure for view `v_dorm_manager_profile`
--

DROP TABLE IF EXISTS `v_dorm_manager_profile`;
/*!50001 DROP VIEW IF EXISTS `v_dorm_manager_profile`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_dorm_manager_profile` AS SELECT 
 1 AS `manager_user_id`,
 1 AS `login_account`,
 1 AS `phone`,
 1 AS `enabled`,
 1 AS `employee_no`,
 1 AS `manager_name`,
 1 AS `gender`,
 1 AS `birth_date`,
 1 AS `hire_date`,
 1 AS `on_duty`,
 1 AS `remark`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `manager_buildings`*/;
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
 1 AS `student_id`,
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
-- Temporary view structure for view `v_repairer_profile`
--

DROP TABLE IF EXISTS `v_repairer_profile`;
/*!50001 DROP VIEW IF EXISTS `v_repairer_profile`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_repairer_profile` AS SELECT 
 1 AS `repairer_user_id`,
 1 AS `login_account`,
 1 AS `phone`,
 1 AS `enabled`,
 1 AS `employee_no`,
 1 AS `repairer_name`,
 1 AS `gender`,
 1 AS `birth_date`,
 1 AS `hire_date`,
 1 AS `on_duty`,
 1 AS `max_active_orders`,
 1 AS `remark`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `work_types`,
 1 AS `repairer_buildings`,
 1 AS `active_orders`*/;
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
 1 AS `student_id`,
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
-- Temporary view structure for view `v_student_profile`
--

DROP TABLE IF EXISTS `v_student_profile`;
/*!50001 DROP VIEW IF EXISTS `v_student_profile`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_student_profile` AS SELECT 
 1 AS `student_id`,
 1 AS `student_no`,
 1 AS `student_name`,
 1 AS `gender`,
 1 AS `birth_date`,
 1 AS `enrollment_status`,
 1 AS `class_id`,
 1 AS `class_code`,
 1 AS `class_name`,
 1 AS `enrollment_year`,
 1 AS `grade`,
 1 AS `major_id`,
 1 AS `major_code`,
 1 AS `major_name`,
 1 AS `department_id`,
 1 AS `department_code`,
 1 AS `department_name`,
 1 AS `login_account`,
 1 AS `phone`,
 1 AS `enabled`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `building_id`,
 1 AS `building_name`,
 1 AS `room_id`,
 1 AS `room_no`,
 1 AS `bed_id`,
 1 AS `bed_no`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_system_admin_profile`
--

DROP TABLE IF EXISTS `v_system_admin_profile`;
/*!50001 DROP VIEW IF EXISTS `v_system_admin_profile`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_system_admin_profile` AS SELECT 
 1 AS `admin_user_id`,
 1 AS `login_account`,
 1 AS `phone`,
 1 AS `enabled`,
 1 AS `employee_no`,
 1 AS `admin_name`,
 1 AS `gender`,
 1 AS `birth_date`,
 1 AS `hire_date`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_user_identity`
--

DROP TABLE IF EXISTS `v_user_identity`;
/*!50001 DROP VIEW IF EXISTS `v_user_identity`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_user_identity` AS SELECT 
 1 AS `user_id`,
 1 AS `login_account`,
 1 AS `real_name`,
 1 AS `phone`,
 1 AS `role_code`,
 1 AS `enabled`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `student_no`,
 1 AS `gender`,
 1 AS `birth_date`,
 1 AS `employee_no`,
 1 AS `hire_date`,
 1 AS `enrollment_status`,
 1 AS `password_hash`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'dorm_platform'
--

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
/*!50001 VIEW `v_accommodation_current` AS select `a`.`assignment_id` AS `assignment_id`,`a`.`student_id` AS `student_id`,`s`.`student_name` AS `student_name`,`s`.`phone` AS `phone`,`b`.`building_id` AS `building_id`,`b`.`building_name` AS `building_name`,`r`.`room_id` AS `room_id`,`r`.`room_no` AS `room_no`,`bd`.`bed_id` AS `bed_id`,`bd`.`bed_no` AS `bed_no`,`a`.`check_in_date` AS `check_in_date`,`a`.`check_out_date` AS `check_out_date` from ((((`accommodation_assignment` `a` join `student` `s` on((`s`.`student_id` = `a`.`student_id`))) join `bed` `bd` on((`bd`.`bed_id` = `a`.`bed_id`))) join `dorm_room` `r` on((`r`.`room_id` = `bd`.`room_id`))) join `building` `b` on((`b`.`building_id` = `r`.`building_id`))) where ((`a`.`check_in_date` <= curdate()) and ((`a`.`check_out_date` is null) or (curdate() < `a`.`check_out_date`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_dorm_manager_profile`
--

/*!50001 DROP VIEW IF EXISTS `v_dorm_manager_profile`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_dorm_manager_profile` AS select `m`.`manager_user_id` AS `manager_user_id`,`m`.`login_account` AS `login_account`,`m`.`phone` AS `phone`,`m`.`enabled` AS `enabled`,`m`.`employee_no` AS `employee_no`,`m`.`manager_name` AS `manager_name`,`m`.`gender` AS `gender`,`m`.`birth_date` AS `birth_date`,`m`.`hire_date` AS `hire_date`,`m`.`on_duty` AS `on_duty`,`m`.`remark` AS `remark`,`m`.`created_at` AS `created_at`,`m`.`updated_at` AS `updated_at`,(select group_concat(`b`.`building_name` order by `b`.`building_code` ASC separator ', ') from (`manager_building_scope` `x` join `building` `b` on((`b`.`building_id` = `x`.`building_id`))) where (`x`.`manager_user_id` = `m`.`manager_user_id`)) AS `manager_buildings` from `dorm_manager_profile` `m` */;
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
/*!50001 VIEW `v_repair_order_dashboard` AS select `ro`.`order_id` AS `order_id`,`ro`.`order_no` AS `order_no`,`ro`.`student_id` AS `student_id`,`ro`.`room_id` AS `room_id`,`ro`.`category_id` AS `category_id`,`ro`.`title` AS `title`,`ro`.`description` AS `description`,`ro`.`urgent` AS `urgent`,`ro`.`current_status` AS `current_status`,`ro`.`abnormal` AS `abnormal`,`ro`.`reject_reason` AS `reject_reason`,`ro`.`created_at` AS `created_at`,`ro`.`updated_at` AS `updated_at`,`ro`.`parent_order_id` AS `parent_order_id`,`ro`.`rule_id` AS `rule_id`,`ro`.`archived_at` AS `archived_at`,`ro`.`archive_reason` AS `archive_reason`,`s`.`student_name` AS `student_name`,`r`.`building_id` AS `building_id`,`r`.`room_no` AS `room_no`,`b`.`building_name` AS `building_name`,`c`.`category_name` AS `category_name`,`c`.`work_type_id` AS `work_type_id`,`w`.`work_type_name` AS `work_type_name`,`rd`.`dispatch_id` AS `dispatch_id`,`rd`.`repairer_user_id` AS `repairer_user_id`,`rp`.`repairer_name` AS `repairer_name`,`rd`.`accept_deadline` AS `accept_deadline`,`rd`.`repair_deadline` AS `repair_deadline`,`rr`.`result_text` AS `result_text`,`ev`.`score` AS `score`,`ev`.`comment` AS `comment`,(select count(0) from `repair_dispatch` `x` where ((`x`.`order_id` = `ro`.`order_id`) and (`x`.`dispatch_status` = 'REJECTED'))) AS `reject_count`,(select count(0) from `repair_dispatch` `x` where ((`x`.`order_id` = `ro`.`order_id`) and (`x`.`dispatch_status` = 'TIMEOUT'))) AS `accept_timeout_count`,(select count(0) from `repair_exception` `x` where ((`x`.`order_id` = `ro`.`order_id`) and (`x`.`exception_type` = 'REPAIR_TIMEOUT'))) AS `repair_timeout_count` from (((((((((`repair_order` `ro` join `student` `s` on((`s`.`student_id` = `ro`.`student_id`))) join `dorm_room` `r` on((`r`.`room_id` = `ro`.`room_id`))) join `building` `b` on((`b`.`building_id` = `r`.`building_id`))) left join `fault_category` `c` on((`c`.`category_id` = `ro`.`category_id`))) left join `repair_work_type` `w` on((`w`.`work_type_id` = `c`.`work_type_id`))) left join `repair_dispatch` `rd` on((`rd`.`dispatch_id` = (select max(`x`.`dispatch_id`) from `repair_dispatch` `x` where ((`x`.`order_id` = `ro`.`order_id`) and (`x`.`dispatch_status` in ('PENDING','ACCEPTED'))))))) left join `repairer_profile` `rp` on((`rp`.`repairer_user_id` = `rd`.`repairer_user_id`))) left join `repair_result` `rr` on((`rr`.`order_id` = `ro`.`order_id`))) left join `repair_evaluation` `ev` on((`ev`.`order_id` = `ro`.`order_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_repairer_profile`
--

/*!50001 DROP VIEW IF EXISTS `v_repairer_profile`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_repairer_profile` AS select `r`.`repairer_user_id` AS `repairer_user_id`,`r`.`login_account` AS `login_account`,`r`.`phone` AS `phone`,`r`.`enabled` AS `enabled`,`r`.`employee_no` AS `employee_no`,`r`.`repairer_name` AS `repairer_name`,`r`.`gender` AS `gender`,`r`.`birth_date` AS `birth_date`,`r`.`hire_date` AS `hire_date`,`r`.`on_duty` AS `on_duty`,`r`.`max_active_orders` AS `max_active_orders`,`r`.`remark` AS `remark`,`r`.`created_at` AS `created_at`,`r`.`updated_at` AS `updated_at`,(select group_concat(`w`.`work_type_name` order by `w`.`work_type_name` ASC separator ', ') from (`repairer_work_type` `x` join `repair_work_type` `w` on((`w`.`work_type_id` = `x`.`work_type_id`))) where (`x`.`repairer_user_id` = `r`.`repairer_user_id`)) AS `work_types`,(select group_concat(`b`.`building_name` order by `b`.`building_code` ASC separator ', ') from (`repairer_building_scope` `x` join `building` `b` on((`b`.`building_id` = `x`.`building_id`))) where (`x`.`repairer_user_id` = `r`.`repairer_user_id`)) AS `repairer_buildings`,(select count(0) from (`repair_dispatch` `d` join `repair_order` `o` on((`o`.`order_id` = `d`.`order_id`))) where ((`d`.`repairer_user_id` = `r`.`repairer_user_id`) and (`d`.`dispatch_status` in ('PENDING','ACCEPTED')) and (`o`.`current_status` in ('PENDING_ACCEPT','ACCEPTED','DELAYED')))) AS `active_orders` from `repairer_profile` `r` */;
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
/*!50001 VIEW `v_stay_application` AS select `a`.`application_id` AS `application_id`,`a`.`batch_id` AS `batch_id`,`a`.`student_id` AS `student_id`,`a`.`current_status` AS `current_status`,`a`.`review_reason` AS `review_reason`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at`,`a`.`reviewer_user_id` AS `reviewer_user_id`,`a`.`reviewed_at` AS `reviewed_at`,`a`.`building_id` AS `building_id`,`a`.`source` AS `source`,`a`.`resubmit_deadline` AS `resubmit_deadline`,`a`.`archived_at` AS `archived_at`,`a`.`archive_reason` AS `archive_reason`,`s`.`student_name` AS `student_name`,`b`.`batch_name` AS `batch_name`,`bl`.`building_name` AS `building_name`,`v`.`version_id` AS `version_id`,`v`.`reason` AS `reason`,`v`.`submitted_at` AS `submitted_at`,(select min(`d`.`start_date`) from `stay_date_range` `d` where (`d`.`version_id` = `v`.`version_id`)) AS `start_date`,(select max(`d`.`end_date`) from `stay_date_range` `d` where (`d`.`version_id` = `v`.`version_id`)) AS `end_date` from ((((`stay_application` `a` join `student` `s` on((`s`.`student_id` = `a`.`student_id`))) join `stay_batch` `b` on((`b`.`batch_id` = `a`.`batch_id`))) left join `building` `bl` on((`bl`.`building_id` = `a`.`building_id`))) left join `stay_version` `v` on((`v`.`version_id` = (select max(`x`.`version_id`) from `stay_version` `x` where ((`x`.`application_id` = `a`.`application_id`) and (`x`.`submitted_at` is not null)))))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_student_profile`
--

/*!50001 DROP VIEW IF EXISTS `v_student_profile`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_student_profile` AS select `s`.`student_id` AS `student_id`,`s`.`student_no` AS `student_no`,`s`.`student_name` AS `student_name`,`s`.`gender` AS `gender`,`s`.`birth_date` AS `birth_date`,`s`.`enrollment_status` AS `enrollment_status`,`s`.`class_id` AS `class_id`,`c`.`class_code` AS `class_code`,`c`.`class_name` AS `class_name`,`c`.`enrollment_year` AS `enrollment_year`,(case when (`c`.`enrollment_year` is null) then NULL else concat(`c`.`enrollment_year`,convert(0xe7baa7 using utf8mb4)) end) AS `grade`,`m`.`major_id` AS `major_id`,`m`.`major_code` AS `major_code`,`m`.`major_name` AS `major_name`,`d`.`department_id` AS `department_id`,`d`.`department_code` AS `department_code`,`d`.`department_name` AS `department_name`,`s`.`login_account` AS `login_account`,`s`.`phone` AS `phone`,`s`.`enabled` AS `enabled`,`s`.`created_at` AS `created_at`,`s`.`updated_at` AS `updated_at`,`ac`.`building_id` AS `building_id`,`ac`.`building_name` AS `building_name`,`ac`.`room_id` AS `room_id`,`ac`.`room_no` AS `room_no`,`ac`.`bed_id` AS `bed_id`,`ac`.`bed_no` AS `bed_no` from ((((`student` `s` left join `student_class` `c` on((`c`.`class_id` = `s`.`class_id`))) left join `major` `m` on((`m`.`major_id` = `c`.`major_id`))) left join `department` `d` on((`d`.`department_id` = `m`.`department_id`))) left join `v_accommodation_current` `ac` on((`ac`.`student_id` = `s`.`student_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_system_admin_profile`
--

/*!50001 DROP VIEW IF EXISTS `v_system_admin_profile`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_system_admin_profile` AS select `a`.`admin_user_id` AS `admin_user_id`,`a`.`login_account` AS `login_account`,`a`.`phone` AS `phone`,`a`.`enabled` AS `enabled`,`a`.`employee_no` AS `employee_no`,`a`.`admin_name` AS `admin_name`,`a`.`gender` AS `gender`,`a`.`birth_date` AS `birth_date`,`a`.`hire_date` AS `hire_date`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at` from `system_admin_profile` `a` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_user_identity`
--

/*!50001 DROP VIEW IF EXISTS `v_user_identity`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_user_identity` AS select `s`.`student_id` AS `user_id`,(convert(`s`.`login_account` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `login_account`,(convert(`s`.`student_name` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `real_name`,(convert(`s`.`phone` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `phone`,(convert('STUDENT' using utf8mb4) collate utf8mb4_0900_ai_ci) AS `role_code`,`s`.`enabled` AS `enabled`,`s`.`created_at` AS `created_at`,`s`.`updated_at` AS `updated_at`,(convert(`s`.`student_no` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `student_no`,(convert(`s`.`gender` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `gender`,`s`.`birth_date` AS `birth_date`,(cast(NULL as char(40) charset utf8mb4) collate utf8mb4_0900_ai_ci) AS `employee_no`,cast(NULL as date) AS `hire_date`,(convert(`s`.`enrollment_status` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `enrollment_status`,(convert(`s`.`password_hash` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `password_hash` from `student` `s` union all select `m`.`manager_user_id` AS `manager_user_id`,(convert(`m`.`login_account` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_17`,(convert(`m`.`manager_name` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(m.manager_name USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,(convert(`m`.`phone` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(m.phone USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,(convert('DORM_MANAGER' using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT('DORM_MANAGER' USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,`m`.`enabled` AS `enabled`,`m`.`created_at` AS `created_at`,`m`.`updated_at` AS `updated_at`,(cast(NULL as char(30) charset utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_24`,(convert(`m`.`gender` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(m.gender USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,`m`.`birth_date` AS `birth_date`,(convert(`m`.`employee_no` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(m.employee_no USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,`m`.`hire_date` AS `hire_date`,(cast(NULL as char(20) charset utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_29`,(convert(`m`.`password_hash` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_30` from `dorm_manager_profile` `m` union all select `r`.`repairer_user_id` AS `repairer_user_id`,(convert(`r`.`login_account` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_32`,(convert(`r`.`repairer_name` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_33`,(convert(`r`.`phone` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(r.phone USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,(convert('REPAIRER' using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT('REPAIRER' USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,`r`.`enabled` AS `enabled`,`r`.`created_at` AS `created_at`,`r`.`updated_at` AS `updated_at`,(cast(NULL as char(30) charset utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_39`,(convert(`r`.`gender` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(r.gender USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,`r`.`birth_date` AS `birth_date`,(convert(`r`.`employee_no` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(r.employee_no USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,`r`.`hire_date` AS `hire_date`,(cast(NULL as char(20) charset utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_44`,(convert(`r`.`password_hash` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_45` from `repairer_profile` `r` union all select `a`.`admin_user_id` AS `admin_user_id`,(convert(`a`.`login_account` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_47`,(convert(`a`.`admin_name` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(a.admin_name USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,(convert(`a`.`phone` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(a.phone USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,(convert('ADMIN' using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT('ADMIN' USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,`a`.`enabled` AS `enabled`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at`,(cast(NULL as char(30) charset utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_54`,(convert(`a`.`gender` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(a.gender USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,`a`.`birth_date` AS `birth_date`,(convert(`a`.`employee_no` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `CONVERT(a.employee_no USING utf8mb4) COLLATE utf8mb4_0900_ai_ci`,`a`.`hire_date` AS `hire_date`,(cast(NULL as char(20) charset utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_59`,(convert(`a`.`password_hash` using utf8mb4) collate utf8mb4_0900_ai_ci) AS `Name_exp_60` from `system_admin_profile` `a` */;
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

-- Dump completed on 2026-10-30 11:35:43
