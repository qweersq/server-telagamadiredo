-- ============================================================
-- Nomor Antrian Tag Sepatu (reset harian per cabang)
-- Dasar reset: tanggal masuk order (orders.entry_date)
-- Jalankan SEKALI: mysql -u root -p notasepatu < sql/tag_sequence_migration.sql
-- ============================================================

-- 1. Tabel counter harian
CREATE TABLE IF NOT EXISTS `tag_sequences` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `seq_date` DATE NOT NULL COMMENT 'Tanggal order masuk (entry_date) sebagai dasar reset harian',
  `last_number` INT NOT NULL DEFAULT 0 COMMENT 'Nomor antrian terakhir yang sudah dipakai',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_tag_sequences_tenant_branch_date` (`tenant_id`, `branch_id`, `seq_date`),
  KEY `idx_tag_sequences_branch_date` (`branch_id`, `seq_date`),
  CONSTRAINT `fk_tag_sequences_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tag_sequences_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Kolom nomor tag di order_details
-- CATATAN: jalankan blok ini hanya sekali. Kalau kolom sudah ada, MySQL akan error
-- "Duplicate column name" — abaikan saja.
ALTER TABLE `order_details`
  ADD COLUMN `tag_number` INT NULL DEFAULT NULL
    COMMENT 'Nomor antrian tag sepatu, reset setiap hari per cabang (dasar: entry_date order)',
  ADD COLUMN `tag_date` DATE NULL DEFAULT NULL
    COMMENT 'Tanggal (entry_date order) yang dipakai sebagai dasar penomoran antrian';

-- 3. Index bantu untuk pencarian / reprint
ALTER TABLE `order_details`
  ADD KEY `idx_order_details_tag` (`order_id`, `tag_number`);

-- ============================================================
-- Order lama (tag_number NULL) bisa di-backfill via API:
--   POST /orders/:id/assign-tag-numbers
-- ============================================================
