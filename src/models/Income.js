const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Income = sequelize.define('incomes', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    shift_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'shifts',
            key: 'id'
        }
    },
    finance_account_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'finance_accounts',
            key: 'id'
        }
    },
    finance_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'finance_categories',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    receipt: {
        type: DataTypes.STRING(1000)
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
        defaultValue: 'completed'
    },
    approved_by: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    approved_at: {
        type: DataTypes.DATE
    },
    transaction_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'finance_transactions',
            key: 'id'
        }
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'branches',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
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
    }
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'incomes'
});

Income.associate = (models) => {
    Income.belongsTo(models.Shift, { foreignKey: 'shift_id' });
    Income.belongsTo(models.User, { foreignKey: 'user_id', as: 'creator' });
    Income.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approver' });
    Income.belongsTo(models.FinanceAccount, { foreignKey: 'finance_account_id', as: 'finance_account' });
    Income.belongsTo(models.FinanceCategory, { foreignKey: 'finance_category_id' });
    Income.belongsTo(models.FinanceTransaction, { foreignKey: 'transaction_id' });
    Income.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });
    Income.belongsTo(models.Branch, { foreignKey: 'branch_id' });
};

module.exports = Income;
