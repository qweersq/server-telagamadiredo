'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Log migration start
      await queryInterface.bulkInsert('migration_logs', [{
        migration_name: '005-migrate-reference-data',
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
      let totalProcessed = 0;

      // 1. Migrate Treatments
      console.log('📋 Migrating treatments...');
      const backupTreatments = await queryInterface.sequelize.query(
        'SELECT * FROM katsikat_migrate.treatment',
        { type: Sequelize.QueryTypes.SELECT }
      );

      for (const treatment of backupTreatments) {
        const [treatmentResult] = await queryInterface.bulkInsert('treatment', [{
          name: treatment.name,
          price: treatment.price,
          type_item: treatment.type_item,
          type_service: treatment.type_service,
          description: treatment.description,
          tenant_id: tenantId,
          is_active: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }], { returning: true });

        await queryInterface.bulkInsert('id_mappings', [{
          table_name: 'treatment',
          old_id: treatment.id,
          new_id: treatmentResult.id,
          createdAt: new Date()
        }]);

        totalProcessed++;
      }

      // 2. Migrate Items
      console.log('👟 Migrating items...');
      const backupItems = await queryInterface.sequelize.query(
        'SELECT * FROM katsikat_migrate.items',
        { type: Sequelize.QueryTypes.SELECT }
      );

      for (const item of backupItems) {
        const [itemResult] = await queryInterface.bulkInsert('items', [{
          name: item.name,
          brand: item.brand,
          type: item.type,
          color: item.color,
          material: item.material,
          tenant_id: tenantId,
          createdAt: new Date(),
          updatedAt: new Date()
        }], { returning: true });

        await queryInterface.bulkInsert('id_mappings', [{
          table_name: 'items',
          old_id: item.id,
          new_id: itemResult.id,
          createdAt: new Date()
        }]);

        totalProcessed++;
      }

      // 3. Migrate Discounts
      console.log('💰 Migrating discounts...');
      const backupDiscounts = await queryInterface.sequelize.query(
        'SELECT * FROM katsikat_migrate.discounts',
        { type: Sequelize.QueryTypes.SELECT }
      );

      for (const discount of backupDiscounts) {
        const [discountResult] = await queryInterface.bulkInsert('discounts', [{
          name: discount.name,
          type: discount.type,
          discount: discount.discount,
          tenant_id: tenantId,
          is_active: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }], { returning: true });

        await queryInterface.bulkInsert('id_mappings', [{
          table_name: 'discounts',
          old_id: discount.id,
          new_id: discountResult.id,
          createdAt: new Date()
        }]);

        totalProcessed++;
      }

      console.log(`✅ Migrated ${totalProcessed} reference records (treatments, items, discounts)`);

      // Update migration log
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'completed', 
          completed_at: new Date(),
          records_processed: totalProcessed
        },
        { migration_name: '005-migrate-reference-data' }
      );

    } catch (error) {
      console.error('❌ Error migrating reference data:', error);
      
      // Update migration log with error
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'failed', 
          completed_at: new Date(),
          error_message: error.message
        },
        { migration_name: '005-migrate-reference-data' }
      );
      
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove ID mappings
    await queryInterface.bulkDelete('id_mappings', {
      table_name: ['treatment', 'items', 'discounts']
    });

    // Remove reference data
    await queryInterface.bulkDelete('treatment', {});
    await queryInterface.bulkDelete('items', {});
    await queryInterface.bulkDelete('discounts', {});

    console.log('✅ Reference data migration rolled back');
  }
};
