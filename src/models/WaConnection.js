const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WaConnection = sequelize.define('wa_connections', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    connection_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'WhatsApp connection ID from WA Gateway'
    },
    connection_type: {
      type: DataTypes.ENUM('superapp', 'promotion', 'cs', 'followup', 'tenant'),
      allowNull: false,
      defaultValue: 'superapp',
      comment: 'Type of WhatsApp connection'
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      comment: 'Tenant ID (NULL for superapp connections)'
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      comment: 'Branch ID (NULL for superapp connections)'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'READY', 'DISCONNECTED', 'FAILED', 'DESTROYED'),
      allowNull: false,
      defaultValue: 'PENDING',
      comment: 'Current status of the WhatsApp connection'
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
    tableName: 'wa_connections',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['connection_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['tenant_id', 'branch_id']
      },
      {
        fields: ['created_at']
      }
    ]
  });

// Define associations
WaConnection.associate = (models) => {
  // Belongs to Tenant (optional)
  WaConnection.belongsTo(models.Tenant, {
    foreignKey: 'tenant_id',
    as: 'tenant'
  });

  // Belongs to Branch (optional)
  WaConnection.belongsTo(models.Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
};

module.exports = WaConnection;
