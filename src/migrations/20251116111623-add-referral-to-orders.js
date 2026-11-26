'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add referred_by (customer_id yang merefer)
    await queryInterface.addColumn('orders', 'referred_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'customers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID customer yang merefer (dari lookup nomor HP)'
    });

    // Add referred_by_phone (nomor HP referrer yang diinput)
    await queryInterface.addColumn('orders', 'referred_by_phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
      comment: 'Nomor HP referrer yang diinput customer (untuk backup/verifikasi)'
    });
    
    console.log('✅ Columns referred_by and referred_by_phone added to orders table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('orders', 'referred_by_phone');
    await queryInterface.removeColumn('orders', 'referred_by');
    
    console.log('⚠️  Columns referred_by and referred_by_phone removed from orders table');
  }
};

