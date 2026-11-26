'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Log migration start
      await queryInterface.bulkInsert('migration_logs', [{
        migration_name: '009-cleanup-migration',
        status: 'running',
        started_at: new Date()
      }]);

      // Validate data integrity
      console.log('🔍 Validating data integrity...');
      
      const validationQueries = [
        { name: 'Tenants', query: 'SELECT COUNT(*) as count FROM tenants' },
        { name: 'Branches', query: 'SELECT COUNT(*) as count FROM branches' },
        { name: 'Users', query: 'SELECT COUNT(*) as count FROM users' },
        { name: 'Customers', query: 'SELECT COUNT(*) as count FROM customers' },
        { name: 'Orders', query: 'SELECT COUNT(*) as count FROM orders' },
        { name: 'Shoes Photos', query: 'SELECT COUNT(*) as count FROM shoes_photos' },
        { name: 'Item Status Photos', query: 'SELECT COUNT(*) as count FROM item_status_photos' }
      ];

      for (const validation of validationQueries) {
        const result = await queryInterface.sequelize.query(validation.query, {
          type: Sequelize.QueryTypes.SELECT
        });
        console.log(`✅ ${validation.name}: ${result[0].count} records`);
      }

      // Show migration summary
      console.log('\n📊 Migration Summary:');
      const migrationLogs = await queryInterface.sequelize.query(
        'SELECT migration_name, status, records_processed, error_message FROM migration_logs ORDER BY id',
        { type: Sequelize.QueryTypes.SELECT }
      );

      migrationLogs.forEach(log => {
        const status = log.status === 'completed' ? '✅' : '❌';
        const records = log.records_processed || 0;
        const error = log.error_message ? ` (${log.error_message})` : '';
        console.log(`${status} ${log.migration_name}: ${records} records${error}`);
      });

      // Clean up migration tables (optional - comment out if you want to keep them)
      console.log('\n🧹 Cleaning up migration tables...');
      await queryInterface.dropTable('migration_logs');
      await queryInterface.dropTable('id_mappings');
      console.log('✅ Migration tables cleaned up');

      // Update final migration log
      await queryInterface.bulkInsert('migration_logs', [{
        migration_name: '009-cleanup-migration',
        status: 'completed',
        started_at: new Date(),
        completed_at: new Date(),
        records_processed: 0
      }]);

      console.log('\n🎉 Migration completed successfully!');
      console.log('📋 Database is ready for use.');

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  Cleanup migration cannot be rolled back');
    console.log('💡 If you need to rollback, restore from backup');
  }
};
