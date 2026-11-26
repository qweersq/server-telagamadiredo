'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add requires_tracking to treatment table
    await queryInterface.addColumn('treatment', 'requires_tracking', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Apakah treatment memerlukan tracking status (false untuk produk/ongkir)'
    });

    // 2. Add custom_price to order_details table
    await queryInterface.addColumn('order_details', 'custom_price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Harga custom yang di-override (nullable, jika null pakai harga treatment)'
    });

    console.log('✅ Migration completed:');
    console.log('   - treatment.requires_tracking added');
    console.log('   - order_details.custom_price added');
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: remove columns
    await queryInterface.removeColumn('order_details', 'custom_price');
    await queryInterface.removeColumn('treatment', 'requires_tracking');

    console.log('⚠️  Rollback completed: columns removed');
  }
};

