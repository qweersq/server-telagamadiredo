'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('branches', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'maintenance', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Status of the branch: active, inactive, maintenance, suspended'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('branches', 'status');
  }
};
