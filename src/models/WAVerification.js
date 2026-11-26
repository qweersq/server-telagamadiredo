const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WAVerification = sequelize.define('WAVerification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenant_orders',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID order yang diverifikasi'
    },
    whatsapp_number: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nomor WhatsApp yang diverifikasi'
    },
    otp_code: {
        type: DataTypes.STRING(6),
        allowNull: false,
        comment: 'Kode OTP yang dikirim'
    },
    otp_expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Waktu kadaluarsa OTP'
    },
    verification_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Jumlah percobaan verifikasi'
    },
    status: {
        type: DataTypes.ENUM('sent', 'verified', 'expired', 'failed'),
        defaultValue: 'sent',
        comment: 'Status verifikasi'
    }
}, {
    tableName: 'wa_verifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = WAVerification;
