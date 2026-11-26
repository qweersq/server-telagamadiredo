const { AppVersion } = require('../models');

class AppVersionRepository {
    static async create(data, transaction = null) {
        try {
            const result = await AppVersion.create(data, { transaction });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(platform = null) {
        try {
            const whereClause = {};
            if (platform) {
                whereClause.platform = platform;
            }
            
            const result = await AppVersion.findAll({
                where: whereClause,
                order: [['created_at', 'DESC']]
            });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await AppVersion.findByPk(id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getLatest(platform) {
        try {
            const result = await AppVersion.findOne({
                where: {
                    platform,
                    is_active: true
                },
                order: [['created_at', 'DESC']]
            });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, transaction = null) {
        try {
            const [updated] = await AppVersion.update(data, {
                where: { id },
                transaction
            });
            
            if (updated === 0) {
                throw new Error('App version not found');
            }
            
            const result = await AppVersion.findByPk(id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, transaction = null) {
        try {
            const result = await AppVersion.destroy({
                where: { id },
                transaction
            });
            
            if (result === 0) {
                throw new Error('App version not found');
            }
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async deactivateByPlatform(platform, excludeId = null, transaction = null) {
        try {
            const { Op } = require('sequelize');
            const whereClause = { platform, is_active: true };
            if (excludeId) {
                whereClause.id = { [Op.ne]: excludeId };
            }
            
            const result = await AppVersion.update(
                { is_active: false },
                { where: whereClause, transaction }
            );
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = AppVersionRepository;

