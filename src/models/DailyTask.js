const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyTask = sequelize.define('daily_tasks', {
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
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Karyawan yang ditugaskan',
    },
    task_template_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'NULL = tugas tambahan manual',
    },
    title: {
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'Salinan nama tugas agar riwayat tetap utuh',
    },
    area: {
        type: DataTypes.STRING(150),
        allowNull: true,
    },
    requires_photo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Wajib foto bukti saat menandai selesai',
    },
    task_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending | done | incomplete',
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    photo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    photo_lat: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Latitude hasil ekstrak watermark GPS camera',
    },
    photo_lng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitude hasil ekstrak watermark GPS camera',
    },
    distance_m: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Jarak foto ke lokasi cabang (meter)',
    },
    photo_taken_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Waktu pengambilan foto dari watermark',
    },
    ai_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending | processing | done | failed | skipped',
    },
    ai_score: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true,
        comment: 'Skor akhir verifikasi 0-100',
    },
    ai_verdict: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'verified | review | reject',
    },
    ai_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ai_raw: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Respons mentah AI untuk audit',
    },
    ai_checked_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'daily_tasks',
    timestamps: true,
    paranoid: false,
});

DailyTask.associate = (models) => {
    DailyTask.belongsTo(models.User, { foreignKey: 'user_id', as: 'employee' });
    DailyTask.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
    DailyTask.belongsTo(models.TaskTemplate, { foreignKey: 'task_template_id', as: 'template' });
};

module.exports = DailyTask;
