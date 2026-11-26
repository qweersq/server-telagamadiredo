const InvoiceRepository = require('../repositories/invoiceRepository');
// const { nanoid } = require('nanoid');
const { InvoiceToken, Order, Customer, Payment } = require('../models');
const { Op } = require('sequelize');

class InvoiceService {
    static async getInvoiceByToken(token) {
        return await InvoiceRepository.findByToken(token);
    }

    static async logInvoiceAccess(data) {
        return await InvoiceRepository.createAccessLog(data);
    }

    static async getInvoiceAccessLogs(token) {
        return await InvoiceRepository.getAccessLogsByToken(token);
    }

    // Generate & save invoice token untuk order baru
    static async generateAndSaveInvoiceToken(orderId) {
        // Generate token pendek pakai crypto
        const token = require('crypto').randomBytes(4).toString('hex'); // 8 karakter
        await InvoiceToken.create({
            order_id: orderId,
            token,
            status: 'active',
        });
        return token;
    }

    static async updateInvoiceTokenStatus(token, status) {
        const invoiceToken = await InvoiceToken.findOne({ where: { token } });
        if (!invoiceToken) throw new Error('Invoice token not found');
        invoiceToken.status = status;
        await invoiceToken.save();
        return invoiceToken;
    }

    static async findTokenByOrderId(orderId) {
        return await InvoiceToken.findOne({ where: { order_id: orderId } });
    }

    static async updateInvoiceTokenToShort(orderId) {
        const invoiceToken = await InvoiceToken.findOne({ where: { order_id: orderId } });
        if (!invoiceToken) return null;
        // Jika token sudah pendek (<12), skip update
        if (invoiceToken.token && invoiceToken.token.length <= 12) return invoiceToken;
        const newToken = require('crypto').randomBytes(4).toString('hex');
        invoiceToken.token = newToken;
        await invoiceToken.save();
        return invoiceToken;
    }

    static async getOrdersByDateRange(startDate, endDate) {
        return await Order.findAll({
            where: {
                entry_date: {
                    [Op.between]: [startDate, endDate],
                },
            },
        });
    }

    static async getOrderById(orderId) {
        // Ambil order, join customer dan payment + payment_details
        const order = await Order.findOne({
            where: { id: orderId },
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['name', 'phone']
                },
                {
                    model: Payment,
                    as: 'payment',
                    attributes: ['final_price', 'code'],
                    include: [
                        {
                            model: require('../models').PaymentDetail,
                            as: 'payment_details',
                            attributes: ['amount', 'method']
                        }
                    ]
                }
            ]
        });
        if (!order) return null;

        const totalAmount = Number(order.payment?.final_price || 0);
        const totalPaid = Array.isArray(order.payment?.payment_details)
            ? order.payment.payment_details.reduce((sum, pd) => sum + Number(pd.amount || 0), 0)
            : 0;
        const remainingAmount = Math.max(totalAmount - totalPaid, 0);
        const paymentStatus = totalPaid <= 0
            ? 'unpaid'
            : (totalPaid < totalAmount ? 'partial' : 'paid');

        // Compose data untuk template WA
        return {
            customer_name: order.customer?.name || '',
            customer_phone: order.customer?.phone || '',
            order_number: order.id,
            payment_final_price: totalAmount,
            payment_code: order.payment?.code || '',
            total_amount: totalAmount,
            total_paid: totalPaid,
            remaining_amount: remainingAmount,
            payment_status: paymentStatus,
        };
    }
}

module.exports = InvoiceService; 