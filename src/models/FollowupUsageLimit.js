const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FollowupUsageLimit = sequelize.define('FollowupUsageLimit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id'
        }
    },
    limit_type: {
        type: DataTypes.ENUM(
            'sequences_active',
            'broadcasts_monthly', 
            'messages_daily',
            'messages_hourly',
            'templates_per_sequence'
        ),
        allowNull: false
    },
    current_usage: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    max_allowed: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    reset_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    reset_hour: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    last_reset_at: {
        type: DataTypes.DATE,
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
    tableName: 'followup_usage_limits',
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            name: 'idx_tenant_limit',
            fields: ['tenant_id', 'limit_type']
        },
        {
            name: 'idx_reset_date',
            fields: ['reset_date']
        }
    ]
});

// Associations
FollowupUsageLimit.associate = function(models) {
    FollowupUsageLimit.belongsTo(models.Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant'
    });
};

module.exports = FollowupUsageLimit;
