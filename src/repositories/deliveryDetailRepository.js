const { DeliveryDetail, sequelize } = require('../models');

class DeliveryDetailRepository {
    static async create(data) {
        try {
            const result = await DeliveryDetail.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAll() {
        try {
            const result = await DeliveryDetail.findAll();

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await DeliveryDetail.findByPk(id);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await DeliveryDetail.findByPk(id);

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
            const result = await DeliveryDetail.findByPk(id);

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
};

module.exports = DeliveryDetailRepository;