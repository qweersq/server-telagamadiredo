const { Customer, Delivery, DeliveryDetail, Item, Op, Order, OrderDetail, Payment, ShoePhoto, Treatment, User, sequelize } = require('../models');

class DeliveryRepository {
    static async create(raw, delivery_details) {
        const transaction = await sequelize.transaction();
        try {
            const newDelivery = await Delivery.create(raw, { transaction });
            const deliveryId = newDelivery.id;
        
            if (delivery_details && delivery_details.length > 0) {
                await Promise.all(
                    delivery_details.map(async detail => {
                        const newDetail = await DeliveryDetail.create({
                        ...detail,
                        delivery_id: deliveryId,
                        }, { transaction });
                        return newDetail;
                    })
                );
            }

            await transaction.commit();
        
            const data = await Delivery.findByPk(deliveryId, {
                include: [
                    {
                        model: DeliveryDetail,
                        as: 'delivery_details',
                    },
                ],
            });

            return data;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async createOdoData(data) {
        return await Delivery.create(data);
    }

    static async getAll({ page, pageSize, startDate, endDate, search, month, year, user_id }) {
        try {
            // Date filter - prioritize month/year over startDate/endDate
            let dateFilter = {};
            if (month && year) {
                // Convert to integers and use month and year filter
                const monthInt = parseInt(month, 10);
                const yearInt = parseInt(year, 10);
                
                // Create dates in UTC to avoid timezone issues
                const startOfMonth = new Date(Date.UTC(yearInt, monthInt - 1, 1));
                const endOfMonth = new Date(Date.UTC(yearInt, monthInt, 0, 23, 59, 59, 999));
                
                console.log('DeliveryRepository.getAll - Month filter dates:', {
                    month: monthInt,
                    year: yearInt,
                    startOfMonth: startOfMonth.toISOString(),
                    endOfMonth: endOfMonth.toISOString()
                });
                
                dateFilter = { date: { [Op.between]: [startOfMonth, endOfMonth] } };
            } else if (startDate && endDate) {
                // Use startDate and endDate filter
                dateFilter = { date: { [Op.between]: [startDate, endDate] } };
            }
            
            // User filter
            const userFilter = user_id ? { users_id: user_id } : {};
            
            const searchFilter = search
                ? {
                [Op.or]: [
                    { '$user.name$': { [Op.substring]: search } },
        
                ],
                }
                : {};
        
            const whereFilter = { ...dateFilter, ...userFilter, ...searchFilter };
            
            // Debug logging
            console.log('DeliveryRepository.getAll - Parameters:', { month, year, user_id, startDate, endDate });
            console.log('DeliveryRepository.getAll - Date filter:', dateFilter);
            console.log('DeliveryRepository.getAll - User filter:', userFilter);
            console.log('DeliveryRepository.getAll - Final where filter:', whereFilter);
        
            const offset = (page - 1) * pageSize;
            const pageSizeInt = parseInt(pageSize, 10);
        
            const deliveries = await Delivery.findAll({
                include: [
                {
                    model: User,
                    as: 'user',
                    attributes: {
                    exclude: ['password'],
                    },
                    required: true,
                },
                {
                    model: DeliveryDetail,
                    as: 'delivery_details',
                    required: false,
                    include: [
                    {
                        model: Order,
                        as: 'order',
                        include: [
                        {
                            model: Customer,
                            as: 'customer',
                        },
                        {
                            model: Payment,
                            as: 'payment',
                        },
                        {
                            model: OrderDetail,
                            as: 'order_details',
                            include: [
                            {
                                model: Treatment,
                                as: 'treatment',
                            },
                            {
                                model: Item,
                                as: 'item',
                            },
                            {
                                model: ShoePhoto,
                                as: 'shoes_photos',
                            },
                            ],
                        },
                        ],
                    },
                    ],
                },
                ],
                where: whereFilter,
                order: [['id', 'DESC']],
                limit: pageSizeInt,
                offset: offset,
            });
            
            // Debug logging for results
            console.log('DeliveryRepository.getAll - Found deliveries:', deliveries.length);
            if (deliveries.length > 0) {
                console.log('DeliveryRepository.getAll - Sample delivery dates:', 
                    deliveries.slice(0, 3).map(d => ({ id: d.id, date: d.date }))
                );
            }
        
            const totalItems = await Delivery.count({
                include: [
                {
                    model: User,
                    as: 'user',
                    attributes: {
                    exclude: ['password'],
                    },
                    required: true,
                },
                {
                    model: DeliveryDetail,
                    as: 'delivery_details',
                    required: false,
                    include: [
                    {
                        model: Order,
                        as: 'order',
                        include: [
                        {
                            model: Customer,
                            as: 'customer',
                        },
                        {
                            model: Payment,
                            as: 'payment',
                        },
                        {
                            model: OrderDetail,
                            as: 'order_details',
                            include: [
                            {
                                model: Treatment,
                                as: 'treatment',
                            },
                            {
                                model: Item,
                                as: 'item',
                            },
                            {
                                model: ShoePhoto,
                                as: 'shoes_photos',
                            },
                            ],
                        },
                        ],
                    },
                    ],
                },
                ],
                where: whereFilter,
            });

            const statistics = {
                total_delivery: deliveries.length,
                total_distance: 0,
                total_cost: 0,
                total_delivery_details: 0,
            };
            
            deliveries.forEach((delivery) => {
                statistics.total_distance += parseFloat(delivery.total_distance);
                statistics.total_cost += parseFloat(delivery.total_cost);
                statistics.total_delivery_details += delivery.delivery_details.length;
            });

            const data = {
                statistics,
                deliveries,
                pagination: {
                    currentPage: parseInt(page, 10),
                    pageSize: pageSizeInt,
                    totalItems,
                    totalPages: Math.ceil(totalItems / pageSizeInt),
                },
            };

            return data;
        } catch (error ){
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await Delivery.findByPk(id);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(raw, delivery_details) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Delivery.findByPk(raw.id);

            await result.update(raw, { transaction });

            const existingDeliveryDetails = await DeliveryDetail.findAll({
                where: { delivery_id: raw.id },
            });

            const deletedDetails = existingDeliveryDetails.filter(
                dbDetail => !delivery_details.some(payloadDetail => payloadDetail.id === dbDetail.id)
            );

            await Promise.all(
                deletedDetails.map(async detail => {
                    await DeliveryDetail.destroy({
                        where: { id: detail.id },
                        transaction
                    });
                })
            );

            if (delivery_details && delivery_details.length > 0) {
                await Promise.all(
                    delivery_details.map(async detail => {
                    if (detail.id) {
                        await DeliveryDetail.update(detail, {
                            where: { id: detail.id },
                            transaction
                        });
                        return detail;
                    } else {
                        const newDetail = await DeliveryDetail.create({
                            ...detail,
                        }, { transaction });
                        return newDetail;
                    }
                    })
                );
            }

            await transaction.commit();

            const data = await Delivery.findByPk(raw.id, {
                include: [
                    {
                        model: DeliveryDetail,
                        as: 'delivery_details',
                    },
                ],
            });

            return data;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id){
        const transaction = await sequelize.transaction();
        try {
            const result = await Delivery.findByPk(id);

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
};

module.exports = DeliveryRepository;