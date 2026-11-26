const ItemStatusPhotoRepository = require('../repositories/itemStatusPhotoRepository');

class ItemStatusPhotoService {
    static async create(data) {
        return await ItemStatusPhotoRepository.create(data);
    }

    static async getAll() {
        return await ItemStatusPhotoRepository.getAll();
    }

    static async getById(id) {
        return await ItemStatusPhotoRepository.getById(id);
    }

    static async update(id, data) {
        return await ItemStatusPhotoRepository.update(id, data);
    }

    static async delete(id) {
        return await ItemStatusPhotoRepository.delete(id);
    }
}

module.exports = ItemStatusPhotoService; 