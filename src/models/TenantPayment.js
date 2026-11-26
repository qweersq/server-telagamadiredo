const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TenantPayment = sequelize.define('tenant_payments', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subscriptions',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID langganan yang dibayar (null untuk trial billing)'
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
        comment: 'ID tenant yang membayar'
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Jumlah pembayaran'
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded', 'unpaid'),
        allowNull: false,
        defaultValue: 'unpaid',
        comment: 'Status pembayaran'
    },
    payment_method: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Metode pembayaran (bank_transfer, credit_card, e_wallet, dll)'
    },
    payment_reference: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Referensi pembayaran dari gateway'
    },
    payment_gateway: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Gateway pembayaran yang digunakan'
    },
    payment_url: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL checkout pembayaran (untuk Tripay)'
    },
    expired_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal expired transaksi pembayaran'
    },
    paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal pembayaran berhasil'
    },
    due_date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Tanggal jatuh tempo pembayaran'
    },
    invoice_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: 'Nomor invoice'
    },
    receipt_url: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL bukti pembayaran'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Catatan pembayaran'
    },
    bank_name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nama bank untuk transfer manual'
    },
    account_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nomor rekening untuk transfer manual'
    },
    account_holder: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nama pemegang rekening untuk transfer manual'
    },
    payment_code: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Kode pembayaran unik untuk identifikasi transfer'
    },
    subscription_plan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subscription_plans',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID subscription plan untuk manual billing'
    },
    billing_period: {
        type: DataTypes.STRING(7),
        allowNull: true,
        comment: 'Periode billing (YYYY-MM)'
    },
    is_manual: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Apakah billing dibuat manual oleh admin'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID admin yang membuat billing manual'
    },
    reminder_h3_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flag email reminder H-3 sudah terkirim'
    },
    reminder_h1_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flag email reminder H-1 sudah terkirim'
    },
    reminder_h0_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flag email reminder hari H sudah terkirim'
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
    tableName: 'tenant_payments'
});

TenantPayment.associate = (models) => {
    // TenantPayment belongs to subscription
    TenantPayment.belongsTo(models.Subscription, { 
        foreignKey: 'subscription_id', 
        as: 'subscription', 
        onDelete: 'CASCADE' 
    });
    
    // TenantPayment belongs to tenant
    TenantPayment.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });

    // TenantPayment belongs to subscription plan
    TenantPayment.belongsTo(models.SubscriptionPlan, { 
        foreignKey: 'subscription_plan_id', 
        as: 'subscription_plan', 
        onDelete: 'SET NULL' 
    });

    // TenantPayment belongs to user (created_by)
    TenantPayment.belongsTo(models.User, { 
        foreignKey: 'created_by', 
        as: 'creator', 
        onDelete: 'SET NULL' 
    });
};

module.exports = TenantPayment;
