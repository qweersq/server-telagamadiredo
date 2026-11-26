const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubscriptionPlan = sequelize.define('subscription_plans', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nama paket (Free Trial, Basic, Premium, Enterprise)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Deskripsi paket'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Harga paket per bulan'
    },
    duration_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Durasi paket dalam hari'
    },
    max_branches: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Maksimal jumlah cabang'
    },
    max_users: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        comment: 'Maksimal jumlah user'
    },
    max_orders_per_month: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Maksimal order per bulan (null = unlimited)'
    },
    features: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Fitur yang disediakan dalam paket'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Status aktif paket'
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Urutan tampil paket'
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
    tableName: 'subscription_plans'
});

SubscriptionPlan.associate = (models) => {
    // SubscriptionPlan has many subscriptions
    SubscriptionPlan.hasMany(models.Subscription, { 
        foreignKey: 'plan_id', 
        as: 'subscriptions', 
        onDelete: 'RESTRICT' 
    });
};

module.exports = SubscriptionPlan;
