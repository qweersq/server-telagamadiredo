const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CustomerMembership = sequelize.define('customer_memberships', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'customers',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID customer yang membeli membership'
    },
    membership_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'memberships',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID program membership yang dibeli'
    },
    payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'payments',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Optional payment reference (for future use)'
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Tanggal mulai membership'
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal berakhir membership (NULL untuk tier-based membership yang tidak expire)'
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Status membership customer'
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
        comment: 'ID tenant pemilik customer membership'
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
        comment: 'ID branch pemilik customer membership'
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
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'customer_memberships'
});

CustomerMembership.associate = (models) => {
    // CustomerMembership belongs to Customer
    CustomerMembership.belongsTo(models.Customer, { 
        foreignKey: 'customer_id', 
        as: 'customer',
        onDelete: 'CASCADE' 
    });
    
    // CustomerMembership belongs to Membership (program)
    CustomerMembership.belongsTo(models.Membership, { 
        foreignKey: 'membership_id', 
        as: 'membership',
        onDelete: 'CASCADE' 
    });
    
    
    // CustomerMembership belongs to Payment
    CustomerMembership.belongsTo(models.Payment, { 
        foreignKey: 'payment_id', 
        as: 'payment',
        onDelete: 'CASCADE' 
    });
    
    // CustomerMembership belongs to Tenant
    CustomerMembership.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant',
        onDelete: 'CASCADE' 
    });
    
    // CustomerMembership belongs to Branch
    CustomerMembership.belongsTo(models.Branch, { 
        foreignKey: 'branch_id', 
        as: 'branch',
        onDelete: 'CASCADE' 
    });
}

module.exports = CustomerMembership;
