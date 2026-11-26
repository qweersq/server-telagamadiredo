const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CustomerFollowupSequence = sequelize.define('CustomerFollowupSequence', {
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
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID customer'
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
  current_step: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Step saat ini dalam sequence (0 = belum mulai)'
  },
  last_order_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Tanggal order terakhir customer'
  },
  last_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Waktu terakhir template dikirim'
  },
  next_send_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Waktu pengiriman template berikutnya'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Status aktif sequence untuk customer ini'
  },
  is_paused: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Status pause sementara'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Waktu sequence selesai (semua step terkirim)'
  },
  total_sent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total template yang sudah dikirim'
  },
  total_responded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total respon dari customer'
  },
  converted_order_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'ID order yang dihasilkan dari follow-up (jika ada)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Catatan tambahan'
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
  tableName: 'customer_followup_sequences',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['customer_id', 'sequence_id'],
      name: 'idx_customer_followup_seq_customer_sequence',
      unique: true
    },
    {
      fields: ['sequence_id', 'is_active'],
      name: 'idx_customer_followup_seq_sequence_active'
    },
    {
      fields: ['next_send_at', 'is_active'],
      name: 'idx_customer_followup_seq_next_send'
    },
    {
      fields: ['last_order_date'],
      name: 'idx_customer_followup_seq_last_order'
    },
    {
      fields: ['current_step'],
      name: 'idx_customer_followup_seq_current_step'
    },
    {
      fields: ['is_paused'],
      name: 'idx_customer_followup_seq_paused'
    }
  ]
});

// Associations
CustomerFollowupSequence.associate = (models) => {
  // Belongs to Customer
  CustomerFollowupSequence.belongsTo(models.Customer, {
    foreignKey: 'customer_id',
    as: 'customer'
  });

  // Belongs to FollowupSequence
  CustomerFollowupSequence.belongsTo(models.FollowupSequence, {
    foreignKey: 'sequence_id',
    as: 'sequence'
  });

  // Belongs to Order (converted order)
  CustomerFollowupSequence.belongsTo(models.Order, {
    foreignKey: 'converted_order_id',
    as: 'converted_order'
  });
};

module.exports = CustomerFollowupSequence;
