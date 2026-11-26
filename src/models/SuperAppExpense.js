const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SuperAppExpense = sequelize.define('SuperAppExpense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  expense_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Tanggal pengeluaran'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [[
          'server_hosting',
          'domain_ssl',
          'api_services',
          'database',
          'development_tools',
          'marketing',
          'operational',
          'maintenance',
          'other'
        ]],
        msg: 'Invalid expense category'
      }
    },
    comment: 'Kategori pengeluaran'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    },
    get() {
      const value = this.getDataValue('amount');
      return value ? parseFloat(value) : 0;
    },
    comment: 'Nominal pengeluaran'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Deskripsi pengeluaran'
  }
}, {
  tableName: 'superapp_expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['expense_date']
    },
    {
      fields: ['category']
    }
  ]
});

// Static method untuk get categories
SuperAppExpense.getCategories = () => {
  return [
    { value: 'server_hosting', label: 'Server Hosting', icon: '🖥️' },
    { value: 'domain_ssl', label: 'Domain & SSL', icon: '🌐' },
    { value: 'api_services', label: 'API Services', icon: '🔌' },
    { value: 'database', label: 'Database', icon: '🗄️' },
    { value: 'development_tools', label: 'Development Tools', icon: '💻' },
    { value: 'marketing', label: 'Marketing', icon: '📢' },
    { value: 'operational', label: 'Operational', icon: '📋' },
    { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { value: 'other', label: 'Lainnya', icon: '➕' }
  ];
};

// Helper method untuk format currency
SuperAppExpense.prototype.getFormattedAmount = function() {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(this.amount);
};

module.exports = SuperAppExpense;

