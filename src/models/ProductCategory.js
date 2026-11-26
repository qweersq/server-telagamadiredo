const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductCategory = sequelize.define('product_categories', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
        comment: 'ID tenant pemilik kategori'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nama kategori, mis. "Makanan Berat", "Kopi", "Paket"'
    },
    type_service: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Lini bisnis kategori ini: Wisata, F&B, Retribusi, dll'
    },
    order_mode: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: "Mode outlet yang menampilkan kategori: 'loket' | 'cafe'. Null = semua outlet"
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Urutan tampil di katalog/POS (kecil duluan)'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'false = kategori disembunyikan dari pilihan produk'
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
}, {
    timestamps: true,
    tableName: 'product_categories'
});

ProductCategory.associate = (models) => {
    ProductCategory.hasMany(models.Treatment, {
        foreignKey: 'category_id',
        as: 'treatments',
        onDelete: 'SET NULL'
    });

    ProductCategory.belongsTo(models.Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant',
        onDelete: 'CASCADE'
    });
};

module.exports = ProductCategory;
