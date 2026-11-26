'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('treatment', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Status aktif treatment'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('treatment', 'is_active');
  }
};