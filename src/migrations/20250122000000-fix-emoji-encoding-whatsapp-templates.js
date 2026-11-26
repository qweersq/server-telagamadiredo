'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Fix encoding untuk support emoji di WhatsApp templates
    await queryInterface.sequelize.query(`
      ALTER TABLE whatsapp_templates 
      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Pastikan column template_content juga utf8mb4
    await queryInterface.sequelize.query(`
      ALTER TABLE whatsapp_templates 
      MODIFY COLUMN template_content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Optional: Fix column lain yang mungkin butuh emoji
    await queryInterface.sequelize.query(`
      ALTER TABLE whatsapp_templates 
      MODIFY COLUMN title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    console.log('✅ WhatsApp templates table encoding fixed - Emoji support enabled!');
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback ke utf8 (jarang diperlukan, tapi untuk consistency)
    await queryInterface.sequelize.query(`
      ALTER TABLE whatsapp_templates 
      CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci
    `);

    console.log('⚠️  Rolled back to utf8 - Emoji support disabled');
  }
};

