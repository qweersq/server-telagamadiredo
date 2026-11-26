const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CustomerFollowup = sequelize.define('CustomerFollowup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  message_content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('sent', 'failed'),
    allowNull: false,
    defaultValue: 'sent'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'customer_followups',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      fields: ['customer_id', 'tenant_id', 'branch_id'],
      name: 'idx_customer_followup'
    },
    {
      fields: ['sent_at'],
      name: 'idx_followup_date'
    },
    {
      fields: ['status'],
      name: 'idx_followup_status'
    }
  ]
});

module.exports = CustomerFollowup;
