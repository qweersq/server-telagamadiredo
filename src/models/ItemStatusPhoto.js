const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItemStatusPhoto = sequelize.define('item_status_photos', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_detail_status_log_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'order_detail_status_logs',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  photo_url: {
    type: DataTypes.STRING,
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
  tableName: 'item_status_photos',
});

ItemStatusPhoto.associate = (models) => {
  ItemStatusPhoto.belongsTo(models.OrderDetailStatusLog, {
    foreignKey: 'order_detail_status_log_id',
    as: 'order_detail_status_log',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
};

module.exports = ItemStatusPhoto; 