const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiCredit = sequelize.define('tenant_ai_credits', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    type: {
        type: DataTypes.ENUM('CREDIT', 'DEBIT'),
        allowNull: false,
        comment: 'CREDIT = nambah saldo, DEBIT = ngurang saldo',
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Positif untuk CREDIT, negatif untuk DEBIT',
    },
    balance_before: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Snapshot saldo sebelum transaksi',
    },
    balance_after: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Snapshot saldo setelah transaksi',
    },
    source: {
        type: DataTypes.ENUM('MONTHLY_GRANT', 'PURCHASE', 'USAGE', 'ADMIN_GRANT', 'REFUND'),
        allowNull: false,
        comment: 'Sumber transaksi credit',
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    payment_method: {
        type: DataTypes.ENUM('TRIPAY', 'APP_STORE', 'FREE_TIER', 'ADMIN'),
        defaultValue: 'FREE_TIER',
        allowNull: false,
    },
    payment_ref: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    expired_at: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
}, {
    paranoid: false,
    timestamps: true,
    tableName: 'tenant_ai_credits',
});

AiCredit.associate = (models) => {
    AiCredit.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE' });
};

module.exports = AiCredit;
