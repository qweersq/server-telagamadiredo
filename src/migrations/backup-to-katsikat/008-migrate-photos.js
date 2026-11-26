'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Log migration start
      await queryInterface.bulkInsert('migration_logs', [{
        migration_name: '008-migrate-photos',
        status: 'running',
        started_at: new Date()
      }]);

      let totalProcessed = 0;

      // 1. Migrate Shoes Photos
      console.log('📸 Migrating shoes photos...');
      const backupShoesPhotos = await queryInterface.sequelize.query(
        'SELECT * FROM katsikat_migrate.shoes_photos',
        { type: Sequelize.QueryTypes.SELECT }
      );

      // Get order detail ID mappings
      const orderDetailMappings = await queryInterface.sequelize.query(
        'SELECT old_id, new_id FROM id_mappings WHERE table_name = "order_details"',
        { type: Sequelize.QueryTypes.SELECT }
      );

      const orderDetailIdMap = {};
      orderDetailMappings.forEach(mapping => {
        orderDetailIdMap[mapping.old_id] = mapping.new_id;
      });

      const batchSize = 1000;
      for (let i = 0; i < backupShoesPhotos.length; i += batchSize) {
        const batch = backupShoesPhotos.slice(i, i + batchSize);
        const photoInserts = [];

        for (const photo of batch) {
          const newOrderDetailId = orderDetailIdMap[photo.order_detail_id];
          if (newOrderDetailId) {
            photoInserts.push({
              order_detail_id: newOrderDetailId,
              url_photo: photo.url_photo,
              createdAt: photo.createdAt || new Date(),
              updatedAt: photo.updatedAt || new Date(),
              deletedAt: photo.deletedAt
            });
          }
        }

        if (photoInserts.length > 0) {
          await queryInterface.bulkInsert('shoes_photos', photoInserts);
          totalProcessed += photoInserts.length;
        }

        console.log(`📊 Processed ${Math.min(i + batchSize, backupShoesPhotos.length)}/${backupShoesPhotos.length} shoes photos`);
      }

      // 2. Migrate Item Status Photos
      console.log('📸 Migrating item status photos...');
      const backupItemStatusPhotos = await queryInterface.sequelize.query(
        'SELECT * FROM katsikat_migrate.item_status_photos',
        { type: Sequelize.QueryTypes.SELECT }
      );

      // Get order detail status log ID mappings
      const statusLogMappings = await queryInterface.sequelize.query(
        'SELECT old_id, new_id FROM id_mappings WHERE table_name = "order_detail_status_logs"',
        { type: Sequelize.QueryTypes.SELECT }
      );

      const statusLogIdMap = {};
      statusLogMappings.forEach(mapping => {
        statusLogIdMap[mapping.old_id] = mapping.new_id;
      });

      for (let i = 0; i < backupItemStatusPhotos.length; i += batchSize) {
        const batch = backupItemStatusPhotos.slice(i, i + batchSize);
        const photoInserts = [];

        for (const photo of batch) {
          const newStatusLogId = statusLogIdMap[photo.order_detail_status_log_id];
          if (newStatusLogId) {
            // Add URL prefix if not already present
            let photoUrl = photo.photo_url;
            if (!photoUrl.startsWith('https://api.katsikat.id/')) {
              photoUrl = `https://api.katsikat.id/${photoUrl}`;
            }

            photoInserts.push({
              order_detail_status_log_id: newStatusLogId,
              photo_url: photoUrl,
              createdAt: photo.createdAt || new Date(),
              updatedAt: photo.updatedAt || new Date()
            });
          }
        }

        if (photoInserts.length > 0) {
          await queryInterface.bulkInsert('item_status_photos', photoInserts);
          totalProcessed += photoInserts.length;
        }

        console.log(`📊 Processed ${Math.min(i + batchSize, backupItemStatusPhotos.length)}/${backupItemStatusPhotos.length} item status photos`);
      }

      console.log(`✅ Migrated ${totalProcessed} photos (shoes + item status)`);

      // Update migration log
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'completed', 
          completed_at: new Date(),
          records_processed: totalProcessed
        },
        { migration_name: '008-migrate-photos' }
      );

    } catch (error) {
      console.error('❌ Error migrating photos:', error);
      
      // Update migration log with error
      await queryInterface.bulkUpdate('migration_logs', 
        { 
          status: 'failed', 
          completed_at: new Date(),
          error_message: error.message
        },
        { migration_name: '008-migrate-photos' }
      );
      
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove photos
    await queryInterface.bulkDelete('shoes_photos', {});
    await queryInterface.bulkDelete('item_status_photos', {});

    console.log('✅ Photos migration rolled back');
  }
};
