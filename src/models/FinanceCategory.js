const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FinanceCategory = sequelize.define('finance_categories', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('debit', 'credit', 'neutral'),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Will be set to false after migration
    references: {
      model: 'tenants',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID tenant pemilik kategori keuangan'
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Flag untuk kategori sistem (true) atau kategori custom tenant (false)'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
  },
});

FinanceCategory.associate = (models) => {
  FinanceCategory.hasMany(models.FinanceTransaction, { foreignKey: 'category_id', onDelete: "CASCADE" });
  FinanceCategory.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: "CASCADE" });
}

module.exports = FinanceCategory;