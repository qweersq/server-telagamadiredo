const { OrderDetail, ShoePhoto } = require('../models');

class ShoePhotoRepository {
    static async create(data, transaction) {
        try {
            const result = await ShoePhoto.create(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkCreate(data, transaction = null) {
        try {
            const result = await ShoePhoto.bulkCreate(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll() {
        try {
            const result = await ShoePhoto.findAll();

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAllByOrderDetailId(id) {
        try {
            const result = await ShoePhoto.findAll({
                where: { order_detail_id: id }
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await ShoePhoto.findByPk(id);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, transaction) {
        try {
            const result = await ShoePhoto.findByPk(id);

            await result.update(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, transaction) {
        try {
            const result = await ShoePhoto.findByPk(id);

            await result.destroy({ transaction });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async deletes(ids, transaction) {
        try {
            await ShoePhoto.destroy({
                where: { id: ids },
                transaction,
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async deleteByOrderDetailId(id, transaction) {
        try {
            const result = await ShoePhoto.findAll({
                where: { order_detail_id: id },
            });

            for (const photo of result) {
                await photo.destroy({ transaction });
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAllPhotosByOrderId(orderId) {
        try {
            const result = await ShoePhoto.findAll({
                include: [{
                    model: OrderDetail,
                    as: 'order_detail',
                    where: { order_id: orderId },
                    attributes: []
                }]
            });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkDeleteByOrderDetailIds(orderDetailIds, options = {}) {
        try {
            return await ShoePhoto.destroy({
                where: {
                    order_detail_id: orderDetailIds
                },
                ...options
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkDelete(ids, options = {}) {
        try {
            return await ShoePhoto.destroy({
                where: {
                    id: ids
                },
                ...options
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async deleteByOrderDetailId(orderDetailId, options = {}) {
        try {
            return await ShoePhoto.destroy({
                where: {
                    order_detail_id: orderDetailId
                },
                ...options
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = ShoePhotoRepository;