const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkScheduleDay = sequelize.define('work_schedule_days', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    schedule_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    day_of_week: {
        type: DataTypes.TINYINT,
        allowNull: false,
        comment: '1=Senin ... 7=Minggu (ISO)',
    },
    is_rest_day: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'true = hari libur rutin, tidak dihitung telat',
    },
    clock_in_target: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    clock_out_target: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    break_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
    },
    tolerance_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
    },
}, {
    tableName: 'work_schedule_days',
    timestamps: true,
    paranoid: false,
});

WorkScheduleDay.associate = (models) => {
    WorkScheduleDay.belongsTo(models.WorkSchedule, { foreignKey: 'schedule_id', as: 'schedule' });
};

module.exports = WorkScheduleDay;
