'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Cek existing columns
      const existingColumns = await queryInterface.describeTable('expenses');

      // 1. Tambah kolom baru (dengan pengecekan)
      if (!existingColumns.finance_account_id) {
        await queryInterface.addColumn('expenses', 'finance_account_id', {
          type: Sequelize.INTEGER,
          references: {
            model: 'finance_accounts',
            key: 'id'
          }
        }, { transaction });
      }

      if (!existingColumns.finance_category_id) {
        await queryInterface.addColumn('expenses', 'finance_category_id', {
          type: Sequelize.INTEGER,
          references: {
            model: 'finance_categories',
            key: 'id'
          }
        }, { transaction });
      }

      if (!existingColumns.status) {
        await queryInterface.addColumn('expenses', 'status', {
          type: Sequelize.ENUM('pending', 'approved', 'rejected', 'completed'),
          defaultValue: 'pending'
        }, { transaction });
      }

      if (!existingColumns.approved_by) {
        await queryInterface.addColumn('expenses', 'approved_by', {
          type: Sequelize.INTEGER,
          references: {
            model: 'users',
            key: 'id'
          }
        }, { transaction });
      }
      if (!existingColumns.transaction_id) {
        await queryInterface.addColumn('expenses', 'transaction_id', {
          type: Sequelize.INTEGER,
          references: {
            model: 'finance_transactions',
            key: 'id'
          }
        }, { transaction });
      }

      if (!existingColumns.approved_at) {
        await queryInterface.addColumn('expenses', 'approved_at', {
          type: Sequelize.DATE
        }, { transaction });
      }

      // 2. Modify existing columns
      await queryInterface.changeColumn('expenses', 'name', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction });

      // await queryInterface.changeColumn('expenses', 'date', {
      //   type: Sequelize.DATEONLY,
      //   allowNull: false,
      //   defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      // }, { transaction });

      await queryInterface.changeColumn('expenses', 'amount', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('expenses', 'description', {
        type: Sequelize.TEXT
      }, { transaction });

      // Tambahkan logging detail untuk payment_method
      const [detailPaymentMethods] = await queryInterface.sequelize.query(
        `SELECT id, payment_method, LENGTH(payment_method) as length 
         FROM expenses 
         WHERE payment_method IS NOT NULL OR payment_method = ''
         ORDER BY payment_method;`,
        { transaction }
      );
      ('Detail Payment Methods:', JSON.stringify(detailPaymentMethods, null, 2));

      // Cek nilai-nilai yang bermasalah
      const [invalidPayments] = await queryInterface.sequelize.query(
        `SELECT id, payment_method
         FROM expenses 
         WHERE payment_method NOT IN ('cash', 'bank_transfer', 'qris', 'shopee')
         OR payment_method IS NULL 
         OR payment_method = '';`,
        { transaction }
      );

      // 2. Update data yang bermasalah terlebih dahulu
      await queryInterface.sequelize.query(
        `UPDATE expenses 
         SET payment_method = 'cash'
         WHERE payment_method IS NULL 
         OR payment_method = ''
         OR payment_method NOT IN ('cash', 'bank_transfer', 'qris', 'shopee');`,
        { transaction }
      );

      // Verifikasi setelah update
      const [afterUpdate] = await queryInterface.sequelize.query(
        'SELECT DISTINCT payment_method FROM expenses;',
        { transaction }
      );

      // Baru kemudian ubah tipe kolom
      await queryInterface.sequelize.query(
        'ALTER TABLE expenses MODIFY COLUMN payment_method VARCHAR(255);',
        { transaction }
      );

      // Final check sebelum convert ke ENUM
      const [finalCheck] = await queryInterface.sequelize.query(
        'SELECT DISTINCT payment_method FROM expenses;',
        { transaction }
      );

      // Ubah ke ENUM
      await queryInterface.changeColumn('expenses', 'payment_method', {
        type: Sequelize.ENUM('cash', 'bank_transfer', 'qris', 'shopee'),
        allowNull: false,
        defaultValue: 'cash'
      }, { transaction });

      await queryInterface.changeColumn('expenses', 'receipt', {
        type: Sequelize.STRING(1000)
      }, { transaction });

      // 3. Data Migration
      // Mapping configuration
      const PAYMENT_METHOD_MAPPING = {
        'cash': 2,
        'bank_transfer': 1,
        'shopee': 1,
        'qris': 1
      };

      const TYPE_ACCOUNT_MAPPING = {
        'beban': 2,
        'peralatan': 2,
        'perlengkapan': 2,
        'modal_bisnis': 13
      };

      // Log initial state
      const [initialCount] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as total FROM expenses WHERE finance_account_id IS NULL',
        { transaction }
      );

      // Data Migration untuk existing records
      const [expenses] = await queryInterface.sequelize.query(
        'SELECT id, category, payment_method, type_account FROM expenses WHERE finance_account_id IS NULL',
        { transaction }
      );

      for (const expense of expenses) {
        const financeAccountId = PAYMENT_METHOD_MAPPING[expense.payment_method] || 2;
        const financeCategoryId = expense.type_account 
          ? TYPE_ACCOUNT_MAPPING[expense.type_account] || 1
          : 1;

        await queryInterface.sequelize.query(
          `UPDATE expenses 
           SET finance_account_id = ?,
               finance_category_id = ?,
               status = 'completed',
               updatedAt = NOW()
           WHERE id = ?`,
          {
            replacements: [financeAccountId, financeCategoryId, expense.id],
            transaction
          }
        );
      }

      // Validasi hasil migrasi
      const [migratedStats] = await queryInterface.sequelize.query(
        `SELECT 
           finance_category_id,
           finance_account_id,
           payment_method,
           status,
           COUNT(*) as total
         FROM expenses 
         GROUP BY finance_category_id, finance_account_id, payment_method, status`,
        { transaction }
      );
      

      // Validasi sebelum drop kolom
      const [unmappedRecords] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count 
         FROM expenses 
         WHERE finance_account_id IS NULL 
         OR finance_category_id IS NULL`,
        { transaction }
      );

      if (unmappedRecords[0].count > 0) {
        throw new Error(`Found ${unmappedRecords[0].count} unmapped records. Please check the data before dropping columns.`);
      }

      // 4. Drop kolom lama
      await queryInterface.removeColumn('expenses', 'category', { transaction });
      await queryInterface.removeColumn('expenses', 'type_account', { transaction });

      await transaction.commit();
    } catch (error) {
      console.error('Migration failed:', error);
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Restore old columns
      await queryInterface.addColumn('expenses', 'category', {
        type: Sequelize.STRING
      }, { transaction });

      await queryInterface.addColumn('expenses', 'type_account', {
        type: Sequelize.STRING
      }, { transaction });

      // 2. Mapping untuk restore data
      const ACCOUNT_ID_MAPPING = {
        '1': 'bank_transfer',
        '2': 'cash'
      };

      const CATEGORY_ID_MAPPING = {
        '1': 'others',
        '2': 'beban',
        '13': 'modal_bisnis'
      };

      // 3. Restore data
      const [expenses] = await queryInterface.sequelize.query(
        `SELECT id, finance_account_id, finance_category_id 
         FROM expenses`,
        { transaction }
      );

      for (const expense of expenses) {
        let typeAccount;
        if (expense.finance_category_id === 2) {
          typeAccount = 'beban';
        } else if (expense.finance_category_id === 13) {
          typeAccount = 'modal_bisnis';
        } else {
          typeAccount = null;
        }

        await queryInterface.sequelize.query(
          `UPDATE expenses 
           SET category = ?,
               payment_method = ?,
               type_account = ?,
               updatedAt = NOW()
           WHERE id = ?`,
          {
            replacements: [
              CATEGORY_ID_MAPPING[expense.finance_category_id] || 'others',
              ACCOUNT_ID_MAPPING[expense.finance_account_id] || 'cash',
              typeAccount,
              expense.id
            ],
            transaction
          }
        );
      }

      // 4. Remove new columns
      await queryInterface.removeColumn('expenses', 'finance_account_id', { transaction });
      await queryInterface.removeColumn('expenses', 'finance_category_id', { transaction });
      await queryInterface.removeColumn('expenses', 'status', { transaction });
      await queryInterface.removeColumn('expenses', 'approved_by', { transaction });
      await queryInterface.removeColumn('expenses', 'approved_at', { transaction });

      // 5. Restore column definitions
      await queryInterface.changeColumn('expenses', 'name', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('expenses', 'date', {
        type: Sequelize.DATEONLY,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('expenses', 'amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      }, { transaction });

      // Drop ENUM type
       await queryInterface.sequelize.query(
        'ALTER TABLE expenses MODIFY COLUMN payment_method VARCHAR(255);',
        { transaction }
      );

      await transaction.commit();
      console.log('Rollback completed successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      await transaction.rollback();
      throw error;
    }
  }
}; 