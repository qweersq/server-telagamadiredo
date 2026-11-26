const KitchenService = require('../services/kitchenService');
const { ResponseHelper } = require('../helpers');
const moment = require('moment');

class KitchenController {
    /**
     * GET /orders/:id/kitchen-tickets
     * Tiket siap cetak untuk satu order, dikelompokkan per dapur produksi.
     */
    static async getByOrder(req, res) {
        try {
            const productionBranchId = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;
            const data = await KitchenService.getTicketsByOrder(
                req.params.id,
                req.user.tenant_id,
                productionBranchId
            );

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * PATCH /kitchen/tickets/:id/status
     * Ubah status satu item dari layar dapur (antrian / on_progress / done).
     */
    static async updateStatus(req, res) {
        try {
            const { status } = req.body || {};
            if (!status) {
                return res.status(400).send(ResponseHelper.errorResponse('Status wajib diisi', 400));
            }

            const data = await KitchenService.updateItemStatus({
                orderDetailId: req.params.id,
                status,
                userId: req.user.id,
                tenantId: req.user.tenant_id,
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    /**
     * GET /kitchen/tickets?branch_id=77&date=YYYY-MM-DD&status=pending
     * Antrian tiket satu dapur. `branch_id` = dapur (production_branch_id).
     */
    static async getByBranch(req, res) {
        try {
            const branchId = req.query.branch_id
                ? parseInt(req.query.branch_id, 10)
                : req.user.branch_id;

            // `date=all` -> tampilkan semua tanggal (agar item yang belum selesai
            // dari hari sebelumnya tidak hilang dari layar dapur).
            const dateParam = req.query.date;
            const date = dateParam === 'all'
                ? null
                : dateParam
                    ? moment(dateParam).format('YYYY-MM-DD')
                    : moment().format('YYYY-MM-DD');

            const data = await KitchenService.getTicketsByBranch({
                branchId,
                date,
                status: req.query.status || null,
                tenantId: req.user.tenant_id,
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = KitchenController;
