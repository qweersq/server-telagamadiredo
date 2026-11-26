Role Hierarchy & Permissions:
1. Super App Super Admin (Global)
✅ Satu role saja - superapp-superadmin
✅ Scope: Mengelola semua tenant dalam sistem
✅ Permissions:
CRUD semua tenant
Lihat dashboard global
Manage subscription plans
Monitor semua tenant
Access ke semua data cross-tenant
2. Tenant Super Admin (Per Tenant)
✅ Role: superadmin (existing)
✅ Scope: Mengelola satu tenant tertentu
✅ Permissions:
Manage branches dalam tenant-nya
Manage treatments/services
Manage users dalam tenant-nya
Manage customers
Manage orders
Access dashboard tenant-nya
Full control dalam tenant scope
3. Admin (Per Branch)
✅ Role: admin (existing)
✅ Scope: Mengelola satu cabang saja
✅ Permissions:
Manage orders di cabang-nya
Manage customers
View reports cabang-nya
Limited access (tidak bisa manage branches lain)
4. Employee (Per Branch)
✅ Role: employee (existing)
✅ Scope: Operasional cabang
✅ Permissions:
Input orders
Update order status
Basic operations
🔄 Data Isolation:
✅ Tenant Level: Data terisolasi per tenant_id
✅ Branch Level: Data terisolasi per branch_id dalam tenant
✅ User Access: User hanya bisa akses data tenant/branch yang di-assign
📊 Dashboard Hierarchy:
✅ Super App Dashboard: Overview semua tenant
✅ Tenant Dashboard: Overview tenant tertentu (branches, orders, etc.)
✅ Branch Dashboard: Overview cabang tertentu


TABEL YANG BENAR-BENAR PERLU DITAMBAHKAN:
1. TABEL BARU (4 tabel saja):
A. Tenant Business Management
tenants - Data bisnis laundry yang mendaftar ke super app
id, business_name, owner_name, email, phone, address, status, trial_end_date, created_at

B. Subscription & Billing
subscription_plans - Paket langganan
id, name, price, duration_days, max_branches, max_users, features, is_active
subscriptions - Langganan per tenant
id, tenant_id, plan_id, status, start_date, end_date, auto_renew
tenant_payments - Pembayaran langganan tenant
id, subscription_id, amount, status, payment_method, paid_at, due_date