const { Payment } = require('../models');

class PaymentRepository {
    static async create(data, transaction = null) {
        try {
            const result = await Payment.create(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(user_tenant_id = null, user_role = null) {
        try {
            let whereClause = {};

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
            } else {
                whereClause.tenant_id = user_tenant_id;
            }

            const result = await Payment.findAll({
                where: whereClause
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_role = null, transaction = null) {
        try {
            let whereClause = {
                id: id
            };

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
            } else {
                whereClause.tenant_id = user_tenant_id;
            }

            const result = await Payment.findOne({
                where: whereClause,
                transaction
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, transaction) {
        try {
            if (!id) throw new Error('ID Payment tidak boleh kosong');

            const dataPayment = {
                code: data.code,
                status: data.status,
                final_price: data.final_price,
                total_service: data.total_service,
                subtotal: data.subtotal,
                total_discount: data.total_discount,
                paid_amount: data.paid_amount,
                remaining_amount: data.remaining_amount,
                additional_cost: data.additional_cost,
                due_date: data.due_date,
                notes: data.notes,
                discount_id: data.discount_id !== undefined ? data.discount_id : null, // Tambahkan discount_id untuk payment-level discount
                total_price: data.total_price,
                method: data.method,
                date: data.date,
                money: data.money,
                change: data.change,
                evidence_photo: data.evidence_photo,
                total_process_time_cost: data.total_process_time_cost
            }
            
            const result = await Payment.findByPk(id);
            if (!result) throw new Error(`Payment dengan ID ${id} tidak ditemukan`);
            
            await result.update(dataPayment, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, transaction) {
        try {
            const result = await Payment.findByPk(id);

            await result.destroy({ transaction });
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = PaymentRepository;