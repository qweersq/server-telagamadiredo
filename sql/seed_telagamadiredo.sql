-- Seed minimal untuk Telaga Madiredo (POS wisata)
-- Password semua user contoh: telaga123

INSERT INTO tenants
  (id, business_name, owner_name, email, phone, address, city, status, trial_end_date,
   subscription_status, settings, createdAt, updatedAt, is_verified, verified_at, ai_credit_balance, ai_tier)
VALUES
  (1, 'Telaga Madiredo', 'Admin Telaga', 'admin@telagamadiredo.id', '6281234567890',
   'Jl. Raya Telaga Madiredo, Pujon, Kabupaten Malang, Jawa Timur', 'Malang',
   'active', NULL, 'active', NULL, NOW(), NOW(), 1, NOW(), 0, 'FREE');

INSERT INTO branches
  (id, name, address, phone, manager_id, city, createdAt, updatedAt, tenant_id, status, branch_type, longitude, latitude)
VALUES
  (1, 'Loket Utama Telaga', 'Jl. Raya Telaga Madiredo, Pujon, Kabupaten Malang, Jawa Timur',
   '6281234567890', 1, 'Malang', NOW(), NOW(), 1, 'active', 'main', NULL, NULL);

INSERT INTO users
  (id, name, branch_id, email, password, phone, address, status, role, salary, salary_date, createdAt, updatedAt, tenant_id)
VALUES
  (1, 'Admin Telaga', 1, 'admin@telagamadiredo.id',
   '$2b$10$VhdHa9XtIIcElSyJaVVvouLZxVKG7Yxxg1A123KJ2J2t2wkkHMO.e',
   '6281234567890', 'Malang', 'active', 'superadmin', NULL, NULL, NOW(), NOW(), 1),
  (2, 'Super App Admin', NULL, 'superapp@telagamadiredo.id',
   '$2b$10$VhdHa9XtIIcElSyJaVVvouLZxVKG7Yxxg1A123KJ2J2t2wkkHMO.e',
   '6281234567890', 'Malang', 'active', 'superapp-superadmin', NULL, NULL, NOW(), NOW(), NULL);

INSERT INTO subscriptions
  (tenant_id, plan_id, status, start_date, end_date, auto_renew, price, discount_amount, final_price, notes, createdAt, updatedAt)
VALUES
  (1, 4, 'active', NOW(), NULL, 0, 0.00, 0.00, 0.00, 'Seed awal Telaga Madiredo', NOW(), NOW());

INSERT INTO treatment
  (id, name, price, type_item, type_service, description, createdAt, updatedAt, tenant_id, is_active, requires_tracking)
VALUES
  (1, 'Tiket Masuk Dewasa', 10000.00, 'Tiket', 'Wisata', 'Tiket masuk kawasan wisata Telaga Madiredo untuk dewasa', NOW(), NOW(), 1, 1, 0),
  (2, 'Tiket Masuk Anak', 5000.00, 'Tiket', 'Wisata', 'Tiket masuk kawasan wisata untuk anak-anak', NOW(), NOW(), 1, 1, 0),
  (3, 'Paket Edukasi Sekolah', 25000.00, 'Paket', 'Wisata', 'Paket kunjungan edukasi untuk rombongan sekolah', NOW(), NOW(), 1, 1, 0),
  (4, 'Paket Camping Keluarga', 150000.00, 'Paket', 'Wisata', 'Paket camping keluarga per tenda per malam', NOW(), NOW(), 1, 1, 0),
  (5, 'Sewa Perahu Keliling Telaga', 25000.00, 'Wahana', 'Wisata', 'Sewa perahu untuk mengelilingi telaga', NOW(), NOW(), 1, 1, 0),
  (6, 'Paket Outbound', 75000.00, 'Paket', 'Wisata', 'Paket kegiatan outbound per peserta', NOW(), NOW(), 1, 1, 0),
  (7, 'Spot Foto / Photo Session', 20000.00, 'Wahana', 'Wisata', 'Sewa area spot foto per sesi', NOW(), NOW(), 1, 1, 0),
  (8, 'Guide Tour', 50000.00, 'Jasa', 'Wisata', 'Jasa pemandu wisata per grup', NOW(), NOW(), 1, 1, 0),
  (9, 'Parkir Motor', 5000.00, 'Parkir', 'Retribusi', 'Retribusi parkir sepeda motor', NOW(), NOW(), 1, 1, 0),
  (10, 'Parkir Mobil', 10000.00, 'Parkir', 'Retribusi', 'Retribusi parkir mobil', NOW(), NOW(), 1, 1, 0);

INSERT INTO finance_accounts
  (id, name, balance, description, createdAt, updatedAt, tenant_id, branch_id, is_global, is_branch_specific, is_active, payment_method_id)
VALUES
  (1, 'Kas Tunai Telaga', 0.00, 'Kas tunai loket utama', NOW(), NOW(), 1, 1, 1, 0, 1, 1),
  (2, 'QRIS Telaga', 0.00, 'Penerimaan pembayaran QRIS', NOW(), NOW(), 1, 1, 1, 0, 1, 2),
  (3, 'Rekening Bank Telaga', 0.00, 'Penerimaan transfer bank', NOW(), NOW(), 1, 1, 1, 0, 1, 6);

INSERT INTO finance_categories
  (id, name, type, description, createdAt, updatedAt, tenant_id, is_system)
VALUES
  (1, 'Pendapatan Tiket', 'credit', 'Pemasukan penjualan tiket dan paket wisata', NOW(), NOW(), 1, 0),
  (2, 'Pendapatan Lainnya', 'credit', 'Pemasukan lain di luar tiket', NOW(), NOW(), 1, 0),
  (3, 'Beban Operasional', 'debit', 'Biaya operasional harian', NOW(), NOW(), 1, 0),
  (4, 'Beban Gaji', 'debit', 'Biaya gaji karyawan', NOW(), NOW(), 1, 0),
  (5, 'Beban Pemeliharaan', 'debit', 'Biaya perawatan sarana wisata', NOW(), NOW(), 1, 0);
