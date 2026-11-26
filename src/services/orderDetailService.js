const OrderDetailRepository = require('../repositories/orderDetailRepository');
const OrderDetailStatusLogRepository = require('../repositories/orderDetailStatusLogRepository');
const { OrderDetail, OrderDetailStatusLog, ItemStatusPhoto, sequelize } = require('../models');

const moment = require('moment');

class OrderDetailService {
    static async create(data) {
        try {
            if (data.due_date) {
                const formattedDate = moment(data.due_date, moment.ISO_8601, true);
                if (!formattedDate.isValid()) throw new Error('Invalid due_date format');
                data.due_date = formattedDate.format('YYYY-MM-DD');
            }

            const result = await OrderDetailRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll() {
        try {
            const result = await OrderDetailRepository.getAll();
            if (!result || result.length === 0) throw new Error('No order detail found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await OrderDetailRepository.getById(id);
            if (!result) throw new Error('Order detail not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(raw) {
        try {
            const data = Object.fromEntries(
                Object.entries(raw).filter(([_, value]) => value !== undefined && value !== null)
            );
            console.log(raw)
            if (data.due_date) {
                const formattedDate = moment(data.due_date, moment.ISO_8601, true);
                if (!formattedDate.isValid()) throw new Error('Invalid due_date format');
                data.due_date = formattedDate.format('YYYY-MM-DD');
            }

            const check = await OrderDetailRepository.getById(data.id);
            if (!check) throw new Error('Order detail not found');

            const result = await OrderDetailRepository.update(data.id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        try {
            const check = await OrderDetailRepository.getById(id);
            if (!check) throw new Error('Order detail not found');

            await OrderDetailRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async processStatusChange({ orderDetailId, old_status, new_status, updated_by, photoUrls }) {
        const t = await sequelize.transaction();
        try {
            // Step 1: Update status order detail
            const orderDetail = await OrderDetail.findByPk(orderDetailId, { transaction: t });
            if (!orderDetail) throw new Error('OrderDetail not found');
            await orderDetail.update({ status: new_status }, { transaction: t });

            // Step 2: Simpan log perubahan status
            const statusLog = await OrderDetailStatusLogRepository.create({
                order_detail_id: orderDetailId,
                old_status,
                new_status,
                updated_by,
                created_at: new Date(),
            }, t);

            // Step 3: Simpan foto ke ItemStatusPhoto
            const photoRecords = [];
            if (Array.isArray(photoUrls)) {
                for (const url of photoUrls) {
                    const photo = await ItemStatusPhoto.create({
                        order_detail_status_log_id: statusLog.id,
                        photo_url: url,
                    }, { transaction: t });
                    photoRecords.push(photo);
                }
            }

            await t.commit();
            return { orderDetail, statusLog, photos: photoRecords };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    static async cancelOnProgressStatus(orderDetailId) {
        const t = await sequelize.transaction();
        try {
            // Step 1: Cek order detail
            const orderDetail = await OrderDetail.findByPk(orderDetailId, { transaction: t });
            if (!orderDetail) throw new Error('OrderDetail not found');
            
            // Step 2: Cek status harus on_progress
            if (orderDetail.status !== 'on_progress') {
                throw new Error('Can only cancel treatment with status on_progress');
            }

            // Step 3: Cari status log terakhir dengan new_status = 'on_progress'
            const statusLog = await OrderDetailStatusLog.findOne({
                where: {
                    order_detail_id: orderDetailId,
                    new_status: 'on_progress'
                },
                order: [['created_at', 'DESC']],
                transaction: t
            });

            if (!statusLog) throw new Error('Status log not found for on_progress');

            // Step 4: Hapus foto dari item_status_photos
            await ItemStatusPhoto.destroy({
                where: {
                    order_detail_status_log_id: statusLog.id
                },
                transaction: t
            });

            // Step 5: Hapus status log
            await OrderDetailStatusLog.destroy({
                where: {
                    id: statusLog.id
                },
                transaction: t
            });

            // Step 6: Update status order detail jadi antrian
            await orderDetail.update({ status: 'antrian' }, { transaction: t });

            await t.commit();
            return { message: 'Treatment canceled successfully', orderDetail };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    static async getPhotoHistory(orderDetailId) {
        try {
            // Get order detail with shoes_photos and employee
            const orderDetail = await OrderDetail.findByPk(orderDetailId, {
                attributes: ['id', 'createdAt', 'employee_id'],
                include: [
                    {
                        model: require('../models').ShoePhoto,
                        as: 'shoes_photos',
                        attributes: ['id', 'url_photo', 'createdAt'],
                        where: { deletedAt: null },
                        required: false
                    },
                    {
                        model: require('../models').User,
                        as: 'employee',
                        attributes: ['id', 'name'],
                        required: false
                    }
                ]
            });

            if (!orderDetail) {
                throw new Error('Order detail not found');
            }

            // Get status logs with photos
            const statusLogsQuery = `
                SELECT 
                    odsl.id, 
                    odsl.old_status, 
                    odsl.new_status, 
                    odsl.updated_by, 
                    odsl.created_at,
                    u.name as updated_by_name
                FROM order_detail_status_logs odsl
                LEFT JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.order_detail_id = ?
                ORDER BY odsl.created_at ASC
            `;

            const statusLogs = await sequelize.query(statusLogsQuery, {
                replacements: [orderDetailId],
                type: sequelize.QueryTypes.SELECT
            });

            // Get photos for each status log
            const statusLogIds = statusLogs.map(log => log.id);
            let statusLogsWithPhotos = statusLogs.map(log => ({
                ...log,
                photos: []
            }));

            if (statusLogIds.length > 0) {
                const photosQuery = `
                    SELECT 
                        order_detail_status_log_id,
                        id,
                        photo_url,
                        createdAt
                    FROM item_status_photos
                    WHERE order_detail_status_log_id IN (${statusLogIds.map(() => '?').join(',')})
                    ORDER BY createdAt ASC
                `;

                const photos = await sequelize.query(photosQuery, {
                    replacements: statusLogIds,
                    type: sequelize.QueryTypes.SELECT
                });

                // Group photos by status log id
                const photosMap = {};
                photos.forEach(photo => {
                    if (!photosMap[photo.order_detail_status_log_id]) {
                        photosMap[photo.order_detail_status_log_id] = [];
                    }
                    photosMap[photo.order_detail_status_log_id].push({
                        id: photo.id,
                        url_photo: photo.photo_url,
                        createdAt: photo.createdAt
                    });
                });

                // Attach photos to status logs
                statusLogsWithPhotos = statusLogsWithPhotos.map(log => ({
                    ...log,
                    photos: photosMap[log.id] || []
                }));
            }

            return {
                shoes_photos: orderDetail.shoes_photos || [],
                status_logs: statusLogsWithPhotos,
                order_detail_id: orderDetail.id,
                created_at: orderDetail.createdAt,
                employee_name: orderDetail.employee?.name || 'Unknown'
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = OrderDetailService;