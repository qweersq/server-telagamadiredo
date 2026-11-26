const { OrderDetail, ShoePhoto } = require('../models');

class OrderDetailRepository {
    static async create(data, transaction = null) {
        try {
            const result = await OrderDetail.create(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkCreate(data, transaction = null) {
        try {
            const result = await OrderDetail.bulkCreate(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll() {
        try {
            const result = await OrderDetail.findAll();

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByOrderId(id) {
        try {
            const result = await OrderDetail.findAll({
                where: {
                    order_id: id
                }, 
                include: [
                    {
                        model: ShoePhoto,
                        as: 'shoes_photos',
                        attributes: ['id', 'order_detail_id', 'url_photo']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await OrderDetail.findByPk(id);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, transaction = null) {
        try {
            if (!id || id === 0) {
                throw new Error('ID Order Detail tidak valid');
            }

            const result = await OrderDetail.findByPk(id);
            if (!result) {
                throw new Error(`Order Detail dengan ID ${id} tidak ditemukan`);
            }

            await result.update(data, { transaction });
            return result;
        } catch (error) {
            throw new Error(`Gagal mengupdate order detail: ${error.message}`);
        }
    }

    static async delete(id, transaction = null) {
        try {
            const result = await OrderDetail.findByPk(id);

            await result.destroy({ transaction });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkUpdate(details, transaction = null) {
        try {
            const result = await OrderDetail.bulkUpdate(details, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkDelete(ids, transaction = null) {
        try {
            const result = await OrderDetail.destroy({
                where: { id: ids },
            }, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = OrderDetailRepository;