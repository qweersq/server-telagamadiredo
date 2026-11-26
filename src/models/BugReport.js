const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BugReport = sequelize.define('BugReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'resolved', 'closed'),
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  }
}, {
  tableName: 'bug_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
BugReport.associate = (models) => {
  BugReport.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
  BugReport.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
};

module.exports = BugReport;
