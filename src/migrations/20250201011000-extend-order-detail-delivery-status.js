'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE order_details
      MODIFY COLUMN delivery_status
      ENUM('not_yet', 'scheduled', 'on_the_way', 'delivered', 'failed', 'done')
      DEFAULT 'not_yet'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE order_details
      MODIFY COLUMN delivery_status
      ENUM('not_yet', 'scheduled', 'on_the_way', 'delivered', 'failed')
      DEFAULT 'not_yet'
    `);
  }
};

