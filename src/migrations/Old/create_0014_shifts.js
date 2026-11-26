'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('shifts', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            employee_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            branch_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'branches',
                    key: 'id',
                },
            },
            start_time: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            end_time: {
                type: Sequelize.DATE,
            },
            sales: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            cash_initial: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            cash_expected: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            cash_actual: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            bank_transfer: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            qris: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            transaction: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            delivery: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            item: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            service: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            difference: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            paid: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            unpaid: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            expense: {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: 0,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            deletedAt: {
                type: Sequelize.DATE,
            },
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('shifts');
    }
};