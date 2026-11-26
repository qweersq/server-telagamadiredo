const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Payment Details Model
const PaymentDetail = sequelize.define('payment_details', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'finance_transactions',
      key: 'id',
    },
  },
  payment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'payments',
      key: 'id',
    },
  },
  method: {
    type: DataTypes.ENUM('cash', 'qris', 'bank_transfer'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  fee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  interest: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  final_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  evidence_photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  finance_account_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'finance_accounts',
      key: 'id'
    },
    comment: 'ID akun keuangan untuk payment detail'
  },
  finance_category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'finance_categories',
      key: 'id'
    },
    comment: 'ID kategori keuangan untuk payment detail'
  },
  shift_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'shifts',
      key: 'id'
    },
    comment: 'ID shift untuk payment detail'
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
    comment: 'ID payment method untuk payment detail'
  },
  money_received: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'Uang yang diterima dari customer (khusus untuk payment method cash)'
  },
  change_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'Kembalian yang diberikan ke customer (khusus untuk payment method cash)'
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
  tableName: 'payment_details'
});

PaymentDetail.associate = (models) => {
  PaymentDetail.belongsTo(models.Payment, { foreignKey: 'payment_id', onDelete: "CASCADE" });
  PaymentDetail.belongsTo(models.FinanceTransaction, { foreignKey: 'transaction_id', as: 'transaction', onDelete: "CASCADE" });
  PaymentDetail.belongsTo(models.FinanceAccount, { foreignKey: 'finance_account_id', as: 'finance_account' });
  PaymentDetail.belongsTo(models.FinanceCategory, { foreignKey: 'finance_category_id', as: 'finance_category' });
  PaymentDetail.belongsTo(models.Shift, { foreignKey: 'shift_id', as: 'shift' });
  PaymentDetail.belongsTo(models.PaymentMethod, { foreignKey: 'payment_method_id', as: 'payment_method', onDelete: "SET NULL" });
}

module.exports = PaymentDetail;