'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subscriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
        comment: 'ID tenant yang berlangganan'
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subscription_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'ID paket langganan'
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'cancelled', 'suspended', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Status langganan'
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal mulai langganan'
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal berakhir langganan'
      },
      auto_renew: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Auto renew langganan'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Harga langganan saat ini'
      },
      discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Jumlah diskon'
      },
      final_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Harga akhir setelah diskon'
      },
      payment_method: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Metode pembayaran'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Catatan langganan'
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
      tableName: 'subscriptions'
    });

    // Add indexes
    await queryInterface.addIndex('subscriptions', ['tenant_id']);
    await queryInterface.addIndex('subscriptions', ['plan_id']);
    await queryInterface.addIndex('subscriptions', ['status']);
    await queryInterface.addIndex('subscriptions', ['end_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subscriptions');
  }
};
