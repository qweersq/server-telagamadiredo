const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReminderLog = sequelize.define('reminder_logs', {
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
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id',
    },
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  error_message: {
    type: DataTypes.TEXT,
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
  tableName: 'reminder_logs',
});

ReminderLog.associate = (models) => {
  ReminderLog.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order', onDelete: 'CASCADE' });
  ReminderLog.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer', onDelete: 'CASCADE' });
  ReminderLog.belongsTo(models.User, { foreignKey: 'admin_id', as: 'admin', onDelete: 'SET NULL' });
};

module.exports = ReminderLog; 