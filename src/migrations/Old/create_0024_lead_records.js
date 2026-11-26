module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.createTable('lead_records', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        lead_id: { type: Sequelize.INTEGER, references: { model: 'leads', key: 'id' }, allowNull: false },
        follow_up_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, allowNull: false },
        follow_up_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        status: { type: Sequelize.STRING, allowNull: true }, // Berhasil, Tidak Berminat, Tidak Respon
        notes: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    },
    down: async (queryInterface, Sequelize) => {
      await queryInterface.dropTable('lead_records');
    },
  };