module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('deliveries', 'odo_start', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('deliveries', 'odo_end', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('deliveries', 'odo_start_photo_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('deliveries', 'odo_end_photo_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('deliveries', 'odo_start');
    await queryInterface.removeColumn('deliveries', 'odo_end');
    await queryInterface.removeColumn('deliveries', 'odo_start_photo_url');
    await queryInterface.removeColumn('deliveries', 'odo_end_photo_url');
  },
}; 