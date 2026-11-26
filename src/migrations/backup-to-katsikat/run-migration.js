#!/usr/bin/env node

// Load environment variables first
require('dotenv').config({ path: '../../../.env' });

// Override DB_NAME to use target database (katsikat)
process.env.DB_NAME = 'katsikat';

const sequelize = require('../../config/database.js');
const fs = require('fs');
const path = require('path');

// List of migration files in order
const migrations = [
  '001-setup-migration-tables.js',
  '002-migrate-tenants.js',
  '003-migrate-branches.js',
  '004-migrate-users.js',
  '005-migrate-reference-data.js',
  '006-migrate-customers.js',
  '007-migrate-orders.js',
  '008-migrate-photos.js',
  '009-cleanup-migration.js'
];

async function runMigrations() {
  console.log('🚀 Starting migration from katsikat_migrate to katsikat...\n');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Run each migration
    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migration file not found: ${migrationFile}`);
        continue;
      }

      console.log(`\n📋 Running migration: ${migrationFile}`);
      
      const migration = require(migrationPath);
      
      if (migration.up) {
        await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
        console.log(`✅ Completed: ${migrationFile}`);
      } else {
        console.log(`⚠️  No up method found in: ${migrationFile}`);
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
    console.log('📊 Database migration from katsikat_migrate to katsikat is complete.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('💡 Check the error details above and fix any issues.');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📋 Migration Runner for katsikat_migrate → katsikat

Usage:
  node run-migration.js              # Run all migrations
  node run-migration.js --help       # Show this help

Migration Order:
  1. Setup migration tracking tables
  2. Migrate tenants
  3. Migrate branches  
  4. Migrate users
  5. Migrate reference data (treatments, items, discounts)
  6. Migrate customers
  7. Migrate orders
  8. Migrate photos (shoes + item status)
  9. Cleanup migration tables

Prerequisites:
  - katsikat_migrate database must exist
  - katsikat database must exist with new structure
  - Database connection configured in config/database.js
`);
  process.exit(0);
}

// Run migrations
runMigrations();
