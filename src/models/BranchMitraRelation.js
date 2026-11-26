const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BranchMitraRelation = sequelize.define('branch_mitra_relations', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    parent_branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'branches',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID cabang utama (parent)'
    },
    mitra_branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'branches',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID cabang mitra (child)'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Status relasi mitra'
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik relasi'
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
    tableName: 'branch_mitra_relations',
    indexes: [
        // Single column indexes
        { fields: ['parent_branch_id'] },
        { fields: ['mitra_branch_id'], unique: true },
        { fields: ['tenant_id'] },
        { fields: ['status'] },

        // Composite indexes
        { fields: ['parent_branch_id', 'status'], name: 'idx_branch_mitra_parent_status' },
        { fields: ['tenant_id', 'status'], name: 'idx_branch_mitra_tenant_status' }
    ]
});

BranchMitraRelation.associate = (models) => {
    // Relasi ke Branch sebagai parent
    BranchMitraRelation.belongsTo(models.Branch, {
        foreignKey: 'parent_branch_id',
        as: 'parentBranch',
        onDelete: 'CASCADE'
    });

    // Relasi ke Branch sebagai mitra
    BranchMitraRelation.belongsTo(models.Branch, {
        foreignKey: 'mitra_branch_id',
        as: 'mitraBranch',
        onDelete: 'CASCADE'
    });

    // Relasi ke Tenant
    BranchMitraRelation.belongsTo(models.Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant',
        onDelete: 'CASCADE'
    });
};

module.exports = BranchMitraRelation;
