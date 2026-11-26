'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add tenant_id to branches table
    await queryInterface.addColumn('branches', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID tenant pemilik cabang'
    });

    // Add tenant_id to users table
    await queryInterface.addColumn('users', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID tenant pemilik user'
    });

    // Add tenant_id to customers table
    await queryInterface.addColumn('customers', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID tenant pemilik customer'
    });

    // Add tenant_id to orders table
    await queryInterface.addColumn('orders', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID tenant pemilik order'
    });

    // Add tenant_id to treatment table
    await queryInterface.addColumn('treatment', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID tenant pemilik treatment'
    });

    // Add tenant_id to items table
    await queryInterface.addColumn('items', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID tenant pemilik item'
    });

    // Add indexes for tenant_id columns
    await queryInterface.addIndex('branches', ['tenant_id']);
    await queryInterface.addIndex('users', ['tenant_id']);
    await queryInterface.addIndex('customers', ['tenant_id']);
    await queryInterface.addIndex('orders', ['tenant_id']);
    await queryInterface.addIndex('treatment', ['tenant_id']);
    await queryInterface.addIndex('items', ['tenant_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('branches', ['tenant_id']);
    await queryInterface.removeIndex('users', ['tenant_id']);
    await queryInterface.removeIndex('customers', ['tenant_id']);
    await queryInterface.removeIndex('orders', ['tenant_id']);
    await queryInterface.removeIndex('treatment', ['tenant_id']);
    await queryInterface.removeIndex('items', ['tenant_id']);

    // Remove columns
    await queryInterface.removeColumn('branches', 'tenant_id');
    await queryInterface.removeColumn('users', 'tenant_id');
    await queryInterface.removeColumn('customers', 'tenant_id');
    await queryInterface.removeColumn('orders', 'tenant_id');
    await queryInterface.removeColumn('treatment', 'tenant_id');
    await queryInterface.removeColumn('items', 'tenant_id');
  }
};
