const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RefreshToken = sequelize.define('refresh_tokens', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
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
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Refresh token untuk auto refresh access token'
    },
    device_type: {
        type: DataTypes.ENUM('web', 'mobile'),
        allowNull: false,
        defaultValue: 'web',
        comment: 'Tipe device: web atau mobile'
    },
    device_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'ID device (optional, untuk tracking device spesifik)'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Tanggal kadaluarsa refresh token'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'refresh_tokens',
    indexes: [
        {
            fields: ['user_id'],
            name: 'idx_refresh_tokens_user_id'
        },
        {
            fields: ['user_id', 'device_type'],
            name: 'idx_refresh_tokens_user_device'
        }
        // Note: No index on refresh_token (TEXT column can't be indexed without key length)
        // Uniqueness handled at application level
    ]
});

RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
    });
};

module.exports = RefreshToken;

