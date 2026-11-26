'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('order_details', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      order_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'orders',
          key: 'id'
        }
      },
      employee_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      treatment_id: { 
        type: Sequelize.INTEGER,
        references: {
          model: 'treatment',
          key: 'id'
        }
      },
      item_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'items',
          key: 'id'
        }
      },
      due_date: {
        type: Sequelize.DATEONLY
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      discount_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'discounts',
          key: 'id'
        }
      },
      process_time: {
        type: Sequelize.STRING,
      },
      process_time_cost: {
        type: Sequelize.DECIMAL(10, 2),
      },
      final_price: {
        type: Sequelize.DECIMAL(10, 2)
      },
      status: {
        type: Sequelize.STRING
      },
      description: {
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
    await queryInterface.dropTable('order_details');
  }
};