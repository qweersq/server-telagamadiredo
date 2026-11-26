'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('finance_accounts', [
      {
        name: 'BCA Account',
        type: 'bank',
        balance: 1000000.00,
        description: 'Rekening utama perusahaan di BCA',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Office Cash',
        type: 'cash',
        balance: 200000.00,
        description: 'Kas tunai untuk operasional kantor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'QRIS Gateway',
        type: 'qris',
        balance: 0.00,
        description: 'Akun untuk mencatat transaksi melalui QRIS',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('finance_accounts', null, {});
  },
};