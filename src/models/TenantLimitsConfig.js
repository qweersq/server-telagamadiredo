const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TenantLimitsConfig = sequelize.define('TenantLimitsConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'tenants',
            key: 'id'
        }
    },
    plan_type: {
        type: DataTypes.ENUM('basic', 'premium', 'business', 'enterprise'),
        defaultValue: 'basic'
    },
    max_sequences: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    max_broadcasts_monthly: {
        type: DataTypes.INTEGER,
        defaultValue: 2
    },
    max_recipients_per_broadcast: {
        type: DataTypes.INTEGER,
        defaultValue: 100
    },
    max_messages_daily: {
        type: DataTypes.INTEGER,
        defaultValue: 50
    },
    max_messages_hourly: {
        type: DataTypes.INTEGER,
        defaultValue: 8
    },
    max_templates_per_sequence: {
        type: DataTypes.INTEGER,
        defaultValue: 4
    },
    message_delay_seconds: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    expires_at: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'updated_at',
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'tenant_limits_config',
    timestamps: true,
    paranoid: false
});

// Associations
TenantLimitsConfig.associate = function(models) {
    TenantLimitsConfig.belongsTo(models.Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant'
    });
};

module.exports = TenantLimitsConfig;
