const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceAccessLog = sequelize.define('invoice_access_logs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    invoice_token_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'invoice_tokens',
            key: 'id',
        },
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'id',
        },
    },
    accessed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    user_agent: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'customers',
            key: 'id',
        },
    },
    email: {
        type: DataTypes.STRING,
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
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'invoice_access_logs',
});

InvoiceAccessLog.associate = (models) => {
    InvoiceAccessLog.belongsTo(models.InvoiceToken, { foreignKey: 'invoice_token_id', as: 'invoice_token', onDelete: 'CASCADE' });
    InvoiceAccessLog.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order', onDelete: 'CASCADE' });
    InvoiceAccessLog.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer', onDelete: 'SET NULL' });
};

module.exports = InvoiceAccessLog; 