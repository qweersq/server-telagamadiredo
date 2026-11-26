'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add has_received_first_order_bonus flag to customers table
    await queryInterface.addColumn('customers', 'has_received_first_order_bonus', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag untuk tracking apakah customer sudah pernah dapat first order bonus (sekali seumur hidup)'
    });
    
    console.log('✅ Column has_received_first_order_bonus added to customers table');
  },
 
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('customers', 'has_received_first_order_bonus');
    
    console.log('⚠️  Column has_received_first_order_bonus removed from customers table');
  }
};

