const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('orders', {
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
        }
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'branches',
            key: 'id'
        }
    },
    payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'payments',
            key: 'id'
        }
    },
    shift_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'shifts',
            key: 'id',
        },
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    // collaboration_id: {
    //     type: DataTypes.INTEGER,
    //     allowNull: true,
    //     references: {
    //         model: 'collaborations',
    //         key: 'id'
    //     }
    // },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'tenants',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik order'
    },
    entry_date: {
        type: DataTypes.DATEONLY
    },
    quantity: {
        type: DataTypes.INTEGER
    },
    order_type: {
        type: DataTypes.STRING
    },
    table_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Nomor meja untuk pesanan dine-in (mis. 05, A3)'
    },
    referred_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'customers',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID customer yang merefer (dari lookup nomor HP)'
    },
    referred_by_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Nomor HP referrer yang diinput customer (untuk backup/verifikasi)'
    },
    customer_note: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Catatan bebas dari customer untuk keseluruhan pesanan'
    },
    is_notified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    notified_at: {
        type: DataTypes.DATE,
        allowNull: true,
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

}, {
    paranoid: true,
    timestamps: true,
    tableName: 'orders',
    indexes: [
        // Single column indexes
        { fields: ['customer_id'] },
        { fields: ['branch_id'] },
        { fields: ['payment_id'] },
        { fields: ['tenant_id'] },
        { fields: ['created_by'] },
        { fields: ['shift_id'] },
        { fields: ['order_type'] },
        { fields: ['table_number'] },
        { fields: ['entry_date'] },
        { fields: ['deletedAt'] },
        
        // Composite indexes for performance optimization
        { fields: ['tenant_id', 'branch_id'], name: 'idx_orders_tenant_branch' },
        { fields: ['tenant_id', 'entry_date'], name: 'idx_orders_tenant_date' },
        { fields: ['branch_id', 'entry_date'], name: 'idx_orders_branch_date' },
        { fields: ['tenant_id', 'branch_id', 'entry_date'], name: 'idx_orders_tenant_branch_date' },
        { fields: ['tenant_id', 'order_type'], name: 'idx_orders_tenant_type' },
        { fields: ['tenant_id', 'created_by'], name: 'idx_orders_tenant_creator' },
        { fields: ['tenant_id', 'shift_id'], name: 'idx_orders_tenant_shift' },
        { fields: ['tenant_id', 'deletedAt'], name: 'idx_orders_tenant_deleted' }
    ]
});

Order.associate = (models) => {
    Order.belongsTo(models.Branch, { foreignKey: 'branch_id', onDelete: "CASCADE" });
    Order.belongsTo(models.Payment, { foreignKey: 'payment_id', as: 'payment', onDelete: "CASCADE" });
    Order.hasMany(models.DeliveryDetail, { foreignKey: 'order_id', onDelete: "CASCADE" });
    Order.hasMany(models.OrderDetail, { foreignKey: 'order_id', as: 'order_details', onDelete: "CASCADE" });
    Order.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer', onDelete: "CASCADE" });
    Order.belongsTo(models.Customer, { foreignKey: 'referred_by', as: 'referrer', onDelete: "SET NULL" });
    Order.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    Order.belongsTo(models.Shift, { foreignKey: 'shift_id', as: 'shift' });
    Order.hasMany(models.ReminderLog, { foreignKey: 'order_id', as: 'reminder_logs', onDelete: 'CASCADE' });
    Order.hasMany(models.PointTransaction, { foreignKey: 'order_id', as: 'point_transactions', onDelete: 'SET NULL' });
    
    // Order belongs to tenant
    Order.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
}

module.exports = Order;