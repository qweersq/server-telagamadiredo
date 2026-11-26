'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('discounts', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.addColumn('discounts', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('discounts', 'is_active');
    await queryInterface.removeColumn('discounts', 'tenant_id');
  }
};
