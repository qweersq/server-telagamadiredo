const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Treatment = sequelize.define('treatment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    type_item: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type_service: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'product_categories', key: 'id' },
        comment: 'Kategori katalog produk. Null = belum dikategorikan'
    },
    unit: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Satuan barang: pcs, porsi, gelas, botol, bungkus'
    },
    production_mode: {
        type: DataTypes.ENUM('outlet', 'central'),
        allowNull: false,
        defaultValue: 'central',
        comment: 'central = dikirim ke dapur cabang, outlet = selalu dibuat di outlet penjual'
    },
    production_branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'branches', key: 'id' },
        comment: 'Dapur produksi khusus produk ini. Null = ikut mode produksi cabang'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
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
        comment: 'ID tenant pemilik treatment'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Status aktif treatment'
    },
    requires_tracking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Apakah treatment memerlukan tracking status (false untuk produk/ongkir)'
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
        type: DataTypes.DATE,
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'treatment'
});

Treatment.associate = (models) => {
    Treatment.hasMany(models.OrderDetail, { foreignKey: 'treatment_id', onDelete: "CASCADE" });

    Treatment.belongsTo(models.ProductCategory, {
        foreignKey: 'category_id',
        as: 'category',
        onDelete: 'SET NULL'
    });
    
    // Treatment belongs to tenant
    Treatment.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
}

module.exports = Treatment;