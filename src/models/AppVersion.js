const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AppVersion = sequelize.define('app_versions', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  platform: {
    type: DataTypes.ENUM('android', 'ios', 'web'),
    allowNull: false,
    comment: 'Platform aplikasi'
  },
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Version aplikasi (contoh: 1.0.0)'
  },
  version_code: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Version code untuk Android'
  },
  min_required_version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Minimum required version'
  },
  force_update: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Wajib update atau tidak'
  },
  update_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Pesan update'
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'List fitur baru (JSON array)'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Status aktif atau tidak'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at',
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
  },
}, {
  tableName: 'app_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = AppVersion;

