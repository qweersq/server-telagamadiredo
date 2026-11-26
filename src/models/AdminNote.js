const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminNote = sequelize.define('admin_notes', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Judul notes'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Isi notes'
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    },
    comment: 'ID customer jika notes terkait customer'
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    },
    comment: 'ID order jika notes terkait order'
  },
  status: {
    type: DataTypes.ENUM('pending', 'done', 'archived'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Status notes'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high'),
    allowNull: false,
    defaultValue: 'normal',
    comment: 'Prioritas notes'
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Tanggal deadline notes'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID user yang membuat notes'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID user yang terakhir mengupdate notes'
  },
  done_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID user yang mark notes sebagai done'
  },
  done_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Tanggal kapan notes di-mark sebagai done'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID cabang notes'
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
    comment: 'ID tenant pemilik notes'
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
  deletedAt: {
    type: DataTypes.DATE
  }
}, {
  paranoid: true,
  timestamps: true,
  tableName: 'admin_notes'
});

AdminNote.associate = (models) => {
  AdminNote.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
  AdminNote.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
  AdminNote.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
  AdminNote.belongsTo(models.User, { foreignKey: 'updated_by', as: 'updater' });
  AdminNote.belongsTo(models.User, { foreignKey: 'done_by', as: 'doneBy' });
  AdminNote.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
  AdminNote.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
};

module.exports = AdminNote;

