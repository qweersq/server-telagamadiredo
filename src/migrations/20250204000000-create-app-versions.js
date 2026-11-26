'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('app_versions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      platform: {
        type: Sequelize.ENUM('android', 'ios', 'web'),
        allowNull: false,
        comment: 'Platform aplikasi'
      },
      version: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Version aplikasi (contoh: 1.0.0)'
      },
      version_code: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Version code untuk Android'
      },
      min_required_version: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Minimum required version'
      },
      force_update: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Wajib update atau tidak'
      },
      update_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Pesan update'
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'List fitur baru (JSON array)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Status aktif atau tidak'
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

    await queryInterface.addIndex('app_versions', ['platform'], {
      name: 'idx_platform'
    });

    await queryInterface.addIndex('app_versions', ['platform', 'is_active'], {
      name: 'idx_platform_active'
    });

    console.log('✅ Table app_versions created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('app_versions');
    console.log('⚠️  Table app_versions dropped');
  }
};

