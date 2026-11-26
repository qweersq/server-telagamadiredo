'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tenant_payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subscriptions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID langganan yang dibayar'
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant yang membayar'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Jumlah pembayaran'
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Status pembayaran'
      },
      payment_method: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Metode pembayaran (bank_transfer, credit_card, e_wallet, dll)'
      },
      payment_reference: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Referensi pembayaran dari gateway'
      },
      payment_gateway: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Gateway pembayaran yang digunakan'
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Tanggal pembayaran berhasil'
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal jatuh tempo pembayaran'
      },
      invoice_number: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
        comment: 'Nomor invoice'
      },
      receipt_url: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'URL bukti pembayaran'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Catatan pembayaran'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    }, {
      timestamps: true,
      paranoid: true,
      tableName: 'tenant_payments'
    });

    // Add indexes
    await queryInterface.addIndex('tenant_payments', ['subscription_id']);
    await queryInterface.addIndex('tenant_payments', ['tenant_id']);
    await queryInterface.addIndex('tenant_payments', ['status']);
    await queryInterface.addIndex('tenant_payments', ['due_date']);
    await queryInterface.addIndex('tenant_payments', ['invoice_number'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tenant_payments');
  }
};
