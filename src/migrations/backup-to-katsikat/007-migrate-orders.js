'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Log migration start
      await queryInterface.bulkInsert('migration_logs', [{
        migration_name: '007-migrate-orders',
        status: 'running',
        started_at: new Date()
      }]);

      // Get ID mappings
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

      // Check if orders already exist
      const existingOrders = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM orders',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (existingOrders[0].count > 0) {
        console.log('⚠️  Orders already exist, skipping migration');
        await queryInterface.bulkUpdate('migration_logs', 
          { status: 'completed', completed_at: new Date() },
          { migration_name: '007-migrate-orders' }
        );
        return;
      }

      // Migrate orders from backup
      const backupOrders = await queryInterface.sequelize.query(
        'SELECT * FROM katsikat_migrate.orders',
        { type: Sequelize.QueryTypes.SELECT }
      );

      let processedCount = 0;
      const batchSize = 100;

      for (let i = 0; i < backupOrders.length; i += batchSize) {
        const batch = backupOrders.slice(i, i + batchSize);
        const orderInserts = [];

        for (const order of batch) {
          orderInserts.push({
            customer_id: order.customer_id,
            branch_id: branchId,
            payment_id: order.payment_id,
            entry_date: order.entry_date,
            quantity: order.quantity,
            order_type: order.order_type,
            created_by: order.created_by,
            shift_id: order.shift_id,
            tenant_id: tenantId,
            createdAt: order.createdAt || new Date(),
            updatedAt: order.updatedAt || new Date(),
            deletedAt: order.deletedAt
          });
        }

        // Bulk insert batch
        const insertedOrders = await queryInterface.bulkInsert('orders', orderInserts, { returning: true });

        // Store ID mappings for batch
        const mappingInserts = [];
        for (let j = 0; j < batch.length; j++) {
          mappingInserts.push({
            table_name: 'orders',
            old_id: batch[j].id,
            new_id: insertedOrders[j].id,
            createdAt: new Date()
          });
        }

        await queryInterface.bulkInsert('id_mappings', mappingInserts);
        processedCount += batch.length;

        console.log(`📊 Processed ${processedCount}/${backupOrders.length} orders`);
      }

      console.log(`✅ Migrated ${processedCount} orders`);

      // Update migration log
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'completed', 
          completed_at: new Date(),
          records_processed: processedCount
        },
        { migration_name: '007-migrate-orders' }
      );

    } catch (error) {
      console.error('❌ Error migrating orders:', error);
      
      // Update migration log with error
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'failed', 
          completed_at: new Date(),
          error_message: error.message
        },
        { migration_name: '007-migrate-orders' }
      );
      
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove ID mappings
    await queryInterface.bulkDelete('id_mappings', {
      table_name: 'orders'
    });

    // Remove orders
    await queryInterface.bulkDelete('orders', {});

    console.log('✅ Orders migration rolled back');
  }
};
