module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bonuses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false }, //'bonus harian', 'bonus bulanan', 'bonus kinerja'
      type: { type: Sequelize.STRING, allowNull: false }, //'harian', 'bulanan', 'kinerja'
      target: { type: Sequelize.INTEGER, allowNull: false },
      bonus_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      valid_from: { type: Sequelize.DATE, allowNull: false },
      valid_to: { type: Sequelize.DATE, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('bonuses');
    },
};