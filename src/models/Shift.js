const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Shift = sequelize.define('shifts', {
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
        },
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'branches',
            key: 'id'
        },
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    end_time: {
        type: DataTypes.DATE,
    },
    sales: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    cash_initial: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    cash_expected: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    cash_actual: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    bank_transfer: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    qris: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    transaction: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    delivery: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    item: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    service: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    difference: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    paid: {
        type: DataTypes.INTEGER,
    },
    unpaid: {
        type: DataTypes.INTEGER,
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
    },
    deletedAt: {
        type: DataTypes.DATE,
    },
    expense: {
        type: DataTypes.INTEGER,
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
        comment: 'ID tenant pemilik shift'
    }
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'shifts'
});

Shift.associate = (models) => {
    Shift.hasMany(models.Expense, { foreignKey: 'shift_id', onDelete: "CASCADE" });
    Shift.hasMany(models.Order, { foreignKey: 'shift_id', as: 'orders' });
    Shift.hasMany(models.PaymentDetail, { foreignKey: 'shift_id', as: 'payment_details' });

    Shift.belongsTo(models.Branch, { foreignKey: 'branch_id', onDelete: "CASCADE" });
    Shift.belongsTo(models.User, { foreignKey: 'employee_id', as: 'employee_shift', onDelete: "CASCADE" });
    
    // Shift belongs to tenant
    Shift.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
}

module.exports = Shift;