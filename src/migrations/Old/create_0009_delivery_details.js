'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('delivery_details', {
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
      delivery_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'deliveries',
          key: 'id'
        }
      },
      address: {
        type: Sequelize.STRING
      },
      date: {
        type: Sequelize.DATEONLY
      },
      type: {
        type: Sequelize.STRING
      },
      photo_url: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.STRING
      },
      distance: {
        type: Sequelize.DECIMAL(10, 2)
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2)
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
    await queryInterface.dropTable('delivery_details');
  }
};