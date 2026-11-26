const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Finance Transactions Model
const FinanceTransaction = sequelize.define('finance_transactions', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  is_checked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'finance_accounts',
      key: 'id',
    },
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'finance_categories',
      key: 'id',
    },
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  total_fee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  final_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
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
    comment: 'ID tenant pemilik transaksi keuangan'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Will be set to false after migration
    references: {
      model: 'branches',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID cabang tempat transaksi keuangan terjadi'
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
    type: DataTypes.DATE
  }
}, {
  paranoid: true,
  timestamps: true,
  tableName: 'finance_transactions'
});

FinanceTransaction.associate = (models) => {
  FinanceTransaction.belongsTo(models.FinanceAccount, { foreignKey: 'account_id', as:'finance_account', onDelete: "CASCADE" });
  FinanceTransaction.belongsTo(models.FinanceCategory, { foreignKey: 'category_id',as: 'finance_category', onDelete: "CASCADE" });
  FinanceTransaction.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: "CASCADE" });
  FinanceTransaction.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch', onDelete: "CASCADE" });
  FinanceTransaction.hasMany(models.PaymentDetail, { foreignKey: 'transaction_id', as: 'payment_details', onDelete: "CASCADE" });
  FinanceTransaction.hasMany(models.Expense, { foreignKey: 'transaction_id', as: 'expenses', onDelete: "CASCADE" });
};

module.exports = FinanceTransaction;
