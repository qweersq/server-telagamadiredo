const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('subscriptions', {
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
        comment: 'ID tenant yang berlangganan'
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subscription_plans',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'ID paket langganan'
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'cancelled', 'suspended', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Status langganan'
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Tanggal mulai langganan'
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal berakhir langganan (NULL untuk plan gratis)'
    },
    auto_renew: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Auto renew langganan'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Harga langganan saat ini'
    },
    discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Jumlah diskon'
    },
    final_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Harga akhir setelah diskon'
    },
    payment_method: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Metode pembayaran'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Catatan langganan'
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
    tableName: 'subscriptions'
});

Subscription.associate = (models) => {
    // Subscription belongs to tenant
    Subscription.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
    
    // Subscription belongs to subscription plan
    Subscription.belongsTo(models.SubscriptionPlan, { 
        foreignKey: 'plan_id', 
        as: 'plan', 
        onDelete: 'RESTRICT' 
    });
    
    // Subscription has many tenant payments
    Subscription.hasMany(models.TenantPayment, { 
        foreignKey: 'subscription_id', 
        as: 'payments', 
        onDelete: 'CASCADE' 
    });
};

module.exports = Subscription;
