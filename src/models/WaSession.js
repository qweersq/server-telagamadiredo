const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WaSession = sequelize.define('wa_sessions', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'WhatsApp session ID from WA Gateway'
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      },
      comment: 'Tenant ID for multi-tenant support'
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      comment: 'Branch ID for per-branch WhatsApp sessions (nullable for campaign sessions)'
    },
    session_type: {
      type: DataTypes.ENUM('general', 'tenant_campaign', 'tenant', 'superapp'),
      allowNull: false,
      defaultValue: 'general',
      comment: 'Session type: general for regular features, tenant_campaign for campaign broadcasts, tenant for regular tenants, superapp for superapp admin'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'READY', 'DISCONNECTED', 'FAILED', 'DESTROYED'),
      allowNull: false,
      defaultValue: 'PENDING',
      comment: 'Current status of the WhatsApp session'
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Connected WhatsApp phone number'
    },
    qr_code: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'QR code data for authentication'
    },
    last_activity: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last activity timestamp'
    }
  }, {
    tableName: 'wa_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['tenant_id', 'branch_id']
      },
      {
        fields: ['session_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['tenant_id', 'session_type'],
        name: 'idx_tenant_campaign_sessions'
      }
    ]
  });

// Define associations
WaSession.associate = (models) => {
  // Belongs to Tenant
  WaSession.belongsTo(models.Tenant, {
    foreignKey: 'tenant_id',
    as: 'tenant'
  });

  // Belongs to Branch
  WaSession.belongsTo(models.Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
};

module.exports = WaSession;
