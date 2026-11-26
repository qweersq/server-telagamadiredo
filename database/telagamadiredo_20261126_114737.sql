-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: 127.0.0.1    Database: telagamadiredo
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `telagamadiredo`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `telagamadiredo` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `telagamadiredo`;

--
-- Table structure for table `SequelizeMeta`
--

DROP TABLE IF EXISTS `SequelizeMeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `SequelizeMeta` (
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SequelizeMeta`
--

LOCK TABLES `SequelizeMeta` WRITE;
/*!40000 ALTER TABLE `SequelizeMeta` DISABLE KEYS */;
INSERT INTO `SequelizeMeta` VALUES ('20250120000000-add-trial-status-to-subscriptions.js'),('20250122000000-fix-emoji-encoding-whatsapp-templates.js'),('20250122100000-create-superapp-expenses.js'),('20250127000000-create-treatment-addon-system.js'),('20250127100000-migrate-existing-order-details-addon.js'),('20250128000000-fix-status-siap-diambil-underscore.js'),('20250129000000-add-custom-price-and-tracking.js'),('20250129100000-add-custom-price-reason.js'),('20250129110000-add-is-product-to-order-details.js'),('20250130000000-add-billing-reminder-flags.js'),('20250130000000-add-has-received-first-order-bonus-to-customers.js'),('20250130000001-add-refresh-token-to-users.js'),('20250130000003-create-refresh-tokens-table.js'),('20250131000000-make-customer-memberships-end-date-nullable.js'),('20250201000000-fix-shift-ids-by-timestamps.js'),('20250201010000-restore-payment-detail-shift.js'),('20250201011000-extend-order-detail-delivery-status.js'),('20250202000000-make-subscriptions-end-date-nullable.js'),('20250202010000-insert-notafree-plan.js'),('20250202020000-downgrade-expired-to-notafree.js'),('20250203000000-insert-3month-and-yearly-plans.js'),('20250204000000-create-app-versions.js'),('20250205000000-add-password-reset-fields.js'),('20250206000000-create-admin-notes.js'),('20251116104525-add-discount-id-to-payments.js'),('20251116111623-add-referral-to-orders.js'),('20251220000000-add-points-system.js'),('20251222000000-add-bonus-type-to-point-transactions.js'),('20260101000000-create-droppoints.js'),('20260101100000-add-droppoint-to-orders.js'),('20260101200000-add-droppoint-to-users.js'),('20260102000000-create-branch-mitra-relations.js'),('20260102000001-add-branch-type-to-branches.js'),('20260105000000-add-cash-change-to-payment-details.js'),('20260130000000-create-incomes.js'),('20260130081300-create-incomes.js'),('20260516000000-add-notified-to-orders.js'),('20260523000001-create-push-tokens.js'),('20260523000002-create-notification-settings.js'),('20260523000003-create-notifications.js'),('20260526000001-create-calendar-notes.js'),('20260706010101-create-tenant-ai-credits.js'),('20260706010102-create-ai-credit-packages.js'),('20260706010103-add-ai-credit-to-tenants.js'),('20261019000000-create-tag-sequences-and-tag-columns.js'),('20261114000000-create-daily-tasks.js'),('20261115000000-create-work-schedules.js'),('20261115000100-add-photo-verification-to-absents.js'),('20261115000200-create-treatment-stocks.js'),('20261115000300-add-unit-to-treatment.js'),('20261115000400-add-serve-mode-and-options-to-order-details.js'),('20261115000500-add-customer-note-to-orders.js'),('20261115000600-add-mixed-to-branch-order-mode.js'),('20261115000700-add-production-routing.js'),('20261115000800-add-production-branch-to-treatment.js'),('20261126010000-create-product-categories.js'),('20261126120000-add-order-mode-to-product-categories.js'),('20261126130000-add-requires-payment-proof-to-finance-accounts.js');
/*!40000 ALTER TABLE `SequelizeMeta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `absents`
--

DROP TABLE IF EXISTS `absents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `absents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `clock_in` time NOT NULL,
  `clock_out` time DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `work_duration` time DEFAULT NULL,
  `photo_clock_in` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL COMMENT 'Employee latitude when checking in',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT 'Employee longitude when checking in',
  `accuracy` decimal(8,2) DEFAULT NULL COMMENT 'GPS accuracy in meters',
  `location_validated` tinyint(1) DEFAULT 0 COMMENT 'Whether location was validated against branch',
  `schedule_id` int(11) DEFAULT NULL COMMENT 'Jadwal yang dipakai saat check-in',
  `expected_clock_in` time DEFAULT NULL COMMENT 'Snapshot jam masuk normal hari itu',
  `expected_clock_out` time DEFAULT NULL COMMENT 'Snapshot jam pulang normal hari itu',
  `late_minutes` int(11) DEFAULT NULL COMMENT 'Menit keterlambatan setelah dikurangi toleransi, 0 = tepat waktu',
  `is_late` tinyint(1) NOT NULL DEFAULT 0,
  `photo_clock_out` varchar(500) DEFAULT NULL,
  `clock_in_lat` decimal(11,8) DEFAULT NULL,
  `clock_in_lng` decimal(11,8) DEFAULT NULL,
  `clock_in_distance_m` int(11) DEFAULT NULL,
  `clock_in_photo_at` datetime DEFAULT NULL,
  `clock_out_lat` decimal(11,8) DEFAULT NULL,
  `clock_out_lng` decimal(11,8) DEFAULT NULL,
  `clock_out_distance_m` int(11) DEFAULT NULL,
  `clock_out_photo_at` datetime DEFAULT NULL,
  `ai_clock_in_status` varchar(20) NOT NULL DEFAULT 'skipped' COMMENT 'pending | processing | done | failed | skipped',
  `ai_clock_in_score` tinyint(3) unsigned DEFAULT NULL,
  `ai_clock_in_verdict` varchar(20) DEFAULT NULL COMMENT 'verified | review | reject',
  `ai_clock_in_reason` text DEFAULT NULL,
  `ai_clock_in_raw` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ai_clock_in_raw`)),
  `ai_clock_in_at` datetime DEFAULT NULL,
  `ai_clock_out_status` varchar(20) NOT NULL DEFAULT 'skipped' COMMENT 'pending | processing | done | failed | skipped',
  `ai_clock_out_score` tinyint(3) unsigned DEFAULT NULL,
  `ai_clock_out_verdict` varchar(20) DEFAULT NULL COMMENT 'verified | review | reject',
  `ai_clock_out_reason` text DEFAULT NULL,
  `ai_clock_out_raw` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ai_clock_out_raw`)),
  `ai_clock_out_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  KEY `branch_id` (`branch_id`),
  KEY `idx_absents_location` (`latitude`,`longitude`),
  KEY `idx_absents_location_validated` (`location_validated`),
  KEY `absents_schedule_id_foreign_idx` (`schedule_id`),
  CONSTRAINT `absents_ibfk_39` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `absents_ibfk_40` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `absents_schedule_id_foreign_idx` FOREIGN KEY (`schedule_id`) REFERENCES `work_schedules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2272 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `absents`
--

LOCK TABLES `absents` WRITE;
/*!40000 ALTER TABLE `absents` DISABLE KEYS */;
INSERT INTO `absents` VALUES (2268,1,1,'2026-11-14','09:30:19','09:31:00','Present','Manual end work - User input',NULL,NULL,'2026-11-14 02:30:19','2026-11-14 12:56:30',NULL,-7.96290600,112.65445518,40.00,1,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,'2026-11-14 12:56:30','skipped',NULL,NULL,NULL,NULL,NULL),(2270,130,1,'2026-11-14','20:22:40','12:22:00','Present','Absen pulang manual - Input pengguna',NULL,NULL,'2026-11-14 13:22:40','2026-11-14 13:23:07',NULL,-7.82462001,112.46942094,35.00,0,4,'10:00:00','21:00:00',607,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL),(2271,129,1,'2026-11-14','20:34:35','20:35:00','Present','Absen pulang (foto GPS camera)',NULL,'http://localhost:3003/public/images/item/November-2026/1794663276066-0-anonymous--IMG_1674.jpg','2026-11-14 13:34:36','2026-11-14 13:35:34',NULL,-7.82461997,112.46942093,35.00,1,1,'08:00:00','20:00:00',739,1,'http://localhost:3003/public/images/item/November-2026/1794663331913-0-anonymous--IMG_1674.jpg',-7.96290800,112.65457800,25546,'2026-11-14 03:51:00',-7.96290800,112.65457800,25546,'2026-11-14 03:51:00','done',25,'reject','Ditolak: Watermark terbaca, 25546 m dari cabang (batas 150 m). lokasi foto di luar radius wajar. Tidak ada wajah karyawan yang terlihat, lokasi di watermark tidak sesuai dengan koordinat cabang.','{\"ai\":{\"watermark_readable\":true,\"latitude\":-7.962908,\"longitude\":112.654578,\"taken_at\":\"2026-11-14 10:51\",\"watermark_address\":\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\",\"person_visible\":false,\"looks_like_workplace\":true,\"is_screenshot\":false,\"confidence\":95,\"reason\":\"Tidak ada wajah karyawan yang terlihat, lokasi di watermark tidak sesuai dengan koordinat cabang.\"},\"parts\":{\"distance\":{\"score\":0,\"weight\":40,\"value\":25546},\"date\":{\"score\":100,\"weight\":25,\"value\":\"2026-11-14 10:51\"},\"time\":{\"score\":0,\"weight\":20,\"value\":\"20:34:35\"},\"presence\":{\"score\":0,\"weight\":15,\"value\":false}},\"raw\":\"{\\n  \\\"watermark_readable\\\": true,\\n  \\\"latitude\\\": -7.962908,\\n  \\\"longitude\\\": 112.654578,\\n  \\\"taken_at\\\": \\\"2026-11-14 10:51\\\",\\n  \\\"watermark_address\\\": \\\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\\\",\\n  \\\"person_visible\\\": false,\\n  \\\"looks_like_workplace\\\": true,\\n  \\\"is_screenshot\\\": false,\\n  \\\"confidence\\\": 95,\\n  \\\"reason\\\": \\\"Tidak ada wajah karyawan yang terlihat, lokasi di watermark tidak sesuai dengan koordinat cabang.\\\"\\n}\"}','2026-11-14 13:34:38','done',25,'reject','Ditolak: Watermark terbaca, 25546 m dari cabang (batas 150 m). lokasi foto di luar radius wajar. Lokasi tidak sesuai dengan cabang, waktu absen salah, dan tidak ada orang di dalam foto.','{\"ai\":{\"watermark_readable\":true,\"latitude\":-7.962908,\"longitude\":112.654578,\"taken_at\":\"2026-11-14 10:51\",\"watermark_address\":\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\",\"person_visible\":false,\"looks_like_workplace\":false,\"is_screenshot\":false,\"confidence\":100,\"reason\":\"Lokasi tidak sesuai dengan cabang, waktu absen salah, dan tidak ada orang di dalam foto.\"},\"parts\":{\"distance\":{\"score\":0,\"weight\":40,\"value\":25546},\"date\":{\"score\":100,\"weight\":25,\"value\":\"2026-11-14 10:51\"},\"time\":{\"score\":0,\"weight\":20,\"value\":\"20:35:00\"},\"presence\":{\"score\":0,\"weight\":15,\"value\":false}},\"raw\":\"{\\n  \\\"watermark_readable\\\": true,\\n  \\\"latitude\\\": -7.962908,\\n  \\\"longitude\\\": 112.654578,\\n  \\\"taken_at\\\": \\\"2026-11-14 10:51\\\",\\n  \\\"watermark_address\\\": \\\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\\\",\\n  \\\"person_visible\\\": false,\\n  \\\"looks_like_workplace\\\": false,\\n  \\\"is_screenshot\\\": false,\\n  \\\"confidence\\\": 100,\\n  \\\"reason\\\": \\\"Lokasi tidak sesuai dengan cabang, waktu absen salah, dan tidak ada orang di dalam foto.\\\"\\n}\"}','2026-11-14 13:35:34');
/*!40000 ALTER TABLE `absents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_notes`
--

DROP TABLE IF EXISTS `admin_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT 'Judul notes',
  `content` text NOT NULL COMMENT 'Isi notes',
  `customer_id` int(11) DEFAULT NULL COMMENT 'ID customer jika notes terkait customer',
  `order_id` int(11) DEFAULT NULL COMMENT 'ID order jika notes terkait order',
  `status` enum('pending','done','archived') NOT NULL DEFAULT 'pending' COMMENT 'Status notes',
  `priority` enum('low','normal','high') NOT NULL DEFAULT 'normal' COMMENT 'Prioritas notes',
  `due_date` date DEFAULT NULL COMMENT 'Tanggal deadline notes',
  `created_by` int(11) NOT NULL COMMENT 'ID user yang membuat notes',
  `updated_by` int(11) DEFAULT NULL COMMENT 'ID user yang terakhir mengupdate notes',
  `done_by` int(11) DEFAULT NULL COMMENT 'ID user yang mark notes sebagai done',
  `done_at` datetime DEFAULT NULL COMMENT 'Tanggal kapan notes di-mark sebagai done',
  `branch_id` int(11) NOT NULL COMMENT 'ID cabang notes',
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant pemilik notes',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `done_by` (`done_by`),
  KEY `idx_admin_notes_branch_id` (`branch_id`),
  KEY `idx_admin_notes_tenant_id` (`tenant_id`),
  KEY `idx_admin_notes_customer_id` (`customer_id`),
  KEY `idx_admin_notes_order_id` (`order_id`),
  KEY `idx_admin_notes_status` (`status`),
  KEY `idx_admin_notes_priority` (`priority`),
  KEY `idx_admin_notes_due_date` (`due_date`),
  CONSTRAINT `admin_notes_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `admin_notes_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `admin_notes_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admin_notes_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `admin_notes_ibfk_5` FOREIGN KEY (`done_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `admin_notes_ibfk_6` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admin_notes_ibfk_7` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_notes`
--

LOCK TABLES `admin_notes` WRITE;
/*!40000 ALTER TABLE `admin_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_credit_packages`
--

DROP TABLE IF EXISTS `ai_credit_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_credit_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `credits` int(11) NOT NULL COMMENT 'Jumlah credit (-1 untuk unlimited)',
  `price` decimal(10,2) NOT NULL COMMENT 'Harga dalam Rupiah',
  `platform` enum('TRIPAY','APP_STORE','BOTH') NOT NULL DEFAULT 'BOTH',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime DEFAULT current_timestamp(),
  `updatedAt` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_credit_packages`
--

LOCK TABLES `ai_credit_packages` WRITE;
/*!40000 ALTER TABLE `ai_credit_packages` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_credit_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `app_versions`
--

DROP TABLE IF EXISTS `app_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_versions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `platform` enum('android','ios','web') NOT NULL COMMENT 'Platform aplikasi',
  `version` varchar(20) NOT NULL COMMENT 'Version aplikasi (contoh: 1.0.0)',
  `version_code` int(11) DEFAULT NULL COMMENT 'Version code untuk Android',
  `min_required_version` varchar(20) NOT NULL COMMENT 'Minimum required version',
  `force_update` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Wajib update atau tidak',
  `update_message` text DEFAULT NULL COMMENT 'Pesan update',
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'List fitur baru (JSON array)' CHECK (json_valid(`features`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif atau tidak',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_platform` (`platform`),
  KEY `idx_platform_active` (`platform`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_versions`
--

LOCK TABLES `app_versions` WRITE;
/*!40000 ALTER TABLE `app_versions` DISABLE KEYS */;
/*!40000 ALTER TABLE `app_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_mitra_relations`
--

DROP TABLE IF EXISTS `branch_mitra_relations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branch_mitra_relations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_branch_id` int(11) NOT NULL COMMENT 'ID cabang utama (parent)',
  `mitra_branch_id` int(11) NOT NULL COMMENT 'ID cabang mitra (child)',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active' COMMENT 'Status relasi mitra',
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant pemilik relasi',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mitra_branch_id` (`mitra_branch_id`),
  UNIQUE KEY `branch_mitra_relations_mitra_branch_id` (`mitra_branch_id`),
  KEY `idx_branch_mitra_parent_id` (`parent_branch_id`),
  KEY `idx_branch_mitra_mitra_id` (`mitra_branch_id`),
  KEY `idx_branch_mitra_tenant_id` (`tenant_id`),
  KEY `idx_branch_mitra_status` (`status`),
  KEY `idx_branch_mitra_parent_status` (`parent_branch_id`,`status`),
  KEY `idx_branch_mitra_tenant_status` (`tenant_id`,`status`),
  KEY `branch_mitra_relations_parent_branch_id` (`parent_branch_id`),
  KEY `branch_mitra_relations_tenant_id` (`tenant_id`),
  KEY `branch_mitra_relations_status` (`status`),
  CONSTRAINT `branch_mitra_relations_ibfk_1` FOREIGN KEY (`parent_branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `branch_mitra_relations_ibfk_2` FOREIGN KEY (`mitra_branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `branch_mitra_relations_ibfk_3` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_mitra_relations`
--

LOCK TABLES `branch_mitra_relations` WRITE;
/*!40000 ALTER TABLE `branch_mitra_relations` DISABLE KEYS */;
/*!40000 ALTER TABLE `branch_mitra_relations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `city` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik cabang',
  `status` enum('active','inactive','maintenance','suspended','closed') NOT NULL DEFAULT 'active' COMMENT 'Status of the branch: active, inactive, maintenance, suspended, closed',
  `branch_type` enum('main','mitra') NOT NULL DEFAULT 'main' COMMENT 'Tipe cabang: main (cabang utama) atau mitra (sub-branch)',
  `order_mode` enum('loket','cafe','mixed') NOT NULL DEFAULT 'loket' COMMENT 'Mode operasional cabang: loket (tiket/retribusi), cafe (F&B), mixed (keduanya)',
  `wa_session_id` varchar(255) DEFAULT NULL COMMENT 'WhatsApp session ID for gateway integration',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT 'Branch longitude for attendance validation',
  `checkin_radius_m` int(11) NOT NULL DEFAULT 150 COMMENT 'Radius toleransi GPS foto bukti (meter)',
  `latitude` decimal(11,8) DEFAULT NULL COMMENT 'Branch latitude for attendance validation',
  `kitchen_branch_id` int(11) DEFAULT NULL COMMENT 'Dapur produksi default. Null = masak di cabang sendiri',
  PRIMARY KEY (`id`),
  KEY `branches_tenant_id` (`tenant_id`),
  KEY `idx_branches_wa_session_id` (`wa_session_id`),
  KEY `idx_branches_location` (`latitude`,`longitude`),
  KEY `idx_branches_tenant_status` (`tenant_id`,`status`),
  KEY `branches_status` (`status`),
  KEY `branches_wa_session_id` (`wa_session_id`),
  KEY `idx_branches_type` (`branch_type`),
  KEY `idx_branches_tenant_type` (`tenant_id`,`branch_type`),
  KEY `branches_branch_type` (`branch_type`),
  KEY `idx_branches_order_mode` (`order_mode`),
  KEY `branches_order_mode` (`order_mode`),
  KEY `idx_branches_kitchen_branch` (`kitchen_branch_id`),
  CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `branches_kitchen_branch_id_foreign_idx` FOREIGN KEY (`kitchen_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (1,'Loket Utama Telaga','Jl. Raya Telaga Madiredo, Pujon, Kabupaten Malang, Jawa Timur','+6281234567890',1,'Malang','2026-10-31 09:31:04','2026-11-14 13:34:16',NULL,1,'active','main','loket',NULL,112.46941375,150,-7.82455869,NULL),(77,'Cafe 1 Telaga','Jl. Raya Telaga Madiredo, Pujon, Kabupaten Malang, Jawa Timur','+6281234567890',0,'Malang','2026-11-15 05:16:29','2026-11-26 02:50:53',NULL,1,'active','main','cafe',NULL,112.46941375,150,-7.82455869,NULL),(78,'Cafe 2 Telaga','Jl. Raya Telaga Madiredo, Pujon, Kabupaten Malang, Jawa Timur','+6281234567890',0,'Malang','2026-11-15 05:16:29','2026-11-26 02:50:59',NULL,1,'active','main','cafe',NULL,112.46941375,150,-7.82455869,77),(79,'Cafe 3 Telaga','Jl. Raya Telaga Madiredo, Pujon, Kabupaten Malang, Jawa Timur','+6281234567890',0,'Malang','2026-11-15 05:16:29','2026-11-26 02:51:08',NULL,1,'active','main','cafe',NULL,112.46941375,150,-7.82455869,77);
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `broadcast_history`
--

DROP TABLE IF EXISTS `broadcast_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `broadcast_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `broadcast_type` enum('promo','announcement','reminder','custom') DEFAULT 'custom',
  `broadcast_date` date NOT NULL,
  `broadcast_time` time NOT NULL,
  `total_recipients` int(11) NOT NULL,
  `success_count` int(11) DEFAULT 0,
  `failed_count` int(11) DEFAULT 0,
  `pending_count` int(11) DEFAULT 0,
  `message_content` text DEFAULT NULL,
  `template_id` int(11) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','cancelled') DEFAULT 'pending',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
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
-- Dumping data for table `broadcast_history`
--

LOCK TABLES `broadcast_history` WRITE;
/*!40000 ALTER TABLE `broadcast_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `broadcast_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bug_reports`
--

DROP TABLE IF EXISTS `bug_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bug_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `status` enum('pending','in_progress','resolved','closed') DEFAULT 'pending',
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bug_reports`
--

LOCK TABLES `bug_reports` WRITE;
/*!40000 ALTER TABLE `bug_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `bug_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `businesses`
--

DROP TABLE IF EXISTS `businesses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `businesses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `type` varchar(255) NOT NULL,
  `pic_name` varchar(255) NOT NULL,
  `pic_phone` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `is_active` enum('active','inactive') NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `businesses`
--

LOCK TABLES `businesses` WRITE;
/*!40000 ALTER TABLE `businesses` DISABLE KEYS */;
/*!40000 ALTER TABLE `businesses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calendar_notes`
--

DROP TABLE IF EXISTS `calendar_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `calendar_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant pemilik',
  `branch_id` int(11) NOT NULL COMMENT 'ID cabang',
  `date` date NOT NULL COMMENT 'Tanggal catatan (YYYY-MM-DD)',
  `note` text NOT NULL COMMENT 'Isi catatan',
  `created_by` int(11) DEFAULT NULL COMMENT 'User yang membuat catatan',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_calendar_notes_tenant_branch_date` (`tenant_id`,`branch_id`,`date`),
  KEY `branch_id` (`branch_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_calendar_notes_tenant_branch` (`tenant_id`,`branch_id`),
  CONSTRAINT `calendar_notes_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `calendar_notes_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `calendar_notes_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendar_notes`
--

LOCK TABLES `calendar_notes` WRITE;
/*!40000 ALTER TABLE `calendar_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `calendar_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_customers`
--

DROP TABLE IF EXISTS `campaign_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `campaign_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  `retry_count` int(11) NOT NULL DEFAULT 0,
  `sent_at` timestamp NULL DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deletedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_campaign_customer` (`campaign_id`,`customer_id`),
  KEY `idx_campaign_customers_campaign_status` (`campaign_id`,`status`),
  KEY `idx_campaign_customers_customer` (`customer_id`),
  CONSTRAINT `campaign_customers_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaign_customers_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10735 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_customers`
--

LOCK TABLES `campaign_customers` WRITE;
/*!40000 ALTER TABLE `campaign_customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaign_customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaigns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `message_content` text NOT NULL,
  `target_audience` enum('follow_up_15','follow_up_30','follow_up_60','all') DEFAULT 'follow_up_30',
  `total_customers` int(11) NOT NULL DEFAULT 0,
  `sent_count` int(11) NOT NULL DEFAULT 0,
  `failed_count` int(11) NOT NULL DEFAULT 0,
  `status` enum('draft','running','completed','error','paused','cooldown') DEFAULT 'draft',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `template_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deletedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_default` tinyint(1) DEFAULT 0,
  `is_editable` tinyint(1) DEFAULT 1,
  `last_started_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu terakhir campaign di-start',
  `cooldown_until` timestamp NULL DEFAULT NULL COMMENT 'Waktu cooldown berakhir (14 hari setelah selesai/error)',
  `follow_up_days` int(11) DEFAULT 30 COMMENT 'Jumlah hari follow-up untuk customer targeting',
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
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaigns`
--

LOCK TABLES `campaigns` WRITE;
/*!40000 ALTER TABLE `campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `capital_records`
--

DROP TABLE IF EXISTS `capital_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `capital_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `date` datetime NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `photos` varchar(255) DEFAULT NULL,
  `payment_method` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `capital_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `capital_records`
--

LOCK TABLES `capital_records` WRITE;
/*!40000 ALTER TABLE `capital_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `capital_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collaborations`
--

DROP TABLE IF EXISTS `collaborations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `collaborations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `business_id` int(11) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `collaborations_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collaborations`
--

LOCK TABLES `collaborations` WRITE;
/*!40000 ALTER TABLE `collaborations` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaborations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_followup_sequences`
--

DROP TABLE IF EXISTS `customer_followup_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_followup_sequences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL COMMENT 'ID customer',
  `sequence_id` int(11) NOT NULL COMMENT 'ID sequence follow-up',
  `current_step` int(11) NOT NULL DEFAULT 0 COMMENT 'Step saat ini dalam sequence (0 = belum mulai)',
  `last_order_date` date DEFAULT NULL COMMENT 'Tanggal order terakhir customer',
  `last_sent_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu terakhir template dikirim',
  `next_send_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu pengiriman template berikutnya',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif sequence untuk customer ini',
  `is_paused` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Status pause sementara',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu sequence selesai (semua step terkirim)',
  `total_sent` int(11) NOT NULL DEFAULT 0 COMMENT 'Total template yang sudah dikirim',
  `total_responded` int(11) NOT NULL DEFAULT 0 COMMENT 'Total respon dari customer',
  `converted_order_id` int(11) DEFAULT NULL COMMENT 'ID order yang dihasilkan dari follow-up (jika ada)',
  `notes` text DEFAULT NULL COMMENT 'Catatan tambahan',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
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
-- Dumping data for table `customer_followup_sequences`
--

LOCK TABLES `customer_followup_sequences` WRITE;
/*!40000 ALTER TABLE `customer_followup_sequences` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_followup_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_followups`
--

DROP TABLE IF EXISTS `customer_followups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_followups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `message_content` text NOT NULL,
  `sent_at` timestamp NULL DEFAULT current_timestamp(),
  `status` enum('sent','failed') DEFAULT 'sent',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
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
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_followups`
--

LOCK TABLES `customer_followups` WRITE;
/*!40000 ALTER TABLE `customer_followups` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_followups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_memberships`
--

DROP TABLE IF EXISTS `customer_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_memberships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL COMMENT 'ID customer yang membeli membership',
  `membership_id` int(11) NOT NULL COMMENT 'ID program membership yang dibeli',
  `payment_id` int(11) DEFAULT NULL,
  `start_date` datetime NOT NULL COMMENT 'Tanggal mulai membership',
  `end_date` datetime DEFAULT NULL COMMENT 'Tanggal berakhir membership (NULL untuk tier-based membership yang tidak expire)',
  `status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active' COMMENT 'Status membership customer',
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik customer membership',
  `branch_id` int(11) DEFAULT NULL COMMENT 'ID branch pemilik customer membership',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
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
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_memberships`
--

LOCK TABLES `customer_memberships` WRITE;
/*!40000 ALTER TABLE `customer_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `age` int(11) DEFAULT NULL,
  `working_type` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `description` text DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik customer',
  `current_membership_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL COMMENT 'ID branch tempat customer terdaftar',
  `last_order_date` timestamp NULL DEFAULT NULL COMMENT 'Tanggal order terakhir customer (untuk follow-up targeting)',
  `points` int(11) NOT NULL DEFAULT 0 COMMENT 'Poin saat ini yang bisa dipakai untuk redeem',
  `lifetime_points` int(11) NOT NULL DEFAULT 0 COMMENT 'Total poin yang pernah didapat (untuk tier membership, tidak pernah turun)',
  `has_received_first_order_bonus` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag untuk tracking apakah customer sudah pernah dapat first order bonus (sekali seumur hidup)',
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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'Pelanggan Umum',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-13 08:58:55','2026-11-13 08:58:55',NULL,NULL,1,NULL,1,NULL,0,0,0),(2,'akbar',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-14 22:21:46','2026-11-14 22:21:46',NULL,NULL,1,NULL,77,NULL,0,0,0),(3,'fahra',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-15 00:39:19','2026-11-15 00:39:19',NULL,NULL,1,NULL,77,NULL,0,0,0),(4,'ellina',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-15 02:02:23','2026-11-15 02:02:23',NULL,NULL,1,NULL,77,NULL,0,0,0),(6,'hadad',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-15 04:18:31','2026-11-15 04:18:31',NULL,NULL,1,NULL,77,NULL,0,0,0),(11,'anggun',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-15 04:41:06','2026-11-15 04:41:06',NULL,NULL,1,NULL,77,NULL,0,0,0),(12,'bu sinta',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-15 05:07:48','2026-11-15 05:07:48',NULL,NULL,1,NULL,78,NULL,0,0,0),(13,'fikri',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-15 12:34:34','2026-11-15 12:34:34',NULL,NULL,1,NULL,78,NULL,0,0,0),(14,'yuwi',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-15 13:01:15','2026-11-15 13:01:15',NULL,NULL,1,NULL,78,NULL,0,0,0),(15,'algozali',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-15 13:02:56','2026-11-15 13:02:56',NULL,NULL,1,NULL,78,NULL,0,0,0),(16,'akbar',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-26 02:15:15','2026-11-26 02:15:15',NULL,NULL,1,NULL,79,NULL,0,0,0),(18,'rizan',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-26 03:58:25','2026-11-26 03:58:25',NULL,NULL,1,NULL,77,NULL,0,0,0),(19,'sari',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-26 03:59:58','2026-11-26 03:59:58',NULL,NULL,1,NULL,78,NULL,0,0,0);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_tasks`
--

DROP TABLE IF EXISTS `daily_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `daily_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL COMMENT 'Cabang tempat tugas dikerjakan',
  `user_id` int(11) NOT NULL COMMENT 'Karyawan yang ditugaskan',
  `task_template_id` int(11) DEFAULT NULL COMMENT 'NULL = tugas tambahan manual',
  `title` varchar(150) NOT NULL COMMENT 'Salinan nama tugas agar riwayat tetap utuh',
  `area` varchar(150) DEFAULT NULL,
  `requires_photo` tinyint(1) NOT NULL DEFAULT 0,
  `task_date` date NOT NULL COMMENT 'Tanggal tugas (YYYY-MM-DD)',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | done | incomplete',
  `completed_at` datetime DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL COMMENT 'Foto bukti (opsional)',
  `photo_lat` decimal(11,8) DEFAULT NULL COMMENT 'Latitude hasil ekstrak watermark',
  `photo_lng` decimal(11,8) DEFAULT NULL COMMENT 'Longitude hasil ekstrak watermark',
  `distance_m` int(11) DEFAULT NULL COMMENT 'Jarak foto ke cabang (meter)',
  `photo_taken_at` datetime DEFAULT NULL COMMENT 'Waktu foto dari watermark',
  `ai_status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | processing | done | failed | skipped',
  `ai_score` tinyint(3) unsigned DEFAULT NULL COMMENT 'Skor akhir 0-100',
  `ai_verdict` varchar(20) DEFAULT NULL COMMENT 'verified | review | reject',
  `ai_reason` text DEFAULT NULL COMMENT 'Alasan singkat dari AI',
  `ai_raw` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Respons mentah AI untuk audit' CHECK (json_valid(`ai_raw`)),
  `ai_checked_at` datetime DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_daily_tasks_user_date_template` (`user_id`,`task_date`,`task_template_id`),
  KEY `task_template_id` (`task_template_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_daily_tasks_branch_date` (`branch_id`,`task_date`),
  KEY `idx_daily_tasks_user_date` (`user_id`,`task_date`),
  KEY `idx_daily_tasks_ai` (`tenant_id`,`branch_id`,`ai_status`),
  CONSTRAINT `daily_tasks_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `daily_tasks_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `daily_tasks_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `daily_tasks_ibfk_4` FOREIGN KEY (`task_template_id`) REFERENCES `task_templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `daily_tasks_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_tasks`
--

LOCK TABLES `daily_tasks` WRITE;
/*!40000 ALTER TABLE `daily_tasks` DISABLE KEYS */;
INSERT INTO `daily_tasks` VALUES (13,1,1,129,NULL,'bersihkan area loket',NULL,0,'2026-11-14','incomplete',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:18:01','2026-11-14 13:35:31'),(14,1,1,129,NULL,'bersihkan area mushola',NULL,0,'2026-11-14','incomplete',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:20:56','2026-11-14 13:35:31'),(15,1,1,129,NULL,'bersihkan area jalan dekat loket',NULL,1,'2026-11-14','done','2026-11-14 03:26:22','http://localhost:3003/public/images/item/November-2026/1794626782771-0-anonymous--WhatsApp Image 2026-11-08 at 09.43.59.jpg',NULL,NULL,NULL,NULL,'done',0,'review','Perlu dicek: Watermark GPS/waktu tidak terbaca. foto tidak sesuai judul tugas. pekerjaan belum terlihat selesai. Foto menampilkan bagian bawah alas kaki, tidak relevan dengan tugas membersihkan area jalan.','{\"ai\":{\"watermark_readable\":false,\"latitude\":null,\"longitude\":null,\"taken_at\":null,\"watermark_address\":null,\"matches_task\":false,\"looks_done\":false,\"confidence\":100,\"reason\":\"Foto menampilkan bagian bawah alas kaki, tidak relevan dengan tugas membersihkan area jalan.\"},\"parts\":{\"distance\":{\"score\":0,\"weight\":40,\"value\":null},\"date\":{\"score\":0,\"weight\":25,\"value\":null},\"matches\":{\"score\":0,\"weight\":20,\"value\":false},\"done\":{\"score\":0,\"weight\":15,\"value\":false}},\"raw\":\"{\\n  \\\"watermark_readable\\\": false,\\n  \\\"latitude\\\": null,\\n  \\\"longitude\\\": null,\\n  \\\"taken_at\\\": null,\\n  \\\"watermark_address\\\": null,\\n  \\\"matches_task\\\": false,\\n  \\\"looks_done\\\": false,\\n  \\\"confidence\\\": 100,\\n  \\\"reason\\\": \\\"Foto menampilkan bagian bawah alas kaki, tidak relevan dengan tugas membersihkan area jalan.\\\"\\n}\"}','2026-11-14 03:50:47',NULL,1,'2026-11-14 03:24:19','2026-11-14 03:50:47'),(16,1,1,129,1,'Bersihkan toilet','Toilet',0,'2026-11-14','incomplete',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:24:30','2026-11-14 13:35:31'),(17,1,1,129,2,'Sapu & pel area utama','Area utama',0,'2026-11-14','done','2026-11-14 03:52:33',NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:24:30','2026-11-14 03:52:33'),(18,1,1,129,3,'Buang sampah','Seluruh area',0,'2026-11-14','done','2026-11-14 03:52:34',NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:24:30','2026-11-14 03:52:34'),(19,1,1,129,4,'Cek air & sabun kamar mandi','Kamar mandi',1,'2026-11-14','done','2026-11-14 03:52:39','http://localhost:3003/public/images/item/November-2026/1794628359625-0-anonymous--IMG_1674.jpg',-7.96290800,112.65457800,4,'2026-11-14 03:51:00','done',65,'review','Perlu dicek: Watermark terbaca, 4 m dari cabang (batas 150 m). foto tidak sesuai tugas. pekerjaan belum terlihat selesai. Foto menunjukkan area dalam ruangan dengan kursi dan lantai biasa, bukan kamar mandi untuk cek air dan sabun.','{\"ai\":{\"watermark_readable\":true,\"latitude\":-7.962908,\"longitude\":112.654578,\"taken_at\":\"2026-11-14 10:51\",\"watermark_address\":\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\",\"matches_task\":false,\"looks_done\":false,\"confidence\":100,\"reason\":\"Foto menunjukkan area dalam ruangan dengan kursi dan lantai biasa, bukan kamar mandi untuk cek air dan sabun.\"},\"parts\":{\"distance\":{\"score\":100,\"weight\":40,\"value\":4},\"date\":{\"score\":100,\"weight\":25,\"value\":\"2026-11-14 10:51\"},\"matches\":{\"score\":0,\"weight\":20,\"value\":false},\"done\":{\"score\":0,\"weight\":15,\"value\":false}},\"raw\":\"{\\n  \\\"watermark_readable\\\": true,\\n  \\\"latitude\\\": -7.962908,\\n  \\\"longitude\\\": 112.654578,\\n  \\\"taken_at\\\": \\\"2026-11-14 10:51\\\",\\n  \\\"watermark_address\\\": \\\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\\\",\\n  \\\"matches_task\\\": false,\\n  \\\"looks_done\\\": false,\\n  \\\"confidence\\\": 100,\\n  \\\"reason\\\": \\\"Foto menunjukkan area dalam ruangan dengan kursi dan lantai biasa, bukan kamar mandi untuk cek air dan sabun.\\\"\\n}\"}','2026-11-14 03:52:49',NULL,1,'2026-11-14 03:24:30','2026-11-14 03:52:49'),(27,1,1,129,NULL,'bersihkan area loket',NULL,0,'2026-11-15','pending',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:33:10','2026-11-14 10:41:03'),(28,1,1,129,NULL,'bersihkan area mushola',NULL,0,'2026-11-15','pending',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:33:10','2026-11-14 10:41:03'),(29,1,1,129,NULL,'bersihkan area jalan dekat loket',NULL,1,'2026-11-15','pending',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:33:10','2026-11-14 10:41:03'),(30,1,1,129,1,'Bersihkan toilet','Toilet',0,'2026-11-15','pending',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:33:10','2026-11-14 10:41:03'),(31,1,1,129,2,'Sapu & pel area utama','Area utama',0,'2026-11-15','pending',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:33:10','2026-11-14 10:41:03'),(32,1,1,129,3,'Buang sampah','Seluruh area',0,'2026-11-15','pending',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:33:10','2026-11-14 10:41:03'),(33,1,1,129,4,'Cek air & sabun kamar mandi','Kamar mandi',1,'2026-11-15','pending',NULL,NULL,NULL,NULL,NULL,NULL,'skipped',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-11-14 03:33:10','2026-11-14 10:41:03'),(34,1,1,130,NULL,'bersihin kamar mandi batu',NULL,1,'2026-11-14','done','2026-11-14 12:23:07','http://localhost:3003/public/images/item/November-2026/1794658987263-0-anonymous--IMG_1674.jpg',-7.96290800,112.65457800,4,'2026-11-14 03:51:00','done',65,'review','Perlu dicek: Watermark terbaca, 4 m dari cabang (batas 150 m). foto tidak sesuai tugas. pekerjaan belum terlihat selesai. Foto menunjukkan lantai ruangan biasa, bukan kamar mandi batu sesuai judul tugas.','{\"ai\":{\"watermark_readable\":true,\"latitude\":-7.962908,\"longitude\":112.654578,\"taken_at\":\"2026-11-14 10:51\",\"watermark_address\":\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\",\"matches_task\":false,\"looks_done\":false,\"confidence\":95,\"reason\":\"Foto menunjukkan lantai ruangan biasa, bukan kamar mandi batu sesuai judul tugas.\"},\"parts\":{\"distance\":{\"score\":100,\"weight\":40,\"value\":4},\"date\":{\"score\":100,\"weight\":25,\"value\":\"2026-11-14 10:51\"},\"matches\":{\"score\":0,\"weight\":20,\"value\":false},\"done\":{\"score\":0,\"weight\":15,\"value\":false}},\"raw\":\"{\\n  \\\"watermark_readable\\\": true,\\n  \\\"latitude\\\": -7.962908,\\n  \\\"longitude\\\": 112.654578,\\n  \\\"taken_at\\\": \\\"2026-11-14 10:51\\\",\\n  \\\"watermark_address\\\": \\\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\\\",\\n  \\\"matches_task\\\": false,\\n  \\\"looks_done\\\": false,\\n  \\\"confidence\\\": 95,\\n  \\\"reason\\\": \\\"Foto menunjukkan lantai ruangan biasa, bukan kamar mandi batu sesuai judul tugas.\\\"\\n}\"}','2026-11-14 12:23:18',NULL,1,'2026-11-14 12:22:50','2026-11-14 12:23:18'),(35,1,1,130,NULL,'membersihkan lantai kantor yang kotor',NULL,1,'2026-11-14','done','2026-11-14 12:28:08','http://localhost:3003/public/images/item/November-2026/1794659288654-0-anonymous--IMG_1674.jpg',-7.96290800,112.65457800,4,'2026-11-14 03:51:00','done',99,'verified','Terverifikasi: Watermark terbaca, 4 m dari cabang (batas 150 m). Lantai kantor terlihat bersih dan mengkilap, sesuai dengan judul tugas dan koordinat masih berada dalam radius toleransi.','{\"ai\":{\"watermark_readable\":true,\"latitude\":-7.962908,\"longitude\":112.654578,\"taken_at\":\"2026-11-14 10:51\",\"watermark_address\":\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\",\"matches_task\":true,\"looks_done\":true,\"confidence\":95,\"reason\":\"Lantai kantor terlihat bersih dan mengkilap, sesuai dengan judul tugas dan koordinat masih berada dalam radius toleransi.\"},\"parts\":{\"distance\":{\"score\":100,\"weight\":40,\"value\":4},\"date\":{\"score\":100,\"weight\":25,\"value\":\"2026-11-14 10:51\"},\"matches\":{\"score\":100,\"weight\":20,\"value\":true},\"done\":{\"score\":95,\"weight\":15,\"value\":true}},\"raw\":\"{\\n  \\\"watermark_readable\\\": true,\\n  \\\"latitude\\\": -7.962908,\\n  \\\"longitude\\\": 112.654578,\\n  \\\"taken_at\\\": \\\"2026-11-14 10:51\\\",\\n  \\\"watermark_address\\\": \\\"Jalan Sulfat, Blimbing, Malang, East Java, Indonesia, 65124\\\",\\n  \\\"matches_task\\\": true,\\n  \\\"looks_done\\\": true,\\n  \\\"confidence\\\": 95,\\n  \\\"reason\\\": \\\"Lantai kantor terlihat bersih dan mengkilap, sesuai dengan judul tugas dan koordinat masih berada dalam radius toleransi.\\\"\\n}\"}','2026-11-14 12:28:10',NULL,1,'2026-11-14 12:27:57','2026-11-14 12:28:10');
/*!40000 ALTER TABLE `daily_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `deliveries`
--

DROP TABLE IF EXISTS `deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `deliveries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `users_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `date` date DEFAULT NULL,
  `total_distance` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `odo_start` int(11) DEFAULT NULL,
  `odo_end` int(11) DEFAULT NULL,
  `odo_start_photo_url` varchar(255) DEFAULT NULL,
  `odo_end_photo_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `users_id` (`users_id`),
  CONSTRAINT `deliveries_ibfk_1` FOREIGN KEY (`users_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `deliveries`
--

LOCK TABLES `deliveries` WRITE;
/*!40000 ALTER TABLE `deliveries` DISABLE KEYS */;
/*!40000 ALTER TABLE `deliveries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_details`
--

DROP TABLE IF EXISTS `delivery_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `delivery_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) DEFAULT NULL,
  `delivery_id` int(11) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `distance` decimal(10,2) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `delivery_id` (`delivery_id`),
  CONSTRAINT `delivery_details_ibfk_39` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `delivery_details_ibfk_40` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=273 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_details`
--

LOCK TABLES `delivery_details` WRITE;
/*!40000 ALTER TABLE `delivery_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discounts`
--

DROP TABLE IF EXISTS `discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `discounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` enum('percent','nominal') NOT NULL,
  `discount` decimal(10,2) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `discounts_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discounts`
--

LOCK TABLES `discounts` WRITE;
/*!40000 ALTER TABLE `discounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `discounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `droppoints`
--

DROP TABLE IF EXISTS `droppoints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `droppoints` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `branch_id` int(11) NOT NULL COMMENT 'Branch yang memiliki droppoint ini',
  `tenant_id` int(11) NOT NULL COMMENT 'Tenant pemilik droppoint',
  `name` varchar(100) NOT NULL COMMENT 'Nama droppoint',
  `address` text DEFAULT NULL COMMENT 'Alamat droppoint',
  `phone` varchar(20) DEFAULT NULL COMMENT 'Nomor telepon droppoint',
  `commission_enabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Apakah menggunakan komisi',
  `commission_type` enum('percent','fixed') DEFAULT NULL COMMENT 'Tipe komisi: percent atau fixed',
  `commission_value` decimal(12,2) DEFAULT 0.00 COMMENT 'Nilai komisi (persen atau nominal)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif droppoint',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT 'Longitude untuk absensi',
  `latitude` decimal(11,8) DEFAULT NULL COMMENT 'Latitude untuk absensi',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `droppoints_branch_id` (`branch_id`),
  KEY `droppoints_tenant_id` (`tenant_id`),
  KEY `droppoints_is_active` (`is_active`),
  KEY `idx_droppoints_tenant_branch` (`tenant_id`,`branch_id`),
  CONSTRAINT `droppoints_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `droppoints_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `droppoints`
--

LOCK TABLES `droppoints` WRITE;
/*!40000 ALTER TABLE `droppoints` DISABLE KEYS */;
/*!40000 ALTER TABLE `droppoints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` text DEFAULT NULL,
  `receipt` varchar(1000) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `shift_id` int(11) DEFAULT NULL,
  `finance_account_id` int(11) DEFAULT NULL,
  `finance_category_id` int(11) DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `transaction_id` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=730 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('pending','in_progress','resolved','closed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finance_accounts`
--

DROP TABLE IF EXISTS `finance_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `finance_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik finance account',
  `branch_id` int(11) DEFAULT NULL,
  `is_global` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag untuk akun global (true) atau akun spesifik cabang (false)',
  `is_branch_specific` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag untuk akun spesifik cabang (true) atau akun global (false)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Flag untuk akun aktif (true) atau tidak aktif (false)',
  `payment_method_id` int(11) DEFAULT NULL,
  `requires_payment_proof` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'True = pembayaran ke akun ini wajib melampirkan foto bukti bayar',
  PRIMARY KEY (`id`),
  KEY `idx_finance_accounts_tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `payment_method_id` (`payment_method_id`),
  CONSTRAINT `finance_accounts_ibfk_29` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `finance_accounts_ibfk_30` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `finance_accounts_ibfk_31` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=136 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finance_accounts`
--

LOCK TABLES `finance_accounts` WRITE;
/*!40000 ALTER TABLE `finance_accounts` DISABLE KEYS */;
INSERT INTO `finance_accounts` VALUES (1,'Kas Tunai Telaga',0.00,'Kas tunai loket utama','2026-10-31 09:31:04','2026-11-13 02:57:39',1,1,1,0,1,1,0),(2,'QRIS Telaga',170000.00,'Penerimaan pembayaran QRIS','2026-10-31 09:31:04','2026-11-26 04:28:47',1,1,0,1,1,2,0),(3,'Rekening Bank Telaga',15000.00,'Penerimaan transfer bank','2026-10-31 09:31:04','2026-11-15 02:02:23',1,1,1,0,1,6,0);
/*!40000 ALTER TABLE `finance_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finance_categories`
--

DROP TABLE IF EXISTS `finance_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `finance_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` enum('debit','credit','neutral') NOT NULL,
  `description` text DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik finance category',
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag untuk kategori sistem (true) atau kategori custom tenant (false)',
  PRIMARY KEY (`id`),
  KEY `idx_finance_categories_tenant_id` (`tenant_id`),
  CONSTRAINT `finance_categories_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=148 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finance_categories`
--

LOCK TABLES `finance_categories` WRITE;
/*!40000 ALTER TABLE `finance_categories` DISABLE KEYS */;
INSERT INTO `finance_categories` VALUES (1,'Pendapatan Tiket','credit','Pemasukan penjualan tiket dan paket wisata','2026-10-31 09:31:04','2026-10-31 09:31:04',1,0),(2,'Pendapatan Lainnya','credit','Pemasukan lain di luar tiket','2026-10-31 09:31:04','2026-10-31 09:31:04',1,0),(3,'Beban Operasional','debit','Biaya operasional harian','2026-10-31 09:31:04','2026-10-31 09:31:04',1,0),(4,'Beban Gaji','debit','Biaya gaji karyawan','2026-10-31 09:31:04','2026-10-31 09:31:04',1,0),(5,'Beban Pemeliharaan','debit','Biaya perawatan sarana wisata','2026-10-31 09:31:04','2026-10-31 09:31:04',1,0);
/*!40000 ALTER TABLE `finance_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finance_transactions`
--

DROP TABLE IF EXISTS `finance_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `finance_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `is_checked` tinyint(1) NOT NULL DEFAULT 0,
  `account_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `total_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `final_amount` decimal(12,2) NOT NULL,
  `description` text DEFAULT NULL,
  `date` datetime NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik finance transaction',
  `branch_id` int(11) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finance_transactions`
--

LOCK TABLES `finance_transactions` WRITE;
/*!40000 ALTER TABLE `finance_transactions` DISABLE KEYS */;
INSERT INTO `finance_transactions` VALUES (1,0,1,1,10000.00,0.00,10000.00,'Uang Masuk: Kas Tunai Telaga dari NOTA26111358448','2026-11-13 02:35:09','2026-11-13 02:35:09','2026-11-13 02:35:09','2026-11-13 02:57:39',1,1),(2,0,2,1,20000.00,0.00,20000.00,'Uang Masuk: QRIS Telaga dari NOTA26111318848','2026-11-13 02:57:56','2026-11-13 02:57:56','2026-11-13 02:57:56',NULL,1,1),(3,0,2,1,48000.00,0.00,48000.00,'Uang Masuk: QRIS Telaga dari NOTA26111405248','2026-11-14 22:21:46','2026-11-14 22:21:46','2026-11-14 22:21:46',NULL,1,77),(4,0,3,1,15000.00,0.00,15000.00,'Uang Masuk: Rekening Bank Telaga dari NOTA26111562348','2026-11-15 02:02:23','2026-11-15 02:02:23','2026-11-15 02:02:23',NULL,1,77),(5,0,2,1,12000.00,0.00,12000.00,'Uang Masuk: QRIS Telaga dari NOTA26111514048','2026-11-15 04:18:31','2026-11-15 04:18:31','2026-11-15 04:18:31',NULL,1,77),(9,0,2,1,15000.00,0.00,15000.00,'Uang Masuk: QRIS Telaga dari NOTA26111549448','2026-11-15 04:41:06','2026-11-15 04:41:06','2026-11-15 04:41:06',NULL,1,77),(10,0,2,1,15000.00,0.00,15000.00,'Uang Masuk: QRIS Telaga dari NOTA26111548148','2026-11-15 05:07:48','2026-11-15 05:07:48','2026-11-15 05:07:48',NULL,1,78),(12,0,2,1,40000.00,0.00,40000.00,'Uang Masuk: QRIS Telaga dari NOTA26112617748','2026-11-26 03:58:25','2026-11-26 03:58:25','2026-11-26 03:58:25',NULL,1,77),(13,0,2,1,20000.00,0.00,20000.00,'Uang Masuk: QRIS Telaga dari NOTA26112608848','2026-11-26 03:59:58','2026-11-26 03:59:58','2026-11-26 03:59:58',NULL,1,78);
/*!40000 ALTER TABLE `finance_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `followup_sequence_templates`
--

DROP TABLE IF EXISTS `followup_sequence_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `followup_sequence_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sequence_id` int(11) NOT NULL COMMENT 'ID sequence follow-up',
  `step_number` int(11) NOT NULL COMMENT 'Urutan step dalam sequence (1, 2, 3, dst)',
  `delay_days` int(11) NOT NULL COMMENT 'Jumlah hari delay setelah order terakhir atau step sebelumnya',
  `template_id` int(11) NOT NULL COMMENT 'ID template WhatsApp yang akan dikirim',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif template dalam sequence',
  `send_time` time DEFAULT '09:00:00' COMMENT 'Jam pengiriman (format HH:MM:SS)',
  `conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Kondisi tambahan untuk pengiriman (optional)' CHECK (json_valid(`conditions`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
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
-- Dumping data for table `followup_sequence_templates`
--

LOCK TABLES `followup_sequence_templates` WRITE;
/*!40000 ALTER TABLE `followup_sequence_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `followup_sequence_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `followup_sequences`
--

DROP TABLE IF EXISTS `followup_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `followup_sequences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Nama sequence follow-up',
  `description` text DEFAULT NULL COMMENT 'Deskripsi sequence',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif sequence',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Sequence default untuk tenant/branch',
  `created_by` int(11) DEFAULT NULL COMMENT 'ID user yang membuat sequence',
  `updated_by` int(11) DEFAULT NULL COMMENT 'ID user yang terakhir update sequence',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
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
-- Dumping data for table `followup_sequences`
--

LOCK TABLES `followup_sequences` WRITE;
/*!40000 ALTER TABLE `followup_sequences` DISABLE KEYS */;
/*!40000 ALTER TABLE `followup_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `followup_usage_limits`
--

DROP TABLE IF EXISTS `followup_usage_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `followup_usage_limits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `limit_type` enum('sequences_active','broadcasts_monthly','messages_daily','messages_hourly','templates_per_sequence') NOT NULL,
  `current_usage` int(11) DEFAULT 0,
  `max_allowed` int(11) NOT NULL,
  `reset_date` date DEFAULT NULL,
  `reset_hour` int(11) DEFAULT NULL,
  `last_reset_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tenant_limit` (`tenant_id`,`limit_type`),
  KEY `idx_reset_date` (`reset_date`),
  CONSTRAINT `followup_usage_limits_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=230 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `followup_usage_limits`
--

LOCK TABLES `followup_usage_limits` WRITE;
/*!40000 ALTER TABLE `followup_usage_limits` DISABLE KEYS */;
/*!40000 ALTER TABLE `followup_usage_limits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `holidays`
--

DROP TABLE IF EXISTS `holidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `holidays` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL COMMENT 'NULL = libur untuk semua cabang tenant',
  `date` date NOT NULL,
  `name` varchar(150) NOT NULL,
  `is_paid` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `holidays_tenant_date` (`tenant_id`,`date`),
  CONSTRAINT `holidays_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `holidays_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `holidays`
--

LOCK TABLES `holidays` WRITE;
/*!40000 ALTER TABLE `holidays` DISABLE KEYS */;
/*!40000 ALTER TABLE `holidays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incomes`
--

DROP TABLE IF EXISTS `incomes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incomes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'User yang mencatat pemasukan',
  `shift_id` int(11) DEFAULT NULL COMMENT 'Shift saat pemasukan dicatat (opsional)',
  `finance_account_id` int(11) NOT NULL COMMENT 'Akun keuangan tujuan pemasukan',
  `finance_category_id` int(11) NOT NULL COMMENT 'Kategori keuangan',
  `name` varchar(255) NOT NULL COMMENT 'Nama/judul pemasukan',
  `date` date NOT NULL COMMENT 'Tanggal pemasukan',
  `amount` decimal(12,2) NOT NULL COMMENT 'Nominal pemasukan',
  `description` text DEFAULT NULL COMMENT 'Deskripsi/catatan pemasukan',
  `receipt` varchar(1000) DEFAULT NULL COMMENT 'URL bukti/receipt',
  `status` enum('pending','approved','rejected','completed') DEFAULT 'completed' COMMENT 'Status pemasukan',
  `approved_by` int(11) DEFAULT NULL COMMENT 'User yang approve',
  `approved_at` datetime DEFAULT NULL COMMENT 'Waktu approval',
  `transaction_id` int(11) DEFAULT NULL COMMENT 'Referensi ke finance transaction',
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant pemilik',
  `branch_id` int(11) DEFAULT NULL COMMENT 'ID cabang',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deletedAt` datetime DEFAULT NULL COMMENT 'Soft delete timestamp',
  PRIMARY KEY (`id`),
  KEY `shift_id` (`shift_id`),
  KEY `finance_account_id` (`finance_account_id`),
  KEY `finance_category_id` (`finance_category_id`),
  KEY `approved_by` (`approved_by`),
  KEY `transaction_id` (`transaction_id`),
  KEY `idx_incomes_tenant` (`tenant_id`),
  KEY `idx_incomes_branch` (`branch_id`),
  KEY `idx_incomes_date` (`date`),
  KEY `idx_incomes_user` (`user_id`),
  CONSTRAINT `incomes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `incomes_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`),
  CONSTRAINT `incomes_ibfk_3` FOREIGN KEY (`finance_account_id`) REFERENCES `finance_accounts` (`id`),
  CONSTRAINT `incomes_ibfk_4` FOREIGN KEY (`finance_category_id`) REFERENCES `finance_categories` (`id`),
  CONSTRAINT `incomes_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `incomes_ibfk_6` FOREIGN KEY (`transaction_id`) REFERENCES `finance_transactions` (`id`),
  CONSTRAINT `incomes_ibfk_7` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `incomes_ibfk_8` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incomes`
--

LOCK TABLES `incomes` WRITE;
/*!40000 ALTER TABLE `incomes` DISABLE KEYS */;
/*!40000 ALTER TABLE `incomes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_access_logs`
--

DROP TABLE IF EXISTS `invoice_access_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_access_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_token_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `accessed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(255) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_token_id` (`invoice_token_id`),
  KEY `order_id` (`order_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `invoice_access_logs_ibfk_16` FOREIGN KEY (`invoice_token_id`) REFERENCES `invoice_tokens` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_access_logs_ibfk_17` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_access_logs_ibfk_18` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1935 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_access_logs`
--

LOCK TABLES `invoice_access_logs` WRITE;
/*!40000 ALTER TABLE `invoice_access_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_access_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_tokens`
--

DROP TABLE IF EXISTS `invoice_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_tokens`
--

LOCK TABLES `invoice_tokens` WRITE;
/*!40000 ALTER TABLE `invoice_tokens` DISABLE KEYS */;
INSERT INTO `invoice_tokens` VALUES (1,1,'ad7802c4','active','2026-11-13 02:35:09','2026-11-13 02:35:09',NULL),(2,2,'3e2f5b3e','active','2026-11-13 02:57:56','2026-11-13 02:57:56',NULL),(3,3,'0a2dfa50','active','2026-11-14 22:21:46','2026-11-14 22:21:46',NULL),(4,4,'b2f145f2','active','2026-11-15 00:39:19','2026-11-15 00:39:19',NULL),(5,5,'75191319','active','2026-11-15 02:02:23','2026-11-15 02:02:23',NULL),(7,7,'5e02693a','active','2026-11-15 04:18:31','2026-11-15 04:18:31',NULL),(8,12,'36740e6d','active','2026-11-15 04:41:06','2026-11-15 04:41:06',NULL),(9,13,'cd77e182','active','2026-11-15 05:07:48','2026-11-15 05:07:48',NULL),(10,14,'9b316018','active','2026-11-15 12:34:34','2026-11-15 12:34:34',NULL),(11,15,'4ebb3011','active','2026-11-15 13:01:15','2026-11-15 13:01:15',NULL),(12,16,'a3cc2bdb','active','2026-11-15 13:02:56','2026-11-15 13:02:56',NULL),(13,17,'c9a6bc91','active','2026-11-26 02:15:15','2026-11-26 02:15:15',NULL),(14,19,'87344fb6','active','2026-11-26 03:58:25','2026-11-26 03:58:25',NULL),(15,20,'5ea6e034','active','2026-11-26 03:59:58','2026-11-26 03:59:58',NULL);
/*!40000 ALTER TABLE `invoice_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_status_photos`
--

DROP TABLE IF EXISTS `item_status_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_status_photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_detail_status_log_id` int(11) NOT NULL,
  `photo_url` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `order_detail_status_log_id` (`order_detail_status_log_id`),
  CONSTRAINT `item_status_photos_ibfk_1` FOREIGN KEY (`order_detail_status_log_id`) REFERENCES `order_detail_status_logs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7800 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_status_photos`
--

LOCK TABLES `item_status_photos` WRITE;
/*!40000 ALTER TABLE `item_status_photos` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_status_photos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `color` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `material` varchar(255) DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik item',
  PRIMARY KEY (`id`),
  KEY `items_tenant_id` (`tenant_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5407 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lead_records`
--

DROP TABLE IF EXISTS `lead_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lead_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lead_id` int(11) NOT NULL,
  `follow_up_by` int(11) NOT NULL,
  `follow_up_at` datetime NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lead_id` (`lead_id`),
  KEY `follow_up_by` (`follow_up_by`),
  CONSTRAINT `lead_records_ibfk_23` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lead_records_ibfk_24` FOREIGN KEY (`follow_up_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lead_records`
--

LOCK TABLES `lead_records` WRITE;
/*!40000 ALTER TABLE `lead_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `lead_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `leads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `source` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Baru',
  `created_by` int(11) NOT NULL,
  `follow_up_count` int(11) NOT NULL DEFAULT 0,
  `last_follow_up_by` int(11) DEFAULT NULL,
  `last_follow_up_at` datetime DEFAULT NULL,
  `next_follow_up_date` datetime DEFAULT NULL,
  `is_converted` tinyint(1) DEFAULT 0,
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

LOCK TABLES `leads` WRITE;
/*!40000 ALTER TABLE `leads` DISABLE KEYS */;
/*!40000 ALTER TABLE `leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `memberships`
--

DROP TABLE IF EXISTS `memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `memberships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Nama program membership (LITE, PREMIUM, VIP, PLATINUM)',
  `description` text DEFAULT NULL COMMENT 'Deskripsi program membership',
  `discount_percentage` decimal(5,2) NOT NULL COMMENT 'Persentase diskon yang diberikan',
  `price` decimal(12,2) NOT NULL COMMENT 'Harga program membership',
  `duration_days` int(11) DEFAULT NULL COMMENT 'Durasi membership dalam hari (nullable untuk backward compatibility)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif program membership',
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik membership',
  `branch_id` int(11) DEFAULT NULL COMMENT 'ID branch pemilik membership',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `min_points` int(11) DEFAULT NULL COMMENT 'Minimum lifetime_points untuk tier ini (nullable, untuk backward compatibility)',
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `memberships_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `memberships_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `memberships`
--

LOCK TABLES `memberships` WRITE;
/*!40000 ALTER TABLE `memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_queue`
--

DROP TABLE IF EXISTS `message_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `message_type` enum('followup','broadcast','manual') NOT NULL,
  `template_id` int(11) DEFAULT NULL,
  `sequence_id` int(11) DEFAULT NULL,
  `broadcast_id` int(11) DEFAULT NULL,
  `message_content` text NOT NULL,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variables`)),
  `priority` int(11) DEFAULT 5,
  `scheduled_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `attempt_count` int(11) DEFAULT 0,
  `max_attempts` int(11) DEFAULT 3,
  `status` enum('pending','processing','sent','failed','cancelled') DEFAULT 'pending',
  `sent_at` timestamp NULL DEFAULT NULL,
  `failed_at` timestamp NULL DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `whatsapp_message_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
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
-- Dumping data for table `message_queue`
--

LOCK TABLES `message_queue` WRITE;
/*!40000 ALTER TABLE `message_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_settings`
--

DROP TABLE IF EXISTS `notification_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notification_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `due_date_h1` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Kirim notif H-1 sebelum due date',
  `due_date_h0` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Kirim notif H-0 (hari due date)',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `notification_settings_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_settings`
--

LOCK TABLES `notification_settings` WRITE;
/*!40000 ALTER TABLE `notification_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'Null = broadcast ke semua user tenant',
  `type` enum('due_date_h1','due_date_h0','order_new','order_status','payment') NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Payload tambahan, misal { order_detail_ids: [...] }' CHECK (json_valid(`data`)),
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` datetime DEFAULT NULL COMMENT 'Waktu push berhasil dikirim',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_tenant_id` (`tenant_id`),
  KEY `idx_notifications_user_id` (`user_id`),
  KEY `idx_notifications_tenant_read` (`tenant_id`,`is_read`),
  KEY `idx_notifications_type_tenant` (`type`,`tenant_id`,`createdAt`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_detail_addons`
--

DROP TABLE IF EXISTS `order_detail_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_detail_addons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_detail_id` int(11) NOT NULL,
  `addon_id` int(11) NOT NULL,
  `price_at_time` decimal(12,2) NOT NULL,
  `name_at_time` varchar(100) NOT NULL,
  `addon_type_at_time` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_order_addon_detail` (`order_detail_id`),
  KEY `idx_order_addon_addon` (`addon_id`),
  CONSTRAINT `order_detail_addons_ibfk_1` FOREIGN KEY (`order_detail_id`) REFERENCES `order_details` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_detail_addons_ibfk_2` FOREIGN KEY (`addon_id`) REFERENCES `treatment_addons` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_detail_addons`
--

LOCK TABLES `order_detail_addons` WRITE;
/*!40000 ALTER TABLE `order_detail_addons` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_detail_addons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_detail_status_logs`
--

DROP TABLE IF EXISTS `order_detail_status_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_detail_status_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_detail_id` int(11) NOT NULL,
  `old_status` varchar(255) DEFAULT NULL,
  `new_status` varchar(255) NOT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `order_detail_id` (`order_detail_id`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `order_detail_status_logs_ibfk_10` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `order_detail_status_logs_ibfk_9` FOREIGN KEY (`order_detail_id`) REFERENCES `order_details` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4717 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_detail_status_logs`
--

LOCK TABLES `order_detail_status_logs` WRITE;
/*!40000 ALTER TABLE `order_detail_status_logs` DISABLE KEYS */;
INSERT INTO `order_detail_status_logs` VALUES (4711,30,'antrian','on_progress',1,'2026-11-15 04:41:22'),(4712,30,'on_progress','done',1,'2026-11-15 04:41:31'),(4713,38,'antrian','on_progress',1,'2026-11-26 03:58:55'),(4714,39,'antrian','on_progress',1,'2026-11-26 03:58:55'),(4715,39,'on_progress','done',1,'2026-11-26 03:59:09'),(4716,38,'on_progress','done',1,'2026-11-26 03:59:09');
/*!40000 ALTER TABLE `order_detail_status_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_details`
--

DROP TABLE IF EXISTS `order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) DEFAULT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `treatment_id` int(11) DEFAULT NULL,
  `item_id` int(11) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `base_price` decimal(12,2) DEFAULT NULL,
  `addon_total` decimal(12,2) DEFAULT 0.00,
  `discount_amount` decimal(12,2) DEFAULT 0.00,
  `discount_id` int(11) DEFAULT NULL,
  `process_time` varchar(255) DEFAULT NULL,
  `process_time_cost` decimal(10,2) DEFAULT NULL,
  `final_price` decimal(10,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `pickup_method` enum('pickup','delivery') DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `delivery_time` varchar(255) DEFAULT NULL,
  `courier_id` int(11) DEFAULT NULL,
  `delivery_status` enum('not_yet','scheduled','on_the_way','delivered','failed','done') DEFAULT 'not_yet',
  `perfume` varchar(255) DEFAULT NULL,
  `custom_price` decimal(10,2) DEFAULT NULL COMMENT 'Harga custom yang di-override (nullable, jika null pakai harga treatment)',
  `custom_price_reason` varchar(255) DEFAULT NULL COMMENT 'Alasan/keterangan kenapa custom price diterapkan',
  `is_product` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag produk (tidak perlu tracking) - cached dari treatment.requires_tracking',
  `tag_number` int(11) DEFAULT NULL COMMENT 'Nomor antrian tag sepatu, reset setiap hari per cabang (dasar: entry_date order)',
  `tag_date` date DEFAULT NULL COMMENT 'Tanggal (entry_date order) yang dipakai sebagai dasar penomoran antrian',
  `serve_mode` enum('dine-in','takeaway') DEFAULT NULL COMMENT 'Dine-in atau bawa pulang per item. Null = ikut order_type',
  `options_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Opsi terstruktur per item, mis. {"sugar":"less","ice":"normal"}' CHECK (json_valid(`options_json`)),
  `production_branch_id` int(11) DEFAULT NULL COMMENT 'Cabang tempat item ini diproduksi (outlet penjual atau dapur pusat)',
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `employee_id` (`employee_id`),
  KEY `treatment_id` (`treatment_id`),
  KEY `item_id` (`item_id`),
  KEY `discount_id` (`discount_id`),
  KEY `order_details_courier_id_foreign_idx` (`courier_id`),
  KEY `idx_order_details_tag` (`order_id`,`tag_number`),
  KEY `idx_order_details_production_branch` (`production_branch_id`),
  CONSTRAINT `order_details_ibfk_60` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_61` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_62` FOREIGN KEY (`treatment_id`) REFERENCES `treatment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_63` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_64` FOREIGN KEY (`discount_id`) REFERENCES `discounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_details_ibfk_65` FOREIGN KEY (`courier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `order_details_production_branch_id_foreign_idx` FOREIGN KEY (`production_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_details`
--

LOCK TABLES `order_details` WRITE;
/*!40000 ALTER TABLE `order_details` DISABLE KEYS */;
INSERT INTO `order_details` VALUES (1,1,1,1,NULL,'2026-11-13',10000.00,NULL,0.00,0.00,NULL,'regular',0.00,10000.00,'done','','2026-11-13 02:35:09','2026-11-13 02:35:09',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,1,'2026-11-13',NULL,NULL,1),(2,2,1,1,NULL,'2026-11-13',10000.00,NULL,0.00,0.00,NULL,'regular',0.00,10000.00,'done','','2026-11-13 02:57:56','2026-11-13 02:57:56',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,2,'2026-11-13',NULL,NULL,1),(3,2,1,1,NULL,'2026-11-13',10000.00,NULL,0.00,0.00,NULL,'regular',0.00,10000.00,'done','','2026-11-13 02:57:56','2026-11-13 02:57:56',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,3,'2026-11-13',NULL,NULL,1),(4,3,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-14 22:21:46','2026-11-14 22:21:46',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,1,'2026-11-14','dine-in',NULL,77),(5,3,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-14 22:21:46','2026-11-14 22:21:46',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,2,'2026-11-14','dine-in',NULL,77),(6,3,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-14 22:21:46','2026-11-14 22:21:46',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,3,'2026-11-14','dine-in',NULL,77),(7,3,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-14 22:21:46','2026-11-14 22:21:46',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,4,'2026-11-14','dine-in',NULL,77),(10,4,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-15 00:39:19','2026-11-15 00:39:19',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,1,'2026-11-15','dine-in',NULL,77),(11,4,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-15 00:39:19','2026-11-15 00:39:19',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,2,'2026-11-15','dine-in',NULL,77),(12,4,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-15 00:39:19','2026-11-15 00:39:19',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,3,'2026-11-15','dine-in',NULL,77),(13,4,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-15 00:39:19','2026-11-15 00:39:19',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,4,'2026-11-15','dine-in',NULL,77),(14,4,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-15 00:39:19','2026-11-15 00:39:19',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,5,'2026-11-15','takeaway',NULL,77),(15,5,1,358,NULL,'2026-11-15',15000.00,NULL,0.00,0.00,NULL,'regular',0.00,15000.00,'done','','2026-11-15 02:02:23','2026-11-15 02:02:23',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,6,'2026-11-15','dine-in','{\"sugar\":\"Normal Sugar\",\"ice\":\"Es Normal\"}',77),(22,7,1,357,NULL,'2026-11-15',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'done','','2026-11-15 04:18:31','2026-11-15 04:18:31',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,7,'2026-11-15','dine-in',NULL,77),(30,12,1,358,NULL,'2026-11-15',15000.00,NULL,0.00,0.00,NULL,'regular',0.00,15000.00,'done','','2026-11-15 04:41:06','2026-11-15 04:41:31',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,8,'2026-11-15','dine-in','{\"sugar\":\"Normal Sugar\",\"ice\":\"Es Normal\"}',77),(31,13,1,358,NULL,'2026-11-15',15000.00,NULL,0.00,0.00,NULL,'regular',0.00,15000.00,'antrian','','2026-11-15 05:07:48','2026-11-15 05:07:48',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,4,'2026-11-15','dine-in',NULL,78),(32,14,1,358,NULL,'2026-11-15',15000.00,NULL,0.00,0.00,NULL,'regular',0.00,15000.00,'antrian','','2026-11-15 12:34:34','2026-11-15 12:34:34',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,5,'2026-11-15','dine-in',NULL,78),(33,15,1,358,NULL,'2026-11-15',15000.00,NULL,0.00,0.00,NULL,'regular',0.00,15000.00,'antrian','','2026-11-15 13:01:15','2026-11-15 13:01:15',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,6,'2026-11-15','dine-in','{\"sugar\":\"Normal Sugar\",\"ice\":\"Tanpa Es\"}',78),(34,16,1,358,NULL,'2026-11-15',15000.00,NULL,0.00,0.00,NULL,'regular',0.00,15000.00,'antrian','','2026-11-15 13:02:56','2026-11-15 13:02:56',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,7,'2026-11-15','dine-in',NULL,78),(35,17,1,357,NULL,'2026-11-26',12000.00,NULL,0.00,0.00,NULL,'regular',0.00,12000.00,'antrian','','2026-11-26 02:15:15','2026-11-26 02:15:15',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,1,'2026-11-26','dine-in',NULL,79),(38,19,1,360,NULL,'2026-11-26',20000.00,NULL,0.00,0.00,NULL,'regular',0.00,20000.00,'done','','2026-11-26 03:58:25','2026-11-26 03:59:09',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,1,'2026-11-26','dine-in',NULL,77),(39,19,1,360,NULL,'2026-11-26',20000.00,NULL,0.00,0.00,NULL,'regular',0.00,20000.00,'done','','2026-11-26 03:58:25','2026-11-26 03:59:09',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,2,'2026-11-26','dine-in',NULL,77),(40,20,1,360,NULL,'2026-11-26',20000.00,NULL,0.00,0.00,NULL,'regular',0.00,20000.00,'antrian','','2026-11-26 03:59:58','2026-11-26 03:59:58',NULL,NULL,NULL,NULL,NULL,'done',NULL,NULL,NULL,0,1,'2026-11-26','dine-in',NULL,77);
/*!40000 ALTER TABLE `order_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_product_details`
--

DROP TABLE IF EXISTS `order_product_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_product_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_product_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `discount_id` int(11) DEFAULT NULL,
  `total_price_per_category` float NOT NULL,
  `quantity` int(11) NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_product_details`
--

LOCK TABLES `order_product_details` WRITE;
/*!40000 ALTER TABLE `order_product_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_product_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_products`
--

DROP TABLE IF EXISTS `order_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `discount_id` int(11) NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_products`
--

LOCK TABLES `order_products` WRITE;
/*!40000 ALTER TABLE `order_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `payment_id` int(11) DEFAULT NULL,
  `entry_date` date DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `order_type` varchar(255) DEFAULT NULL,
  `table_number` varchar(20) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `shift_id` int(11) DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik order',
  `referred_by` int(11) DEFAULT NULL COMMENT 'ID customer yang merefer (dari lookup nomor HP)',
  `referred_by_phone` varchar(20) DEFAULT NULL COMMENT 'Nomor HP referrer yang diinput customer (untuk backup/verifikasi)',
  `droppoint_id` int(11) DEFAULT NULL COMMENT 'ID droppoint jika order_type = droppoint',
  `is_notified` tinyint(1) NOT NULL DEFAULT 0,
  `notified_at` datetime DEFAULT NULL,
  `customer_note` text DEFAULT NULL COMMENT 'Catatan bebas dari customer untuk keseluruhan pesanan',
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
  KEY `orders_referred_by_foreign_idx` (`referred_by`),
  KEY `idx_orders_droppoint` (`droppoint_id`),
  KEY `idx_orders_tenant_droppoint` (`tenant_id`,`droppoint_id`),
  KEY `orders_droppoint_id` (`droppoint_id`),
  KEY `idx_orders_table_number` (`table_number`),
  KEY `orders_table_number` (`table_number`),
  CONSTRAINT `orders_droppoint_id_foreign_idx` FOREIGN KEY (`droppoint_id`) REFERENCES `droppoints` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_63` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_64` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_65` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_66` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_67` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_68` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_referred_by_foreign_idx` FOREIGN KEY (`referred_by`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,1,1,1,'2026-11-13',1,'offline',NULL,'2026-11-13 02:35:09','2026-11-13 02:57:39','2026-11-13 02:57:39',1,779,1,NULL,NULL,NULL,0,NULL,NULL),(2,1,1,2,'2026-11-13',2,'offline',NULL,'2026-11-13 02:57:56','2026-11-13 02:57:56',NULL,1,779,1,NULL,NULL,NULL,0,NULL,NULL),(3,2,77,3,'2026-11-14',4,'dine-in','10','2026-11-14 22:21:46','2026-11-14 22:21:46',NULL,1,780,1,NULL,NULL,NULL,0,NULL,NULL),(4,3,77,4,'2026-11-15',5,'mixed','10','2026-11-15 00:39:19','2026-11-15 00:39:19',NULL,1,780,1,NULL,NULL,NULL,0,NULL,NULL),(5,4,77,5,'2026-11-15',1,'dine-in','10','2026-11-15 02:02:23','2026-11-15 02:02:23',NULL,1,780,1,NULL,NULL,NULL,0,NULL,NULL),(7,6,77,7,'2026-11-15',1,'dine-in','11','2026-11-15 04:18:31','2026-11-15 04:18:31',NULL,1,780,1,NULL,NULL,NULL,0,NULL,NULL),(12,11,77,12,'2026-11-15',1,'dine-in','9','2026-11-15 04:41:06','2026-11-15 04:41:06',NULL,1,780,1,NULL,NULL,NULL,0,NULL,NULL),(13,12,78,13,'2026-11-15',1,'dine-in','8','2026-11-15 05:07:48','2026-11-15 05:07:48',NULL,1,781,1,NULL,NULL,NULL,0,NULL,NULL),(14,13,78,14,'2026-11-15',1,'dine-in','18','2026-11-15 12:34:34','2026-11-15 12:34:34',NULL,1,781,1,NULL,NULL,NULL,0,NULL,NULL),(15,14,78,15,'2026-11-15',1,'dine-in','12','2026-11-15 13:01:15','2026-11-15 13:01:15',NULL,1,781,1,NULL,NULL,NULL,0,NULL,NULL),(16,15,78,16,'2026-11-15',1,'dine-in','44','2026-11-15 13:02:56','2026-11-15 13:02:56',NULL,1,781,1,NULL,NULL,NULL,0,NULL,NULL),(17,16,79,17,'2026-11-26',1,'dine-in','01','2026-11-26 02:15:15','2026-11-26 02:15:15',NULL,1,782,1,NULL,NULL,NULL,0,NULL,NULL),(19,18,77,19,'2026-11-26',2,'dine-in','1','2026-11-26 03:58:25','2026-11-26 03:58:25',NULL,1,780,1,NULL,NULL,NULL,0,NULL,NULL),(20,19,78,20,'2026-11-26',1,'dine-in','1','2026-11-26 03:59:58','2026-11-26 03:59:58',NULL,1,781,1,NULL,NULL,NULL,0,NULL,NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_details`
--

DROP TABLE IF EXISTS `payment_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `method` varchar(50) NOT NULL COMMENT 'Payment method name (dynamic from payment_methods table)',
  `amount` decimal(12,2) NOT NULL,
  `fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `interest` decimal(12,2) DEFAULT 0.00,
  `final_amount` decimal(12,2) NOT NULL,
  `evidence_photo` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `finance_account_id` int(11) DEFAULT NULL,
  `finance_category_id` int(11) DEFAULT NULL,
  `shift_id` int(11) DEFAULT NULL,
  `payment_method_id` int(11) DEFAULT NULL,
  `money_received` decimal(15,2) DEFAULT NULL COMMENT 'Uang yang diterima dari customer (khusus untuk payment method cash)',
  `change_amount` decimal(15,2) DEFAULT NULL COMMENT 'Kembalian yang diberikan ke customer (khusus untuk payment method cash)',
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_details`
--

LOCK TABLES `payment_details` WRITE;
/*!40000 ALTER TABLE `payment_details` DISABLE KEYS */;
INSERT INTO `payment_details` VALUES (1,1,1,'cash',10000.00,0.00,0.00,10000.00,'','2026-11-13 02:35:09','2026-11-13 02:35:09','2026-11-13 02:57:39',1,1,779,1,50000.00,40000.00),(2,2,2,'qris',20000.00,0.00,0.00,20000.00,'','2026-11-13 02:57:56','2026-11-13 02:57:56',NULL,2,1,779,2,NULL,NULL),(3,3,3,'qris',48000.00,0.00,0.00,48000.00,'','2026-11-14 22:21:46','2026-11-14 22:21:46',NULL,2,1,780,2,NULL,NULL),(4,4,5,'bank_transfer',15000.00,0.00,0.00,15000.00,'','2026-11-15 02:02:23','2026-11-15 02:02:23',NULL,3,1,780,6,NULL,NULL),(5,5,7,'qris',12000.00,0.00,0.00,12000.00,'','2026-11-15 04:18:31','2026-11-15 04:18:31',NULL,2,1,780,2,NULL,NULL),(9,9,12,'qris',15000.00,0.00,0.00,15000.00,'','2026-11-15 04:41:06','2026-11-15 04:41:06',NULL,2,1,780,2,NULL,NULL),(10,10,13,'qris',15000.00,0.00,0.00,15000.00,'','2026-11-15 05:07:48','2026-11-15 05:07:48',NULL,2,1,781,2,NULL,NULL),(12,12,19,'qris',40000.00,0.00,0.00,40000.00,'','2026-11-26 03:58:25','2026-11-26 03:58:25',NULL,2,1,780,2,NULL,NULL),(13,13,20,'qris',20000.00,0.00,0.00,20000.00,'','2026-11-26 03:59:58','2026-11-26 03:59:58',NULL,2,1,781,2,NULL,NULL);
/*!40000 ALTER TABLE `payment_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_logs`
--

DROP TABLE IF EXISTS `payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `payment_detail_id` int(11) NOT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `action` enum('create','update','delete') NOT NULL,
  `description` text DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `payment_detail_id` (`payment_detail_id`),
  KEY `changed_by` (`changed_by`),
  CONSTRAINT `payment_logs_ibfk_21` FOREIGN KEY (`payment_detail_id`) REFERENCES `payment_details` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payment_logs_ibfk_22` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_logs`
--

LOCK TABLES `payment_logs` WRITE;
/*!40000 ALTER TABLE `payment_logs` DISABLE KEYS */;
INSERT INTO `payment_logs` VALUES (1,1,1,'create','Pembayaran NOTA26111358448 dibuat','2026-11-13 02:35:09','2026-11-13 02:35:09'),(2,2,1,'create','Pembayaran NOTA26111318848 dibuat','2026-11-13 02:57:56','2026-11-13 02:57:56'),(3,3,1,'create','Pembayaran NOTA26111405248 dibuat','2026-11-14 22:21:46','2026-11-14 22:21:46'),(4,4,1,'create','Pembayaran NOTA26111562348 dibuat','2026-11-15 02:02:23','2026-11-15 02:02:23'),(5,5,1,'create','Pembayaran NOTA26111514048 dibuat','2026-11-15 04:18:31','2026-11-15 04:18:31'),(9,9,1,'create','Pembayaran NOTA26111549448 dibuat','2026-11-15 04:41:06','2026-11-15 04:41:06'),(10,10,1,'create','Pembayaran NOTA26111548148 dibuat','2026-11-15 05:07:48','2026-11-15 05:07:48'),(12,12,1,'create','Pembayaran NOTA26112617748 dibuat','2026-11-26 03:58:25','2026-11-26 03:58:25'),(13,13,1,'create','Pembayaran NOTA26112608848 dibuat','2026-11-26 03:59:58','2026-11-26 03:59:58');
/*!40000 ALTER TABLE `payment_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_methods` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `fee_percentage` decimal(5,2) DEFAULT 0.00,
  `fee_fixed` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES (1,'Cash (Tunai)','cash','cash','dollar',1,0.00,0.00,'2025-09-24 05:56:56','2025-09-24 05:56:56'),(2,'QRIS','qris','qris','qrcode',1,0.00,0.00,'2025-09-24 05:56:56','2025-09-24 05:56:56'),(3,'Debit Card','debit','debit','credit-card',1,0.00,0.00,'2025-09-24 05:56:56','2025-09-24 05:56:56'),(4,'Credit Card','credit','credit','credit-card',1,0.00,0.00,'2025-09-24 05:56:56','2025-09-24 05:56:56'),(5,'E-Wallet','ewallet','ewallet','smartphone',1,0.00,0.00,'2025-09-24 05:56:56','2025-09-24 05:56:56'),(6,'Bank Transfer','bank_transfer','bank','bank',1,0.00,0.00,'2025-09-24 05:57:47','2025-09-24 05:57:47'),(13,'GoPay','gopay','ewallet','📱',1,1.50,2500.00,'2025-09-24 06:57:37','2025-09-24 07:23:53'),(14,'OVO','ovo','ewallet','O',1,0.00,0.00,'2025-09-24 07:12:01','2025-09-24 07:12:01'),(15,'Shopee','shopee','shopee','shopee',1,0.00,0.00,'2025-09-24 07:30:54','2025-09-24 09:09:18');
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `total_service` decimal(10,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Total harga sebelum diskon',
  `additional_cost` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Biaya tambahan (jika ada)',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Total yang sudah dibayar',
  `remaining_amount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Sisa yang harus dibayar',
  `due_date` datetime DEFAULT NULL COMMENT 'Tanggal jatuh tempo pembayaran',
  `notes` text DEFAULT NULL COMMENT 'Catatan tambahan untuk pembayaran',
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik payment',
  `discount_id` int(11) DEFAULT NULL COMMENT 'ID discount untuk potongan di level payment (diskon tambahan setelah diskon per order detail)',
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `payments_discount_id_foreign_idx` (`discount_id`),
  CONSTRAINT `payments_discount_id_foreign_idx` FOREIGN KEY (`discount_id`) REFERENCES `discounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,'NOTA26111358448','paid','cash',0.00,0.00,10000.00,10000.00,'2026-11-13',10000.00,0.00,'','2026-11-13 02:35:09','2026-11-13 02:57:39','2026-11-13 02:57:39',10000.00,10000.00,0.00,10000.00,0.00,NULL,NULL,1,NULL),(2,'NOTA26111318848','paid','qris',0.00,0.00,20000.00,20000.00,'2026-11-13',20000.00,0.00,'','2026-11-13 02:57:56','2026-11-13 02:57:56',NULL,20000.00,20000.00,0.00,20000.00,0.00,NULL,NULL,1,NULL),(3,'NOTA26111405248','paid','qris',0.00,0.00,48000.00,48000.00,'2026-11-14',48000.00,0.00,'','2026-11-14 22:21:46','2026-11-14 22:21:46',NULL,48000.00,48000.00,0.00,48000.00,0.00,NULL,NULL,1,NULL),(4,'NOTA26111500848','unpaid','cash',0.00,0.00,60000.00,60000.00,'2026-11-15',0.00,0.00,'','2026-11-15 00:39:19','2026-11-15 00:39:19',NULL,60000.00,60000.00,0.00,0.00,60000.00,NULL,NULL,1,NULL),(5,'NOTA26111562348','paid','bank_transfer',0.00,0.00,15000.00,15000.00,'2026-11-15',15000.00,0.00,'','2026-11-15 02:02:23','2026-11-15 02:02:23',NULL,15000.00,15000.00,0.00,15000.00,0.00,NULL,NULL,1,NULL),(7,'NOTA26111514048','paid','qris',0.00,0.00,12000.00,12000.00,'2026-11-15',12000.00,0.00,'','2026-11-15 04:18:31','2026-11-15 04:18:31',NULL,12000.00,12000.00,0.00,12000.00,0.00,NULL,NULL,1,NULL),(12,'NOTA26111549448','paid','qris',0.00,0.00,15000.00,15000.00,'2026-11-15',15000.00,0.00,'','2026-11-15 04:41:06','2026-11-15 04:41:06',NULL,15000.00,15000.00,0.00,15000.00,0.00,NULL,NULL,1,NULL),(13,'NOTA26111548148','paid','qris',0.00,0.00,15000.00,15000.00,'2026-11-15',15000.00,0.00,'','2026-11-15 05:07:48','2026-11-15 05:07:48',NULL,15000.00,15000.00,0.00,15000.00,0.00,NULL,NULL,1,NULL),(14,'NOTA26111532548','unpaid','cash',0.00,0.00,15000.00,15000.00,'2026-11-15',0.00,0.00,'','2026-11-15 12:34:34','2026-11-15 12:34:34',NULL,15000.00,15000.00,0.00,0.00,15000.00,NULL,NULL,1,NULL),(15,'NOTA26111563448','unpaid','cash',0.00,0.00,15000.00,15000.00,'2026-11-15',0.00,0.00,'','2026-11-15 13:01:15','2026-11-15 13:01:15',NULL,15000.00,15000.00,0.00,0.00,15000.00,NULL,NULL,1,NULL),(16,'NOTA26111515548','unpaid','cash',0.00,0.00,15000.00,15000.00,'2026-11-15',0.00,0.00,'','2026-11-15 13:02:56','2026-11-15 13:02:56',NULL,15000.00,15000.00,0.00,0.00,15000.00,NULL,NULL,1,NULL),(17,'NOTA26112689548','unpaid','cash',0.00,0.00,12000.00,12000.00,'2026-11-26',0.00,0.00,'','2026-11-26 02:15:15','2026-11-26 02:15:15',NULL,12000.00,12000.00,0.00,0.00,12000.00,NULL,NULL,1,NULL),(19,'NOTA26112617748','paid','qris',0.00,0.00,40000.00,40000.00,'2026-11-26',40000.00,0.00,'','2026-11-26 03:58:25','2026-11-26 03:58:25',NULL,40000.00,40000.00,0.00,40000.00,0.00,NULL,NULL,1,NULL),(20,'NOTA26112608848','paid','qris',0.00,0.00,20000.00,20000.00,'2026-11-26',20000.00,0.00,'','2026-11-26 03:59:58','2026-11-26 03:59:58',NULL,20000.00,20000.00,0.00,20000.00,0.00,NULL,NULL,1,NULL);
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `point_transactions`
--

DROP TABLE IF EXISTS `point_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `point_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL COMMENT 'ID customer pemilik poin',
  `order_id` int(11) DEFAULT NULL COMMENT 'ID order terkait (nullable untuk bonus poin)',
  `type` enum('earn','redeem','expire','bonus') NOT NULL COMMENT 'Jenis transaksi poin',
  `points` int(11) NOT NULL COMMENT 'Jumlah poin (bisa negatif untuk redeem)',
  `description` varchar(255) DEFAULT NULL COMMENT 'Deskripsi transaksi poin',
  `expires_at` date DEFAULT NULL COMMENT 'Tanggal kadaluarsa poin (nullable, untuk future use)',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `bonus_type` enum('referral_referrer','referral_new_customer','first_order') DEFAULT NULL COMMENT 'Jenis bonus poin (hanya untuk type = bonus). referral_referrer: bonus untuk referrer, referral_new_customer: bonus untuk customer baru yang direfer, first_order: bonus untuk order pertama tanpa referral',
  PRIMARY KEY (`id`),
  KEY `idx_point_transactions_customer_id` (`customer_id`),
  KEY `idx_point_transactions_order_id` (`order_id`),
  KEY `idx_point_transactions_type` (`type`),
  KEY `idx_point_transactions_created_at` (`createdAt`),
  KEY `idx_point_transactions_bonus_type` (`bonus_type`),
  CONSTRAINT `point_transactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `point_transactions_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `point_transactions`
--

LOCK TABLES `point_transactions` WRITE;
/*!40000 ALTER TABLE `point_transactions` DISABLE KEYS */;
INSERT INTO `point_transactions` VALUES (1,1,1,'redeem',-10,'Reverse earned poin dari delete order #1 (calculated from paid_amount 10000.00)',NULL,'2026-11-13 02:57:39','2026-11-13 02:57:39','2026-11-13 02:57:39',NULL);
/*!40000 ALTER TABLE `point_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `printers`
--

DROP TABLE IF EXISTS `printers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `printers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Nama printer (contoh: Printer Kasir 1, Printer Kitchen)',
  `device_name` varchar(255) NOT NULL COMMENT 'Nama device Bluetooth (contoh: RPP02, POS-58)',
  `device_id` varchar(255) DEFAULT NULL COMMENT 'ID unik device Bluetooth',
  `service_uuid` varchar(255) DEFAULT NULL COMMENT 'Service UUID untuk koneksi Bluetooth',
  `characteristic_uuid` varchar(255) DEFAULT NULL COMMENT 'Characteristic UUID untuk koneksi Bluetooth',
  `paper_width` int(11) NOT NULL DEFAULT 58 COMMENT 'Lebar kertas dalam mm (58mm, 80mm)',
  `encoding` varchar(255) NOT NULL DEFAULT 'CP437' COMMENT 'Encoding untuk printer (CP437, UTF-8, etc)',
  `printer_type` enum('thermal','inkjet','laser') NOT NULL DEFAULT 'thermal' COMMENT 'Tipe printer',
  `status` enum('active','inactive','maintenance','disconnected') NOT NULL DEFAULT 'inactive' COMMENT 'Status printer',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Apakah printer ini default untuk cabang',
  `print_capabilities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Kemampuan printer (invoice, checklist, receipt, etc)' CHECK (json_valid(`print_capabilities`)),
  `connection_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Pengaturan koneksi tambahan' CHECK (json_valid(`connection_settings`)),
  `last_connected` datetime DEFAULT NULL COMMENT 'Terakhir kali terhubung',
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant pemilik printer',
  `branch_id` int(11) NOT NULL COMMENT 'ID cabang tempat printer berada',
  `created_by` int(11) DEFAULT NULL COMMENT 'ID user yang membuat printer',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
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
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel untuk menyimpan data printer';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printers`
--

LOCK TABLES `printers` WRITE;
/*!40000 ALTER TABLE `printers` DISABLE KEYS */;
/*!40000 ALTER TABLE `printers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant pemilik kategori',
  `name` varchar(100) NOT NULL COMMENT 'Nama kategori, mis. "Makanan Berat", "Kopi", "Paket"',
  `type_service` varchar(50) DEFAULT NULL COMMENT 'Lini bisnis kategori ini: Wisata, F&B, Retribusi, dll',
  `description` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Urutan tampil di katalog/POS (kecil duluan)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'false = kategori disembunyikan dari pilihan produk',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `order_mode` varchar(10) DEFAULT NULL COMMENT 'Mode outlet yang menampilkan kategori: ''loket'' | ''cafe''. Null = semua outlet',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_categories_tenant_name` (`tenant_id`,`name`),
  KEY `idx_product_categories_tenant_service` (`tenant_id`,`type_service`),
  CONSTRAINT `product_categories_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_categories`
--

LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
INSERT INTO `product_categories` VALUES (10,1,'Makanan Berat','Makanan','Nasi, mie, ayam, sate',1,1,'2026-11-26 09:27:48','2026-11-26 03:05:32','cafe'),(11,1,'Snack','Snack','Kentang, pisang goreng, popmie',1,1,'2026-11-26 09:27:48','2026-11-26 03:05:41','cafe'),(12,1,'Coffee','Minuman','Kopi susu, americano, tubruk',1,1,'2026-11-26 09:27:48','2026-11-26 03:05:26','cafe'),(13,1,'Non-Coffee','Minuman','Teh, jus, susu, air mineral',2,1,'2026-11-26 09:27:48','2026-11-26 03:05:56','cafe'),(14,1,'Souvenir','Souvenir','Oleh-oleh dan merchandise',1,1,'2026-11-26 09:27:48','2026-11-26 09:27:48',NULL),(15,1,'Tiket Masuk','Wisata','Tiket masuk kawasan',1,1,'2026-11-26 09:27:48','2026-11-26 03:05:52','loket'),(16,1,'Wahana','Wisata','Permainan dan atraksi',2,1,'2026-11-26 09:27:48','2026-11-26 03:06:04','loket'),(17,1,'Parkir','Retribusi','Retribusi parkir kendaraan',1,1,'2026-11-26 09:27:48','2026-11-26 03:05:36','loket'),(18,1,'Paket',NULL,'Bundling tiket + makan, family package',99,1,'2026-11-26 09:27:48','2026-11-26 03:06:07','loket');
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `category` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` float NOT NULL,
  `stock` int(11) NOT NULL,
  `images` varchar(255) DEFAULT NULL,
  `sold` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `push_tokens`
--

DROP TABLE IF EXISTS `push_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `push_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` text NOT NULL COMMENT 'Expo push token',
  `platform` enum('android','ios') NOT NULL DEFAULT 'android',
  `device_id` varchar(255) DEFAULT NULL COMMENT 'Unique device identifier untuk upsert',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_push_tokens_user_id` (`user_id`),
  KEY `idx_push_tokens_device_id` (`device_id`),
  CONSTRAINT `push_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `push_tokens`
--

LOCK TABLES `push_tokens` WRITE;
/*!40000 ALTER TABLE `push_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `push_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `refresh_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'ID user pemilik refresh token',
  `refresh_token` varchar(512) NOT NULL COMMENT 'Refresh token untuk auto refresh access token',
  `device_type` enum('web','mobile') NOT NULL DEFAULT 'web' COMMENT 'Tipe device: web atau mobile',
  `device_id` varchar(255) DEFAULT NULL COMMENT 'ID device (optional, untuk tracking device spesifik)',
  `expires_at` datetime NOT NULL COMMENT 'Tanggal kadaluarsa refresh token',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_refresh_tokens_token` (`refresh_token`),
  KEY `idx_refresh_tokens_user_id` (`user_id`),
  KEY `idx_refresh_tokens_user_device` (`user_id`,`device_type`),
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=284 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (268,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzkzNDEzODkyLCJleHAiOjE3OTYwMDU4OTJ9.c7oAKHD32KyLbLm-7APi5a-LfTQ5VRuj35ZywiI4c6A','web',NULL,'2026-11-30 02:31:32','2026-10-31 02:31:32','2026-11-14 03:18:27','2026-11-14 03:18:27'),(269,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzkzNDEzODk1LCJleHAiOjE3OTYwMDU4OTV9.a44AoOUsTk526hIbs-31jbpsPE2FyzNcyXll0nuPjQU','web',NULL,'2026-11-30 02:31:35','2026-10-31 02:31:35','2026-11-14 03:18:27','2026-11-14 03:18:27'),(270,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzkzNDEzOTkyLCJleHAiOjE3OTYwMDU5OTJ9.FHnpZ8d4x6Y48150qOkjtDABJx4t_ceHg_Fz3msat48','web',NULL,'2026-11-30 02:33:12','2026-10-31 02:33:12','2026-11-14 03:18:27','2026-11-14 03:18:27'),(271,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NDA0MjM4LCJleHAiOjE3OTY5OTYyMzh9.Gr3S_M95TWoipFj_oWORPV1h649Cm5-eGy8SikntLTI','web',NULL,'2026-12-11 13:37:18','2026-11-11 13:37:18','2026-11-14 03:18:27','2026-11-14 03:18:27'),(272,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NDA2Mjg1LCJleHAiOjE3OTY5OTgyODV9.jxdyP1fLd9Rva0en14_yEay3wcXOG4xJBAQ0SZb1J8Q','web',NULL,'2026-12-11 14:11:25','2026-11-11 14:11:25','2026-11-14 03:18:27','2026-11-14 03:18:27'),(273,129,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InpPdG1JOHJnNzliWXkvcVZQeWkyZ1E9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NjI2MzEwLCJleHAiOjE3OTcyMTgzMTB9.mUKZhUr5TBySnULf17vDZvzq58t6tXVep41hLOYrjW8','web',NULL,'2026-12-14 03:18:30','2026-11-14 03:18:30','2026-11-14 03:20:10','2026-11-14 03:20:10'),(274,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NjI2NDE1LCJleHAiOjE3OTcyMTg0MTV9.8GWE1TBcH63G98_iC3U-WlX0-fRAQYZry9uLx-kTQoY','web',NULL,'2026-12-14 03:20:15','2026-11-14 03:20:15','2026-11-14 03:25:19','2026-11-14 03:25:19'),(275,129,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InpPdG1JOHJnNzliWXkvcVZQeWkyZ1E9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NjI2NzM5LCJleHAiOjE3OTcyMTg3Mzl9.qcnHxfl9qrVYGEzwlPmQpLLJRxDyAj6GWRJ76awOsXA','web',NULL,'2026-12-14 03:25:39','2026-11-14 03:25:39','2026-11-14 12:21:28','2026-11-14 12:21:28'),(276,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NjI2ODA3LCJleHAiOjE3OTcyMTg4MDd9.9XsHRoscIjKHJ-pxDLkL7flmUlTAIHdJ2YHJL18IZP8','web',NULL,'2026-12-14 03:26:47','2026-11-14 03:26:47','2026-11-14 03:53:38','2026-11-14 03:53:38'),(277,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NjI4NDI1LCJleHAiOjE3OTcyMjA0MjV9.mXwBiMz1pTdPQ2iUbkvKAGWt20wtZNRX7fRA09YUPX4','web',NULL,'2026-12-14 03:53:45','2026-11-14 03:53:45','2026-11-14 03:53:45',NULL),(278,130,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InZmbExFWnoyM1U1Z0ZKZFYzOU1SUFE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NjU4ODk5LCJleHAiOjE3OTcyNTA4OTl9.hzkcV_GdDvz36TKwRfK0YCRi6zi0MM3EhGS0IXImxSI','web',NULL,'2026-12-14 12:21:39','2026-11-14 12:21:39','2026-11-14 13:23:30','2026-11-14 13:23:30'),(279,129,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InpPdG1JOHJnNzliWXkvcVZQeWkyZ1E9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NjYyNjEyLCJleHAiOjE3OTcyNTQ2MTJ9.JfLEkICR7PpL-vz0Rx77yAXYB_YF8JVr76qhTZRLdzY','web',NULL,'2026-12-14 13:23:32','2026-11-14 13:23:32','2026-11-14 13:23:32',NULL),(280,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NjkyNjQ5LCJleHAiOjE3OTcyODQ2NDl9.1CnW212Jf62AaKXwnBhPCA1X2_hj6tcVzFQJ4-_aCBo','web',NULL,'2026-12-14 21:44:09','2026-11-14 21:44:09','2026-11-14 21:44:09',NULL),(281,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NzA1OTE5LCJleHAiOjE3OTcyOTc5MTl9.aCOhOg9MqYInph1EG_zrj77G_nF_qRMyXHyUJD0x5xI','web',NULL,'2026-12-15 01:25:19','2026-11-15 01:25:19','2026-11-15 01:25:19',NULL),(282,129,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InpPdG1JOHJnNzliWXkvcVZQeWkyZ1E9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk0NzEzODI3LCJleHAiOjE3OTczMDU4Mjd9.tOlOGtIw0HfZyPwGJl5QFtiU0cydflSU5D35ruCA0OU','web',NULL,'2026-12-15 03:37:07','2026-11-15 03:37:07','2026-11-15 03:37:07',NULL),(283,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ikp2WklaSzVQbXJzR21wenRJbnVRTlE9PSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzk1NjU5MjUzLCJleHAiOjE3OTgyNTEyNTN9.duaDkIMFETDepo9kfvWZyvg_7JgGnbixtFl0JhCtmXg','web',NULL,'2026-12-26 02:14:13','2026-11-26 02:14:13','2026-11-26 02:14:13',NULL);
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reminder_logs`
--

DROP TABLE IF EXISTS `reminder_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reminder_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT current_timestamp(),
  `status` varchar(20) NOT NULL,
  `error_message` text DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `reminder_logs_ibfk_16` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reminder_logs_ibfk_17` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reminder_logs_ibfk_18` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reminder_logs`
--

LOCK TABLES `reminder_logs` WRITE;
/*!40000 ALTER TABLE `reminder_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `reminder_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shifts`
--

DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shifts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `sales` int(11) NOT NULL,
  `cash_initial` int(11) NOT NULL,
  `cash_expected` int(11) NOT NULL,
  `cash_actual` int(11) NOT NULL,
  `bank_transfer` int(11) NOT NULL,
  `qris` int(11) NOT NULL,
  `transaction` int(11) NOT NULL,
  `delivery` int(11) NOT NULL,
  `item` int(11) NOT NULL,
  `service` int(11) NOT NULL,
  `difference` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `paid` int(11) DEFAULT NULL,
  `unpaid` int(11) DEFAULT NULL,
  `expense` int(11) DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik shift',
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  KEY `branch_id` (`branch_id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `shifts_ibfk_30` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `shifts_ibfk_31` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `shifts_ibfk_32` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=783 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shifts`
--

LOCK TABLES `shifts` WRITE;
/*!40000 ALTER TABLE `shifts` DISABLE KEYS */;
INSERT INTO `shifts` VALUES (779,1,1,'2026-11-11 14:43:23',NULL,0,0,0,0,0,0,0,0,0,0,0,'2026-11-11 14:43:23','2026-11-11 14:43:23',NULL,NULL,NULL,NULL,1),(780,1,77,'2026-11-14 22:20:57',NULL,0,0,0,0,0,0,0,0,0,0,0,'2026-11-14 22:20:57','2026-11-14 22:20:57',NULL,NULL,NULL,NULL,1),(781,1,78,'2026-11-15 05:07:23',NULL,0,0,0,0,0,0,0,0,0,0,0,'2026-11-15 05:07:23','2026-11-15 05:07:23',NULL,NULL,NULL,NULL,1),(782,1,79,'2026-11-26 02:14:42',NULL,0,0,0,0,0,0,0,0,0,0,0,'2026-11-26 02:14:42','2026-11-26 02:14:42',NULL,NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shoes_photos`
--

DROP TABLE IF EXISTS `shoes_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shoes_photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_detail_id` int(11) NOT NULL,
  `url_photo` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_detail_id` (`order_detail_id`),
  CONSTRAINT `shoes_photos_ibfk_1` FOREIGN KEY (`order_detail_id`) REFERENCES `order_details` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36665 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shoes_photos`
--

LOCK TABLES `shoes_photos` WRITE;
/*!40000 ALTER TABLE `shoes_photos` DISABLE KEYS */;
/*!40000 ALTER TABLE `shoes_photos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `treatment_id` int(11) NOT NULL,
  `type` varchar(20) NOT NULL COMMENT 'in | sale | adjust | transfer_in | transfer_out | void',
  `qty` int(11) NOT NULL COMMENT 'Signed: positif = masuk, negatif = keluar. SUM(qty) = perubahan stok',
  `stock_before` int(11) NOT NULL DEFAULT 0,
  `stock_after` int(11) NOT NULL DEFAULT 0,
  `ref_type` varchar(30) DEFAULT NULL COMMENT 'order | transfer | manual',
  `ref_id` int(11) DEFAULT NULL COMMENT 'ID order / ID pasangan transfer',
  `note` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'Siapa yang melakukan pergerakan stok',
  `movement_date` date NOT NULL COMMENT 'Tanggal lokal (YYYY-MM-DD) untuk filter laporan',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_stock_movements_tenant_branch_date` (`tenant_id`,`branch_id`,`movement_date`),
  KEY `idx_stock_movements_treatment_branch_date` (`treatment_id`,`branch_id`,`movement_date`),
  KEY `idx_stock_movements_ref` (`ref_type`,`ref_id`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_ibfk_3` FOREIGN KEY (`treatment_id`) REFERENCES `treatment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES (1,1,1,357,'in',10,0,10,'manual',NULL,'Stok awal',1,'2026-11-15','2026-11-14 21:58:16','2026-11-14 21:58:16'),(2,1,1,357,'in',10,10,20,'manual',NULL,'beli lagi',1,'2026-11-15','2026-11-14 22:01:06','2026-11-14 22:01:06'),(3,1,77,357,'in',10,0,10,'manual',NULL,'Stok awal',1,'2026-11-15','2026-11-14 22:20:00','2026-11-14 22:20:00'),(4,1,78,357,'in',11,0,11,'manual',NULL,'Stok awal',1,'2026-11-15','2026-11-14 22:20:24','2026-11-14 22:20:24'),(5,1,79,357,'in',12,0,12,'manual',NULL,'Stok awal',1,'2026-11-15','2026-11-14 22:20:33','2026-11-14 22:20:33'),(6,1,77,357,'sale',-4,10,6,'order',3,NULL,1,'2026-11-15','2026-11-14 22:21:46','2026-11-14 22:21:46'),(7,1,77,357,'sale',-5,6,1,'order',4,NULL,1,'2026-11-15','2026-11-15 00:39:19','2026-11-15 00:39:19'),(9,1,78,357,'sale',-2,11,9,'order',6,NULL,1,'2026-11-15','2026-11-15 03:54:28','2026-11-15 03:54:28'),(10,1,77,357,'sale',-1,1,0,'order',7,NULL,1,'2026-11-15','2026-11-15 04:18:31','2026-11-15 04:18:31'),(11,1,79,357,'sale',-1,12,11,'order',17,NULL,1,'2026-11-26','2026-11-26 02:15:15','2026-11-26 02:15:15'),(12,1,77,359,'in',100,0,100,'manual',NULL,'Stok awal',1,'2026-11-26','2026-11-26 02:42:59','2026-11-26 02:42:59'),(13,1,77,360,'in',100,0,100,'manual',NULL,'stok awal',1,'2026-11-26','2026-11-26 03:57:44','2026-11-26 03:57:44'),(14,1,77,360,'sale',-2,100,98,'order',19,NULL,1,'2026-11-26','2026-11-26 03:58:25','2026-11-26 03:58:25');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Nama paket (Free Trial, Basic, Premium, Enterprise)',
  `description` text DEFAULT NULL COMMENT 'Deskripsi paket',
  `price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Harga paket per bulan',
  `duration_days` int(11) NOT NULL COMMENT 'Durasi paket dalam hari',
  `max_branches` int(11) NOT NULL DEFAULT 1 COMMENT 'Maksimal jumlah cabang',
  `max_users` int(11) NOT NULL DEFAULT 5 COMMENT 'Maksimal jumlah user',
  `max_orders_per_month` int(11) DEFAULT NULL COMMENT 'Maksimal order per bulan (null = unlimited)',
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Fitur yang disediakan dalam paket' CHECK (json_valid(`features`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif paket',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Urutan tampil paket',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscription_plans_is_active_idx` (`is_active`),
  KEY `subscription_plans_sort_order_idx` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` VALUES (1,'NotaPro','Paket profesional untuk bisnis laundry sepatu',149000.00,30,3,20,NULL,'{\"daily_reports\": true, \"multi_payment\": true, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": false, \"role_based_access\": true, \"advanced_reporting\": true, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,2,'2025-09-15 07:37:04','2025-10-15 22:18:33',NULL),(2,'NotaLite','Paket starter untuk bisnis laundry sepatu',99000.00,30,1,5,NULL,'{\"daily_reports\": true, \"multi_payment\": true, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": false, \"role_based_access\": true, \"advanced_reporting\": false, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,1,'2025-09-17 09:52:48','2025-10-15 22:17:09',NULL),(3,'NotaBusiness','Paket Business untuk laundry sepatu.',249000.00,30,10,100,NULL,'{\"daily_reports\": false, \"multi_payment\": true, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": true, \"role_based_access\": true, \"advanced_reporting\": true, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,3,'2025-09-17 09:53:11','2025-10-15 22:16:44',NULL),(4,'NotaFree','Paket gratis untuk bisnis laundry sepatu kecil yang belum punya cabang',0.00,9999,1,2,50,'{\"nota_basic\": true, \"input_order\": true, \"daily_reports\": false, \"multi_payment\": false, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": false, \"campaign_features\": false, \"role_based_access\": true, \"advanced_reporting\": false, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,0,'2025-11-12 06:59:00','2025-11-12 06:59:00',NULL),(5,'NotaLite','Paket NotaLite 3 bulan dengan diskon 20%',237600.00,90,1,5,NULL,'{\"daily_reports\": true, \"multi_payment\": true, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": false, \"role_based_access\": true, \"advanced_reporting\": false, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,11,'2025-11-13 12:39:04','2025-11-13 12:39:04',NULL),(6,'NotaLite','Paket NotaLite 1 tahun dengan diskon 50%',594000.00,365,1,5,NULL,'{\"daily_reports\": true, \"multi_payment\": true, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": false, \"role_based_access\": true, \"advanced_reporting\": false, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,12,'2025-11-13 12:39:04','2025-11-13 12:39:04',NULL),(7,'NotaPro','Paket NotaPro 3 bulan dengan diskon 20%',357600.00,90,3,20,NULL,'{\"daily_reports\": true, \"multi_payment\": true, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": false, \"role_based_access\": true, \"advanced_reporting\": true, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,21,'2025-11-13 12:39:04','2025-11-13 12:39:04',NULL),(8,'NotaPro','Paket NotaPro 1 tahun dengan diskon 50%',894000.00,365,3,20,NULL,'{\"daily_reports\": true, \"multi_payment\": true, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": false, \"role_based_access\": true, \"advanced_reporting\": true, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,22,'2025-11-13 12:39:04','2025-11-13 12:39:04',NULL),(9,'NotaBusiness','Paket NotaBusiness 3 bulan dengan diskon 20%',597600.00,90,10,100,NULL,'{\"daily_reports\": false, \"multi_payment\": true, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": true, \"role_based_access\": true, \"advanced_reporting\": true, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,31,'2025-11-13 12:39:04','2025-11-13 12:39:04',NULL),(10,'NotaBusiness','Paket NotaBusiness 1 tahun dengan diskon 50%',1494000.00,365,10,100,NULL,'{\"daily_reports\": false, \"multi_payment\": true, \"photo_tracking\": true, \"digital_invoice\": true, \"priority_support\": true, \"role_based_access\": true, \"advanced_reporting\": true, \"follow_up_features\": false, \"whatsapp_integration\": false}',1,32,'2025-11-13 12:39:04','2025-11-13 12:39:04',NULL);
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant yang berlangganan',
  `plan_id` int(11) NOT NULL COMMENT 'ID paket langganan',
  `status` enum('active','expired','cancelled','suspended','pending','trial') NOT NULL DEFAULT 'pending' COMMENT 'Status langganan',
  `start_date` datetime NOT NULL COMMENT 'Tanggal mulai langganan',
  `end_date` datetime DEFAULT NULL COMMENT 'Tanggal berakhir langganan (NULL untuk plan gratis)',
  `auto_renew` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Auto renew langganan',
  `price` decimal(10,2) NOT NULL COMMENT 'Harga langganan saat ini',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Jumlah diskon',
  `final_price` decimal(10,2) NOT NULL COMMENT 'Harga akhir setelah diskon',
  `payment_method` varchar(255) DEFAULT NULL COMMENT 'Metode pembayaran',
  `notes` text DEFAULT NULL COMMENT 'Catatan langganan',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscriptions_tenant_id` (`tenant_id`),
  KEY `subscriptions_plan_id` (`plan_id`),
  KEY `subscriptions_status` (`status`),
  KEY `subscriptions_end_date` (`end_date`),
  CONSTRAINT `subscriptions_ibfk_5` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_ibfk_6` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=159 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES (157,1,4,'cancelled','2026-10-31 09:31:04',NULL,0,0.00,0.00,0.00,NULL,'Seed awal Telaga Madiredo (digantikan NotaBusiness 2026-11-14)','2026-10-31 09:31:04','2026-11-14 19:19:42',NULL),(158,1,3,'active','2026-11-14 00:00:00','2030-12-31 23:59:59',0,249000.00,249000.00,0.00,NULL,'Grant internal: NotaBusiness s/d 2030-12-31 (diubah manual via DB)','2026-11-14 19:19:42','2026-11-14 19:19:42',NULL);
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `superapp_expenses`
--

DROP TABLE IF EXISTS `superapp_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `superapp_expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `expense_date` date NOT NULL COMMENT 'Tanggal pengeluaran',
  `category` varchar(50) NOT NULL COMMENT 'Kategori pengeluaran (server_hosting, domain_ssl, api_services, dll)',
  `amount` decimal(15,2) NOT NULL COMMENT 'Nominal pengeluaran',
  `description` text DEFAULT NULL COMMENT 'Deskripsi pengeluaran',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_expense_date` (`expense_date`),
  KEY `idx_category` (`category`),
  KEY `superapp_expenses_expense_date` (`expense_date`),
  KEY `superapp_expenses_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `superapp_expenses`
--

LOCK TABLES `superapp_expenses` WRITE;
/*!40000 ALTER TABLE `superapp_expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `superapp_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tag_sequences`
--

DROP TABLE IF EXISTS `tag_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tag_sequences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `seq_date` date NOT NULL COMMENT 'Tanggal order masuk (entry_date) sebagai dasar reset harian',
  `last_number` int(11) NOT NULL DEFAULT 0 COMMENT 'Nomor antrian terakhir yang sudah dipakai',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_tag_sequences_tenant_branch_date` (`tenant_id`,`branch_id`,`seq_date`),
  KEY `idx_tag_sequences_branch_date` (`branch_id`,`seq_date`),
  CONSTRAINT `fk_tag_sequences_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tag_sequences_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tag_sequences`
--

LOCK TABLES `tag_sequences` WRITE;
/*!40000 ALTER TABLE `tag_sequences` DISABLE KEYS */;
INSERT INTO `tag_sequences` VALUES (1,1,1,'2026-11-13',3,'2026-11-13 02:35:09','2026-11-13 02:57:56'),(3,1,77,'2026-11-14',4,'2026-11-14 22:21:46','2026-11-14 22:21:46'),(4,1,77,'2026-11-15',8,'2026-11-15 00:39:19','2026-11-15 04:41:06'),(7,1,78,'2026-11-15',7,'2026-11-15 03:54:28','2026-11-15 13:02:56'),(18,1,79,'2026-11-26',1,'2026-11-26 02:15:15','2026-11-26 02:15:15'),(20,1,77,'2026-11-26',2,'2026-11-26 03:58:25','2026-11-26 03:58:25'),(21,1,78,'2026-11-26',1,'2026-11-26 03:59:58','2026-11-26 03:59:58');
/*!40000 ALTER TABLE `tag_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_templates`
--

DROP TABLE IF EXISTS `task_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant pemilik template',
  `branch_id` int(11) DEFAULT NULL COMMENT 'NULL = berlaku untuk semua cabang',
  `title` varchar(150) NOT NULL COMMENT 'Nama tugas, mis. Bersihkan toilet',
  `position` varchar(50) DEFAULT NULL COMMENT 'NULL = semua posisi, mis. kebersihan/dapur/taman/keamanan',
  `area` varchar(150) DEFAULT NULL COMMENT 'Area kerja default, mis. Toilet Pria',
  `requires_photo` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Foto bukti wajib (opsional per template)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_task_templates_tenant_active` (`tenant_id`,`is_active`),
  KEY `idx_task_templates_tenant_position` (`tenant_id`,`position`),
  CONSTRAINT `task_templates_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_templates_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_templates_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_templates`
--

LOCK TABLES `task_templates` WRITE;
/*!40000 ALTER TABLE `task_templates` DISABLE KEYS */;
INSERT INTO `task_templates` VALUES (1,1,NULL,'Bersihkan toilet','kebersihan','Toilet',0,1,1,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(2,1,NULL,'Sapu & pel area utama','kebersihan','Area utama',0,1,2,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(3,1,NULL,'Buang sampah','kebersihan','Seluruh area',0,1,3,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(4,1,NULL,'Cek air & sabun kamar mandi','kebersihan','Kamar mandi',1,1,4,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(5,1,NULL,'Siapkan bahan masakan','dapur','Dapur',0,1,1,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(6,1,NULL,'Cek kebersihan dapur','dapur','Dapur',1,1,2,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(7,1,NULL,'Catat stok bahan','dapur','Gudang dapur',0,1,3,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(8,1,NULL,'Siram tanaman','taman','Area taman',0,1,1,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(9,1,NULL,'Bersihkan area kolam','taman','Kolam',0,1,2,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(10,1,NULL,'Potong rumput','taman','Area taman',0,1,3,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(11,1,NULL,'Cek pintu & gerbang','keamanan','Gerbang',0,1,1,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04'),(12,1,NULL,'Catat kendaraan masuk','keamanan','Pos jaga',0,1,2,NULL,'2026-11-14 09:38:04','2026-11-14 09:38:04');
/*!40000 ALTER TABLE `task_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_ai_credits`
--

DROP TABLE IF EXISTS `tenant_ai_credits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_ai_credits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `type` enum('CREDIT','DEBIT') NOT NULL COMMENT 'CREDIT = nambah saldo, DEBIT = ngurang saldo',
  `amount` int(11) NOT NULL COMMENT 'Positif untuk CREDIT, negatif untuk DEBIT',
  `balance_before` int(11) NOT NULL DEFAULT 0 COMMENT 'Snapshot saldo sebelum transaksi',
  `balance_after` int(11) NOT NULL DEFAULT 0 COMMENT 'Snapshot saldo setelah transaksi',
  `source` enum('MONTHLY_GRANT','PURCHASE','USAGE','ADMIN_GRANT','REFUND') NOT NULL COMMENT 'Sumber transaksi credit',
  `description` varchar(255) DEFAULT NULL,
  `payment_method` enum('TRIPAY','APP_STORE','FREE_TIER','ADMIN') NOT NULL DEFAULT 'FREE_TIER',
  `payment_ref` varchar(100) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `expired_at` date DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `updatedAt` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tenant_created` (`tenant_id`,`createdAt`),
  KEY `idx_source` (`source`),
  CONSTRAINT `tenant_ai_credits_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_ai_credits`
--

LOCK TABLES `tenant_ai_credits` WRITE;
/*!40000 ALTER TABLE `tenant_ai_credits` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_ai_credits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_limits_config`
--

DROP TABLE IF EXISTS `tenant_limits_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_limits_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `plan_type` enum('basic','premium','business','enterprise') DEFAULT 'basic',
  `max_sequences` int(11) DEFAULT 1,
  `max_broadcasts_monthly` int(11) DEFAULT 2,
  `max_recipients_per_broadcast` int(11) DEFAULT 100,
  `max_messages_daily` int(11) DEFAULT 50,
  `max_messages_hourly` int(11) DEFAULT 8,
  `max_templates_per_sequence` int(11) DEFAULT 4,
  `message_delay_seconds` int(11) DEFAULT 10,
  `is_active` tinyint(1) DEFAULT 1,
  `expires_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tenant` (`tenant_id`),
  CONSTRAINT `tenant_limits_config_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_limits_config`
--

LOCK TABLES `tenant_limits_config` WRITE;
/*!40000 ALTER TABLE `tenant_limits_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_limits_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_onboardings`
--

DROP TABLE IF EXISTS `tenant_onboardings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_onboardings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant yang sedang onboarding',
  `user_id` int(11) NOT NULL COMMENT 'ID user yang melakukan onboarding',
  `current_step` enum('branch_setup','user_creation','service_setup','printer_setup','wa_setup','completed') NOT NULL DEFAULT 'branch_setup' COMMENT 'Step onboarding saat ini',
  `completed_steps` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array step yang sudah diselesaikan' CHECK (json_valid(`completed_steps`)),
  `onboarding_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Data yang dikumpulkan selama onboarding' CHECK (json_valid(`onboarding_data`)),
  `is_completed` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Apakah onboarding sudah selesai',
  `completed_at` datetime DEFAULT NULL COMMENT 'Tanggal selesai onboarding',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tenant_onboardings_ibfk_5` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tenant_onboardings_ibfk_6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_onboardings`
--

LOCK TABLES `tenant_onboardings` WRITE;
/*!40000 ALTER TABLE `tenant_onboardings` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_onboardings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_orders`
--

DROP TABLE IF EXISTS `tenant_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `verification_attempts` int(11) DEFAULT 0 COMMENT 'Jumlah percobaan verifikasi',
  `verification_token` varchar(255) DEFAULT NULL,
  `verification_expires_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `verification_token` (`verification_token`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_orders`
--

LOCK TABLES `tenant_orders` WRITE;
/*!40000 ALTER TABLE `tenant_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_payments`
--

DROP TABLE IF EXISTS `tenant_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subscription_id` int(11) DEFAULT NULL,
  `subscription_plan_id` int(11) DEFAULT NULL,
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant yang membayar',
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
  `notes` text DEFAULT NULL COMMENT 'Catatan pembayaran',
  `is_manual` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(255) DEFAULT NULL,
  `account_holder` varchar(255) DEFAULT NULL,
  `payment_code` varchar(255) DEFAULT NULL,
  `payment_url` varchar(500) DEFAULT NULL COMMENT 'URL checkout pembayaran (untuk Tripay)',
  `expired_at` datetime DEFAULT NULL COMMENT 'Tanggal expired transaksi pembayaran',
  `reminder_h3_sent` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag email reminder H-3 sudah terkirim',
  `reminder_h1_sent` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag email reminder H-1 sudah terkirim',
  `reminder_h0_sent` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag email reminder hari H sudah terkirim',
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
) ENGINE=InnoDB AUTO_INCREMENT=196 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_payments`
--

LOCK TABLES `tenant_payments` WRITE;
/*!40000 ALTER TABLE `tenant_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_name` varchar(255) NOT NULL COMMENT 'Nama bisnis laundry',
  `owner_name` varchar(255) NOT NULL COMMENT 'Nama pemilik bisnis',
  `email` varchar(255) NOT NULL COMMENT 'Email pemilik bisnis',
  `phone` varchar(255) NOT NULL COMMENT 'Nomor telepon pemilik',
  `address` text NOT NULL COMMENT 'Alamat bisnis',
  `city` varchar(255) DEFAULT NULL COMMENT 'Kota bisnis',
  `status` enum('active','inactive','suspended','trial','pending_payment','expired') NOT NULL DEFAULT 'trial',
  `trial_end_date` datetime DEFAULT NULL COMMENT 'Tanggal berakhir trial',
  `subscription_status` enum('trial','active','expired','cancelled','pending_payment') NOT NULL DEFAULT 'trial' COMMENT 'Status langganan',
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Pengaturan khusus tenant' CHECK (json_valid(`settings`)),
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `verified_at` datetime DEFAULT NULL,
  `ai_credit_balance` int(11) NOT NULL DEFAULT 0 COMMENT 'Sisa credit AI real-time',
  `ai_tier` enum('FREE','BASIC','PREMIUM') NOT NULL DEFAULT 'FREE' COMMENT 'Tier AI menentukan monthly grant amount',
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
) ENGINE=InnoDB AUTO_INCREMENT=160 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES (1,'Telaga Madiredo','Admin Telaga','admin@telagamadiredo.id','6281234567890','Jl. Raya Telaga Madiredo, Pujon, Kabupaten Malang, Jawa Timur','Malang','active',NULL,'active',NULL,'2026-10-31 09:31:04','2026-11-14 19:19:42',NULL,1,'2026-10-31 09:31:04',0,'FREE');
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `treatment`
--

DROP TABLE IF EXISTS `treatment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `treatment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `type_item` varchar(255) NOT NULL,
  `type_service` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik treatment',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif treatment',
  `requires_tracking` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Apakah treatment memerlukan tracking status (false untuk produk/ongkir)',
  `unit` varchar(30) DEFAULT NULL COMMENT 'Satuan barang: pcs, porsi, gelas, botol, bungkus',
  `production_mode` enum('outlet','central') NOT NULL DEFAULT 'central' COMMENT 'central = dikirim ke dapur cabang (default), outlet = selalu dibuat di outlet penjual',
  `production_branch_id` int(11) DEFAULT NULL COMMENT 'Dapur produksi khusus produk ini. Null = ikut mode produksi cabang',
  `category_id` int(11) DEFAULT NULL COMMENT 'Kategori katalog produk. Null = belum dikategorikan',
  PRIMARY KEY (`id`),
  KEY `treatment_tenant_id` (`tenant_id`),
  KEY `idx_treatment_production_branch` (`production_branch_id`),
  KEY `idx_treatment_category` (`category_id`),
  CONSTRAINT `treatment_category_id_foreign_idx` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `treatment_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `treatment_production_branch_id_foreign_idx` FOREIGN KEY (`production_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=361 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `treatment`
--

LOCK TABLES `treatment` WRITE;
/*!40000 ALTER TABLE `treatment` DISABLE KEYS */;
INSERT INTO `treatment` VALUES (1,'Tiket Masuk Dewasa',10000.00,'Tiket','Wisata','Tiket masuk kawasan wisata Telaga Madiredo untuk dewasa','2026-10-31 09:31:04','2026-11-26 02:39:00',NULL,1,1,0,'','outlet',NULL,16),(2,'Tiket Masuk Anak',5000.00,'Tiket','Wisata','Tiket masuk kawasan wisata untuk anak-anak','2026-10-31 09:31:04','2026-11-26 02:40:37',NULL,1,1,0,'','outlet',NULL,16),(3,'Paket Edukasi Sekolah',25000.00,'Paket','Wisata','Paket kunjungan edukasi untuk rombongan sekolah','2026-10-31 09:31:04','2026-11-26 02:40:47',NULL,1,1,0,'','outlet',NULL,18),(4,'Paket Camping Keluarga',150000.00,'Paket','Wisata','Paket camping keluarga per tenda per malam','2026-10-31 09:31:04','2026-11-26 02:40:53',NULL,1,1,0,'','outlet',NULL,18),(5,'Sewa Perahu Keliling Telaga',25000.00,'Wahana','Wisata','Sewa perahu untuk mengelilingi telaga','2026-10-31 09:31:04','2026-11-26 02:40:59',NULL,1,1,0,'','outlet',NULL,16),(6,'Paket Outbound',75000.00,'Paket','Wisata','Paket kegiatan outbound per peserta','2026-10-31 09:31:04','2026-11-26 02:41:05',NULL,1,1,0,'','outlet',NULL,18),(7,'Spot Foto / Photo Session',20000.00,'Wahana','Wisata','Sewa area spot foto per sesi','2026-10-31 09:31:04','2026-11-26 02:41:16',NULL,1,1,0,'','outlet',NULL,18),(8,'Guide Tour',50000.00,'Jasa','Wisata','Jasa pemandu wisata per grup','2026-10-31 09:31:04','2026-11-26 02:41:24',NULL,1,1,0,'','outlet',NULL,18),(9,'Parkir Motor',5000.00,'Parkir','Retribusi','Retribusi parkir sepeda motor','2026-10-31 09:31:04','2026-11-26 02:41:30',NULL,1,1,0,'','outlet',NULL,17),(10,'Parkir Mobil',10000.00,'Parkir','Retribusi','Retribusi parkir mobil','2026-10-31 09:31:04','2026-11-26 02:41:39',NULL,1,1,0,'','outlet',NULL,17),(357,'Popmie Goreng',12000.00,'Makanan','Makanan','','2026-11-14 21:58:16','2026-11-26 02:40:08',NULL,1,1,0,'pcs','outlet',NULL,11),(358,'Kopi Susu Telaga',15000.00,'Makanan','Makanan','','2026-11-15 01:29:14','2026-11-26 02:39:33',NULL,1,1,0,'pcs','outlet',NULL,12),(359,'Kopi Gula Aren',18000.00,'Makanan','Makanan','kopi susu gula aren','2026-11-26 02:42:59','2026-11-26 02:47:15',NULL,1,1,0,'pcs','central',NULL,12),(360,'Cwie Mie',20000.00,'Makanan','Makanan','','2026-11-26 03:56:14','2026-11-26 03:56:14',NULL,1,1,0,'pcs','central',NULL,10);
/*!40000 ALTER TABLE `treatment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `treatment_addon_availability`
--

DROP TABLE IF EXISTS `treatment_addon_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `treatment_addon_availability` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `treatment_id` int(11) NOT NULL,
  `addon_id` int(11) NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `custom_price` decimal(12,2) DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_unique_treatment_addon` (`treatment_id`,`addon_id`),
  UNIQUE KEY `treatment_addon_availability_treatment_id_addon_id` (`treatment_id`,`addon_id`),
  KEY `idx_avail_treatment` (`treatment_id`),
  KEY `idx_avail_addon` (`addon_id`),
  CONSTRAINT `treatment_addon_availability_ibfk_1` FOREIGN KEY (`treatment_id`) REFERENCES `treatment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `treatment_addon_availability_ibfk_2` FOREIGN KEY (`addon_id`) REFERENCES `treatment_addons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `treatment_addon_availability`
--

LOCK TABLES `treatment_addon_availability` WRITE;
/*!40000 ALTER TABLE `treatment_addon_availability` DISABLE KEYS */;
/*!40000 ALTER TABLE `treatment_addon_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `treatment_addons`
--

DROP TABLE IF EXISTS `treatment_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `treatment_addons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `addon_type` enum('process_time','material','service','extra') NOT NULL DEFAULT 'extra',
  `description` text DEFAULT NULL,
  `default_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `days_adjustment` int(11) NOT NULL DEFAULT 0,
  `icon` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_addon_tenant` (`tenant_id`),
  KEY `idx_addon_type` (`addon_type`),
  KEY `idx_addon_active` (`is_active`),
  CONSTRAINT `treatment_addons_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `treatment_addons`
--

LOCK TABLES `treatment_addons` WRITE;
/*!40000 ALTER TABLE `treatment_addons` DISABLE KEYS */;
/*!40000 ALTER TABLE `treatment_addons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `treatment_stocks`
--

DROP TABLE IF EXISTS `treatment_stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `treatment_stocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `treatment_id` int(11) NOT NULL COMMENT 'Barang/layanan yang di-track stoknya',
  `branch_id` int(11) NOT NULL COMMENT 'Outlet pemilik stok ini',
  `stock` int(11) NOT NULL DEFAULT 0 COMMENT 'Sisa stok saat ini (boleh minus bila allow_negative_stock aktif)',
  `min_stock` int(11) NOT NULL DEFAULT 0 COMMENT 'Batas bawah untuk status "Menipis"',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'false = berhenti di-track (stok tidak lagi dipotong saat penjualan)',
  `last_restock_at` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_treatment_stocks_treatment_branch` (`treatment_id`,`branch_id`),
  KEY `branch_id` (`branch_id`),
  KEY `idx_treatment_stocks_tenant_branch` (`tenant_id`,`branch_id`),
  CONSTRAINT `treatment_stocks_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `treatment_stocks_ibfk_2` FOREIGN KEY (`treatment_id`) REFERENCES `treatment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `treatment_stocks_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `treatment_stocks`
--

LOCK TABLES `treatment_stocks` WRITE;
/*!40000 ALTER TABLE `treatment_stocks` DISABLE KEYS */;
INSERT INTO `treatment_stocks` VALUES (1,1,357,1,20,5,1,'2026-11-14 22:01:06','2026-11-14 21:58:16','2026-11-14 22:01:06'),(2,1,357,77,0,5,1,'2026-11-14 22:20:00','2026-11-14 22:20:00','2026-11-15 04:18:31'),(3,1,357,78,9,5,1,'2026-11-14 22:20:24','2026-11-14 22:20:24','2026-11-15 03:54:28'),(4,1,357,79,11,5,1,'2026-11-14 22:20:33','2026-11-14 22:20:33','2026-11-26 02:15:15'),(5,1,359,77,100,5,1,'2026-11-26 02:42:59','2026-11-26 02:42:59','2026-11-26 02:42:59'),(6,1,360,77,98,5,1,'2026-11-26 03:57:44','2026-11-26 03:56:14','2026-11-26 03:58:25');
/*!40000 ALTER TABLE `treatment_stocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `role` varchar(255) NOT NULL DEFAULT 'employee',
  `position` varchar(50) DEFAULT NULL COMMENT 'Jabatan operasional: kasir, kebersihan, dapur, taman, keamanan, dll',
  `salary` int(11) DEFAULT NULL,
  `salary_date` date DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL COMMENT 'ID tenant pemilik user',
  `refresh_token` text DEFAULT NULL COMMENT 'Refresh token untuk auto refresh access token',
  `password_reset_token` varchar(255) DEFAULT NULL COMMENT 'Token untuk reset password',
  `password_reset_expires_at` datetime DEFAULT NULL COMMENT 'Tanggal kadaluarsa password reset token',
  `droppoint_id` int(11) DEFAULT NULL COMMENT 'ID droppoint jika user adalah staff mitra',
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
  KEY `idx_users_password_reset_token` (`password_reset_token`),
  KEY `idx_users_droppoint` (`droppoint_id`),
  KEY `idx_users_tenant_droppoint` (`tenant_id`,`droppoint_id`),
  CONSTRAINT `users_droppoint_id_foreign_idx` FOREIGN KEY (`droppoint_id`) REFERENCES `droppoints` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `users_ibfk_19` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `users_ibfk_20` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin Telaga',77,'admin@telagamadiredo.id','$2b$10$VhdHa9XtIIcElSyJaVVvouLZxVKG7Yxxg1A123KJ2J2t2wkkHMO.e','6281234567890','Malang','active','superadmin',NULL,NULL,NULL,'2026-10-31 09:31:04','2026-11-26 04:20:36',NULL,1,NULL,NULL,NULL,NULL),(2,'Super App Admin',NULL,'superapp@telagamadiredo.id','$2b$10$VhdHa9XtIIcElSyJaVVvouLZxVKG7Yxxg1A123KJ2J2t2wkkHMO.e','6281234567890','Malang','active','superapp-superadmin',NULL,NULL,NULL,'2026-10-31 09:31:04','2026-10-31 09:31:04',NULL,NULL,NULL,NULL,NULL,NULL),(129,'akbar',1,'karyawanloket@gmail.com','$2b$10$UqXnYNVZMA4HzlASrGIb8.AzgVix2OP.0HTxyUMccRLA18aDsOBFG','+6282255355555','malang','active','employee','kebersihan',NULL,NULL,'2026-11-14 01:26:53','2026-11-14 03:17:25',NULL,1,NULL,NULL,NULL,NULL),(130,'bersih',1,'karyawanbersih@gmail.com','$2b$10$o3cqD1CLIwWJBSoH7Mz/B.oqB/uhxfGMYnaiABKcmZZF5D0zrRwIG','+62823332332122','malang','active','employee',NULL,NULL,NULL,'2026-11-14 12:21:13','2026-11-14 12:21:13',NULL,1,NULL,NULL,NULL,NULL),(131,'Tutut',1,'tutut@telagamadiredo.id','$2b$10$zxxUAGiDr5Fps.Q/pX8Gbev6MrluEByjB4PeEdqfc8Py5dL27F0na','+62822323234343','meduran pujon','active','admin',NULL,NULL,NULL,'2026-11-26 04:31:22','2026-11-26 04:31:22',NULL,1,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wa_connections`
--

DROP TABLE IF EXISTS `wa_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wa_connections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `connection_id` varchar(255) NOT NULL COMMENT 'WhatsApp connection ID from WA Gateway',
  `connection_type` enum('superapp','promotion','cs','followup','tenant') NOT NULL DEFAULT 'superapp' COMMENT 'Type of WhatsApp connection',
  `tenant_id` int(11) DEFAULT NULL COMMENT 'Tenant ID (NULL for superapp connections)',
  `branch_id` int(11) DEFAULT NULL COMMENT 'Branch ID (NULL for superapp connections)',
  `status` enum('PENDING','READY','DISCONNECTED','FAILED','DESTROYED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the WhatsApp connection',
  `phone_number` varchar(20) DEFAULT NULL COMMENT 'Connected WhatsApp phone number',
  `qr_code` text DEFAULT NULL COMMENT 'QR code data for authentication',
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='WhatsApp connections for different purposes';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wa_connections`
--

LOCK TABLES `wa_connections` WRITE;
/*!40000 ALTER TABLE `wa_connections` DISABLE KEYS */;
/*!40000 ALTER TABLE `wa_connections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wa_sessions`
--

DROP TABLE IF EXISTS `wa_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wa_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(255) NOT NULL COMMENT 'WhatsApp session ID from WA Gateway',
  `tenant_id` int(11) NOT NULL COMMENT 'Tenant ID for multi-tenant support',
  `branch_id` int(11) DEFAULT NULL,
  `session_type` enum('general','tenant_campaign','tenant','superapp') DEFAULT 'general',
  `status` enum('PENDING','READY','DISCONNECTED','FAILED','DESTROYED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the WhatsApp session',
  `phone_number` varchar(20) DEFAULT NULL COMMENT 'Connected WhatsApp phone number',
  `qr_code` text DEFAULT NULL COMMENT 'QR code data for authentication',
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
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wa_sessions`
--

LOCK TABLES `wa_sessions` WRITE;
/*!40000 ALTER TABLE `wa_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `wa_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wa_verifications`
--

DROP TABLE IF EXISTS `wa_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wa_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `whatsapp_number` varchar(255) NOT NULL COMMENT 'Nomor WhatsApp yang diverifikasi',
  `otp_code` varchar(6) NOT NULL COMMENT 'Kode OTP yang dikirim',
  `otp_expires_at` datetime NOT NULL COMMENT 'Waktu kadaluarsa OTP',
  `verification_attempts` int(11) DEFAULT 0 COMMENT 'Jumlah percobaan verifikasi',
  `status` enum('sent','verified','expired','failed') DEFAULT 'sent' COMMENT 'Status verifikasi',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `wa_verifications_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `tenant_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wa_verifications`
--

LOCK TABLES `wa_verifications` WRITE;
/*!40000 ALTER TABLE `wa_verifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `wa_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_templates`
--

DROP TABLE IF EXISTS `whatsapp_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `whatsapp_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Nama template untuk identifikasi',
  `category` enum('invoice','invoice_paid','invoice_dp','invoice_unpaid','item_done','delivery','pickup','notification','promotion','reminder','campaign','broadcast','announcement','other','followup') NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `template_content` text DEFAULT NULL,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Daftar variable yang bisa digunakan dalam template' CHECK (json_valid(`variables`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif template',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Template default untuk kategori tertentu',
  `tenant_id` int(11) NOT NULL COMMENT 'ID tenant pemilik template',
  `branch_id` int(11) DEFAULT NULL COMMENT 'ID branch (null = untuk semua branch)',
  `created_by` int(11) DEFAULT NULL COMMENT 'ID user yang membuat template',
  `updated_by` int(11) DEFAULT NULL COMMENT 'ID user yang terakhir update template',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Template system yang tidak bisa dihapus dan diedit',
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
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Template WhatsApp untuk berbagai kategori pesan';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_templates`
--

LOCK TABLES `whatsapp_templates` WRITE;
/*!40000 ALTER TABLE `whatsapp_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_schedule_days`
--

DROP TABLE IF EXISTS `work_schedule_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `work_schedule_days` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_id` int(11) NOT NULL,
  `day_of_week` tinyint(4) NOT NULL COMMENT '1=Senin ... 7=Minggu (ISO)',
  `is_rest_day` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'true = hari libur rutin, tidak dihitung telat',
  `clock_in_target` time DEFAULT NULL COMMENT 'Jam masuk normal, mis. 08:00:00',
  `clock_out_target` time DEFAULT NULL COMMENT 'Jam pulang normal, mis. 17:00:00',
  `break_minutes` int(11) NOT NULL DEFAULT 60 COMMENT 'Istirahat, dipakai hitung durasi kerja efektif',
  `tolerance_minutes` int(11) NOT NULL DEFAULT 15 COMMENT 'Batas toleransi telat per hari',
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_schedule_days_unique` (`schedule_id`,`day_of_week`),
  CONSTRAINT `work_schedule_days_ibfk_1` FOREIGN KEY (`schedule_id`) REFERENCES `work_schedules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_schedule_days`
--

LOCK TABLES `work_schedule_days` WRITE;
/*!40000 ALTER TABLE `work_schedule_days` DISABLE KEYS */;
INSERT INTO `work_schedule_days` VALUES (1,1,1,0,'08:00:00','17:00:00',60,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(2,1,2,0,'08:00:00','17:00:00',60,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(3,1,3,0,'08:00:00','17:00:00',60,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(4,1,4,0,'08:00:00','17:00:00',60,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(5,1,5,0,'08:00:00','17:00:00',60,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(6,1,6,0,'08:00:00','20:00:00',60,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(7,1,7,1,NULL,NULL,0,0,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(8,2,1,1,NULL,NULL,0,0,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(9,2,2,0,'12:00:00','20:00:00',45,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(10,2,3,0,'12:00:00','20:00:00',45,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(11,2,4,0,'12:00:00','20:00:00',45,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(12,2,5,0,'12:00:00','20:00:00',45,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(13,2,6,0,'10:00:00','21:00:00',45,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(14,2,7,0,'10:00:00','21:00:00',45,15,'2026-11-14 19:38:45','2026-11-14 19:38:45'),(22,4,1,1,NULL,NULL,0,0,'2026-11-14 13:18:26','2026-11-14 13:18:26'),(23,4,2,0,'12:00:00','20:00:00',45,15,'2026-11-14 13:18:26','2026-11-14 13:18:26'),(24,4,3,0,'12:00:00','20:00:00',45,15,'2026-11-14 13:18:26','2026-11-14 13:18:26'),(25,4,4,0,'12:00:00','20:00:00',45,15,'2026-11-14 13:18:26','2026-11-14 13:18:26'),(26,4,5,0,'12:00:00','20:00:00',45,15,'2026-11-14 13:18:26','2026-11-14 13:18:26'),(27,4,6,0,'10:00:00','21:00:00',45,15,'2026-11-14 13:18:26','2026-11-14 13:18:26'),(28,4,7,0,'10:00:00','21:00:00',45,15,'2026-11-14 13:18:26','2026-11-14 13:18:26');
/*!40000 ALTER TABLE `work_schedule_days` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_schedules`
--

DROP TABLE IF EXISTS `work_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `work_schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL COMMENT 'NULL = mengikuti cabang karyawan',
  `employment_type` enum('fulltime','parttime') NOT NULL DEFAULT 'fulltime' COMMENT 'Fulltime / parttime hanya pembeda label, jam tetap per hari',
  `effective_from` date NOT NULL COMMENT 'Berlaku mulai tanggal ini',
  `effective_to` date DEFAULT NULL COMMENT 'NULL = berlaku selamanya',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `note` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  KEY `branch_id` (`branch_id`),
  KEY `work_schedules_tenant_employee_active` (`tenant_id`,`employee_id`,`is_active`),
  CONSTRAINT `work_schedules_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `work_schedules_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `work_schedules_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_schedules`
--

LOCK TABLES `work_schedules` WRITE;
/*!40000 ALTER TABLE `work_schedules` DISABLE KEYS */;
INSERT INTO `work_schedules` VALUES (1,1,129,1,'fulltime','2026-11-01',NULL,1,'Jadwal awal fulltime','2026-11-14 19:38:45','2026-11-14 12:46:11',NULL),(2,1,130,1,'parttime','2026-11-01','2026-11-14',0,'Jadwal awal parttime','2026-11-14 19:38:45','2026-11-14 13:18:26',NULL),(4,1,130,1,'parttime','2026-11-01',NULL,1,NULL,'2026-11-14 13:18:26','2026-11-14 13:18:26',NULL);
/*!40000 ALTER TABLE `work_schedules` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-26 11:47:37
