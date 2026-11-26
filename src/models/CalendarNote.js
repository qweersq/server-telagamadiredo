const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CalendarNote = sequelize.define('calendar_notes', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'calendar_notes',
    timestamps: true,
    paranoid: false,
});

module.exports = CalendarNote;
