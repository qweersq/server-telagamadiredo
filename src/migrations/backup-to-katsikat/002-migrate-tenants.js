'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Log migration start
      await queryInterface.bulkInsert('migration_logs', [{
        migration_name: '002-migrate-tenants',
        status: 'running',
        started_at: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      // Check if tenants already exist in katsikat (target database)
      const existingTenants = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM tenants',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (existingTenants[0].count > 0) {
        console.log('⚠️  Tenants already exist, skipping migration');
        await queryInterface.bulkUpdate('migration_logs', 
          { status: 'completed', completed_at: new Date() },
          { migration_name: '002-migrate-tenants' }
        );
        return;
      }

      // Create default tenant for backup data
      const [tenantResult] = await queryInterface.bulkInsert('tenants', [{
        business_name: 'Laundry Sepatu Default',
        owner_name: 'Admin',
        email: 'admin@notasepatu.com',
        phone: '081234567890',
        address: 'Jl. Default No. 1',
        city: 'Jakarta',
        status: 'active',
        subscription_status: 'active',
        is_verified: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }], { returning: true });

      // Store ID mapping
      await queryInterface.bulkInsert('id_mappings', [{
        table_name: 'tenants',
        old_id: 1, // Default tenant ID for backup data
        new_id: tenantResult.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      console.log(`✅ Created default tenant with ID: ${tenantResult.id}`);

      // Update migration log
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'completed', 
          completed_at: new Date(),
          records_processed: 1
        },
        { migration_name: '002-migrate-tenants' }
      );

    } catch (error) {
      console.error('❌ Error migrating tenants:', error);
      
      // Update migration log with error
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'failed', 
          completed_at: new Date(),
          error_message: error.message
        },
        { migration_name: '002-migrate-tenants' }
      );
      
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove ID mappings
    await queryInterface.bulkDelete('id_mappings', {
      table_name: 'tenants'
    });

    // Remove tenants
    await queryInterface.bulkDelete('tenants', {
      business_name: 'Laundry Sepatu Default'
    });

    console.log('✅ Tenants migration rolled back');
  }
};
