'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `UPDATE orders o
         SET o.shift_id = (
           SELECT s.id
           FROM shifts s
           WHERE s.deletedAt IS NULL
             AND s.branch_id = o.branch_id
             AND (s.tenant_id IS NULL OR s.tenant_id = o.tenant_id)
             AND s.start_time <= o.createdAt
             AND (s.end_time IS NULL OR o.createdAt <= s.end_time)
           ORDER BY s.start_time DESC
           LIMIT 1
         )
         WHERE o.deletedAt IS NULL;`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `UPDATE orders
         SET shift_id = NULL
         WHERE deletedAt IS NULL;`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

