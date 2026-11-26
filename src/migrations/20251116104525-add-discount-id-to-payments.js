'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('payments', 'discount_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'discounts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID discount untuk potongan di level payment (diskon tambahan setelah diskon per order detail)'
    });
    
    console.log('✅ Column discount_id added to payments table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('payments', 'discount_id');
    
    console.log('⚠️  Column discount_id removed from payments table');
  }
};

