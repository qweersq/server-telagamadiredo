const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Delivery = sequelize.define('deliveries', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    users_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY
    },
    total_distance: {
        type: DataTypes.DECIMAL(10, 2)
    },
    total_cost: {
        type: DataTypes.DECIMAL(10, 2)
    },
    odo_start: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    odo_end: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    odo_start_photo_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    odo_end_photo_url: {
        type: DataTypes.STRING,
        allowNull: true,
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
    tableName: 'deliveries'
});

Delivery.associate = (models) => {
    Delivery.hasMany(models.DeliveryDetail, { foreignKey: 'delivery_id', onDelete: "CASCADE" });

    Delivery.belongsTo(models.User, { foreignKey: 'users_id', onDelete: "CASCADE" });
};

module.exports = Delivery;