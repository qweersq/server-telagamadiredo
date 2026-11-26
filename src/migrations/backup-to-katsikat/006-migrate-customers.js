'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Log migration start
      await queryInterface.bulkInsert('migration_logs', [{
        migration_name: '006-migrate-customers',
        status: 'running',
        started_at: new Date()
      }]);

      // Get tenant and branch ID mappings
      const [tenantMapping] = await queryInterface.sequelize.query(
        'SELECT new_id FROM id_mappings WHERE table_name = "tenants" AND old_id = 1',
        { type: Sequelize.QueryTypes.SELECT }
      );

      const [branchMapping] = await queryInterface.sequelize.query(
        'SELECT new_id FROM id_mappings WHERE table_name = "branches" ORDER BY new_id LIMIT 1',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (!tenantMapping || !branchMapping) {
        throw new Error('Tenant or branch mapping not found. Run previous migrations first.');
      }

      const tenantId = tenantMapping.new_id;
      const branchId = branchMapping.new_id;

      // Check if customers already exist
      const existingCustomers = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM customers',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (existingCustomers[0].count > 0) {
        console.log('⚠️  Customers already exist, skipping migration');
        await queryInterface.bulkUpdate('migration_logs', 
          { status: 'completed', completed_at: new Date() },
          { migration_name: '006-migrate-customers' }
        );
        return;
      }

      // Migrate customers from backup
      const backupCustomers = await queryInterface.sequelize.query(
        'SELECT * FROM katsikat_migrate.customers',
        { type: Sequelize.QueryTypes.SELECT }
      );

      let processedCount = 0;
      const batchSize = 100; // Process in batches to avoid memory issues

      for (let i = 0; i < backupCustomers.length; i += batchSize) {
        const batch = backupCustomers.slice(i, i + batchSize);
        const customerInserts = [];

        for (const customer of batch) {
          customerInserts.push({
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            gender: customer.gender,
            password: customer.password,
            address: customer.address,
            gmaps: customer.gmaps,
            date_birthday: customer.date_birthday,
            city: customer.city,
            hobby: customer.hobby,
            age: customer.age,
            working_type: customer.working_type,
            description: customer.description,
            tenant_id: tenantId,
            current_membership_id: null, // Will be set later if needed
            branch_id: branchId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Bulk insert batch
        const insertedCustomers = await queryInterface.bulkInsert('customers', customerInserts, { returning: true });

        // Store ID mappings for batch
        const mappingInserts = [];
        for (let j = 0; j < batch.length; j++) {
          mappingInserts.push({
            table_name: 'customers',
            old_id: batch[j].id,
            new_id: insertedCustomers[j].id,
            createdAt: new Date()
          });
        }

        await queryInterface.bulkInsert('id_mappings', mappingInserts);
        processedCount += batch.length;

        console.log(`📊 Processed ${processedCount}/${backupCustomers.length} customers`);
      }

      console.log(`✅ Migrated ${processedCount} customers`);

      // Update migration log
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'completed', 
          completed_at: new Date(),
          records_processed: processedCount
        },
        { migration_name: '006-migrate-customers' }
      );

    } catch (error) {
      console.error('❌ Error migrating customers:', error);
      
      // Update migration log with error
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'failed', 
          completed_at: new Date(),
          error_message: error.message
        },
        { migration_name: '006-migrate-customers' }
      );
      
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove ID mappings
    await queryInterface.bulkDelete('id_mappings', {
      table_name: 'customers'
    });

    // Remove customers
    await queryInterface.bulkDelete('customers', {});

    console.log('✅ Customers migration rolled back');
  }
};
