-- Script untuk menambahkan indexes penting pada table customers
-- Fokus pada: nama, tenant_id, dan no HP

USE katsikat;

-- 1. Index untuk pencarian berdasarkan nama (untuk LIKE queries)
-- Ini akan membantu query: WHERE name LIKE '%search%'
ALTER TABLE customers ADD INDEX idx_customers_name (name);

-- 2. Composite index untuk tenant_id + name (untuk filtering by tenant dan sorting by name)
-- Ini akan membantu query: WHERE tenant_id = ? ORDER BY name ASC
ALTER TABLE customers ADD INDEX idx_customers_tenant_name (tenant_id, name);

-- 3. Composite index untuk tenant_id + phone (untuk unique phone per tenant)
-- Ini akan membantu query: WHERE tenant_id = ? AND phone = ?
ALTER TABLE customers ADD INDEX idx_customers_tenant_phone (tenant_id, phone);

-- Menampilkan semua indexes yang telah dibuat
SHOW INDEX FROM customers;
