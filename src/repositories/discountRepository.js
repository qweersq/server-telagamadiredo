const { Discount, Op, sequelize } = require('../models');

class DiscountRepository {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Discount.create(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getAll(search, tenant_id) {
        try {
            const searchFilter = search
                ? {
                [Op.and]: [
                    { tenant_id: tenant_id },
                    {
                        [Op.or]: [
                            { '$name$': { [Op.substring]: search } },
                            { '$type$': { [Op.substring]: search } },
                            { '$discount$': { [Op.substring]: search } },
                        ],
                    }
                ]
                }
                : { tenant_id: tenant_id };

            const result = await Discount.findAll({
                where: searchFilter,
                order: [['id', 'DESC']],
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id) {
        try {
            const result = await Discount.findOne({
                where: {
                    id: id,
                    tenant_id: tenant_id
                }
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Discount.findByPk(id);

            await result.update(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Discount.findByPk(id);

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
};

module.exports = DiscountRepository;