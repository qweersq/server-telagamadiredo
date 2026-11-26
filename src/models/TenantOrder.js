const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TenantOrder = sequelize.define('TenantOrder', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    business_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nama bisnis laundry'
    },
    owner_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nama pemilik bisnis'
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Email pemilik'
    },
    phone: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nomor telepon pemilik'
    },
    whatsapp: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nomor WhatsApp untuk verifikasi'
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Alamat lengkap bisnis'
    },
    city: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Kota bisnis'
    },
    selected_plan: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Paket yang dipilih (Starter, Professional, Enterprise)'
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Password yang diinput user (hashed)'
    },
    status: {
        type: DataTypes.ENUM('pending_verification', 'verified', 'account_created', 'failed', 'account_created_no_wa', 'pending_link_verification'),
        defaultValue: 'pending_verification',
        comment: 'Status order'
    },
    otp_code: {
        type: DataTypes.STRING(6),
        allowNull: true,
        comment: 'Kode OTP untuk verifikasi WhatsApp'
    },
    otp_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Waktu kadaluarsa OTP'
    },
    verification_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Jumlah percobaan verifikasi'
    },
    verification_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'Token untuk link verification'
    },
    verification_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Waktu kadaluarsa verification token'
    },
    verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Waktu ketika link verification berhasil'
    }
}, {
    tableName: 'tenant_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = TenantOrder;
