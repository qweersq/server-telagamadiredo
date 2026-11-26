const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WhatsAppTemplate = sequelize.define('WhatsAppTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nama template untuk identifikasi'
  },
  category: {
    type: DataTypes.ENUM(
      'invoice',
      'invoice_paid',
      'invoice_dp',
      'invoice_unpaid',
      'item_done',
      'delivery',
      'pickup',
      'notification',
      'promotion',
      'reminder',
      'campaign',
      'broadcast',
      'announcement',
      'other',
      'followup'
    ),
    allowNull: false,
    comment: 'Kategori template'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Judul template yang ditampilkan di UI'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Deskripsi template'
  },
  template_content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: 'Konten template dengan placeholder variables'
  },
  variables: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Daftar variable yang bisa digunakan dalam template',
    defaultValue: []
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Status aktif template'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Template default untuk kategori tertentu'
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Template system yang tidak bisa dihapus dan diedit'
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID tenant pemilik template'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID branch (null = untuk semua branch)'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID user yang membuat template'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID user yang terakhir update template'
  }
}, {
  tableName: 'whatsapp_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['tenant_id', 'branch_id']
    },
    {
      fields: ['category', 'is_active']
    },
    {
      fields: ['name', 'tenant_id']
    },
    {
      fields: ['is_system', 'category']
    }
  ]
});

// Associations
WhatsAppTemplate.associate = (models) => {
  // Belongs to Tenant
  WhatsAppTemplate.belongsTo(models.Tenant, {
    foreignKey: 'tenant_id',
    as: 'tenant'
  });

  // Belongs to Branch (optional)
  WhatsAppTemplate.belongsTo(models.Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });

  // Belongs to User (creator)
  WhatsAppTemplate.belongsTo(models.User, {
    foreignKey: 'created_by',
    as: 'creator',
    onDelete: 'SET NULL'
  });

  // Belongs to User (updater)
  WhatsAppTemplate.belongsTo(models.User, {
    foreignKey: 'updated_by',
    as: 'updater',
    onDelete: 'SET NULL'
  });
};

module.exports = WhatsAppTemplate;
