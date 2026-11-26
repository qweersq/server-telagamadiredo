const { Item, Op, sequelize }  = require('../models');

class ItemRepository {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Item.create(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async bulkCreate(itemsData) {
        const transaction = await sequelize.transaction();
        try {
            const results = await Item.bulkCreate(itemsData, { transaction });
            await transaction.commit();
            return results;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getAll(search, user_tenant_id = null, page = 1, pageSize = 10) {
        try {
            const whereClause = {};
            
            // Add tenant_id filter for data isolation
            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }
            
            // Calculate pagination
            const offset = (page - 1) * pageSize;
            
            if (search) {
                const keywords = search.split(/\s+/).filter(Boolean);
                // Buat filter OR besar: asal ada satu kata match di salah satu kolom
                const orFilters = keywords.map(keyword => ({
                    [Op.or]: [
                        { name: { [Op.substring]: keyword } },
                        { brand: { [Op.substring]: keyword } },
                        { color: { [Op.substring]: keyword } },
                        { type: { [Op.substring]: keyword } },
                    ]
                }));
                
                // Combine tenant filter with search filter
                const combinedWhere = {
                    [Op.and]: [
                        whereClause,
                        { [Op.or]: orFilters }
                    ]
                };
                
                // Get total count for pagination
                const totalCount = await Item.count({
                    where: combinedWhere
                });
                
                // Get paginated results
                const items = await Item.findAll({
                    where: combinedWhere,
                    order: [['id', 'DESC']],
                    limit: pageSize,
                    offset: offset
                });
                
                // Hitung relevansi (berapa banyak kata yang match di setiap row)
                const resultWithRelevance = items
                    .map(item => {
                        const itemData = item.toJSON();
                        const text = [itemData.name, itemData.brand, itemData.color, itemData.type].join(' ').toLowerCase();
                        const matchCount = keywords.reduce((acc, keyword) => text.includes(keyword.toLowerCase()) ? acc + 1 : acc, 0);
                        return { ...itemData, _matchCount: matchCount };
                    })
                    .filter(item => item._matchCount > 0) // pastikan minimal ada 1 kata match
                    .sort((a, b) => b._matchCount - a._matchCount); // urutkan relevansi

                // Calculate pagination info
                const totalPages = Math.ceil(totalCount / pageSize);
                
                return {
                    items: resultWithRelevance,
                    pagination: {
                        currentPage: page,
                        totalPages: totalPages,
                        totalItems: totalCount,
                        itemsPerPage: pageSize,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1
                    }
                };
            } else {
                // Get total count for pagination
                const totalCount = await Item.count({
                    where: whereClause
                });
                
                // Get paginated results
                const items = await Item.findAll({
                    where: whereClause,
                    order: [['id', 'DESC']],
                    limit: pageSize,
                    offset: offset
                });
                
                // Calculate pagination info
                const totalPages = Math.ceil(totalCount / pageSize);
                
                return {
                    items: items,
                    pagination: {
                        currentPage: page,
                        totalPages: totalPages,
                        totalItems: totalCount,
                        itemsPerPage: pageSize,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1
                    }
                };
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null) {
        try {
            const whereClause = { id };
            
            // Add tenant_id filter for data isolation
            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }
            
            const result = await Item.findOne({ where: whereClause });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, user_tenant_id = null) {
        const transaction = await sequelize.transaction();
        try {
            const whereClause = { id };
            
            // Add tenant_id filter for data isolation
            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }
            
            const result = await Item.findOne({ where: whereClause });
            if (!result) throw new Error('Item not found');

            await result.update(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id, user_tenant_id = null) {
        const transaction = await sequelize.transaction();
        try {
            const whereClause = { id };
            
            // Add tenant_id filter for data isolation
            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }
            
            const result = await Item.findOne({ where: whereClause });
            if (!result) throw new Error('Item not found');

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async searchByKeywords(keywords, user_tenant_id = null) {
        const orFilters = keywords.map(keyword => ({
            [Op.or]: [
                { name: { [Op.substring]: keyword } },
                { brand: { [Op.substring]: keyword } },
                { color: { [Op.substring]: keyword } },
                { type: { [Op.substring]: keyword } },
            ]
        }));
        
        const whereClause = { [Op.or]: orFilters };
        
        // Add tenant_id filter for data isolation
        if (user_tenant_id) {
            whereClause.tenant_id = user_tenant_id;
        }
        
        return await Item.findAll({
            where: whereClause,
            order: [['id', 'DESC']],
        });
    }
};

module.exports = ItemRepository;