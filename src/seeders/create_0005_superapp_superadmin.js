'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Cek apakah user superapp-superadmin sudah ada
    const existingUser = await queryInterface.rawSelect('users', {
      where: {
        email: 'superapp@katsikat.com'
      }
    }, ['id']);

    if (!existingUser) {
      await queryInterface.bulkInsert('users', [
        {
          name: 'Super App Admin',
          branch_id: null, // Super app admin tidak terikat ke branch tertentu
          email: 'superapp@katsikat.com',
          password: await bcrypt.hash('superapp123', 10),
          phone: '6281234567890',
          address: 'Super App Headquarters',
          status: 'active',
          role: 'superapp-superadmin',
          salary: null, // Super app admin tidak memiliki gaji
          salary_date: null,
          tenant_id: null, // Super app admin tidak terikat ke tenant tertentu
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: 'superapp@katsikat.com'
    }, {});
  },
};
