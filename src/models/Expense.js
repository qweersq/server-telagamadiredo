const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Expense = sequelize.define('expenses', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  shift_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'shifts',
      key: 'id'
    }
  },
  finance_account_id: {  // Tambahan: referensi ke akun keuangan
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'finance_accounts',
      key: 'id'
    }
  },
  finance_category_id: {  // Tambahan: referensi ke kategori keuangan
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'finance_categories',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),  // Disesuaikan dengan format balance di FinanceAccount
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT  // Diubah ke TEXT untuk deskripsi yang lebih panjang
  },
  // ✅ Removed payment_method field - now using finance_account.payment_method_id as single source of truth
  receipt: {
    type: DataTypes.STRING(1000)  // Ditambah length untuk URL panjang
  },
  status: {  // Tambahan: status expense
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
    defaultValue: 'pending'
  },
  approved_by: {  // Tambahan: tracking approval
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'finance_transactions',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE
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
    comment: 'ID tenant pemilik expense'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID cabang tempat expense terjadi'
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
  }
}, {
  paranoid: true,
  timestamps: true,
  tableName: 'expenses'
});

Expense.associate = (models) => {
  Expense.belongsTo(models.Shift, { foreignKey: 'shift_id' });
  Expense.belongsTo(models.User, { foreignKey: 'user_id', as: 'creator' });
  Expense.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approver' });
  Expense.belongsTo(models.FinanceAccount, { foreignKey: 'finance_account_id', as: 'finance_account' });
  Expense.belongsTo(models.FinanceCategory, { foreignKey: 'finance_category_id' });
  Expense.belongsTo(models.FinanceTransaction, { foreignKey: 'transaction_id' });
  Expense.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });
  Expense.belongsTo(models.Branch, { foreignKey: 'branch_id' });
};

module.exports = Expense;