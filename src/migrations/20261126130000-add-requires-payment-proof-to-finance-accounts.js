'use strict';

/**
 * Flag "wajib upload bukti bayar" per akun keuangan.
 *
 * Akun QRIS / Transfer biasanya butuh foto bukti transfer, sementara kas tunai
 * tidak. Menaruh flag di level akun membuat aturan mengikuti payment method
 * yang dipasang pada akun tersebut:
 *
 *   requires_payment_proof = 0 → bukti bayar opsional (default, data lama aman)
 *   requires_payment_proof = 1 → kasir wajib upload foto bukti pembayaran
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const columns = await queryInterface.describeTable('finance_accounts');

        if (!columns.requires_payment_proof) {
            await queryInterface.addColumn('finance_accounts', 'requires_payment_proof', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'True = pembayaran ke akun ini wajib melampirkan foto bukti bayar'
            });
            console.log('✅ Column finance_accounts.requires_payment_proof added');
        }
    },

    down: async (queryInterface) => {
        const columns = await queryInterface.describeTable('finance_accounts');

        if (columns.requires_payment_proof) {
            await queryInterface.removeColumn('finance_accounts', 'requires_payment_proof');
            console.log('✅ Column finance_accounts.requires_payment_proof removed');
        }
    }
};
