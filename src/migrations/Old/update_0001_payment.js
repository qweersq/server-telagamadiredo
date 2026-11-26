'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add new columns
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Tambah kolom baru
      await queryInterface.addColumn('payments', 'total_service', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total service dalam transaksi'
      }, { transaction });

      await queryInterface.addColumn('payments', 'subtotal', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total harga sebelum diskon'
      }, { transaction });

      await queryInterface.addColumn('payments', 'additional_cost', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Biaya tambahan (jika ada)'
      }, { transaction });

      await queryInterface.addColumn('payments', 'paid_amount', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total yang sudah dibayar'
      }, { transaction });

      await queryInterface.addColumn('payments', 'remaining_amount', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Sisa yang harus dibayar'
      }, { transaction });

      await queryInterface.addColumn('payments', 'due_date', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Tanggal jatuh tempo pembayaran'
      }, { transaction });

      await queryInterface.addColumn('payments', 'notes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Catatan tambahan untuk pembayaran'
      }, { transaction });

      // Modify existing columns
      await queryInterface.changeColumn('payments', 'status', {
        type: Sequelize.ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID'),
        allowNull: false,
        defaultValue: 'UNPAID'
      }, { transaction });

      // Update data yang sudah ada
      await queryInterface.sequelize.query(`
        UPDATE payments 
        SET 
          subtotal = total_price,
          paid_amount = CASE 
            WHEN status = 'PAID' THEN final_price 
            WHEN money IS NOT NULL THEN money
            ELSE 0 
          END,
          remaining_amount = CASE 
            WHEN status = 'PAID' THEN 0
            WHEN money IS NOT NULL THEN final_price - money
            ELSE final_price
          END,
          status = CASE 
            WHEN status = 'PAID' OR money >= final_price THEN 'PAID'
            WHEN money > 0 THEN 'PARTIALLY_PAID'
            ELSE 'UNPAID'
          END,
          total_service = (
            SELECT COUNT(*) 
            FROM order_details
            WHERE order_details.order_id = orders.id
          )
        WHERE id > 0
      `, { transaction });
    });

    // Step 2: Remove deprecated columns (optional, can be done later)
    // await queryInterface.sequelize.transaction(async (transaction) => {
    //   await queryInterface.removeColumn('payments', 'method', { transaction });
    //   await queryInterface.removeColumn('payments', 'total_process_time_cost', { transaction });
    //   await queryInterface.removeColumn('payments', 'money', { transaction });
    //   await queryInterface.removeColumn('payments', 'change', { transaction });
    //   await queryInterface.removeColumn('payments', 'evidence_photo', { transaction });
    //   await queryInterface.removeColumn('payments', 'date', { transaction });
    // });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Restore status type
      await queryInterface.changeColumn('payments', 'status', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction });

      // Remove new columns
      await queryInterface.removeColumn('payments', 'total_service', { transaction });
      await queryInterface.removeColumn('payments', 'subtotal', { transaction });
      await queryInterface.removeColumn('payments', 'additional_cost', { transaction });
      await queryInterface.removeColumn('payments', 'paid_amount', { transaction });
      await queryInterface.removeColumn('payments', 'remaining_amount', { transaction });
      await queryInterface.removeColumn('payments', 'due_date', { transaction });
      await queryInterface.removeColumn('payments', 'notes', { transaction });
    });
  }
};