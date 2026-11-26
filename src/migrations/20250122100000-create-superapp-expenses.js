'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('superapp_expenses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      expense_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Tanggal pengeluaran'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Kategori pengeluaran (server_hosting, domain_ssl, api_services, dll)'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Nominal pengeluaran'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Deskripsi pengeluaran'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Add indexes
    await queryInterface.addIndex('superapp_expenses', ['expense_date'], {
      name: 'idx_expense_date'
    });

    await queryInterface.addIndex('superapp_expenses', ['category'], {
      name: 'idx_category'
    });

    console.log('✅ Table superapp_expenses created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('superapp_expenses');
    console.log('⚠️  Table superapp_expenses dropped');
  }
};

