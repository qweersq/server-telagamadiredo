    module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.addColumn('order_details', 'perfumes', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    },
    down: async (queryInterface, Sequelize) => {
      await queryInterface.removeColumn('order_details', 'perfumes');
    },
  };