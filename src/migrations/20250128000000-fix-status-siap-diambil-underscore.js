'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update status "siap diambil" (dengan spasi) menjadi "siap_diambil" (dengan underscore)
    await queryInterface.sequelize.query(`
      UPDATE order_details 
      SET status = 'siap_diambil' 
      WHERE status = 'siap diambil'
    `);

    console.log('✅ Status "siap diambil" berhasil diubah menjadi "siap_diambil"');
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: ubah kembali ke format lama (dengan spasi)
    await queryInterface.sequelize.query(`
      UPDATE order_details 
      SET status = 'siap diambil' 
      WHERE status = 'siap_diambil'
    `);

    console.log('⚠️  Rolled back: status "siap_diambil" dikembalikan ke "siap diambil"');
  }
};

