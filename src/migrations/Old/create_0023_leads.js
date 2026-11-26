module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('leads', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            name: { type: Sequelize.STRING, allowNull: false },
            phone: { type: Sequelize.STRING, allowNull: false, unique: true },
            source: { type: Sequelize.STRING, allowNull: true },
            status: {
                type: Sequelize.STRING,  // Baru, Tidak Berminat, Berhasil, Tidak Respon
                allowNull: false,
                defaultValue: 'Baru'
            },
            created_by: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            follow_up_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            last_follow_up_by: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'users',
                    key: 'id'
                },
                allowNull: true
            },
            next_follow_up_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            is_converted: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            conversion_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            last_follow_up_at: { type: Sequelize.DATE, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deletedAt: { type: Sequelize.DATE, allowNull: true },
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('leads');
    },
};