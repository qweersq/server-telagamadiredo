'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      business_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nama bisnis laundry'
      },
      owner_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nama pemilik bisnis'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Email pemilik bisnis'
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nomor telepon pemilik'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Alamat bisnis'
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Kota bisnis'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended', 'trial'),
        allowNull: false,
        defaultValue: 'trial',
        comment: 'Status tenant'
      },
      trial_end_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Tanggal berakhir trial'
      },
      subscription_status: {
        type: Sequelize.ENUM('trial', 'active', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'trial',
        comment: 'Status langganan'
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Pengaturan khusus tenant'
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
      tableName: 'tenants'
    });

    // Add indexes
    await queryInterface.addIndex('tenants', ['email'], { unique: true });
    await queryInterface.addIndex('tenants', ['status']);
    await queryInterface.addIndex('tenants', ['subscription_status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tenants');
  }
};
