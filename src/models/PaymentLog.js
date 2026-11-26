const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Payment Logs Model
const PaymentLog = sequelize.define('payment_logs', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    payment_detail_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'payment_details',
        key: 'id',
      },
    },
    changed_by: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    action: {
      type: DataTypes.ENUM('create', 'update', 'delete'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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

PaymentLog.associate = (models) => {
  PaymentLog.belongsTo(models.PaymentDetail, { foreignKey: 'payment_detail_id', onDelete: "CASCADE" });
  PaymentLog.belongsTo(models.User, { foreignKey: 'changed_by', onDelete: "SET NULL" });
}

module.exports = PaymentLog;