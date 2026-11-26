'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('finance_transactions', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Set to true initially for migration
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID tenant pemilik transaksi keuangan'
    });

    await queryInterface.addColumn('finance_transactions', 'branch_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Set to true initially for migration
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID cabang tempat transaksi keuangan terjadi'
    });

    // Add indexes for better performance
    await queryInterface.addIndex('finance_transactions', ['tenant_id'], {
      name: 'idx_finance_transactions_tenant_id'
    });

    await queryInterface.addIndex('finance_transactions', ['branch_id'], {
      name: 'idx_finance_transactions_branch_id'
    });

    await queryInterface.addIndex('finance_transactions', ['tenant_id', 'branch_id'], {
      name: 'idx_finance_transactions_tenant_branch'
    });

    // Add composite index for date filtering
    await queryInterface.addIndex('finance_transactions', ['tenant_id', 'branch_id', 'date'], {
      name: 'idx_finance_transactions_tenant_branch_date'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('finance_transactions', 'idx_finance_transactions_tenant_branch_date');
    await queryInterface.removeIndex('finance_transactions', 'idx_finance_transactions_tenant_branch');
    await queryInterface.removeIndex('finance_transactions', 'idx_finance_transactions_branch_id');
    await queryInterface.removeIndex('finance_transactions', 'idx_finance_transactions_tenant_id');

    // Remove columns
    await queryInterface.removeColumn('finance_transactions', 'branch_id');
    await queryInterface.removeColumn('finance_transactions', 'tenant_id');
  }
};