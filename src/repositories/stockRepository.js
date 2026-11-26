const { Op, sequelize, Treatment, TreatmentStock, StockMovement, Branch, User } = require('../models');

const MOVEMENT_TYPES = ['in', 'sale', 'adjust', 'transfer_in', 'transfer_out', 'void'];

/**
 * Repository stok barang per outlet.
 *
 * Catatan: `treatment` adalah master barang (Indomie, Popmie, tiket, ...).
 * Angka stok ada di `treatment_stocks` (satu baris per barang per outlet)
 * dan setiap perubahan dicatat di `stock_movements`.
 */
class StockRepository {
    // ── Daftar stok ──────────────────────────────────────────────────────────

    /**
     * Daftar barang + stok pada satu outlet.
     * Treatment tanpa baris `treatment_stocks` dianggap belum di-track.
     */
    static async listStocks({ tenantId, branchId, search = null, status = null, onlyTracked = false }) {
        const like = search ? `%${search}%` : null;

        const [rows] = await sequelize.query(
            `SELECT t.id            AS treatment_id,
                    t.name,
                    t.type_item,
                    t.type_service,
                    t.price,
                    t.requires_tracking,
                    ts.id           AS stock_id,
                    ts.stock,
                    ts.min_stock,
                    ts.is_active    AS stock_is_active,
                    ts.last_restock_at
             FROM treatment t
             LEFT JOIN treatment_stocks ts
                    ON ts.treatment_id = t.id
                   AND ts.branch_id = :branchId
             WHERE t.tenant_id = :tenantId
               AND t.deletedAt IS NULL
               AND (:like IS NULL OR t.name LIKE :like)
             ORDER BY t.name ASC`,
            { replacements: { tenantId, branchId, like } }
        );

        // Terjual hari ini & 7 hari terakhir per barang pada outlet ini
        const [soldRows] = await sequelize.query(
            `SELECT od.treatment_id,
                    SUM(CASE WHEN DATE(o.entry_date) = CURDATE() THEN 1 ELSE 0 END) AS sold_today,
                    SUM(CASE WHEN DATE(o.entry_date) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) THEN 1 ELSE 0 END) AS sold_7d
             FROM order_details od
             JOIN orders o ON o.id = od.order_id
             WHERE o.tenant_id = :tenantId
               AND o.branch_id = :branchId
               AND o.deletedAt IS NULL
               AND od.deletedAt IS NULL
               AND od.treatment_id IS NOT NULL
             GROUP BY od.treatment_id`,
            { replacements: { tenantId, branchId } }
        );

        const soldMap = new Map(
            soldRows.map((r) => [Number(r.treatment_id), {
                sold_today: Number(r.sold_today || 0),
                sold_7d: Number(r.sold_7d || 0),
            }])
        );

        const stocks = rows.map((row) => {
            const isTracked = row.stock_id !== null && row.stock_id !== undefined;
            const stock = isTracked ? Number(row.stock) : null;
            const minStock = isTracked ? Number(row.min_stock) : null;
            const sold = soldMap.get(Number(row.treatment_id)) || { sold_today: 0, sold_7d: 0 };

            return {
                treatment_id: Number(row.treatment_id),
                name: row.name,
                type_item: row.type_item,
                type_service: row.type_service,
                price: Number(row.price),
                requires_tracking: Boolean(row.requires_tracking),
                is_tracked: isTracked,
                is_active: isTracked ? Boolean(row.stock_is_active) : null,
                stock,
                min_stock: minStock,
                stock_status: StockRepository.stockStatus(isTracked, stock, minStock, row.stock_is_active),
                sold_today: sold.sold_today,
                sold_7d: sold.sold_7d,
                last_restock_at: row.last_restock_at,
            };
        });

        let filtered = stocks;
        if (onlyTracked) filtered = filtered.filter((s) => s.is_tracked);
        if (status) filtered = filtered.filter((s) => s.stock_status === status);

        return { stocks: filtered, all: stocks };
    }

    static stockStatus(isTracked, stock, minStock, isActive) {
        if (!isTracked) return 'untracked';
        if (isActive === 0 || isActive === false) return 'inactive';
        if (stock <= 0) return 'out';
        if (minStock !== null && stock <= minStock) return 'low';
        return 'safe';
    }

    static summarizeStocks(stocks) {
        const summary = {
            total_items: stocks.length,
            tracked: 0,
            untracked: 0,
            out: 0,
            low: 0,
            safe: 0,
            inactive: 0,
            total_stock: 0,
        };

        stocks.forEach((s) => {
            if (s.stock_status === 'untracked') summary.untracked += 1;
            else {
                summary.tracked += 1;
                if (summary[s.stock_status] !== undefined) summary[s.stock_status] += 1;
            }
            if (s.stock !== null) summary.total_stock += s.stock;
        });

        return summary;
    }

    // ── Satu baris stok ──────────────────────────────────────────────────────

    static async findStock(treatmentId, branchId, transaction = null) {
        return await TreatmentStock.findOne({
            where: { treatment_id: treatmentId, branch_id: branchId },
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : undefined,
        });
    }

    static async findAnyStock(treatmentId, branchId) {
        return await TreatmentStock.findOne({
            where: { treatment_id: treatmentId, branch_id: branchId },
        });
    }

    static async createStock(data, transaction = null) {
        return await TreatmentStock.create(data, { transaction });
    }

    static async updateStock(instance, data, transaction = null) {
        return await instance.update(data, { transaction });
    }

    /** Pastikan baris stok ada; kalau belum ada, buat dengan stok 0. */
    static async ensureStock({ tenantId, treatmentId, branchId, minStock = 0 }, transaction = null) {
        let row = await StockRepository.findStock(treatmentId, branchId, transaction);
        if (!row) {
            row = await StockRepository.createStock({
                tenant_id: tenantId,
                treatment_id: treatmentId,
                branch_id: branchId,
                stock: 0,
                min_stock: minStock,
                is_active: true,
            }, transaction);
        }
        return row;
    }

    // ── Pergerakan stok ──────────────────────────────────────────────────────

    static async createMovement(data, transaction = null) {
        return await StockMovement.create(data, { transaction });
    }

    static async listMovements({ tenantId, branchId, treatmentId = null, type = null, startDate = null, endDate = null, search = null, limit = 100, offset = 0 }) {
        const where = { tenant_id: tenantId };
        if (branchId) where.branch_id = branchId;
        if (treatmentId) where.treatment_id = treatmentId;
        if (type) where.type = type;
        if (startDate && endDate) {
            where.movement_date = { [Op.between]: [startDate, endDate] };
        } else if (startDate) {
            where.movement_date = { [Op.gte]: startDate };
        } else if (endDate) {
            where.movement_date = { [Op.lte]: endDate };
        }

        const include = [
            {
                model: Treatment,
                as: 'treatment',
                attributes: ['id', 'name', 'type_item'],
                required: true,
                ...(search ? { where: { name: { [Op.like]: `%${search}%` } } } : {}),
            },
            { model: Branch, as: 'branch', attributes: ['id', 'name'], required: false },
            { model: User, as: 'user', attributes: ['id', 'name'], required: false },
        ];

        const { rows, count } = await StockMovement.findAndCountAll({
            where,
            include,
            order: [['id', 'DESC']],
            limit,
            offset,
            distinct: true,
        });

        return { rows, count };
    }

    /** Semua movement penjualan milik satu order (untuk restore saat order dibatalkan). */
    static async findOrderSales(orderId, transaction = null) {
        return await StockMovement.findAll({
            where: { ref_type: 'order', ref_id: orderId, type: 'sale' },
            transaction,
        });
    }

    /** Apakah order ini sudah pernah di-restore stoknya (biar tidak dobel). */
    static async hasOrderVoid(orderId, transaction = null) {
        const count = await StockMovement.count({
            where: { ref_type: 'order', ref_id: orderId, type: 'void' },
            transaction,
        });
        return count > 0;
    }

    static async summarizeMovements({ tenantId, branchId, startDate = null, endDate = null }) {
        const where = { tenant_id: tenantId };
        if (branchId) where.branch_id = branchId;
        // Samakan dengan listMovements: rentang separuh juga harus difilter,
        // supaya kartu ringkasan tidak beda dengan tabel di bawahnya.
        if (startDate && endDate) {
            where.movement_date = { [Op.between]: [startDate, endDate] };
        } else if (startDate) {
            where.movement_date = { [Op.gte]: startDate };
        } else if (endDate) {
            where.movement_date = { [Op.lte]: endDate };
        }

        const rows = await StockMovement.findAll({
            where,
            attributes: [
                'type',
                [sequelize.fn('SUM', sequelize.col('qty')), 'total_qty'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_rows'],
            ],
            group: ['type'],
            raw: true,
        });

        const summary = { in: 0, sale: 0, adjust: 0, transfer_in: 0, transfer_out: 0, void: 0 };
        rows.forEach((r) => {
            const qty = Number(r.total_qty || 0);
            if (summary[r.type] === undefined) summary[r.type] = 0;
            summary[r.type] += qty;
        });

        return summary;
    }

    // ── Helper validasi ──────────────────────────────────────────────────────

    static async findTreatment(treatmentId, tenantId) {
        return await Treatment.findOne({
            where: { id: treatmentId, tenant_id: tenantId },
            attributes: ['id', 'name', 'price', 'type_item', 'requires_tracking'],
        });
    }

    static async findBranch(branchId, tenantId) {
        return await Branch.findOne({
            where: { id: branchId, tenant_id: tenantId },
            attributes: ['id', 'name'],
        });
    }
}

StockRepository.MOVEMENT_TYPES = MOVEMENT_TYPES;

module.exports = StockRepository;
