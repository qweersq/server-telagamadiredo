'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add tenant_id to finance_accounts
    await queryInterface.addColumn('finance_accounts', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Set to true initially for migration
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID tenant pemilik akun keuangan'
    });

    // Add branch_id to finance_accounts (optional for branch-specific accounts)
    await queryInterface.addColumn('finance_accounts', 'branch_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Optional for global accounts
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID cabang untuk akun spesifik cabang (NULL untuk akun global)'
    });

    // Add is_global flag to finance_accounts
    await queryInterface.addColumn('finance_accounts', 'is_global', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag untuk akun global (true) atau akun spesifik cabang (false)'
    });

    // Add is_branch_specific flag to finance_accounts
    await queryInterface.addColumn('finance_accounts', 'is_branch_specific', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag untuk akun spesifik cabang (true) atau akun global (false)'
    });

    // Add tenant_id to finance_categories
    await queryInterface.addColumn('finance_categories', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Set to true initially for migration
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID tenant pemilik kategori keuangan'
    });

    // Add is_system flag to finance_categories
    await queryInterface.addColumn('finance_categories', 'is_system', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag untuk kategori sistem (true) atau kategori custom tenant (false)'
    });

    // Add indexes for better performance
    await queryInterface.addIndex('finance_accounts', ['tenant_id'], {
      name: 'idx_finance_accounts_tenant_id'
    });

    await queryInterface.addIndex('finance_accounts', ['branch_id'], {
      name: 'idx_finance_accounts_branch_id'
    });

    await queryInterface.addIndex('finance_accounts', ['tenant_id', 'branch_id'], {
      name: 'idx_finance_accounts_tenant_branch'
    });

    await queryInterface.addIndex('finance_accounts', ['tenant_id', 'is_global'], {
      name: 'idx_finance_accounts_tenant_global'
    });

    await queryInterface.addIndex('finance_categories', ['tenant_id'], {
      name: 'idx_finance_categories_tenant_id'
    });

    await queryInterface.addIndex('finance_categories', ['tenant_id', 'is_system'], {
      name: 'idx_finance_categories_tenant_system'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('finance_categories', 'idx_finance_categories_tenant_system');
    await queryInterface.removeIndex('finance_categories', 'idx_finance_categories_tenant_id');
    await queryInterface.removeIndex('finance_accounts', 'idx_finance_accounts_tenant_global');
    await queryInterface.removeIndex('finance_accounts', 'idx_finance_accounts_tenant_branch');
    await queryInterface.removeIndex('finance_accounts', 'idx_finance_accounts_branch_id');
    await queryInterface.removeIndex('finance_accounts', 'idx_finance_accounts_tenant_id');

    // Remove columns from finance_categories
    await queryInterface.removeColumn('finance_categories', 'is_system');
    await queryInterface.removeColumn('finance_categories', 'tenant_id');

    // Remove columns from finance_accounts
    await queryInterface.removeColumn('finance_accounts', 'is_branch_specific');
    await queryInterface.removeColumn('finance_accounts', 'is_global');
    await queryInterface.removeColumn('finance_accounts', 'branch_id');
    await queryInterface.removeColumn('finance_accounts', 'tenant_id');
  }
};