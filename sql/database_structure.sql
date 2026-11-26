-- MySQL dump 10.13  Distrib 9.3.0, for macos15.2 (arm64)
--
-- Host: localhost    Database: katsikat
-- ------------------------------------------------------
-- Server version	9.3.0

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
-- Table structure for table `absents`
--

DROP TABLE IF EXISTS `absents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `absents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `date` date NOT NULL,
  `clock_in` time NOT NULL,
  `clock_out` time DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `description` text,
  `work_duration` time DEFAULT NULL,
  `photo_clock_in` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL COMMENT 'Employee latitude when checking in',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT 'Employee longitude when checking in',
  `accuracy` decimal(8,2) DEFAULT NULL COMMENT 'GPS accuracy in meters',
  `location_validated` tinyint(1) DEFAULT '0' COMMENT 'Whether location was validated against branch',
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  KEY `branch_id` (`branch_id`),
  KEY `idx_absents_location` (`latitude`,`longitude`),
  KEY `idx_absents_location_validated` (`location_validated`),
  CONSTRAINT `absents_ibfk_39` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `absents_ibfk_40` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1861 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `manager_id` int DEFAULT NULL,
  `city` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik cabang',
  `status` enum('active','inactive','maintenance','suspended','closed') NOT NULL DEFAULT 'active' COMMENT 'Status of the branch: active, inactive, maintenance, suspended, closed',
  `wa_session_id` varchar(255) DEFAULT NULL COMMENT 'WhatsApp session ID for gateway integration',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT 'Branch longitude for attendance validation',
  `latitude` decimal(11,8) DEFAULT NULL COMMENT 'Branch latitude for attendance validation',
  PRIMARY KEY (`id`),
  KEY `branches_tenant_id` (`tenant_id`),
  KEY `idx_branches_wa_session_id` (`wa_session_id`),
  KEY `idx_branches_location` (`latitude`,`longitude`),
  KEY `idx_branches_tenant_status` (`tenant_id`,`status`),
  KEY `branches_status` (`status`),
  KEY `branches_wa_session_id` (`wa_session_id`),
  CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `broadcast_history`
--

DROP TABLE IF EXISTS `broadcast_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `broadcast_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int DEFAULT NULL,
  `broadcast_type` enum('promo','announcement','reminder','custom') COLLATE utf8mb4_unicode_ci DEFAULT 'custom',
  `broadcast_date` date NOT NULL,
  `broadcast_time` time NOT NULL,
  `total_recipients` int NOT NULL,
  `success_count` int DEFAULT '0',
  `failed_count` int DEFAULT '0',
  `pending_count` int DEFAULT '0',
  `message_content` text COLLATE utf8mb4_unicode_ci,
  `template_id` int DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_date` (`tenant_id`,`broadcast_date`),
  KEY `idx_status` (`status`),
  KEY `idx_broadcast_type` (`broadcast_type`),
  KEY `branch_id` (`branch_id`),
  KEY `template_id` (`template_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `broadcast_history_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `broadcast_history_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `broadcast_history_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `broadcast_history_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bug_reports`
--

DROP TABLE IF EXISTS `bug_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `status` enum('pending','in_progress','resolved','closed') DEFAULT 'pending',
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `businesses`
--

DROP TABLE IF EXISTS `businesses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `businesses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `branch_id` int NOT NULL,
  `type` varchar(255) NOT NULL,
  `pic_name` varchar(255) NOT NULL,
  `pic_phone` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `is_active` enum('active','inactive') NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaign_customers`
--

DROP TABLE IF EXISTS `campaign_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign_customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaign_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  `retry_count` int NOT NULL DEFAULT '0',
  `sent_at` timestamp NULL DEFAULT NULL,
  `error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deletedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_campaign_customer` (`campaign_id`,`customer_id`),
  KEY `idx_campaign_customers_campaign_status` (`campaign_id`,`status`),
  KEY `idx_campaign_customers_customer` (`customer_id`),
  CONSTRAINT `campaign_customers_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaign_customers_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10735 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `message_content` text NOT NULL,
  `target_audience` enum('follow_up_15','follow_up_30','follow_up_60','all') DEFAULT 'follow_up_30',
  `total_customers` int NOT NULL DEFAULT '0',
  `sent_count` int NOT NULL DEFAULT '0',
  `failed_count` int NOT NULL DEFAULT '0',
  `status` enum('draft','running','completed','error','paused','cooldown') DEFAULT 'draft',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `error_message` text,
  `template_id` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deletedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_default` tinyint(1) DEFAULT '0',
  `is_editable` tinyint(1) DEFAULT '1',
  `last_started_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu terakhir campaign di-start',
  `cooldown_until` timestamp NULL DEFAULT NULL COMMENT 'Waktu cooldown berakhir (14 hari setelah selesai/error)',
  `follow_up_days` int DEFAULT '30' COMMENT 'Jumlah hari follow-up untuk customer targeting',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_campaigns_tenant_unique` (`tenant_id`),
  KEY `idx_campaigns_tenant_status` (`tenant_id`,`status`),
  KEY `idx_campaigns_created_by` (`created_by`),
  KEY `idx_campaigns_template` (`template_id`),
  KEY `branch_id` (`branch_id`),
  KEY `idx_campaigns_cooldown` (`cooldown_until`),
  CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaigns_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaigns_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `campaigns_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `capital_records`
--

DROP TABLE IF EXISTS `capital_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `capital_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `date` datetime NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `photos` varchar(255) DEFAULT NULL,
  `payment_method` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `capital_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collaborations`
--

DROP TABLE IF EXISTS `collaborations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaborations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `business_id` int NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `collaborations_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customer_followup_sequences`
--

DROP TABLE IF EXISTS `customer_followup_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_followup_sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL COMMENT 'ID customer',
  `sequence_id` int NOT NULL COMMENT 'ID sequence follow-up',
  `current_step` int NOT NULL DEFAULT '0' COMMENT 'Step saat ini dalam sequence (0 = belum mulai)',
  `last_order_date` date DEFAULT NULL COMMENT 'Tanggal order terakhir customer',
  `last_sent_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu terakhir template dikirim',
  `next_send_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu pengiriman template berikutnya',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Status aktif sequence untuk customer ini',
  `is_paused` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Status pause sementara',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu sequence selesai (semua step terkirim)',
  `total_sent` int NOT NULL DEFAULT '0' COMMENT 'Total template yang sudah dikirim',
  `total_responded` int NOT NULL DEFAULT '0' COMMENT 'Total respon dari customer',
  `converted_order_id` int DEFAULT NULL COMMENT 'ID order yang dihasilkan dari follow-up (jika ada)',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Catatan tambahan',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_customer_followup_seq_customer_sequence` (`customer_id`,`sequence_id`),
  KEY `converted_order_id` (`converted_order_id`),
  KEY `idx_customer_followup_seq_sequence_active` (`sequence_id`,`is_active`),
  KEY `idx_customer_followup_seq_next_send` (`next_send_at`,`is_active`),
  KEY `idx_customer_followup_seq_last_order` (`last_order_date`),
  KEY `idx_customer_followup_seq_current_step` (`current_step`),
  KEY `idx_customer_followup_seq_paused` (`is_paused`),
  KEY `idx_next_send` (`next_send_at`,`is_active`),
  CONSTRAINT `customer_followup_sequences_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_followup_sequences_ibfk_2` FOREIGN KEY (`sequence_id`) REFERENCES `followup_sequences` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_followup_sequences_ibfk_3` FOREIGN KEY (`converted_order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customer_followups`
--

DROP TABLE IF EXISTS `customer_followups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_followups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `message_content` text NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('sent','failed') DEFAULT 'sent',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_customer_followup` (`customer_id`,`tenant_id`,`branch_id`),
  KEY `idx_followup_date` (`sent_at`),
  KEY `idx_followup_status` (`status`),
  CONSTRAINT `customer_followups_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_followups_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_followups_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_followups_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customer_memberships`
--

DROP TABLE IF EXISTS `customer_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL COMMENT 'ID customer yang membeli membership',
  `membership_id` int NOT NULL COMMENT 'ID program membership yang dibeli',
  `payment_id` int DEFAULT NULL,
  `start_date` datetime NOT NULL COMMENT 'Tanggal mulai membership',
  `end_date` datetime NOT NULL COMMENT 'Tanggal berakhir membership',
  `status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active' COMMENT 'Status membership customer',
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik customer membership',
  `branch_id` int DEFAULT NULL COMMENT 'ID branch pemilik customer membership',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `membership_id` (`membership_id`),
  KEY `payment_id` (`payment_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `customer_memberships_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_memberships_ibfk_2` FOREIGN KEY (`membership_id`) REFERENCES `memberships` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_memberships_ibfk_3` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_memberships_ibfk_4` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_memberships_ibfk_5` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `gmaps` varchar(255) DEFAULT NULL,
  `date_birthday` date DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `hobby` varchar(255) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `working_type` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `description` text,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik customer',
  `current_membership_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL COMMENT 'ID branch tempat customer terdaftar',
  `last_order_date` timestamp NULL DEFAULT NULL COMMENT 'Tanggal order terakhir customer (untuk follow-up targeting)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `email_20` (`email`),
  UNIQUE KEY `unique_tenant_phone` (`tenant_id`,`phone`),
  KEY `customers_tenant_id` (`tenant_id`),
  KEY `idx_customers_name` (`name`),
  KEY `idx_customers_tenant_name` (`tenant_id`,`name`),
  KEY `idx_customers_tenant_phone` (`tenant_id`,`phone`),
  KEY `customers_ibfk_39` (`current_membership_id`),
  KEY `fk_customers_branch_id` (`branch_id`),
  KEY `idx_tenant_active` (`tenant_id`,`deletedAt`),
  KEY `idx_customers_last_order` (`tenant_id`,`last_order_date`),
  CONSTRAINT `customers_ibfk_37` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customers_ibfk_39` FOREIGN KEY (`current_membership_id`) REFERENCES `customer_memberships` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_customers_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2492 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deliveries`
--

DROP TABLE IF EXISTS `deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deliveries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `users_id` int DEFAULT NULL,
  `quantity` int NOT NULL,
  `date` date DEFAULT NULL,
  `total_distance` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `odo_start` int DEFAULT NULL,
  `odo_end` int DEFAULT NULL,
  `odo_start_photo_url` varchar(255) DEFAULT NULL,
  `odo_end_photo_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `users_id` (`users_id`),
  CONSTRAINT `deliveries_ibfk_1` FOREIGN KEY (`users_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=145 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `delivery_details`
--

DROP TABLE IF EXISTS `delivery_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `delivery_id` int DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `distance` decimal(10,2) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `delivery_id` (`delivery_id`),
  CONSTRAINT `delivery_details_ibfk_39` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `delivery_details_ibfk_40` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=273 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `discounts`
--

DROP TABLE IF EXISTS `discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` enum('percent','nominal') NOT NULL,
  `discount` decimal(10,2) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `discounts_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` text,
  `receipt` varchar(1000) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `shift_id` int DEFAULT NULL,
  `finance_account_id` int DEFAULT NULL,
  `finance_category_id` int DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `transaction_id` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `tenant_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `expenses_shift_id_foreign_idx` (`shift_id`),
  KEY `expenses_finance_account_id_foreign_idx` (`finance_account_id`),
  KEY `expenses_finance_category_id_foreign_idx` (`finance_category_id`),
  KEY `expenses_approved_by_foreign_idx` (`approved_by`),
  KEY `expenses_transaction_id_foreign_idx` (`transaction_id`),
  CONSTRAINT `expenses_ibfk_79` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `expenses_ibfk_80` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `expenses_ibfk_81` FOREIGN KEY (`finance_account_id`) REFERENCES `finance_accounts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `expenses_ibfk_82` FOREIGN KEY (`finance_category_id`) REFERENCES `finance_categories` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `expenses_ibfk_83` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `expenses_ibfk_84` FOREIGN KEY (`transaction_id`) REFERENCES `finance_transactions` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=712 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('pending','in_progress','resolved','closed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_accounts`
--

DROP TABLE IF EXISTS `finance_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `description` text,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik finance account',
  `branch_id` int DEFAULT NULL,
  `is_global` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Flag untuk akun global (true) atau akun spesifik cabang (false)',
  `is_branch_specific` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Flag untuk akun spesifik cabang (true) atau akun global (false)',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Flag untuk akun aktif (true) atau tidak aktif (false)',
  `payment_method_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_finance_accounts_tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `payment_method_id` (`payment_method_id`),
  CONSTRAINT `finance_accounts_ibfk_29` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `finance_accounts_ibfk_30` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `finance_accounts_ibfk_31` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_categories`
--

DROP TABLE IF EXISTS `finance_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` enum('debit','credit','neutral') NOT NULL,
  `description` text,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik finance category',
  `is_system` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Flag untuk kategori sistem (true) atau kategori custom tenant (false)',
  PRIMARY KEY (`id`),
  KEY `idx_finance_categories_tenant_id` (`tenant_id`),
  CONSTRAINT `finance_categories_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_transactions`
--

DROP TABLE IF EXISTS `finance_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `is_checked` tinyint(1) NOT NULL DEFAULT '0',
  `account_id` int NOT NULL,
  `category_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `total_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `final_amount` decimal(12,2) NOT NULL,
  `description` text,
  `date` datetime NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik finance transaction',
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `account_id` (`account_id`),
  KEY `category_id` (`category_id`),
  KEY `idx_finance_transactions_deleted_at` (`deletedAt`),
  KEY `idx_finance_transactions_tenant_id` (`tenant_id`),
  KEY `idx_finance_transactions_branch_id` (`branch_id`),
  KEY `idx_finance_transactions_tenant_branch` (`tenant_id`,`branch_id`),
  CONSTRAINT `finance_transactions_ibfk_43` FOREIGN KEY (`account_id`) REFERENCES `finance_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `finance_transactions_ibfk_44` FOREIGN KEY (`category_id`) REFERENCES `finance_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `finance_transactions_ibfk_45` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `finance_transactions_ibfk_46` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5212 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `followup_sequence_templates`
--

DROP TABLE IF EXISTS `followup_sequence_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `followup_sequence_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sequence_id` int NOT NULL COMMENT 'ID sequence follow-up',
  `step_number` int NOT NULL COMMENT 'Urutan step dalam sequence (1, 2, 3, dst)',
  `delay_days` int NOT NULL COMMENT 'Jumlah hari delay setelah order terakhir atau step sebelumnya',
  `template_id` int NOT NULL COMMENT 'ID template WhatsApp yang akan dikirim',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Status aktif template dalam sequence',
  `send_time` time DEFAULT '09:00:00' COMMENT 'Jam pengiriman (format HH:MM:SS)',
  `conditions` json DEFAULT NULL COMMENT 'Kondisi tambahan untuk pengiriman (optional)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_followup_seq_templates_sequence_step` (`sequence_id`,`step_number`),
  KEY `idx_followup_seq_templates_sequence_delay` (`sequence_id`,`delay_days`),
  KEY `idx_followup_seq_templates_template` (`template_id`),
  KEY `idx_followup_seq_templates_active` (`is_active`),
  CONSTRAINT `followup_sequence_templates_ibfk_1` FOREIGN KEY (`sequence_id`) REFERENCES `followup_sequences` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `followup_sequence_templates_ibfk_2` FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `followup_sequences`
--

DROP TABLE IF EXISTS `followup_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `followup_sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama sequence follow-up',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Deskripsi sequence',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Status aktif sequence',
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Sequence default untuk tenant/branch',
  `created_by` int DEFAULT NULL COMMENT 'ID user yang membuat sequence',
  `updated_by` int DEFAULT NULL COMMENT 'ID user yang terakhir update sequence',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_followup_sequences_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `idx_followup_sequences_tenant_active` (`tenant_id`,`is_active`),
  KEY `idx_followup_sequences_default` (`is_default`,`tenant_id`),
  KEY `idx_tenant_active` (`tenant_id`,`is_active`),
  CONSTRAINT `followup_sequences_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `followup_sequences_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `followup_sequences_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `followup_sequences_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `followup_usage_limits`
--

DROP TABLE IF EXISTS `followup_usage_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `followup_usage_limits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `limit_type` enum('sequences_active','broadcasts_monthly','messages_daily','messages_hourly','templates_per_sequence') COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_usage` int DEFAULT '0',
  `max_allowed` int NOT NULL,
  `reset_date` date DEFAULT NULL,
  `reset_hour` int DEFAULT NULL,
  `last_reset_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_limit` (`tenant_id`,`limit_type`),
  KEY `idx_reset_date` (`reset_date`),
  CONSTRAINT `followup_usage_limits_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=230 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_access_logs`
--

DROP TABLE IF EXISTS `invoice_access_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_access_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_token_id` int NOT NULL,
  `order_id` int NOT NULL,
  `accessed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(255) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_token_id` (`invoice_token_id`),
  KEY `order_id` (`order_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `invoice_access_logs_ibfk_16` FOREIGN KEY (`invoice_token_id`) REFERENCES `invoice_tokens` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_access_logs_ibfk_17` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_access_logs_ibfk_18` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=974 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_tokens`
--

DROP TABLE IF EXISTS `invoice_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  UNIQUE KEY `token_2` (`token`),
  UNIQUE KEY `token_3` (`token`),
  UNIQUE KEY `token_4` (`token`),
  UNIQUE KEY `token_5` (`token`),
  UNIQUE KEY `token_6` (`token`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `invoice_tokens_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=630 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `item_status_photos`
--

DROP TABLE IF EXISTS `item_status_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_status_photos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_detail_status_log_id` int NOT NULL,
  `photo_url` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_detail_status_log_id` (`order_detail_status_log_id`),
  CONSTRAINT `item_status_photos_ibfk_1` FOREIGN KEY (`order_detail_status_log_id`) REFERENCES `order_detail_status_logs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4258 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `color` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `material` varchar(255) DEFAULT NULL,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik item',
  PRIMARY KEY (`id`),
  KEY `items_tenant_id` (`tenant_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5238 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lead_records`
--

DROP TABLE IF EXISTS `lead_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lead_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `follow_up_by` int NOT NULL,
  `follow_up_at` datetime NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `notes` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lead_id` (`lead_id`),
  KEY `follow_up_by` (`follow_up_by`),
  CONSTRAINT `lead_records_ibfk_23` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lead_records_ibfk_24` FOREIGN KEY (`follow_up_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `source` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Baru',
  `created_by` int NOT NULL,
  `follow_up_count` int NOT NULL DEFAULT '0',
  `last_follow_up_by` int DEFAULT NULL,
  `last_follow_up_at` datetime DEFAULT NULL,
  `next_follow_up_date` datetime DEFAULT NULL,
  `is_converted` tinyint(1) DEFAULT '0',
  `conversion_date` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `phone_2` (`phone`),
  UNIQUE KEY `phone_3` (`phone`),
  UNIQUE KEY `phone_4` (`phone`),
  UNIQUE KEY `phone_5` (`phone`),
  UNIQUE KEY `phone_6` (`phone`),
  UNIQUE KEY `phone_7` (`phone`),
  UNIQUE KEY `phone_8` (`phone`),
  UNIQUE KEY `phone_9` (`phone`),
  UNIQUE KEY `phone_10` (`phone`),
  UNIQUE KEY `phone_11` (`phone`),
  UNIQUE KEY `phone_12` (`phone`),
  KEY `created_by` (`created_by`),
  KEY `last_follow_up_by` (`last_follow_up_by`),
  CONSTRAINT `leads_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `leads_ibfk_2` FOREIGN KEY (`last_follow_up_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `memberships`
--

DROP TABLE IF EXISTS `memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Nama program membership (LITE, PREMIUM, VIP, PLATINUM)',
  `description` text COMMENT 'Deskripsi program membership',
  `discount_percentage` decimal(5,2) NOT NULL COMMENT 'Persentase diskon yang diberikan',
  `price` decimal(12,2) NOT NULL COMMENT 'Harga program membership',
  `duration_days` int NOT NULL COMMENT 'Durasi membership dalam hari',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Status aktif program membership',
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik membership',
  `branch_id` int DEFAULT NULL COMMENT 'ID branch pemilik membership',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `memberships_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `memberships_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `message_queue`
--

DROP TABLE IF EXISTS `message_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `message_type` enum('followup','broadcast','manual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_id` int DEFAULT NULL,
  `sequence_id` int DEFAULT NULL,
  `broadcast_id` int DEFAULT NULL,
  `message_content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `variables` json DEFAULT NULL,
  `priority` int DEFAULT '5',
  `scheduled_at` timestamp NOT NULL,
  `attempt_count` int DEFAULT '0',
  `max_attempts` int DEFAULT '3',
  `status` enum('pending','processing','sent','failed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `sent_at` timestamp NULL DEFAULT NULL,
  `failed_at` timestamp NULL DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `whatsapp_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_status` (`tenant_id`,`status`),
  KEY `idx_scheduled_at` (`scheduled_at`),
  KEY `idx_message_type` (`message_type`),
  KEY `idx_priority_scheduled` (`priority`,`scheduled_at`),
  KEY `customer_id` (`customer_id`),
  KEY `template_id` (`template_id`),
  KEY `sequence_id` (`sequence_id`),
  CONSTRAINT `message_queue_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_queue_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_queue_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `message_queue_ibfk_4` FOREIGN KEY (`sequence_id`) REFERENCES `followup_sequences` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_detail_status_logs`
--

DROP TABLE IF EXISTS `order_detail_status_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_detail_status_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_detail_id` int NOT NULL,
  `old_status` varchar(255) DEFAULT NULL,
  `new_status` varchar(255) NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_detail_id` (`order_detail_id`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `order_detail_status_logs_ibfk_10` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `order_detail_status_logs_ibfk_9` FOREIGN KEY (`order_detail_id`) REFERENCES `order_details` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2427 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_details`
--

DROP TABLE IF EXISTS `order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `treatment_id` int DEFAULT NULL,
  `item_id` int DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `discount_id` int DEFAULT NULL,
  `process_time` varchar(255) DEFAULT NULL,
  `process_time_cost` decimal(10,2) DEFAULT NULL,
  `final_price` decimal(10,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `pickup_method` enum('pickup','delivery') DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `delivery_time` varchar(255) DEFAULT NULL,
  `courier_id` int DEFAULT NULL,
  `delivery_status` enum('not_yet','scheduled','on_the_way','delivered','failed') DEFAULT 'not_yet',
  `perfume` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `employee_id` (`employee_id`),
  KEY `treatment_id` (`treatment_id`),
  KEY `item_id` (`item_id`),
  KEY `discount_id` (`discount_id`),
  KEY `order_details_courier_id_foreign_idx` (`courier_id`),
  CONSTRAINT `order_details_ibfk_60` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_61` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_62` FOREIGN KEY (`treatment_id`) REFERENCES `treatment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_63` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_64` FOREIGN KEY (`discount_id`) REFERENCES `discounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_65` FOREIGN KEY (`courier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9978 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_product_details`
--

DROP TABLE IF EXISTS `order_product_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_product_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_product_id` int NOT NULL,
  `product_id` int NOT NULL,
  `discount_id` int DEFAULT NULL,
  `total_price_per_category` float NOT NULL,
  `quantity` int NOT NULL,
  `date` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_product_id` (`order_product_id`),
  KEY `product_id` (`product_id`),
  KEY `discount_id` (`discount_id`),
  CONSTRAINT `order_product_details_ibfk_1` FOREIGN KEY (`order_product_id`) REFERENCES `order_products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_product_details_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `order_product_details_ibfk_3` FOREIGN KEY (`discount_id`) REFERENCES `discounts` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_products`
--

DROP TABLE IF EXISTS `order_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `payment_id` int NOT NULL,
  `discount_id` int NOT NULL,
  `date` datetime NOT NULL,
  `total_price` float NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `branch_id` (`branch_id`),
  KEY `payment_id` (`payment_id`),
  KEY `discount_id` (`discount_id`),
  CONSTRAINT `order_products_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `order_products_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `order_products_ibfk_3` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `order_products_ibfk_4` FOREIGN KEY (`discount_id`) REFERENCES `discounts` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `payment_id` int DEFAULT NULL,
  `entry_date` date DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `order_type` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `shift_id` int DEFAULT NULL,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik order',
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `branch_id` (`branch_id`),
  KEY `payment_id` (`payment_id`),
  KEY `orders_created_by_foreign_idx` (`created_by`),
  KEY `orders_shift_id_foreign_idx` (`shift_id`),
  KEY `orders_tenant_id` (`tenant_id`),
  KEY `idx_orders_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `idx_orders_tenant_date` (`tenant_id`,`entry_date`),
  KEY `idx_orders_branch_date` (`branch_id`,`entry_date`),
  KEY `idx_orders_tenant_branch_date` (`tenant_id`,`branch_id`,`entry_date`),
  KEY `idx_orders_order_type` (`order_type`),
  KEY `idx_orders_tenant_type` (`tenant_id`,`order_type`),
  KEY `idx_orders_created_by` (`created_by`),
  KEY `idx_orders_shift_id` (`shift_id`),
  KEY `idx_orders_entry_date` (`entry_date`),
  KEY `idx_orders_deleted_at` (`deletedAt`),
  KEY `orders_customer_id` (`customer_id`),
  KEY `orders_branch_id` (`branch_id`),
  KEY `orders_payment_id` (`payment_id`),
  KEY `orders_created_by` (`created_by`),
  KEY `orders_shift_id` (`shift_id`),
  KEY `orders_order_type` (`order_type`),
  KEY `orders_entry_date` (`entry_date`),
  KEY `orders_deleted_at` (`deletedAt`),
  KEY `idx_orders_tenant_creator` (`tenant_id`,`created_by`),
  KEY `idx_orders_tenant_shift` (`tenant_id`,`shift_id`),
  KEY `idx_orders_tenant_deleted` (`tenant_id`,`deletedAt`),
  CONSTRAINT `orders_ibfk_63` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_64` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_65` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_66` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_67` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_68` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4084 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_details`
--

DROP TABLE IF EXISTS `payment_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int NOT NULL,
  `payment_id` int NOT NULL,
  `method` varchar(50) NOT NULL COMMENT 'Payment method name (dynamic from payment_methods table)',
  `amount` decimal(12,2) NOT NULL,
  `fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `interest` decimal(12,2) DEFAULT '0.00',
  `final_amount` decimal(12,2) NOT NULL,
  `evidence_photo` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `finance_account_id` int DEFAULT NULL,
  `finance_category_id` int DEFAULT NULL,
  `shift_id` int DEFAULT NULL,
  `payment_method_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `payment_id` (`payment_id`),
  KEY `idx_payment_details_deleted_at` (`deletedAt`),
  KEY `finance_account_id` (`finance_account_id`),
  KEY `finance_category_id` (`finance_category_id`),
  KEY `shift_id` (`shift_id`),
  KEY `payment_method_id` (`payment_method_id`),
  CONSTRAINT `payment_details_ibfk_21` FOREIGN KEY (`transaction_id`) REFERENCES `finance_transactions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payment_details_ibfk_22` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payment_details_ibfk_23` FOREIGN KEY (`finance_account_id`) REFERENCES `finance_accounts` (`id`),
  CONSTRAINT `payment_details_ibfk_24` FOREIGN KEY (`finance_category_id`) REFERENCES `finance_categories` (`id`),
  CONSTRAINT `payment_details_ibfk_25` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`),
  CONSTRAINT `payment_details_ibfk_26` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4348 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_logs`
--

DROP TABLE IF EXISTS `payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_detail_id` int NOT NULL,
  `changed_by` int DEFAULT NULL,
  `action` enum('create','update','delete') NOT NULL,
  `description` text,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_detail_id` (`payment_detail_id`),
  KEY `changed_by` (`changed_by`),
  CONSTRAINT `payment_logs_ibfk_21` FOREIGN KEY (`payment_detail_id`) REFERENCES `payment_details` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payment_logs_ibfk_22` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=819 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `fee_percentage` decimal(5,2) DEFAULT '0.00',
  `fee_fixed` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL,
  `method` varchar(255) DEFAULT NULL,
  `total_process_time_cost` decimal(10,2) NOT NULL,
  `total_discount` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `final_price` decimal(10,2) NOT NULL,
  `date` date DEFAULT NULL,
  `money` decimal(10,2) DEFAULT NULL,
  `change` decimal(10,2) DEFAULT NULL,
  `evidence_photo` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `total_service` decimal(10,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Total harga sebelum diskon',
  `additional_cost` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Biaya tambahan (jika ada)',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Total yang sudah dibayar',
  `remaining_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Sisa yang harus dibayar',
  `due_date` datetime DEFAULT NULL COMMENT 'Tanggal jatuh tempo pembayaran',
  `notes` text COMMENT 'Catatan tambahan untuk pembayaran',
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik payment',
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `printers`
--

DROP TABLE IF EXISTS `printers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama printer (contoh: Printer Kasir 1, Printer Kitchen)',
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama device Bluetooth (contoh: RPP02, POS-58)',
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID unik device Bluetooth',
  `service_uuid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Service UUID untuk koneksi Bluetooth',
  `characteristic_uuid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Characteristic UUID untuk koneksi Bluetooth',
  `paper_width` int NOT NULL DEFAULT '58' COMMENT 'Lebar kertas dalam mm (58mm, 80mm)',
  `encoding` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CP437' COMMENT 'Encoding untuk printer (CP437, UTF-8, etc)',
  `printer_type` enum('thermal','inkjet','laser') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'thermal' COMMENT 'Tipe printer',
  `status` enum('active','inactive','maintenance','disconnected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'inactive' COMMENT 'Status printer',
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Apakah printer ini default untuk cabang',
  `print_capabilities` json DEFAULT NULL COMMENT 'Kemampuan printer (invoice, checklist, receipt, etc)',
  `connection_settings` json DEFAULT NULL COMMENT 'Pengaturan koneksi tambahan',
  `last_connected` datetime DEFAULT NULL COMMENT 'Terakhir kali terhubung',
  `tenant_id` int NOT NULL COMMENT 'ID tenant pemilik printer',
  `branch_id` int NOT NULL COMMENT 'ID cabang tempat printer berada',
  `created_by` int DEFAULT NULL COMMENT 'ID user yang membuat printer',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_printers_tenant_id` (`tenant_id`),
  KEY `idx_printers_branch_id` (`branch_id`),
  KEY `idx_printers_created_by` (`created_by`),
  KEY `idx_printers_status` (`status`),
  KEY `idx_printers_printer_type` (`printer_type`),
  KEY `idx_printers_is_default` (`is_default`),
  KEY `idx_printers_deleted_at` (`deletedAt`),
  CONSTRAINT `printers_ibfk_4` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `printers_ibfk_5` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `printers_ibfk_6` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel untuk menyimpan data printer';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `branch_id` int NOT NULL,
  `category` varchar(255) NOT NULL,
  `description` text,
  `price` float NOT NULL,
  `stock` int NOT NULL,
  `images` varchar(255) DEFAULT NULL,
  `sold` int NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reminder_logs`
--

DROP TABLE IF EXISTS `reminder_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reminder_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `admin_id` int DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL,
  `error_message` text,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `reminder_logs_ibfk_16` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reminder_logs_ibfk_17` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reminder_logs_ibfk_18` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SequelizeMeta`
--

DROP TABLE IF EXISTS `SequelizeMeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SequelizeMeta` (
  `name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shifts`
--

DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `sales` int NOT NULL,
  `cash_initial` int NOT NULL,
  `cash_expected` int NOT NULL,
  `cash_actual` int NOT NULL,
  `bank_transfer` int NOT NULL,
  `qris` int NOT NULL,
  `transaction` int NOT NULL,
  `delivery` int NOT NULL,
  `item` int NOT NULL,
  `service` int NOT NULL,
  `difference` int NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `paid` int DEFAULT NULL,
  `unpaid` int DEFAULT NULL,
  `expense` int DEFAULT NULL,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik shift',
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  KEY `branch_id` (`branch_id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `shifts_ibfk_30` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `shifts_ibfk_31` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `shifts_ibfk_32` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=744 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shoes_photos`
--

DROP TABLE IF EXISTS `shoes_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shoes_photos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_detail_id` int NOT NULL,
  `url_photo` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_detail_id` (`order_detail_id`),
  CONSTRAINT `shoes_photos_ibfk_1` FOREIGN KEY (`order_detail_id`) REFERENCES `order_details` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30689 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Nama paket (Free Trial, Basic, Premium, Enterprise)',
  `description` text COMMENT 'Deskripsi paket',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Harga paket per bulan',
  `duration_days` int NOT NULL COMMENT 'Durasi paket dalam hari',
  `max_branches` int NOT NULL DEFAULT '1' COMMENT 'Maksimal jumlah cabang',
  `max_users` int NOT NULL DEFAULT '5' COMMENT 'Maksimal jumlah user',
  `max_orders_per_month` int DEFAULT NULL COMMENT 'Maksimal order per bulan (null = unlimited)',
  `features` json DEFAULT NULL COMMENT 'Fitur yang disediakan dalam paket',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Status aktif paket',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT 'Urutan tampil paket',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscription_plans_is_active_idx` (`is_active`),
  KEY `subscription_plans_sort_order_idx` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL COMMENT 'ID tenant yang berlangganan',
  `plan_id` int NOT NULL COMMENT 'ID paket langganan',
  `status` enum('active','expired','cancelled','suspended','pending') NOT NULL DEFAULT 'pending' COMMENT 'Status langganan',
  `start_date` datetime NOT NULL COMMENT 'Tanggal mulai langganan',
  `end_date` datetime NOT NULL COMMENT 'Tanggal berakhir langganan',
  `auto_renew` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Auto renew langganan',
  `price` decimal(10,2) NOT NULL COMMENT 'Harga langganan saat ini',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Jumlah diskon',
  `final_price` decimal(10,2) NOT NULL COMMENT 'Harga akhir setelah diskon',
  `payment_method` varchar(255) DEFAULT NULL COMMENT 'Metode pembayaran',
  `notes` text COMMENT 'Catatan langganan',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscriptions_tenant_id` (`tenant_id`),
  KEY `subscriptions_plan_id` (`plan_id`),
  KEY `subscriptions_status` (`status`),
  KEY `subscriptions_end_date` (`end_date`),
  CONSTRAINT `subscriptions_ibfk_5` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_ibfk_6` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tenant_limits_config`
--

DROP TABLE IF EXISTS `tenant_limits_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_limits_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `plan_type` enum('basic','premium','business','enterprise') COLLATE utf8mb4_unicode_ci DEFAULT 'basic',
  `max_sequences` int DEFAULT '1',
  `max_broadcasts_monthly` int DEFAULT '2',
  `max_recipients_per_broadcast` int DEFAULT '100',
  `max_messages_daily` int DEFAULT '50',
  `max_messages_hourly` int DEFAULT '8',
  `max_templates_per_sequence` int DEFAULT '4',
  `message_delay_seconds` int DEFAULT '10',
  `is_active` tinyint(1) DEFAULT '1',
  `expires_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tenant` (`tenant_id`),
  CONSTRAINT `tenant_limits_config_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tenant_onboardings`
--

DROP TABLE IF EXISTS `tenant_onboardings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_onboardings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL COMMENT 'ID tenant yang sedang onboarding',
  `user_id` int NOT NULL COMMENT 'ID user yang melakukan onboarding',
  `current_step` enum('branch_setup','user_creation','service_setup','printer_setup','wa_setup','completed') NOT NULL DEFAULT 'branch_setup' COMMENT 'Step onboarding saat ini',
  `completed_steps` json DEFAULT NULL COMMENT 'Array step yang sudah diselesaikan',
  `onboarding_data` json DEFAULT NULL COMMENT 'Data yang dikumpulkan selama onboarding',
  `is_completed` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Apakah onboarding sudah selesai',
  `completed_at` datetime DEFAULT NULL COMMENT 'Tanggal selesai onboarding',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tenant_onboardings_ibfk_5` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tenant_onboardings_ibfk_6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tenant_orders`
--

DROP TABLE IF EXISTS `tenant_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_name` varchar(255) NOT NULL COMMENT 'Nama bisnis laundry',
  `owner_name` varchar(255) NOT NULL COMMENT 'Nama pemilik bisnis',
  `email` varchar(255) NOT NULL COMMENT 'Email pemilik',
  `phone` varchar(255) NOT NULL COMMENT 'Nomor telepon pemilik',
  `whatsapp` varchar(255) NOT NULL COMMENT 'Nomor WhatsApp untuk verifikasi',
  `address` text NOT NULL COMMENT 'Alamat lengkap bisnis',
  `city` varchar(255) NOT NULL COMMENT 'Kota bisnis',
  `selected_plan` varchar(100) NOT NULL COMMENT 'Paket yang dipilih (Starter, Professional, Enterprise)',
  `password` varchar(255) DEFAULT NULL,
  `status` enum('pending_verification','verified','account_created','failed','account_created_no_wa','pending_link_verification') DEFAULT 'pending_verification',
  `otp_code` varchar(6) DEFAULT NULL COMMENT 'Kode OTP untuk verifikasi WhatsApp',
  `otp_expires_at` datetime DEFAULT NULL COMMENT 'Waktu kadaluarsa OTP',
  `verification_attempts` int DEFAULT '0' COMMENT 'Jumlah percobaan verifikasi',
  `verification_token` varchar(255) DEFAULT NULL,
  `verification_expires_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `verification_token` (`verification_token`)
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tenant_payments`
--

DROP TABLE IF EXISTS `tenant_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subscription_id` int DEFAULT NULL,
  `subscription_plan_id` int DEFAULT NULL,
  `tenant_id` int NOT NULL COMMENT 'ID tenant yang membayar',
  `amount` decimal(10,2) NOT NULL COMMENT 'Jumlah pembayaran',
  `status` enum('pending','paid','failed','cancelled','refunded','unpaid') NOT NULL DEFAULT 'unpaid',
  `payment_method` varchar(255) DEFAULT NULL COMMENT 'Metode pembayaran (bank_transfer, credit_card, e_wallet, dll)',
  `payment_reference` varchar(255) DEFAULT NULL COMMENT 'Referensi pembayaran dari gateway',
  `payment_gateway` varchar(255) DEFAULT NULL COMMENT 'Gateway pembayaran yang digunakan',
  `paid_at` datetime DEFAULT NULL COMMENT 'Tanggal pembayaran berhasil',
  `due_date` datetime NOT NULL COMMENT 'Tanggal jatuh tempo pembayaran',
  `billing_period` varchar(7) DEFAULT NULL,
  `invoice_number` varchar(255) DEFAULT NULL COMMENT 'Nomor invoice',
  `receipt_url` varchar(255) DEFAULT NULL COMMENT 'URL bukti pembayaran',
  `notes` text COMMENT 'Catatan pembayaran',
  `is_manual` tinyint(1) DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(255) DEFAULT NULL,
  `account_holder` varchar(255) DEFAULT NULL,
  `payment_code` varchar(255) DEFAULT NULL,
  `payment_url` varchar(500) DEFAULT NULL COMMENT 'URL checkout pembayaran (untuk Tripay)',
  `expired_at` datetime DEFAULT NULL COMMENT 'Tanggal expired transaksi pembayaran',
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  UNIQUE KEY `tenant_payments_invoice_number` (`invoice_number`),
  UNIQUE KEY `invoice_number_2` (`invoice_number`),
  UNIQUE KEY `invoice_number_3` (`invoice_number`),
  KEY `tenant_payments_subscription_id` (`subscription_id`),
  KEY `tenant_payments_tenant_id` (`tenant_id`),
  KEY `tenant_payments_status` (`status`),
  KEY `tenant_payments_due_date` (`due_date`),
  CONSTRAINT `tenant_payments_ibfk_5` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tenant_payments_ibfk_6` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_name` varchar(255) NOT NULL COMMENT 'Nama bisnis laundry',
  `owner_name` varchar(255) NOT NULL COMMENT 'Nama pemilik bisnis',
  `email` varchar(255) NOT NULL COMMENT 'Email pemilik bisnis',
  `phone` varchar(255) NOT NULL COMMENT 'Nomor telepon pemilik',
  `address` text NOT NULL COMMENT 'Alamat bisnis',
  `city` varchar(255) DEFAULT NULL COMMENT 'Kota bisnis',
  `status` enum('active','inactive','suspended','trial','pending_payment','expired') NOT NULL DEFAULT 'trial',
  `trial_end_date` datetime DEFAULT NULL COMMENT 'Tanggal berakhir trial',
  `subscription_status` enum('trial','active','expired','cancelled','pending_payment') NOT NULL DEFAULT 'trial' COMMENT 'Status langganan',
  `settings` json DEFAULT NULL COMMENT 'Pengaturan khusus tenant',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `tenants_email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  KEY `tenants_status` (`status`),
  KEY `tenants_subscription_status` (`subscription_status`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `treatment`
--

DROP TABLE IF EXISTS `treatment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `treatment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `type_item` varchar(255) NOT NULL,
  `type_service` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik treatment',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Status aktif treatment',
  PRIMARY KEY (`id`),
  KEY `treatment_tenant_id` (`tenant_id`),
  CONSTRAINT `treatment_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=292 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `branch_id` int DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `role` varchar(255) NOT NULL DEFAULT 'employee',
  `salary` int DEFAULT NULL,
  `salary_date` date DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int DEFAULT NULL COMMENT 'ID tenant pemilik user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `email_11` (`email`),
  KEY `branch_id` (`branch_id`),
  KEY `users_tenant_id` (`tenant_id`),
  CONSTRAINT `users_ibfk_19` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `users_ibfk_20` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=105 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_connections`
--

DROP TABLE IF EXISTS `wa_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wa_connections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `connection_id` varchar(255) NOT NULL COMMENT 'WhatsApp connection ID from WA Gateway',
  `connection_type` enum('superapp','promotion','cs','followup','tenant') NOT NULL DEFAULT 'superapp' COMMENT 'Type of WhatsApp connection',
  `tenant_id` int DEFAULT NULL COMMENT 'Tenant ID (NULL for superapp connections)',
  `branch_id` int DEFAULT NULL COMMENT 'Branch ID (NULL for superapp connections)',
  `status` enum('PENDING','READY','DISCONNECTED','FAILED','DESTROYED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the WhatsApp connection',
  `phone_number` varchar(20) DEFAULT NULL COMMENT 'Connected WhatsApp phone number',
  `qr_code` text COMMENT 'QR code data for authentication',
  `last_activity` datetime DEFAULT NULL COMMENT 'Last activity timestamp',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `connection_id` (`connection_id`),
  UNIQUE KEY `connection_id_2` (`connection_id`),
  UNIQUE KEY `connection_id_3` (`connection_id`),
  KEY `idx_connection_type` (`connection_type`),
  KEY `idx_status` (`status`),
  KEY `idx_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `wa_connections_connection_type` (`connection_type`),
  KEY `wa_connections_status` (`status`),
  KEY `wa_connections_tenant_id_branch_id` (`tenant_id`,`branch_id`),
  KEY `wa_connections_created_at` (`created_at`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `wa_connections_ibfk_3` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `wa_connections_ibfk_4` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='WhatsApp connections for different purposes';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_sessions`
--

DROP TABLE IF EXISTS `wa_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wa_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(255) NOT NULL COMMENT 'WhatsApp session ID from WA Gateway',
  `tenant_id` int NOT NULL COMMENT 'Tenant ID for multi-tenant support',
  `branch_id` int DEFAULT NULL,
  `session_type` enum('general','tenant_campaign','tenant','superapp') DEFAULT 'general',
  `status` enum('PENDING','READY','DISCONNECTED','FAILED','DESTROYED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the WhatsApp session',
  `phone_number` varchar(20) DEFAULT NULL COMMENT 'Connected WhatsApp phone number',
  `qr_code` text COMMENT 'QR code data for authentication',
  `last_activity` datetime DEFAULT NULL COMMENT 'Last activity timestamp',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_id` (`session_id`),
  UNIQUE KEY `session_id_2` (`session_id`),
  UNIQUE KEY `session_id_3` (`session_id`),
  KEY `wa_sessions_tenant_id_branch_id` (`tenant_id`,`branch_id`),
  KEY `wa_sessions_session_id` (`session_id`),
  KEY `wa_sessions_status` (`status`),
  KEY `wa_sessions_created_at` (`created_at`),
  KEY `branch_id` (`branch_id`),
  KEY `idx_tenant_campaign_sessions` (`tenant_id`,`session_type`),
  CONSTRAINT `wa_sessions_ibfk_5` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `wa_sessions_ibfk_6` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_verifications`
--

DROP TABLE IF EXISTS `wa_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wa_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `whatsapp_number` varchar(255) NOT NULL COMMENT 'Nomor WhatsApp yang diverifikasi',
  `otp_code` varchar(6) NOT NULL COMMENT 'Kode OTP yang dikirim',
  `otp_expires_at` datetime NOT NULL COMMENT 'Waktu kadaluarsa OTP',
  `verification_attempts` int DEFAULT '0' COMMENT 'Jumlah percobaan verifikasi',
  `status` enum('sent','verified','expired','failed') DEFAULT 'sent' COMMENT 'Status verifikasi',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `wa_verifications_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `tenant_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `whatsapp_templates`
--

DROP TABLE IF EXISTS `whatsapp_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama template untuk identifikasi',
  `category` enum('invoice','invoice_paid','invoice_dp','invoice_unpaid','item_done','delivery','pickup','notification','promotion','reminder','campaign','broadcast','announcement','other','followup') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Judul template yang ditampilkan di UI',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Deskripsi template',
  `template_content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Konten template dengan placeholder variables',
  `variables` json DEFAULT NULL COMMENT 'Daftar variable yang bisa digunakan dalam template',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Status aktif template',
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Template default untuk kategori tertentu',
  `tenant_id` int NOT NULL COMMENT 'ID tenant pemilik template',
  `branch_id` int DEFAULT NULL COMMENT 'ID branch (null = untuk semua branch)',
  `created_by` int DEFAULT NULL COMMENT 'ID user yang membuat template',
  `updated_by` int DEFAULT NULL COMMENT 'ID user yang terakhir update template',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Template system yang tidak bisa dihapus dan diedit',
  PRIMARY KEY (`id`),
  KEY `idx_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `idx_category_active` (`category`,`is_active`),
  KEY `idx_name_tenant` (`name`,`tenant_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_updated_by` (`updated_by`),
  KEY `whatsapp_templates_tenant_id_branch_id` (`tenant_id`,`branch_id`),
  KEY `whatsapp_templates_category_is_active` (`category`,`is_active`),
  KEY `whatsapp_templates_name_tenant_id` (`name`,`tenant_id`),
  KEY `whatsapp_templates_is_system_category_idx` (`is_system`,`category`),
  KEY `whatsapp_templates_is_system_category` (`is_system`,`category`),
  CONSTRAINT `whatsapp_templates_ibfk_5` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `whatsapp_templates_ibfk_6` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `whatsapp_templates_ibfk_7` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `whatsapp_templates_ibfk_8` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Template WhatsApp untuk berbagai kategori pesan';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'katsikat'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-16  5:24:26
