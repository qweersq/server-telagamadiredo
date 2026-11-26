'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Log migration start
      await queryInterface.bulkInsert('migration_logs', [{
        migration_name: '004-migrate-users',
        status: 'running',
        started_at: new Date()
      }]);

      // Get tenant and branch ID mappings
      const [tenantMapping] = await queryInterface.sequelize.query(
        'SELECT new_id FROM id_mappings WHERE table_name = "tenants" AND old_id = 1',
        { type: Sequelize.QueryTypes.SELECT }
      );

      const branchMappings = await queryInterface.sequelize.query(
        'SELECT old_id, new_id FROM id_mappings WHERE table_name = "branches"',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (!tenantMapping) {
        throw new Error('Tenant mapping not found. Run tenant migration first.');
      }

      const tenantId = tenantMapping.new_id;
      const branchIdMap = {};
      branchMappings.forEach(mapping => {
        branchIdMap[mapping.old_id] = mapping.new_id;
      });

      // Check if users already exist
      const existingUsers = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM users',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (existingUsers[0].count > 0) {
        console.log('⚠️  Users already exist, skipping migration');
        await queryInterface.bulkUpdate('migration_logs', 
          { status: 'completed', completed_at: new Date() },
          { migration_name: '004-migrate-users' }
        );
        return;
      }

      // Migrate users from backup
      const backupUsers = await queryInterface.sequelize.query(
        'SELECT * FROM katsikat_migrate.users',
        { type: Sequelize.QueryTypes.SELECT }
      );

      let processedCount = 0;

      for (const user of backupUsers) {
        // Map branch_id
        const newBranchId = branchIdMap[user.branch_id] || branchIdMap[1]; // Default to first branch

        const [userResult] = await queryInterface.bulkInsert('users', [{
          name: user.name,
          branch_id: newBranchId,
          email: user.email,
          password: user.password,
          phone: user.phone,
          address: user.address,
          status: user.status || 'active',
          role: user.role,
          salary: user.salary,
          salary_date: user.salary_date,
          tenant_id: tenantId,
          createdAt: new Date(),
          updatedAt: new Date()
        }], { returning: true });

        // Store ID mapping
        await queryInterface.bulkInsert('id_mappings', [{
          table_name: 'users',
          old_id: user.id,
          new_id: userResult.id,
          createdAt: new Date()
        }]);

        processedCount++;
      }

      console.log(`✅ Migrated ${processedCount} users`);

      // Update migration log
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'completed', 
          completed_at: new Date(),
          records_processed: processedCount
        },
        { migration_name: '004-migrate-users' }
      );

    } catch (error) {
      console.error('❌ Error migrating users:', error);
      
      // Update migration log with error
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'failed', 
          completed_at: new Date(),
          error_message: error.message
        },
        { migration_name: '004-migrate-users' }
      );
      
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove ID mappings
    await queryInterface.bulkDelete('id_mappings', {
      table_name: 'users'
    });

    // Remove users
    await queryInterface.bulkDelete('users', {});

    console.log('✅ Users migration rolled back');
  }
};
