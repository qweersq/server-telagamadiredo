const DiscountRepository = require('../repositories/discountRepository');
const { OrderDetail } = require('../models');
const { Op } = require('sequelize');

class DiscountService {
    static async create(data) {
        try {
            const result = await DiscountRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(search, tenant_id) {
        try {
            // Ambil semua discount berdasarkan tenant_id
            const discounts = await DiscountRepository.getAll(search, tenant_id);
            
            // Return empty array jika tidak ada discount (bukan throw error)
            if (!discounts || discounts.length === 0) {
                return [];
            }

            // Ambil semua order detail yang punya discount_id
            const orderDetails = await OrderDetail.findAll({
                attributes: ['discount_id'],
                where: { discount_id: { [Op.ne]: null } },
                raw: true
            });

            // Hitung jumlah pemakaian tiap discount_id
            const usageCount = {};
            orderDetails.forEach(od => {
                if (od.discount_id) {
                    usageCount[od.discount_id] = (usageCount[od.discount_id] || 0) + 1;
                }
            });

            // Urutkan discounts berdasarkan usageCount
            const sortedDiscounts = discounts
                .map(d => ({ ...d.toJSON(), usage_count: usageCount[d.id] || 0 }))
                .sort((a, b) => b.usage_count - a.usage_count);

            return sortedDiscounts;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await DiscountRepository.getById(id, tenant_id);
            if (!result) throw new Error('Discount not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(data) {
        try {
            if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');

            const check = await DiscountRepository.getById(data.id, data.tenant_id);
            if (!check) throw new Error('Discount not found');

            const result = await DiscountRepository.update(data.id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await DiscountRepository.getById(id, tenant_id);
            if (!check) throw new Error('Discount not found');

            await DiscountRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async toggleStatus(id, tenant_id) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const discount = await DiscountRepository.getById(id, tenant_id);
            if (!discount) throw new Error('Discount not found');

            const newStatus = !discount.is_active;
            const result = await DiscountRepository.update(id, { is_active: newStatus });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = DiscountService;