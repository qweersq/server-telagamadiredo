const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkSchedule = sequelize.define('work_schedules', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Karyawan pemilik jadwal',
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'NULL = mengikuti cabang karyawan',
    },
    employment_type: {
        type: DataTypes.ENUM('fulltime', 'parttime'),
        allowNull: false,
        defaultValue: 'fulltime',
        comment: 'Pembeda label; jam kerja tetap per hari',
    },
    effective_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    effective_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'NULL = berlaku selamanya',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    note: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
}, {
    tableName: 'work_schedules',
    timestamps: true,
    paranoid: true,
});

WorkSchedule.associate = (models) => {
    WorkSchedule.belongsTo(models.User, { foreignKey: 'employee_id', as: 'employee' });
    WorkSchedule.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
    WorkSchedule.hasMany(models.WorkScheduleDay, { foreignKey: 'schedule_id', as: 'days' });
};

module.exports = WorkSchedule;
