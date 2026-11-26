const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tenant = sequelize.define('tenants', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    business_name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nama bisnis laundry'
    },
    owner_name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nama pemilik bisnis'
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Email pemilik bisnis'
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nomor telepon pemilik'
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Alamat bisnis'
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Kota bisnis'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended', 'trial', 'pending_payment'),
        allowNull: false,
        defaultValue: 'trial',
        comment: 'Status tenant'
    },
    trial_end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal berakhir trial'
    },
    subscription_status: {
        type: DataTypes.ENUM('trial', 'active', 'expired', 'cancelled', 'pending_payment'),
        allowNull: false,
        defaultValue: 'trial',
        comment: 'Status langganan'
    },
    settings: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Pengaturan khusus tenant'
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
    is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether tenant is verified via link'
    },
    verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When tenant was verified'
    },
    ai_credit_balance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Sisa credit AI real-time'
    },
    ai_tier: {
        type: DataTypes.ENUM('FREE', 'BASIC', 'PREMIUM'),
        defaultValue: 'FREE',
        allowNull: false,
        comment: 'Tier AI menentukan monthly grant amount'
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'tenants'
});

Tenant.associate = (models) => {
    // Tenant has many branches
    Tenant.hasMany(models.Branch, { 
        foreignKey: 'tenant_id', 
        as: 'branches', 
        onDelete: 'CASCADE' 
    });
    
    // Tenant has many users
    Tenant.hasMany(models.User, { 
        foreignKey: 'tenant_id', 
        as: 'users', 
        onDelete: 'CASCADE' 
    });
    
    // Tenant has many customers
    Tenant.hasMany(models.Customer, { 
        foreignKey: 'tenant_id', 
        as: 'customers', 
        onDelete: 'CASCADE' 
    });
    
    // Tenant has many orders
    Tenant.hasMany(models.Order, { 
        foreignKey: 'tenant_id', 
        as: 'orders', 
        onDelete: 'CASCADE' 
    });
    
    // Tenant has many treatments
    Tenant.hasMany(models.Treatment, { 
        foreignKey: 'tenant_id', 
        as: 'treatments', 
        onDelete: 'CASCADE' 
    });
    
    // Tenant has many items
    Tenant.hasMany(models.Item, { 
        foreignKey: 'tenant_id', 
        as: 'items', 
        onDelete: 'CASCADE' 
    });
    
    // Tenant has many subscriptions
    Tenant.hasMany(models.Subscription, { 
        foreignKey: 'tenant_id', 
        as: 'subscriptions', 
        onDelete: 'CASCADE' 
    });
    
    // Tenant has many tenant payments
    Tenant.hasMany(models.TenantPayment, { 
        foreignKey: 'tenant_id', 
        as: 'payments', 
        onDelete: 'CASCADE' 
    });
    
    // Tenant has many AI credit transactions
    Tenant.hasMany(models.AiCredit, { 
        foreignKey: 'tenant_id', 
        as: 'ai_credits', 
        onDelete: 'CASCADE' 
    });
};

module.exports = Tenant;
