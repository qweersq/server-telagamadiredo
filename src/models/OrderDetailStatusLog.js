const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderDetailStatusLog = sequelize.define('order_detail_status_logs', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  order_detail_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'order_details',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  old_status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  new_status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
  }
}, {
  timestamps: false,
  tableName: 'order_detail_status_logs',
});

OrderDetailStatusLog.associate = (models) => {
  OrderDetailStatusLog.belongsTo(models.OrderDetail, { foreignKey: 'order_detail_id', as: 'order_detail' });
  OrderDetailStatusLog.belongsTo(models.User, { foreignKey: 'updated_by', as: 'status_updater' });
  OrderDetailStatusLog.hasMany(models.ItemStatusPhoto, { foreignKey: 'order_detail_status_log_id', as: 'item_status_photos', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
};

module.exports = OrderDetailStatusLog;
