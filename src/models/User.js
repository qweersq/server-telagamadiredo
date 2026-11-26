const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'branches',
            key: 'id'
        },
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'employee',
    },
    position: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Jabatan operasional: kasir, kebersihan, dapur, taman, keamanan, dll',
    },
    salary: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    salary_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'tenants',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik user'
    },
    refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Refresh token untuk auto refresh access token'
    },
    password_reset_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Token untuk reset password'
    },
    password_reset_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal kadaluarsa password reset token'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'users'
});

User.associate = (models) => {
    User.hasMany(models.Absent, { foreignKey: 'employee_id', as: 'employee_absent', onDelete: "CASCADE" });
    // User.hasMany(models.CapitalRecord, { foreignKey: 'user_id', as: 'capital_records', onDelete: "CASCADE" });
    User.hasMany(models.Delivery, { foreignKey: 'users_id', onDelete: "CASCADE" });
    User.hasMany(models.Expense, { foreignKey: 'user_id', onDelete: "CASCADE" });
    User.hasMany(models.Expense, { foreignKey: 'approved_by', onDelete: "CASCADE" });
    User.hasMany(models.OrderDetail, { foreignKey: 'employee_id', as: 'employee', onDelete: "CASCADE" });
    User.hasMany(models.Shift, { foreignKey: 'employee_id', as: 'employee_shift', onDelete: "CASCADE" });
    User.hasMany(models.LeadRecord, { foreignKey: 'follow_up_by', as: 'followUpBy', onDelete: "CASCADE" });
    User.hasMany(models.Lead, { foreignKey: 'created_by', as: 'createdBy', onDelete: "CASCADE" });
    User.hasMany(models.Order, { foreignKey: 'created_by', as: 'created_orders' });
    User.hasMany(models.ReminderLog, { foreignKey: 'admin_id', as: 'sent_reminder_logs', onDelete: 'SET NULL' });
    User.hasMany(models.DailyTask, { foreignKey: 'user_id', as: 'daily_tasks', onDelete: 'CASCADE' });
    User.belongsTo(models.Branch, { 
        foreignKey: 'branch_id', 
        as: 'branch',
        onDelete: "CASCADE" 
    });
    
    // User belongs to tenant
    User.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
}

module.exports = User;