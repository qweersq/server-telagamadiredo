const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('customers', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    gender: {
        type: DataTypes.STRING
    },
    address: {
        type: DataTypes.STRING
    },
    gmaps: {
        type: DataTypes.STRING
    },
    date_birthday: {
        type: DataTypes.DATEONLY
    },
    city: {
        type: DataTypes.STRING
    },
    hobby: {
        type: DataTypes.STRING
    },
    age: {
        type: DataTypes.INTEGER
    },
    working_type: {
        type: DataTypes.STRING
    },
    description: {
        type: DataTypes.TEXT
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
        comment: 'ID tenant pemilik customer'
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'branches',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID branch tempat customer terdaftar'
    },
    current_membership_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'memberships',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID membership aktif saat ini'
    },
    last_order_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal order terakhir customer (untuk follow-up targeting)'
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Poin saat ini yang bisa dipakai untuk redeem'
    },
    lifetime_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total poin yang pernah didapat (untuk tier membership, tidak pernah turun)'
    },
    has_received_first_order_bonus: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flag untuk tracking apakah customer sudah pernah dapat first order bonus (sekali seumur hidup)'
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
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'customers',
    indexes: [
        {
            unique: true,
            fields: ['tenant_id', 'phone'],
            name: 'unique_tenant_phone'
        },
        {
            fields: ['tenant_id', 'last_order_date'],
            name: 'idx_customers_last_order'
        }
    ]
});

Customer.associate = (models) => {
    Customer.hasMany(models.Order, { foreignKey: 'customer_id', as: 'orders', onDelete: "CASCADE" });
    Customer.hasMany(models.CustomerMembership, { foreignKey: 'customer_id', as: 'customer_memberships', onDelete: "CASCADE" });
    Customer.hasMany(models.ReminderLog, { foreignKey: 'customer_id', as: 'reminder_logs', onDelete: 'CASCADE' });
    Customer.hasMany(models.PointTransaction, { foreignKey: 'customer_id', as: 'point_transactions', onDelete: 'CASCADE' });
    
    // Customer belongs to tenant
    Customer.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
    
    // Customer belongs to branch
    Customer.belongsTo(models.Branch, { 
        foreignKey: 'branch_id', 
        as: 'branch', 
        onDelete: 'CASCADE' 
    });
    
    // Customer belongs to current customer membership (one-to-one)
    Customer.belongsTo(models.CustomerMembership, { 
        foreignKey: 'current_membership_id', 
        as: 'current_membership', 
        onDelete: 'SET NULL' 
    });
};

module.exports = Customer;