const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceToken = sequelize.define('invoice_tokens', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'id',
        },
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
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
    tableName: 'invoice_tokens',
});

InvoiceToken.associate = (models) => {
    InvoiceToken.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order', onDelete: 'CASCADE' });
    InvoiceToken.hasMany(models.InvoiceAccessLog, { foreignKey: 'invoice_token_id', as: 'access_logs', onDelete: 'CASCADE' });
};

module.exports = InvoiceToken; 