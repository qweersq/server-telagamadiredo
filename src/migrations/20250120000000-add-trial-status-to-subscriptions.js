'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'trial' to the ENUM values for status column in subscriptions table
    await queryInterface.changeColumn('subscriptions', 'status', {
      type: Sequelize.ENUM('active', 'expired', 'cancelled', 'suspended', 'pending', 'trial'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status langganan'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove 'trial' from the ENUM values for status column in subscriptions table
    await queryInterface.changeColumn('subscriptions', 'status', {
      type: Sequelize.ENUM('active', 'expired', 'cancelled', 'suspended', 'pending'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status langganan'
    });
  }
};
