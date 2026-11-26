'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Cek apakah tabel sudah ada
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('subscription_plans')
    );

    if (!tableExists) {
      await queryInterface.createTable('subscription_plans', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Nama paket (Free Trial, Basic, Premium, Enterprise)'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Deskripsi paket'
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          comment: 'Harga paket per bulan'
        },
        duration_days: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Durasi paket dalam hari'
        },
        max_branches: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Maksimal jumlah cabang'
        },
        max_users: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 5,
          comment: 'Maksimal jumlah user'
        },
        max_orders_per_month: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Maksimal order per bulan (null = unlimited)'
        },
        features: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Fitur yang disediakan dalam paket'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Status aktif paket'
        },
        sort_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Urutan tampil paket'
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
        tableName: 'subscription_plans'
      });

      // Add indexes
      await queryInterface.addIndex('subscription_plans', ['is_active'], {
        name: 'subscription_plans_is_active_idx'
      });
      await queryInterface.addIndex('subscription_plans', ['sort_order'], {
        name: 'subscription_plans_sort_order_idx'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subscription_plans');
  }
};
