const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lead = sequelize.define('leads', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  phone: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true 
  },
  source: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  status: { 
    type: DataTypes.STRING, // Baru, Tidak Berminat, Berhasil, Tidak Respon
    allowNull: false,
    defaultValue: 'Baru'
  },
  created_by: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  follow_up_count: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    defaultValue: 0 
  },
  last_follow_up_by: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  last_follow_up_at: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  next_follow_up_date: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  is_converted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  conversion_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Lead',
  tableName: 'leads',
  paranoid: true // untuk soft delete (deletedAt)
});

Lead.associate = (models) => {
  Lead.hasMany(models.LeadRecord, { as: 'lead_records', foreignKey: 'lead_id', onDelete: "CASCADE" });
  Lead.belongsTo(models.User, { as: 'createdBy', foreignKey: 'created_by' });
}

module.exports = Lead; 