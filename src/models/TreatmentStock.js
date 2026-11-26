const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Stok satu barang (`treatment`) di satu outlet (`branch`).
 *
 * Treatment yang belum punya baris di tabel ini dianggap TIDAK di-track,
 * sehingga penjualannya tidak memotong stok apa pun (tiket, parkir, dll).
 */
const TreatmentStock = sequelize.define('treatment_stocks', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    treatment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    min_stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'false = berhenti di-track',
    },
    last_restock_at: {
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
}, {
    timestamps: true,
    tableName: 'treatment_stocks',
    indexes: [
        { name: 'uk_treatment_stocks_treatment_branch', unique: true, fields: ['treatment_id', 'branch_id'] },
        { name: 'idx_treatment_stocks_tenant_branch', fields: ['tenant_id', 'branch_id'] },
    ],
});

TreatmentStock.associate = (models) => {
    TreatmentStock.belongsTo(models.Treatment, { foreignKey: 'treatment_id', as: 'treatment' });
    TreatmentStock.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
};

module.exports = TreatmentStock;
