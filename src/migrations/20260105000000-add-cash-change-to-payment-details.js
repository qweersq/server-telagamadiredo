'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add money_received column to payment_details table (for cash payments)
        await queryInterface.addColumn('payment_details', 'money_received', {
            type: Sequelize.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: null,
            comment: 'Uang yang diterima dari customer (khusus untuk payment method cash)'
        });

        console.log('✅ Column money_received added to payment_details table');

        // Add change_amount column to payment_details table (for cash payments)
        await queryInterface.addColumn('payment_details', 'change_amount', {
            type: Sequelize.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: null,
            comment: 'Kembalian yang diberikan ke customer (khusus untuk payment method cash)'
        });

        console.log('✅ Column change_amount added to payment_details table');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('payment_details', 'money_received');
        console.log('⚠️  Column money_received removed from payment_details table');

        await queryInterface.removeColumn('payment_details', 'change_amount');
        console.log('⚠️  Column change_amount removed from payment_details table');
    }
};
