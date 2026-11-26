module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('broadcasts', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            customer_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'customers',
                    key: 'id'
                }
            },
            last_order_date: { type: Sequelize.DATE, allowNull: true },
            last_broadcast_date: { type: Sequelize.DATE, allowNull: true },
            next_broadcast_date: { type: Sequelize.DATE, allowNull: true },
            broadcast_step: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 15 },
            status: {
                type: Sequelize.ENUM('active', 'paused', 'completed'),
                allowNull: false,
                defaultValue: 'active'
            },
            created_by: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            message_template: { type: Sequelize.TEXT, allowNull: true },
            notes: { type: Sequelize.TEXT, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deletedAt: { type: Sequelize.DATE, allowNull: true },
        });

        // Membuat tabel untuk log broadcast
        await queryInterface.createTable('broadcast_logs', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            broadcast_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'broadcasts',
                    key: 'id'
                }
            },
            message: { type: Sequelize.TEXT, allowNull: false },
            status: {
                type: Sequelize.ENUM('pending', 'sent', 'failed'),
                allowNull: false,
                defaultValue: 'pending'
            },
            error_message: { type: Sequelize.TEXT, allowNull: true },
            sent_at: { type: Sequelize.DATE, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deletedAt: { type: Sequelize.DATE, allowNull: true },
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('broadcast_logs');
        await queryInterface.dropTable('broadcasts');
    },
};
