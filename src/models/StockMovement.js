const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Buku besar pergerakan stok. Satu baris = satu perubahan stok.
 *
 * `qty` disimpan signed (positif = masuk, negatif = keluar) supaya
 * SUM(qty) langsung menghasilkan perubahan stok bersih.
 */
const StockMovement = sequelize.define('stock_movements', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    treatment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'in | sale | adjust | transfer_in | transfer_out | void',
    },
    qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Signed: positif = masuk, negatif = keluar',
    },
    stock_before: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    stock_after: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    ref_type: {
        type: DataTypes.STRING(30),
        allowNull: true,
    },
    ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    note: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    movement_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
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
}, {
    timestamps: true,
    tableName: 'stock_movements',
    indexes: [
        { name: 'idx_stock_movements_tenant_branch_date', fields: ['tenant_id', 'branch_id', 'movement_date'] },
        { name: 'idx_stock_movements_treatment_branch_date', fields: ['treatment_id', 'branch_id', 'movement_date'] },
        { name: 'idx_stock_movements_ref', fields: ['ref_type', 'ref_id'] },
    ],
});

StockMovement.associate = (models) => {
    StockMovement.belongsTo(models.Treatment, { foreignKey: 'treatment_id', as: 'treatment' });
    StockMovement.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
    StockMovement.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
};

module.exports = StockMovement;
