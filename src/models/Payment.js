const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('payments', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },  
    final_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },

    // NEW
    total_service: { 
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total harga sebelum diskon'
    },
    total_discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total diskon'
    },
    additional_cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Biaya tambahan (jika ada)'
    },
    paid_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total yang sudah dibayar'
    },
    remaining_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Sisa yang harus dibayar'
    },
    due_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal jatuh tempo pembayaran'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Catatan tambahan untuk pembayaran'
    },



    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deletedAt: {
        type: DataTypes.DATE
    },


    method: { //gaperlu
        type: DataTypes.STRING,
    },
    total_process_time_cost: { //gaperlu
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    total_discount: { //gaperlu
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    total_price: { //gaperlu
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    date: { //gaperlu
        type: DataTypes.DATEONLY
    },
    money: { //gaperlu
        type: DataTypes.DECIMAL(10, 2)
    },
    change: { //gaperlu
        type: DataTypes.DECIMAL(10, 2)
    },
    evidence_photo: { //gaperlu
        type: DataTypes.STRING
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'tenants',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik payment'
    },
    discount_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'discounts',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID discount untuk potongan di level payment (diskon tambahan setelah diskon per order detail)'
    },

}, {
    paranoid: true,
    timestamps: true,
    tableName: 'payments'
});

Payment.associate = (models) => {
    Payment.hasOne(models.Order, { foreignKey: 'payment_id', as: 'order', onDelete: "CASCADE" });
    Payment.hasMany(models.PaymentDetail, { foreignKey: 'payment_id', onDelete: "CASCADE" });
    Payment.hasMany(models.CustomerMembership, { foreignKey: 'payment_id', as: 'customer_memberships', onDelete: "CASCADE" });
    
    // Payment belongs to tenant
    Payment.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
    
    // Payment belongs to discount (payment-level discount)
    Payment.belongsTo(models.Discount, { 
        foreignKey: 'discount_id', 
        as: 'discount', 
        onDelete: 'SET NULL' 
    });
    
    // Payment.hasMany(models.Membership, { foreignKey: 'payment_id', onDelete: "CASCADE" });
    // Payment.hasMany(models.OrderProduct, { foreignKey: 'payment_id', onDelete: "CASCADE" });
}

module.exports = Payment;