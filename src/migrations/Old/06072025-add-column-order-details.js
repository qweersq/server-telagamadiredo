module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('order_details', 'pickup_method', {
      type: Sequelize.ENUM('pickup', 'delivery'),
      allowNull: true,
    });

    await queryInterface.addColumn('order_details', 'delivery_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn('order_details', 'delivery_time', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('order_details', 'courier_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('order_details', 'delivery_status', {
      type: Sequelize.ENUM('scheduled', 'on_the_way', 'delivered', 'failed'),
      allowNull: true,
      defaultValue: 'scheduled',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('order_details', 'pickup_method');
    await queryInterface.removeColumn('order_details', 'delivery_date');
    await queryInterface.removeColumn('order_details', 'delivery_time');
    await queryInterface.removeColumn('order_details', 'courier_id');
    await queryInterface.removeColumn('order_details', 'delivery_status');

    // Hapus ENUM-nya secara eksplisit (wajib di PostgreSQL, opsional di MySQL)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_details_pickup_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_details_delivery_status";');
  },
};

