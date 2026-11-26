const { Item, Treatment, OrderDetail, Op, sequelize } = require('../models');

class AiDetectionRepository {
    static async getStoreContext(tenantId) {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Top items in last 7 days
            const topItems = await OrderDetail.findAll({
                attributes: [
                    [sequelize.col('item.id'), 'id'],
                    [sequelize.col('item.name'), 'name'],
                    [sequelize.col('item.brand'), 'brand'],
                    [sequelize.fn('COUNT', sequelize.col('order_details.id')), 'total']
                ],
                include: [{
                    model: Item,
                    as: 'item',
                    attributes: [],
                    where: { tenant_id: tenantId }
                }],
                where: {
                    createdAt: { [Op.gte]: sevenDaysAgo },
                    item_id: { [Op.ne]: null }
                },
                group: ['item.id', 'item.name', 'item.brand'],
                order: [[sequelize.fn('COUNT', sequelize.col('order_details.id')), 'DESC']],
                limit: 5,
                raw: true
            });

            // Top brands in last 7 days
            const topBrands = await OrderDetail.findAll({
                attributes: [
                    [sequelize.col('item.brand'), 'brand'],
                    [sequelize.fn('COUNT', sequelize.col('order_details.id')), 'total']
                ],
                include: [{
                    model: Item,
                    as: 'item',
                    attributes: [],
                    where: {
                        tenant_id: tenantId,
                        brand: { [Op.ne]: null }
                    }
                }],
                where: {
                    createdAt: { [Op.gte]: sevenDaysAgo },
                    item_id: { [Op.ne]: null }
                },
                group: [sequelize.col('item.brand')],
                order: [[sequelize.fn('COUNT', sequelize.col('order_details.id')), 'DESC']],
                limit: 3,
                raw: true
            });

            // Top treatments in last 7 days
            const topTreatments = await OrderDetail.findAll({
                attributes: [
                    [sequelize.col('treatment.id'), 'id'],
                    [sequelize.col('treatment.name'), 'name'],
                    [sequelize.fn('COUNT', sequelize.col('order_details.id')), 'total']
                ],
                include: [{
                    model: Treatment,
                    as: 'treatment',
                    attributes: [],
                    where: { tenant_id: tenantId }
                }],
                where: {
                    createdAt: { [Op.gte]: sevenDaysAgo },
                    treatment_id: { [Op.ne]: null }
                },
                group: ['treatment.id', 'treatment.name'],
                order: [[sequelize.fn('COUNT', sequelize.col('order_details.id')), 'DESC']],
                limit: 3,
                raw: true
            });

            return {
                top_items: topItems.map(i => i.name),
                top_brands: topBrands.map(b => b.brand),
                top_treatments: topTreatments.map(t => t.name)
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async searchItems(tenantId, name, brand) {
        try {
            const whereClause = { tenant_id: tenantId };
            const conditions = [];

            if (name) {
                conditions.push({ name: { [Op.like]: `%${name}%` } });
            }
            if (brand) {
                conditions.push({ brand: { [Op.like]: `%${brand}%` } });
            }

            if (conditions.length > 0) {
                whereClause[Op.or] = conditions;
            }

            return await Item.findAll({
                where: whereClause,
                limit: 5,
                order: [['name', 'ASC']]
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async createItem(data) {
        try {
            return await Item.create(data);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getTreatmentsByIds(ids, tenantId) {
        try {
            return await Treatment.findAll({
                where: {
                    id: { [Op.in]: ids },
                    tenant_id: tenantId,
                    is_active: true
                }
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = AiDetectionRepository;
