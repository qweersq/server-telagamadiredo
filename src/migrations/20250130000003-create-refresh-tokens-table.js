'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID user pemilik refresh token'
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Refresh token untuk auto refresh access token'
      },
      device_type: {
        type: Sequelize.ENUM('web', 'mobile'),
        allowNull: false,
        defaultValue: 'web',
        comment: 'Tipe device: web atau mobile'
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'ID device (optional, untuk tracking device spesifik)'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal kadaluarsa refresh token'
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
    });

    // Add indexes
    await queryInterface.addIndex('refresh_tokens', ['user_id'], {
      name: 'idx_refresh_tokens_user_id'
    });

    // Note: No index on refresh_token column because TEXT column can't be indexed without key length in MySQL
    // Uniqueness is handled at application level in AuthRepository.createRefreshToken()
    // Query by refresh_token will use full table scan, but this is acceptable since:
    // 1. Refresh tokens are long-lived (30 days), so queries are infrequent
    // 2. Table size will be small (one token per user per device)
    // 3. Uniqueness check is done before insert, not during query

    await queryInterface.addIndex('refresh_tokens', ['user_id', 'device_type'], {
      name: 'idx_refresh_tokens_user_device'
    });

    console.log('✅ Refresh tokens table created');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('refresh_tokens');
    console.log('⚠️  Refresh tokens table dropped');
  }
};

