const ShoePhotoRepository = require('../repositories/shoePhotoRepository');

class ShoePhotoService {
    static async create(data) {
        try {
            const result = await ShoePhotoRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAll() {
        try {
            const result = await ShoePhotoRepository.getAll();
            if (!result || result.length === 0) throw new Error('No shoe photo found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getById(id) {
        try {
            const result = await ShoePhotoRepository.getById(id);
            if (!result) throw new Error('Shoe Photo not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async update(raw) {
        try {
            if (isNaN(raw.id) || raw.id <= 0) throw new Error('Invalid ID');

            const data = Object.fromEntries(
                Object.entries(raw).filter(([_, value]) => value !== undefined && value !== null)
            );

            const check = await ShoePhotoRepository.getById(data.id);
            if (!check) throw new Error('Shoe Photo not found');

            const result = await ShoePhotoRepository.update(data.id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        try {
            const check = await ShoePhotoRepository.getById(id);
            if (!check) throw new Error('Shoe Photo not found');

            await ShoePhotoRepository.delete(id);

            return null;
        } catch (error) {;
            throw new Error(error.message);
        }
    }
};

module.exports = ShoePhotoService;