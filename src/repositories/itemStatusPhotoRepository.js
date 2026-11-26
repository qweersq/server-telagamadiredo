const { ItemStatusPhoto } = require('../models');

class ItemStatusPhotoRepository {
    static async create(data) {
        return await ItemStatusPhoto.create(data);
    }

    static async getAll() {
        return await ItemStatusPhoto.findAll();
    }

    static async getById(id) {
        return await ItemStatusPhoto.findByPk(id);
    }

    static async update(id, data) {
        const itemStatusPhoto = await ItemStatusPhoto.findByPk(id);
        if (!itemStatusPhoto) throw new Error('ItemStatusPhoto not found');
        return await itemStatusPhoto.update(data);
    }

    static async delete(id) {
        const itemStatusPhoto = await ItemStatusPhoto.findByPk(id);
        if (!itemStatusPhoto) throw new Error('ItemStatusPhoto not found');
        return await itemStatusPhoto.destroy();
    }
}

module.exports = ItemStatusPhotoRepository; 