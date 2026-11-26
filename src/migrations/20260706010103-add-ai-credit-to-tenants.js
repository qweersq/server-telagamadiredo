'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tenants', 'ai_credit_balance', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Sisa credit AI real-time',
    });

    await queryInterface.addColumn('tenants', 'ai_tier', {
      type: Sequelize.ENUM('FREE', 'BASIC', 'PREMIUM'),
      defaultValue: 'FREE',
      allowNull: false,
      comment: 'Tier AI menentukan monthly grant amount',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tenants', 'ai_credit_balance');
    await queryInterface.removeColumn('tenants', 'ai_tier');
  }
};
