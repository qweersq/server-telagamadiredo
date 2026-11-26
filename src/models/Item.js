const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Item = sequelize.define('items', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    brand: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    color: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    material: {
        type: DataTypes.STRING,
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
        comment: 'ID tenant pemilik item'
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
    tableName: 'items'
});

Item.associate = (models) => {
    Item.hasMany(models.OrderDetail, { as: 'order_details', foreignKey: 'item_id', onDelete: "CASCADE" });
    
    // Item belongs to tenant
    Item.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
}

module.exports = Item;