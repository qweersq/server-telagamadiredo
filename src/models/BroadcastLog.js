const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BroadcastLog = sequelize.define('broadcast_logs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    broadcast_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'broadcasts',
            key: 'id'
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'sent', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'BroadcastLog',
    tableName: 'broadcast_logs',
    paranoid: true
});
// Associations
Broadcast.associate = (models) => {
    Broadcast.belongsTo(models.Customer, { as: 'customer', foreignKey: 'customer_id' });
    Broadcast.belongsTo(models.User, { as: 'createdBy', foreignKey: 'created_by' });
    Broadcast.hasMany(models.BroadcastLog, { as: 'logs', foreignKey: 'broadcast_id', onDelete: "CASCADE" });
};
BroadcastLog.associate = (models) => {
    BroadcastLog.belongsTo(models.Broadcast, { as: 'broadcast', foreignKey: 'broadcast_id' });
};
module.exports = { Broadcast, BroadcastLog };