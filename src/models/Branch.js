const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Branch = sequelize.define('branches', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    manager_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false
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
        comment: 'ID tenant pemilik cabang'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'suspended', 'closed'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Status of the branch: active, inactive, maintenance, suspended, closed'
    },
    branch_type: {
        type: DataTypes.ENUM('main', 'mitra'),
        allowNull: false,
        defaultValue: 'main',
        comment: 'Tipe cabang: main (cabang utama) atau mitra (sub-branch)'
    },
    order_mode: {
        type: DataTypes.ENUM('loket', 'cafe', 'mixed'),
        allowNull: false,
        defaultValue: 'loket',
        comment: 'Mode operasional cabang: loket (tiket/retribusi), cafe (F&B), mixed (keduanya)'
    },
    kitchen_branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
            model: 'branches',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Dapur produksi default. Null = masak di cabang sendiri'
    },
    wa_session_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'WhatsApp session ID for gateway integration'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Branch longitude for attendance validation'
    },
    latitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Branch latitude for attendance validation'
    },
    checkin_radius_m: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 150,
        comment: 'Radius toleransi GPS foto bukti tugas harian (meter)'
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
    tableName: 'branches',
    indexes: [
        // Single column indexes
        { fields: ['tenant_id'] },
        { fields: ['status'] },
        { fields: ['wa_session_id'] },
        { fields: ['branch_type'] },
        { fields: ['order_mode'] },
        { fields: ['kitchen_branch_id'], name: 'idx_branches_kitchen_branch' },

        // Composite indexes
        { fields: ['latitude', 'longitude'], name: 'idx_branches_location' },
        { fields: ['tenant_id', 'status'], name: 'idx_branches_tenant_status' },
        { fields: ['tenant_id', 'branch_type'], name: 'idx_branches_tenant_type' }
    ]
});

Branch.associate = (models) => {
    Branch.hasMany(models.Absent, { foreignKey: 'branch_id', onDelete: "CASCADE" });
    // Branch.hasMany(models.Ai, { foreignKey: 'branch_id', onDelete: "CASCADE" });
    // Branch.hasMany(models.Business, { foreignKey: 'branch_id', onDelete: "CASCADE" });
    Branch.hasMany(models.Order, { foreignKey: 'branch_id', onDelete: "CASCADE" });
    // Branch.hasMany(models.OrderProduct, { foreignKey: 'branch_id', onDelete: "CASCADE" });
    Branch.hasMany(models.Shift, { foreignKey: 'branch_id', onDelete: "CASCADE" });
    Branch.hasMany(models.User, { foreignKey: 'branch_id', onDelete: "CASCADE" });

    // Branch belongs to tenant
    Branch.belongsTo(models.Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant',
        onDelete: 'CASCADE'
    });

    // Dapur produksi default (mis. Cafe 2 & 3 masak di Cafe 1)
    Branch.belongsTo(models.Branch, {
        foreignKey: 'kitchen_branch_id',
        as: 'kitchenBranch',
        onDelete: 'SET NULL'
    });

    // Branch mitra relations
    Branch.hasMany(models.BranchMitraRelation, {
        foreignKey: 'parent_branch_id',
        as: 'mitraRelations',
        onDelete: 'CASCADE'
    });
    Branch.hasOne(models.BranchMitraRelation, {
        foreignKey: 'mitra_branch_id',
        as: 'parentRelation',
        onDelete: 'CASCADE'
    });
};

module.exports = Branch;