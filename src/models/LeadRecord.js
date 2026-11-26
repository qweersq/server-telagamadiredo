const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeadRecord = sequelize.define('lead_records', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  lead_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  follow_up_by: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: {
      model: 'users',
      key: 'id'
    }
  },
  follow_up_at: { 
    type: DataTypes.DATE, 
    allowNull: false,
    defaultValue: DataTypes.NOW 
  },
  status: { 
    type: DataTypes.STRING, // Berhasil, Tidak Berminat, Tidak Respon
    allowNull: true 
  },    
  notes: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
}, {
  sequelize,
  modelName: 'LeadRecord',
  tableName: 'lead_records'
});

LeadRecord.associate = (models) => {
  LeadRecord.belongsTo(models.Lead, { as: 'lead', foreignKey: 'lead_id', onDelete: "CASCADE" });
  LeadRecord.belongsTo(models.User, { as: 'followUpBy', foreignKey: 'follow_up_by' });
}

module.exports = LeadRecord; 