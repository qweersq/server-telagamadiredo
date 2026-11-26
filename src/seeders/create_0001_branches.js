'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('branches', [
      {
        name: 'Katsikat Grindulu',
        address: 'Jl. Grindulu No.24, Bunulrejo, Kec. Blimbing, Kota Malang, Jawa Timur 65126',
        phone: '6287795452475',
        manager_id: 1,
        city: 'Malang',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('branches', null, {});
  },
};