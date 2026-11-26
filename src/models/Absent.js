const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Absent = sequelize.define('absents', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'branches',
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    clock_in: {
        type: DataTypes.TIME,
        allowNull: false
    },
    clock_out: {
        type: DataTypes.TIME,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    work_duration: {
        type: DataTypes.TIME,
        allowNull: true
    },
    photo_clock_in: {
        type: DataTypes.STRING,
        allowNull: true
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Employee latitude when checking in'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Employee longitude when checking in'
    },
    accuracy: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        comment: 'GPS accuracy in meters'
    },
    location_validated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether location was validated against branch'
    },
    schedule_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Jadwal yang dipakai saat check-in',
    },
    expected_clock_in: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Snapshot jam masuk normal hari itu',
    },
    expected_clock_out: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Snapshot jam pulang normal hari itu',
    },
    late_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Menit keterlambatan setelah toleransi, 0 = tepat waktu',
    },
    is_late: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    photo_clock_out: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    clock_in_lat: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    clock_in_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    clock_in_distance_m: { type: DataTypes.INTEGER, allowNull: true },
    clock_in_photo_at: { type: DataTypes.DATE, allowNull: true },
    clock_out_lat: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    clock_out_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    clock_out_distance_m: { type: DataTypes.INTEGER, allowNull: true },
    clock_out_photo_at: { type: DataTypes.DATE, allowNull: true },
    ai_clock_in_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'skipped',
        comment: 'pending | processing | done | failed | skipped',
    },
    ai_clock_in_score: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    ai_clock_in_verdict: { type: DataTypes.STRING(20), allowNull: true, comment: 'verified | review | reject' },
    ai_clock_in_reason: { type: DataTypes.TEXT, allowNull: true },
    ai_clock_in_raw: { type: DataTypes.JSON, allowNull: true },
    ai_clock_in_at: { type: DataTypes.DATE, allowNull: true },
    ai_clock_out_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'skipped',
        comment: 'pending | processing | done | failed | skipped',
    },
    ai_clock_out_score: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    ai_clock_out_verdict: { type: DataTypes.STRING(20), allowNull: true, comment: 'verified | review | reject' },
    ai_clock_out_reason: { type: DataTypes.TEXT, allowNull: true },
    ai_clock_out_raw: { type: DataTypes.JSON, allowNull: true },
    ai_clock_out_at: { type: DataTypes.DATE, allowNull: true },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deletedAt: {
        type: DataTypes.DATE
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'absents'
});

Absent.associate = (models) => {
    Absent.belongsTo(models.Branch, { foreignKey: 'branch_id', onDelete: "CASCADE" });
    Absent.belongsTo(models.User, { foreignKey: 'employee_id', as: 'employee_absent', onDelete: "CASCADE" });
};

module.exports = Absent;