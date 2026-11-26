const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Finance Accounts Model
const FinanceAccount = sequelize.define('finance_accounts', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Will be set to false after migration
    references: {
      model: 'tenants',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID tenant pemilik akun keuangan'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Optional for global accounts
    references: {
      model: 'branches',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID cabang untuk akun spesifik cabang (NULL untuk akun global)'
  },
  is_global: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Flag untuk akun global (true) atau akun spesifik cabang (false)'
  },
  is_branch_specific: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Flag untuk akun spesifik cabang (true) atau akun global (false)'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Flag untuk akun aktif (true) atau tidak aktif (false)'
  },
  payment_method_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'payment_methods',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'ID payment method yang terkait dengan akun ini'
  },
  requires_payment_proof: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'True = pembayaran ke akun ini wajib melampirkan foto bukti bayar'
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
});

FinanceAccount.associate = (models) => {
  FinanceAccount.hasMany(models.FinanceTransaction, { foreignKey: 'account_id', as:'finance_transactions', onDelete: "CASCADE" });
  FinanceAccount.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: "CASCADE" });
  FinanceAccount.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch', onDelete: "CASCADE" });
  FinanceAccount.belongsTo(models.PaymentMethod, { foreignKey: 'payment_method_id', as: 'payment_method', onDelete: "SET NULL" });
}

module.exports = FinanceAccount;