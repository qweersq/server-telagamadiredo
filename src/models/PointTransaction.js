const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PointTransaction = sequelize.define('point_transactions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'customers',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID customer pemilik poin'
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'orders',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID order terkait (nullable untuk bonus poin)'
    },
    type: {
        type: DataTypes.ENUM('earn', 'redeem', 'expire', 'bonus'),
        allowNull: false,
        comment: 'Jenis transaksi poin'
    },
    bonus_type: {
        type: DataTypes.ENUM('referral_referrer', 'referral_new_customer', 'first_order'),
        allowNull: true,
        defaultValue: null,
        comment: 'Jenis bonus poin (hanya untuk type = bonus). referral_referrer: bonus untuk referrer, referral_new_customer: bonus untuk customer baru yang direfer, first_order: bonus untuk order pertama tanpa referral'
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Jumlah poin (bisa negatif untuk redeem)'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'Deskripsi transaksi poin'
    },
    expires_at: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: null,
        comment: 'Tanggal kadaluarsa poin (nullable, untuk future use)'
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
        defaultValue: null,
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'point_transactions',
    indexes: [
        {
            fields: ['customer_id'],
            name: 'idx_point_transactions_customer_id'
        },
        {
            fields: ['order_id'],
            name: 'idx_point_transactions_order_id'
        },
        {
            fields: ['type'],
            name: 'idx_point_transactions_type'
        },
        {
            fields: ['createdAt'],
            name: 'idx_point_transactions_created_at'
        }
    ]
});

PointTransaction.associate = (models) => {
    // PointTransaction belongs to Customer
    PointTransaction.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
        onDelete: 'CASCADE'
    });
    
    // PointTransaction belongs to Order (optional)
    PointTransaction.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order',
        onDelete: 'SET NULL'
    });
};

module.exports = PointTransaction;
