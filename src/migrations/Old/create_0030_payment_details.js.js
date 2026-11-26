module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment_details', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'finance_transactions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'payments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      method: { type: Sequelize.ENUM('cash', 'qris', 'bank_transfer'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fee: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      interest: { type: Sequelize.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
      final_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      evidence_photo: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payment_details');
  },
};