const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiCreditPackage = sequelize.define('ai_credit_packages', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    credits: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Jumlah credit (-1 untuk unlimited)',
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Harga dalam Rupiah',
    },
    platform: {
        type: DataTypes.ENUM('TRIPAY', 'APP_STORE', 'BOTH'),
        defaultValue: 'BOTH',
        allowNull: false,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
}, {
    paranoid: false,
    timestamps: true,
    tableName: 'ai_credit_packages',
});

AiCreditPackage.associate = () => {
    // Standalone table, no associations needed
};

module.exports = AiCreditPackage;
