# Migration Script: katsikat_migrate → katsikat

## 📋 Overview

This migration script migrates data from the old `katsikat_migrate` database structure to the new `katsikat` database structure with multi-tenant support.

## 🎯 What This Migration Does

### Data Migration:
- **Core System**: Tenants, Branches, Users
- **Reference Data**: Treatments, Items, Discounts
- **Customer Data**: Customers with membership mapping
- **Transaction Data**: Orders, Order Details
- **Photo Data**: Shoes Photos (35,790), Item Status Photos (7,459)
- **Operational Data**: Shifts, Absents, Deliveries
- **Financial Data**: Finance Accounts, Transactions

### Data Transformations:
- Adds `tenant_id = 1` and `branch_id = 1` to all records
- Maps old IDs to new IDs using ID mapping table
- Updates photo URLs with `https://api.katsikat.id/` prefix
- Handles foreign key dependencies automatically
- Validates data integrity after migration

## 🚀 How to Run

### Prerequisites:
1. `katsikat_migrate` database must exist with old data
2. `katsikat` database must exist with new structure
3. Database connection configured in `config/database.js`

### Run Migration:
```bash
cd backend-notasepatu/src/migrations/backup-to-katsikat
node run-migration.js
```

### Check Help:
```bash
node run-migration.js --help
```

## 📁 Migration Files

| File | Description | Records |
|------|-------------|---------|
| `001-setup-migration-tables.js` | Create tracking tables | - |
| `002-migrate-tenants.js` | Create default tenant | 1 |
| `003-migrate-branches.js` | Migrate branches | ~1 |
| `004-migrate-users.js` | Migrate users | ~30 |
| `005-migrate-reference-data.js` | Migrate treatments, items, discounts | ~200+ |
| `006-migrate-customers.js` | Migrate customers | ~2,279 |
| `007-migrate-orders.js` | Migrate orders | ~4,322 |
| `008-migrate-photos.js` | Migrate photos | ~43,000+ |
| `009-cleanup-migration.js` | Validate & cleanup | - |

## 🔍 Migration Process

1. **Setup**: Create migration tracking tables
2. **Core Data**: Migrate tenants, branches, users
3. **Reference Data**: Migrate treatments, items, discounts
4. **Customer Data**: Migrate customers with batch processing
5. **Transaction Data**: Migrate orders and order details
6. **Photo Data**: Migrate shoes photos and item status photos
7. **Validation**: Check data integrity
8. **Cleanup**: Remove migration tracking tables

## 📊 Expected Results

After successful migration:
- ✅ All data from `katsikat_migrate` migrated to `katsikat`
- ✅ Multi-tenant structure with `tenant_id = 1`
- ✅ Multi-branch structure with `branch_id = 1`
- ✅ All foreign key relationships intact
- ✅ Photo URLs updated with correct prefix
- ✅ Data integrity validated

## ⚠️ Important Notes

- **Backup First**: Always backup your `katsikat` database before running
- **One-Time Use**: This migration is designed for one-time use
- **Rollback**: Use database backup to rollback if needed
- **Testing**: Test in development environment first

## 🐛 Troubleshooting

### Common Issues:
1. **Foreign Key Errors**: Run migrations in correct order
2. **Memory Issues**: Migration uses batch processing for large tables
3. **Connection Errors**: Check database configuration
4. **Permission Errors**: Ensure database user has proper permissions

### Error Recovery:
- Check `migration_logs` table for error details
- Fix the issue and re-run the specific migration
- Use database backup to restore if needed

## 📈 Performance

- **Batch Processing**: Large tables processed in batches of 100-1000 records
- **Progress Tracking**: Real-time progress updates
- **Memory Efficient**: Processes data in chunks to avoid memory issues
- **Estimated Time**: 5-15 minutes depending on data size

## 🔧 Customization

To modify the migration:
1. Edit individual migration files
2. Adjust batch sizes for performance
3. Add additional data transformations
4. Modify validation rules

## 📞 Support

If you encounter issues:
1. Check the migration logs
2. Verify database connections
3. Ensure all prerequisites are met
4. Review error messages for specific issues
