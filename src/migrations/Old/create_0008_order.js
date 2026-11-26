'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      customer_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'customers',
          key: 'id'
        }
      },
      branch_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'branches',
          key: 'id'
        }
      },
      payment_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'payments',
          key: 'id'
        }
      },
      // collaboration_id: {
      //   allowNull: true,
      //   type:Sequelize.INTEGER,
      //   references: {
      //     model: 'collaborations',
      //     key: 'id'
      //   }
      // },
      entry_date: {
        type: Sequelize.DATEONLY
      },
      quantity: {
        type: Sequelize.INTEGER
      },
      order_type: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('orders');
  }
};