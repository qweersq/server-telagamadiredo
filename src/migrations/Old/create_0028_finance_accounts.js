module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('finance_accounts', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            name: { type: Sequelize.STRING, allowNull: false },
            type: { type: Sequelize.ENUM('bank', 'cash', 'qris'), allowNull: false },
            balance: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
            description: { type: Sequelize.TEXT, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('finance_accounts');
    },
};