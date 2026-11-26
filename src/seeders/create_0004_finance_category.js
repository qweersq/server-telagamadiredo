module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('finance_categories', [
      { name: 'Pendapatan', type: 'credit', description: 'Pemasukan operasional', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Beban Operasional', type: 'debit', description: 'Biaya operasional', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Beban Gaji', type: 'debit', description: 'Biaya gaji karyawan', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Beban Listrik', type: 'debit', description: 'Biaya listrik', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Beban Air', type: 'debit', description: 'Biaya air', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Beban Internet', type: 'debit', description: 'Biaya internet', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Beban Telepon', type: 'debit', description: 'Biaya telepon', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Beban Pajak', type: 'debit', description: 'Biaya pajak', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Beban Lainnya', type: 'debit', description: 'Biaya lainnya', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Penyusutan', type: 'debit', description: 'Biaya penyusutan', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Lainnya', type: 'debit', description: 'Biaya lainnya', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Piutang', type: 'debit', description: 'Pendapatan diakui tapi belum diterima', createdAt: new Date(), updatedAt: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('finance_categories', null, {});
  },
};