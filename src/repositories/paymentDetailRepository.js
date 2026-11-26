const { PaymentDetail, FinanceTransaction, sequelize } = require('../models');
const FinanceTransactionRepository = require('./financeTransactionRepository');

// Note: This repository now includes updateDate for editing payment detail dates

class PaymentDetailRepository {

    static async create(data, transaction = null) {
        try {
            const result = await PaymentDetail.create(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkCreate(data, transaction = null) {
        try {
            const result = await PaymentDetail.bulkCreate(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await PaymentDetail.findByPk(id);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByPaymentId(paymentId, includeDeleted = false) {
        try {
            // ✅ FIX: Tambahkan option paranoid: false saat includeDeleted = true
            // Ini diperlukan agar saat order di-delete, PaymentDetail yang sudah soft-deleted
            // juga bisa diambil, sehingga FinanceTransaction terkait juga bisa di-soft-delete
            const result = await PaymentDetail.findAll({
                where: { payment_id: paymentId },
                paranoid: !includeDeleted // false = include deleted, true = exclude deleted
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, transaction = null) {
        try {
            const result = await PaymentDetail.update(data, {
                where: { id },
                transaction
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkDelete(ids, transaction = null) {
        try {
            const result = await PaymentDetail.findAll({ where: { id: ids }, transaction });

            await PaymentDetail.destroy({ where: { id: ids }, transaction });

            console.log("result ", result);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Update payment detail date
     * 1. Update finance_transaction.date
     * 2. Update payment_detail.createdAt
     * 3. Set shift_id = null (karena tanggal beda dari shift)
     */
    static async updateDate(id, newDate) {
        const transaction = await sequelize.transaction();
        try {
            // Get payment detail
            const paymentDetail = await PaymentDetail.findByPk(id, { transaction });
            if (!paymentDetail) {
                throw new Error('Payment detail not found');
            }

            // 1. Update finance_transaction.date
            if (paymentDetail.transaction_id) {
                await FinanceTransaction.update(
                    { date: newDate },
                    { where: { id: paymentDetail.transaction_id }, transaction }
                );
            }

            // 2. Update payment_detail.createdAt + 3. Clear shift_id
            await PaymentDetail.update(
                { createdAt: newDate, shift_id: null },
                { where: { id }, transaction }
            );

            await transaction.commit();

            // Return updated payment detail
            return await PaymentDetail.findByPk(id);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

}

module.exports = PaymentDetailRepository;