'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('ai_credit_packages', [
      {
        name: 'Starter Pack',
        credits: 100,
        price: 25000.00,
        platform: 'BOTH',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Business Pack',
        credits: 500,
        price: 100000.00,
        platform: 'BOTH',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Unlimited Month',
        credits: -1,
        price: 150000.00,
        platform: 'BOTH',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ai_credit_packages', null, {});
  }
};
