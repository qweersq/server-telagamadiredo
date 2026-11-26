const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TaskTemplate = sequelize.define('task_templates', {
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
        allowNull: true,
        comment: 'NULL = berlaku untuk semua cabang',
    },
    title: {
        type: DataTypes.STRING(150),
        allowNull: false,
    },
    position: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'NULL = semua posisi',
    },
    area: {
        type: DataTypes.STRING(150),
        allowNull: true,
    },
    requires_photo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'task_templates',
    timestamps: true,
    paranoid: false,
});

TaskTemplate.associate = (models) => {
    TaskTemplate.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    TaskTemplate.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
    TaskTemplate.hasMany(models.DailyTask, {
        foreignKey: 'task_template_id',
        as: 'daily_tasks',
        onDelete: 'SET NULL',
    });
};

module.exports = TaskTemplate;
