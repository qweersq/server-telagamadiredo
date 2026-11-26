const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TenantOnboarding = sequelize.define('tenant_onboardings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant yang sedang onboarding'
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
        comment: 'ID user yang melakukan onboarding'
    },
    current_step: {
        type: DataTypes.ENUM('branch_setup', 'user_creation', 'service_setup', 'printer_setup', 'wa_setup', 'completed'),
        allowNull: false,
        defaultValue: 'branch_setup',
        comment: 'Step onboarding saat ini'
    },
    completed_steps: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array step yang sudah diselesaikan'
    },
    onboarding_data: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Data yang dikumpulkan selama onboarding'
    },
    is_completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Apakah onboarding sudah selesai'
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal selesai onboarding'
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
}, {
    paranoid: false,
    timestamps: true,
    tableName: 'tenant_onboardings'
});

TenantOnboarding.associate = (models) => {
    // TenantOnboarding belongs to Tenant
    TenantOnboarding.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
    
    // TenantOnboarding belongs to User
    TenantOnboarding.belongsTo(models.User, { 
        foreignKey: 'user_id', 
        as: 'user', 
        onDelete: 'CASCADE' 
    });
};

module.exports = TenantOnboarding;
