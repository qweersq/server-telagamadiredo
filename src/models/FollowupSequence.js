const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FollowupSequence = sequelize.define('FollowupSequence', {
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
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID tenant pemilik sequence'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID branch (null = untuk semua branch)'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nama sequence follow-up'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Deskripsi sequence'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Status aktif sequence'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Sequence default untuk tenant/branch'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'ID user yang membuat sequence'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'ID user yang terakhir update sequence'
  }
}, {
  tableName: 'followup_sequences',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['tenant_id', 'branch_id'],
      name: 'idx_followup_sequences_tenant_branch'
    },
    {
      fields: ['tenant_id', 'is_active'],
      name: 'idx_followup_sequences_tenant_active'
    },
    {
      fields: ['is_default', 'tenant_id'],
      name: 'idx_followup_sequences_default'
    }
  ]
});

// Associations
FollowupSequence.associate = (models) => {
  // Belongs to Tenant
  FollowupSequence.belongsTo(models.Tenant, {
    foreignKey: 'tenant_id',
    as: 'tenant'
  });

  // Belongs to Branch (optional)
  FollowupSequence.belongsTo(models.Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });

  // Belongs to User (creator)
  FollowupSequence.belongsTo(models.User, {
    foreignKey: 'created_by',
    as: 'creator',
    onDelete: 'SET NULL'
  });

  // Belongs to User (updater)
  FollowupSequence.belongsTo(models.User, {
    foreignKey: 'updated_by',
    as: 'updater',
    onDelete: 'SET NULL'
  });

  // Has many sequence templates
  FollowupSequence.hasMany(models.FollowupSequenceTemplate, {
    foreignKey: 'sequence_id',
    as: 'templates',
    onDelete: 'CASCADE'
  });

  // Has many customer sequences
  FollowupSequence.hasMany(models.CustomerFollowupSequence, {
    foreignKey: 'sequence_id',
    as: 'customer_sequences',
    onDelete: 'CASCADE'
  });
};

module.exports = FollowupSequence;
