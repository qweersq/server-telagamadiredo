'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tenant_ai_credits', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('CREDIT', 'DEBIT'),
        allowNull: false,
        comment: 'CREDIT = nambah saldo, DEBIT = ngurang saldo',
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Positif untuk CREDIT, negatif untuk DEBIT',
      },
      balance_before: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Snapshot saldo sebelum transaksi',
      },
      balance_after: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Snapshot saldo setelah transaksi',
      },
      source: {
        type: Sequelize.ENUM('MONTHLY_GRANT', 'PURCHASE', 'USAGE', 'ADMIN_GRANT', 'REFUND'),
        allowNull: false,
        comment: 'Sumber transaksi credit',
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      payment_method: {
        type: Sequelize.ENUM('TRIPAY', 'APP_STORE', 'FREE_TIER', 'ADMIN'),
        defaultValue: 'FREE_TIER',
        allowNull: false,
      },
      payment_ref: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      expired_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('tenant_ai_credits', ['tenant_id', 'createdAt'], { name: 'idx_tenant_created' });
    await queryInterface.addIndex('tenant_ai_credits', ['source'], { name: 'idx_source' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tenant_ai_credits');
  }
};
