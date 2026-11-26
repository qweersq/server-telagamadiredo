module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('partimer_worklogs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      shift_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'partimer_shifts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      schedule_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'partimer_schedules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      clock_in: { type: Sequelize.DATE, allowNull: true },
      clock_out: { type: Sequelize.DATE, allowNull: true },
      work_duration: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('partimer_worklogs');
  },
};