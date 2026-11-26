module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('finance_transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'finance_accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'finance_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      total_fee: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      final_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      date: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('finance_transactions');
  },
};