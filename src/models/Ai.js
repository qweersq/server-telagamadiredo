// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

// const Ai = sequelize.define('ai', {
//     id: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true,
//         allowNull: false,
//     },
//     branch_id: {
//         type: DataTypes.INTEGER,
//         allowNull: true,
//         references: {
//             model: 'branches',
//             key: 'id'
//         },
//     },
//     current_request: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         defaultValue: 0
//     },
//     createdAt: {
//         type: DataTypes.DATE,
//         allowNull: false,
//         defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
//     },
//     updatedAt: {
//         type: DataTypes.DATE,
//         allowNull: false,
//         defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
//     },
//     deletedAt: {
//         type: DataTypes.DATE,
//         allowNull: true,
//     },
// }, {
//     paranoid: true,
//     timestamps: true,
//     tableName: 'ai',
// });

// Ai.associate = (models) => {
//     Ai.belongsTo(models.Branch, { foreignKey: 'branch_id', onDelete: "CASCADE" });
// }
// module.exports = Ai;