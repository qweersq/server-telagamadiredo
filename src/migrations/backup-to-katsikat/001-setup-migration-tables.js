'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create migration tracking table
    await queryInterface.createTable('migration_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      migration_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'running', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      records_processed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create ID mapping table for tracking old -> new ID mappings
    await queryInterface.createTable('id_mappings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      table_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      old_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      new_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    console.log('✅ Migration tracking tables created');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('migration_logs');
    await queryInterface.dropTable('id_mappings');
    console.log('✅ Migration tracking tables dropped');
  }
};
