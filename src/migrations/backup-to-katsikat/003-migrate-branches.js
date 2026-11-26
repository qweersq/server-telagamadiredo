'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Log migration start
      await queryInterface.bulkInsert('migration_logs', [{
        migration_name: '003-migrate-branches',
        status: 'running',
        started_at: new Date()
      }]);

      // Get tenant ID mapping
      const [tenantMapping] = await queryInterface.sequelize.query(
        'SELECT new_id FROM id_mappings WHERE table_name = "tenants" AND old_id = 1',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (!tenantMapping) {
        throw new Error('Tenant mapping not found. Run tenant migration first.');
      }

      const tenantId = tenantMapping.new_id;

      // Check if branches already exist
      const existingBranches = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM branches',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (existingBranches[0].count > 0) {
        console.log('⚠️  Branches already exist, skipping migration');
        await queryInterface.bulkUpdate('migration_logs', 
          { status: 'completed', completed_at: new Date() },
          { migration_name: '003-migrate-branches' }
        );
        return;
      }

      // Migrate branches from backup
      const backupBranches = await queryInterface.sequelize.query(
        'SELECT * FROM katsikat_migrate.branches',
        { type: Sequelize.QueryTypes.SELECT }
      );

      let processedCount = 0;

      for (const branch of backupBranches) {
        const [branchResult] = await queryInterface.bulkInsert('branches', [{
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          manager_id: branch.manager_id,
          city: branch.city,
          tenant_id: tenantId,
          status: 'active',
          longitude: 112.75000000, // Default coordinates
          latitude: -7.25000000,
          createdAt: new Date(),
          updatedAt: new Date()
        }], { returning: true });

        // Store ID mapping
        await queryInterface.bulkInsert('id_mappings', [{
          table_name: 'branches',
          old_id: branch.id,
          new_id: branchResult.id,
          createdAt: new Date()
        }]);

        processedCount++;
      }

      console.log(`✅ Migrated ${processedCount} branches`);

      // Update migration log
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'completed', 
          completed_at: new Date(),
          records_processed: processedCount
        },
        { migration_name: '003-migrate-branches' }
      );

    } catch (error) {
      console.error('❌ Error migrating branches:', error);
      
      // Update migration log with error
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'failed', 
          completed_at: new Date(),
          error_message: error.message
        },
        { migration_name: '003-migrate-branches' }
      );
      
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove ID mappings
    await queryInterface.bulkDelete('id_mappings', {
      table_name: 'branches'
    });

    // Remove branches
    await queryInterface.bulkDelete('branches', {});

    console.log('✅ Branches migration rolled back');
  }
};
