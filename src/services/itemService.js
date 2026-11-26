const ItemRepository = require('../repositories/itemRepository');

class ItemService {
    static async create(data, user_tenant_id = null) {
        try {
            if (user_tenant_id) {
                data.tenant_id = user_tenant_id;
            }

            const result = await ItemRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkCreate(itemsData, user_tenant_id = null) {
        try {
            const dataWithTenant = itemsData.map(item => ({
                name: item.name || '',
                brand: item.brand || '',
                type: item.type || 'Shoes',
                color: item.color || '',
                material: item.material || '',
                tenant_id: user_tenant_id,
            }));

            const results = await ItemRepository.bulkCreate(dataWithTenant);
            return results;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(search, user_tenant_id = null, page = 1, pageSize = 10) {
        try {
            const result = await ItemRepository.getAll(search, user_tenant_id, page, pageSize);
            if (!result || result.length === 0) throw new Error('No item found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await ItemRepository.getById(id, user_tenant_id);
            if (!result) throw new Error('Item not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(data, user_tenant_id = null) {
        try {
            if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');

            const check = await ItemRepository.getById(data.id, user_tenant_id);
            if (!check) throw new Error('Item not found');

            const result = await ItemRepository.update(data.id, data, user_tenant_id);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, user_tenant_id = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await ItemRepository.getById(id, user_tenant_id);
            if (!check) throw new Error('Item not found');

            await ItemRepository.delete(id, user_tenant_id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async searchItemsWithRelevance(search, user_tenant_id = null) {
        try {
            if (!search) {
                // Jika tidak ada search, return semua item berdasarkan tenant
                return await ItemRepository.getAll(null, user_tenant_id);
            }
            const keywords = search.split(/\s+/).filter(Boolean);
            const items = await ItemRepository.searchByKeywords(keywords, user_tenant_id);
            // Hitung relevansi dan prioritas (name/brand match)
            const result = items
                .map(item => {
                    const itemData = item.toJSON();
                    const name = (itemData.name || '').toLowerCase();
                    const brand = (itemData.brand || '').toLowerCase();
                    const color = (itemData.color || '').toLowerCase();
                    const type = (itemData.type || '').toLowerCase();

                    // Hitung matchCount (jumlah kata yang match di semua kolom)
                    const matchCount = keywords.reduce((acc, keyword) => {
                        const kw = keyword.toLowerCase();
                        return (
                            acc +
                            (name.includes(kw) ? 1 : 0) +
                            (brand.includes(kw) ? 1 : 0) +
                            (color.includes(kw) ? 1 : 0) +
                            (type.includes(kw) ? 1 : 0)
                        );
                    }, 0);

                    // Cek apakah ada keyword yang match di name/brand
                    const isNameOrBrandMatch = keywords.some(
                        kw => name.includes(kw.toLowerCase()) || brand.includes(kw.toLowerCase())
                    );

                    // Prioritas: 1 jika match di name/brand, 0 jika tidak
                    const priority = isNameOrBrandMatch ? 1 : 0;

                    return { ...itemData, _matchCount: matchCount, _priority: priority };
                })
                .filter(item => item._matchCount > 0) // pastikan minimal ada 1 kata match
                // Urutkan: priority dulu, lalu matchCount
                .sort((a, b) => {
                    if (b._priority !== a._priority) return b._priority - a._priority;
                    return b._matchCount - a._matchCount;
                })
                .slice(0, 50); // Batasi maksimal 50 hasil
            
            // Return dengan informasi pagination
            return {
                items: result,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: result.length,
                    hasNextPage: false,
                    limit: 50,
                    message: result.length === 50 ? 'Menampilkan 50 hasil teratas berdasarkan relevansi' : `Menampilkan ${result.length} hasil`
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }   
};

module.exports = ItemService;