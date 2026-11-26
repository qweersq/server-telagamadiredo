'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('order_details', 'custom_price_reason', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: 'Alasan/keterangan kenapa custom price diterapkan',
      after: 'custom_price' // MySQL specific - put after custom_price column
    });
    
    console.log('✅ Column custom_price_reason added to order_details table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('order_details', 'custom_price_reason');
    
    console.log('⚠️  Column custom_price_reason removed from order_details table');
  }
};

