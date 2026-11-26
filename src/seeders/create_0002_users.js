'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('users', [
      {
        name: 'Hadad Al Akbar',
        branch_id: 1,
        email: 'akbarhadadal@gmail.com',
        password: await bcrypt.hash('hadad123', 10),
        phone: '6287795452475',
        address: 'Jl. Bontang, Kalimantan Timur, Indonesia',
        status: 'active',
        role: 'superadmin',
        salary: 2000000,
        salary_date: '2024-12-01',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Katsikat Grindulu',
        branch_id: 1,
        email: 'katsikatid@gmail.com',
        password: await bcrypt.hash('katsikat123', 10),
        phone: '6287795425621',
        address: 'Jl. Grindulu No.24, Bunulrejo, Kec. Blimbing, Kota Malang, Jawa Timur',
        status: 'active',
        role: 'superadmin',
        salary: 2000000,
        salary_date: '2024-12-01',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  },
};