'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('wa_sessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'WhatsApp session ID from WA Gateway'
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
        comment: 'Tenant ID for multi-tenant support'
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Branch ID for per-branch WhatsApp sessions'
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'READY', 'DISCONNECTED', 'FAILED', 'DESTROYED'),
        allowNull: false,
        defaultValue: 'PENDING',
        comment: 'Current status of the WhatsApp session'
      },
      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Connected WhatsApp phone number'
      },
      qr_code: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'QR code data for authentication'
      },
      last_activity: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last activity timestamp'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('wa_sessions', ['tenant_id', 'branch_id']);
    await queryInterface.addIndex('wa_sessions', ['session_id']);
    await queryInterface.addIndex('wa_sessions', ['status']);
    await queryInterface.addIndex('wa_sessions', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('wa_sessions');
  }
};
