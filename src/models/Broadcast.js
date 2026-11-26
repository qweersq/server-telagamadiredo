const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Broadcast = sequelize.define('broadcasts', {
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
        }
    },
    last_order_date: { 
        type: DataTypes.DATE, 
        allowNull: true 
    },
    last_broadcast_date: { 
        type: DataTypes.DATE, 
        allowNull: true 
    },
    next_broadcast_date: { 
        type: DataTypes.DATE, 
        allowNull: true 
    },
    broadcast_step: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        defaultValue: 15 
    },
    status: { 
        type: DataTypes.ENUM('active', 'paused', 'completed'),
        allowNull: false,
        defaultValue: 'active'
    },
    created_by: { 
        type: DataTypes.INTEGER, 
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    message_template: { 
        type: DataTypes.TEXT, 
        allowNull: true 
    },
    notes: { 
        type: DataTypes.TEXT, 
        allowNull: true 
    }
}, {
    sequelize,
    modelName: 'Broadcast',
    tableName: 'broadcasts',
    paranoid: true
});

module.exports = Broadcast; 