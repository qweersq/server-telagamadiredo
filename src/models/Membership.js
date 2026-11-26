const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Membership = sequelize.define('memberships', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nama program membership (LITE, PREMIUM, VIP, PLATINUM)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Deskripsi program membership'
    },
    discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Persentase diskon yang diberikan'
    },
    price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Harga program membership (untuk backward compatibility dengan membership payment)'
    },
    min_points: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Minimum lifetime_points untuk tier ini (nullable, untuk tier-based membership)'
    },
    duration_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Durasi membership dalam hari (nullable untuk backward compatibility)'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Status aktif program membership'
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
        comment: 'ID tenant pemilik membership'
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
        comment: 'ID branch pemilik membership'
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
    tableName: 'memberships'
});

Membership.associate = (models) => {
    // Membership belongs to tenant
    Membership.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant',
        onDelete: 'CASCADE' 
    });
    
    // Membership belongs to branch
    Membership.belongsTo(models.Branch, { 
        foreignKey: 'branch_id', 
        as: 'branch',
        onDelete: 'CASCADE' 
    });
    
    // Membership has many customer memberships (customers who bought this program)
    Membership.hasMany(models.CustomerMembership, { 
        foreignKey: 'membership_id', 
        as: 'customer_memberships',
        onDelete: 'CASCADE' 
    });
}

module.exports = Membership;