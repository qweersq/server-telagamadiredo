const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FollowupSequenceTemplate = sequelize.define('FollowupSequenceTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sequence_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'followup_sequences',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID sequence follow-up'
  },
  step_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Urutan step dalam sequence (1, 2, 3, dst)'
  },
  delay_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Jumlah hari delay setelah order terakhir atau step sebelumnya'
  },
  template_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'whatsapp_templates',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID template WhatsApp yang akan dikirim'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Status aktif template dalam sequence'
  },
  send_time: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: '09:00:00',
    comment: 'Jam pengiriman (format HH:MM:SS)'
  },
  conditions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Kondisi tambahan untuk pengiriman (optional)',
    defaultValue: {}
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'followup_sequence_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['sequence_id', 'step_number'],
      name: 'idx_followup_seq_templates_sequence_step',
      unique: true
    },
    {
      fields: ['sequence_id', 'delay_days'],
      name: 'idx_followup_seq_templates_sequence_delay'
    },
    {
      fields: ['template_id'],
      name: 'idx_followup_seq_templates_template'
    },
    {
      fields: ['is_active'],
      name: 'idx_followup_seq_templates_active'
    }
  ]
});

// Associations
FollowupSequenceTemplate.associate = (models) => {
  // Belongs to FollowupSequence
  FollowupSequenceTemplate.belongsTo(models.FollowupSequence, {
    foreignKey: 'sequence_id',
    as: 'sequence'
  });

  // Belongs to WhatsAppTemplate
  FollowupSequenceTemplate.belongsTo(models.WhatsAppTemplate, {
    foreignKey: 'template_id',
    as: 'template'
  });
};

module.exports = FollowupSequenceTemplate;
