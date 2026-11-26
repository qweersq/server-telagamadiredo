const StockService = require('../services/stockService');
const { ResponseHelper } = require('../helpers');

const BAD_REQUEST_HINTS = [
    'wajib',
    'tidak valid',
    'harus berupa',
    'minimal',
    'tidak ditemukan',
    'tidak boleh sama',
    'belum di-track',
    'sudah di-track',
    'tidak cukup',
    'tidak ada perubahan',
];

class StockController {
    static statusFor(error) {
        const message = error?.message || '';
        return BAD_REQUEST_HINTS.some((hint) => message.includes(hint)) ? 400 : 500;
    }

    /** GET /stocks — daftar barang + sisa stok pada satu outlet */
    static async getAll(req, res) {
        try {
            const data = await StockService.listStocks(req.query, req.user);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            const status = StockController.statusFor(error);
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** GET /stocks/movements — riwayat keluar-masuk stok */
    static async getMovements(req, res) {
        try {
            const data = await StockService.listMovements(req.query, req.user);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            const status = StockController.statusFor(error);
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** POST /stocks — mulai tracking stok sebuah barang di satu outlet */
    static async startTracking(req, res) {
        try {
            const data = await StockService.startTracking(req.body, req.user);
            return res.status(201).send(ResponseHelper.successResponse(data, 'Stok barang mulai di-track'));
        } catch (error) {
            const status = StockController.statusFor(error);
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** PATCH /stocks/:treatment_id — ubah min stok / aktifkan-nonaktifkan tracking */
    static async updateSettings(req, res) {
        try {
            const data = await StockService.updateSettings(parseInt(req.params.treatment_id, 10), req.body, req.user);
            return res.status(200).send(ResponseHelper.successResponse(data, 'Pengaturan stok diperbarui'));
        } catch (error) {
            const status = StockController.statusFor(error);
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** POST /stocks/restock — tambah stok masuk */
    static async restock(req, res) {
        try {
            const data = await StockService.restock(req.body, req.user);
            const total = data.reduce((sum, item) => sum + item.qty, 0);
            return res.status(200).send(ResponseHelper.successResponse(data, `${total} stok berhasil ditambahkan`));
        } catch (error) {
            const status = StockController.statusFor(error);
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** POST /stocks/adjust — koreksi stok fisik (stock opname) */
    static async adjust(req, res) {
        try {
            const data = await StockService.adjust(req.body, req.user);
            const message = data.qty === 0
                ? 'Stok tidak berubah'
                : `Stok dikoreksi ${data.qty > 0 ? '+' : ''}${data.qty}`;
            return res.status(200).send(ResponseHelper.successResponse(data, message));
        } catch (error) {
            const status = StockController.statusFor(error);
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** POST /stocks/transfer — pindah stok antar outlet */
    static async transfer(req, res) {
        try {
            const data = await StockService.transfer(req.body, req.user);
            return res.status(200).send(ResponseHelper.successResponse(
                data,
                `${data.qty} ${data.treatment_name} dipindah ke ${data.to.branch_name}`
            ));
        } catch (error) {
            const status = StockController.statusFor(error);
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }
}

module.exports = StockController;
