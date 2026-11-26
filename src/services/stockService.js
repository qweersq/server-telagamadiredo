const StockRepository = require('../repositories/stockRepository');
const { sequelize } = require('../models');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

class StockService {
    /** Tanggal lokal (bukan UTC) supaya tidak bergeser 7 jam. */
    static today() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    static resolveDate(value, fallback = null) {
        if (value === undefined || value === null || value === '') return fallback;
        if (!DATE_REGEX.test(value)) throw new Error('Format tanggal harus YYYY-MM-DD');
        return value;
    }

    static toInt(value, field, { min = null, required = true } = {}) {
        if (value === undefined || value === null || value === '') {
            if (required) throw new Error(`${field} wajib diisi`);
            return null;
        }
        const parsed = parseInt(value, 10);
        if (Number.isNaN(parsed)) throw new Error(`${field} harus berupa angka`);
        if (min !== null && parsed < min) throw new Error(`${field} minimal ${min}`);
        return parsed;
    }

    /** Outlet aktif: dari query, kalau kosong pakai branch user. */
    static resolveBranchId(value, user, { required = true } = {}) {
        const raw = value ?? user?.branch_id;
        if (raw === undefined || raw === null || raw === '') {
            if (required) throw new Error('branch_id wajib diisi (outlet aktif tidak terdeteksi)');
            return null;
        }
        const parsed = parseInt(raw, 10);
        if (Number.isNaN(parsed) || parsed <= 0) throw new Error('branch_id tidak valid');
        return parsed;
    }

    static resolveTenantId(user) {
        if (!user?.tenant_id) throw new Error('User tidak terhubung ke tenant');
        return user.tenant_id;
    }

    // ── Baca ─────────────────────────────────────────────────────────────────

    /** GET /stocks */
    static async listStocks(query, user) {
        const tenantId = StockService.resolveTenantId(user);
        const branchId = StockService.resolveBranchId(query.branch_id, user);
        const status = ['out', 'low', 'safe', 'untracked', 'inactive'].includes(query.status)
            ? query.status
            : null;

        const { stocks, all } = await StockRepository.listStocks({
            tenantId,
            branchId,
            search: query.search ? String(query.search).trim() : null,
            status,
            onlyTracked: query.only_tracked === 'true' || query.only_tracked === '1',
        });

        return {
            branch_id: branchId,
            summary: StockRepository.summarizeStocks(all),
            stocks,
        };
    }

    /** GET /stocks/movements */
    static async listMovements(query, user) {
        const tenantId = StockService.resolveTenantId(user);
        const branchId = StockService.resolveBranchId(query.branch_id, user, { required: false });

        const startDate = StockService.resolveDate(query.start_date, null);
        const endDate = StockService.resolveDate(query.end_date, null);

        const page = Math.max(parseInt(query.page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(query.page_size, 10) || 30, 1), 200);

        const type = StockRepository.MOVEMENT_TYPES.includes(query.type) ? query.type : null;

        const { rows, count } = await StockRepository.listMovements({
            tenantId,
            branchId,
            treatmentId: query.treatment_id ? parseInt(query.treatment_id, 10) : null,
            type,
            startDate,
            endDate,
            search: query.search ? String(query.search).trim() : null,
            limit: pageSize,
            offset: (page - 1) * pageSize,
        });

        const summary = await StockRepository.summarizeMovements({ tenantId, branchId, startDate, endDate });

        return {
            branch_id: branchId,
            summary,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / pageSize) || 1,
                currentPage: page,
                pageSize,
            },
            movements: rows.map((row) => ({
                id: row.id,
                treatment_id: row.treatment_id,
                treatment_name: row.treatment?.name || null,
                branch_id: row.branch_id,
                branch_name: row.branch?.name || null,
                type: row.type,
                qty: row.qty,
                stock_before: row.stock_before,
                stock_after: row.stock_after,
                ref_type: row.ref_type,
                ref_id: row.ref_id,
                note: row.note,
                user_id: row.user_id,
                user_name: row.user?.name || null,
                movement_date: row.movement_date,
                created_at: row.createdAt,
            })),
        };
    }

    // ── Mulai / berhenti tracking ────────────────────────────────────────────

    /** POST /stocks — mulai track stok sebuah barang di satu outlet. */
    static async startTracking(body, user) {
        const tenantId = StockService.resolveTenantId(user);
        const branchId = StockService.resolveBranchId(body.branch_id, user);
        const treatmentId = StockService.toInt(body.treatment_id, 'treatment_id', { min: 1 });

        const treatment = await StockRepository.findTreatment(treatmentId, tenantId);
        if (!treatment) throw new Error('Barang/layanan tidak ditemukan');

        const existing = await StockRepository.findAnyStock(treatmentId, branchId);
        if (existing) throw new Error('Stok barang ini sudah di-track pada outlet tersebut');

        const stock = StockService.toInt(body.stock, 'stock', { min: 0, required: false }) || 0;
        const minStock = StockService.toInt(body.min_stock, 'min_stock', { min: 0, required: false }) || 0;

        const transaction = await sequelize.transaction();
        try {
            const row = await StockRepository.createStock({
                tenant_id: tenantId,
                treatment_id: treatmentId,
                branch_id: branchId,
                stock,
                min_stock: minStock,
                is_active: true,
                last_restock_at: stock > 0 ? new Date() : null,
            }, transaction);

            if (stock > 0) {
                await StockRepository.createMovement({
                    tenant_id: tenantId,
                    branch_id: branchId,
                    treatment_id: treatmentId,
                    type: 'in',
                    qty: stock,
                    stock_before: 0,
                    stock_after: stock,
                    ref_type: 'manual',
                    note: 'Stok awal',
                    user_id: user.id,
                    movement_date: StockService.today(),
                }, transaction);
            }

            await transaction.commit();
            return row;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /** PATCH /stocks/:treatment_id — ubah min stok / status tracking. */
    static async updateSettings(treatmentId, body, user) {
        const tenantId = StockService.resolveTenantId(user);
        const branchId = StockService.resolveBranchId(body.branch_id, user);

        const row = await StockRepository.findAnyStock(treatmentId, branchId);
        if (!row) throw new Error('Barang ini belum di-track pada outlet tersebut');

        const data = {};
        if (body.min_stock !== undefined) {
            data.min_stock = StockService.toInt(body.min_stock, 'min_stock', { min: 0 });
        }
        if (body.is_active !== undefined) {
            data.is_active = body.is_active === true || body.is_active === 'true' || body.is_active === 1;
        }

        if (!Object.keys(data).length) throw new Error('Tidak ada perubahan yang dikirim');

        return await StockRepository.updateStock(row, data);
    }

    // ── Mutasi stok ──────────────────────────────────────────────────────────

    /**
     * POST /stocks/restock — tambah stok masuk.
     * Bisa satu barang (`treatment_id` + `qty`) atau banyak (`items: [...]`).
     */
    static async restock(body, user) {
        const tenantId = StockService.resolveTenantId(user);
        const branchId = StockService.resolveBranchId(body.branch_id, user);

        const items = Array.isArray(body.items) && body.items.length
            ? body.items.map((item) => ({
                treatment_id: StockService.toInt(item.treatment_id, 'treatment_id', { min: 1 }),
                qty: StockService.toInt(item.qty, 'qty', { min: 1 }),
                note: item.note || null,
            }))
            : [{
                treatment_id: StockService.toInt(body.treatment_id, 'treatment_id', { min: 1 }),
                qty: StockService.toInt(body.qty, 'qty', { min: 1 }),
                note: body.note || null,
            }];

        const results = [];

        for (const item of items) {
            const treatment = await StockRepository.findTreatment(item.treatment_id, tenantId);
            if (!treatment) throw new Error(`Barang dengan id ${item.treatment_id} tidak ditemukan`);

            const transaction = await sequelize.transaction();
            try {
                const row = await StockRepository.ensureStock({
                    tenantId,
                    treatmentId: item.treatment_id,
                    branchId,
                }, transaction);

                const before = Number(row.stock);
                const after = before + item.qty;

                await StockRepository.updateStock(row, {
                    stock: after,
                    last_restock_at: new Date(),
                    is_active: true,
                }, transaction);

                const movement = await StockRepository.createMovement({
                    tenant_id: tenantId,
                    branch_id: branchId,
                    treatment_id: item.treatment_id,
                    type: 'in',
                    qty: item.qty,
                    stock_before: before,
                    stock_after: after,
                    ref_type: 'manual',
                    note: item.note || 'Tambah stok',
                    user_id: user.id,
                    movement_date: StockService.today(),
                }, transaction);

                await transaction.commit();
                results.push({
                    treatment_id: item.treatment_id,
                    treatment_name: treatment.name,
                    qty: item.qty,
                    stock_before: before,
                    stock_after: after,
                    movement_id: movement.id,
                });
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        }

        return results;
    }

    /**
     * POST /stocks/adjust — stock opname: set stok fisik, selisih dicatat.
     */
    static async adjust(body, user) {
        const tenantId = StockService.resolveTenantId(user);
        const branchId = StockService.resolveBranchId(body.branch_id, user);
        const treatmentId = StockService.toInt(body.treatment_id, 'treatment_id', { min: 1 });
        const physicalStock = StockService.toInt(body.physical_stock, 'physical_stock', { min: 0 });

        const treatment = await StockRepository.findTreatment(treatmentId, tenantId);
        if (!treatment) throw new Error('Barang/layanan tidak ditemukan');

        const transaction = await sequelize.transaction();
        try {
            const row = await StockRepository.ensureStock({ tenantId, treatmentId, branchId }, transaction);

            const before = Number(row.stock);
            const diff = physicalStock - before;

            if (diff === 0) {
                await transaction.rollback();
                return {
                    treatment_id: treatmentId,
                    treatment_name: treatment.name,
                    stock_before: before,
                    stock_after: before,
                    qty: 0,
                    message: 'Stok fisik sama dengan stok sistem, tidak ada perubahan',
                };
            }

            await StockRepository.updateStock(row, { stock: physicalStock }, transaction);

            const movement = await StockRepository.createMovement({
                tenant_id: tenantId,
                branch_id: branchId,
                treatment_id: treatmentId,
                type: 'adjust',
                qty: diff,
                stock_before: before,
                stock_after: physicalStock,
                ref_type: 'manual',
                note: body.note || 'Koreksi stock opname',
                user_id: user.id,
                movement_date: StockService.today(),
            }, transaction);

            await transaction.commit();

            return {
                treatment_id: treatmentId,
                treatment_name: treatment.name,
                stock_before: before,
                stock_after: physicalStock,
                qty: diff,
                movement_id: movement.id,
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * POST /stocks/transfer — pindah stok antar outlet.
     * Satu aksi = dua movement (transfer_out di asal, transfer_in di tujuan).
     */
    static async transfer(body, user) {
        const tenantId = StockService.resolveTenantId(user);
        const fromBranchId = StockService.resolveBranchId(body.from_branch_id, user);
        const toBranchId = StockService.toInt(body.to_branch_id, 'to_branch_id', { min: 1 });
        const treatmentId = StockService.toInt(body.treatment_id, 'treatment_id', { min: 1 });
        const qty = StockService.toInt(body.qty, 'qty', { min: 1 });

        if (fromBranchId === toBranchId) throw new Error('Outlet asal dan tujuan tidak boleh sama');

        const treatment = await StockRepository.findTreatment(treatmentId, tenantId);
        if (!treatment) throw new Error('Barang/layanan tidak ditemukan');

        const [fromBranch, toBranch] = await Promise.all([
            StockRepository.findBranch(fromBranchId, tenantId),
            StockRepository.findBranch(toBranchId, tenantId),
        ]);
        if (!fromBranch) throw new Error('Outlet asal tidak ditemukan');
        if (!toBranch) throw new Error('Outlet tujuan tidak ditemukan');

        const transaction = await sequelize.transaction();
        try {
            const source = await StockRepository.findStock(treatmentId, fromBranchId, transaction);
            if (!source) throw new Error('Barang ini belum di-track pada outlet asal');

            const beforeSource = Number(source.stock);
            if (beforeSource < qty) {
                throw new Error(`Stok ${treatment.name} di ${fromBranch.name} hanya ${beforeSource}, tidak cukup untuk transfer ${qty}`);
            }

            const target = await StockRepository.ensureStock({ tenantId, treatmentId, branchId: toBranchId }, transaction);
            const beforeTarget = Number(target.stock);

            await StockRepository.updateStock(source, { stock: beforeSource - qty }, transaction);
            await StockRepository.updateStock(target, { stock: beforeTarget + qty, is_active: true }, transaction);

            const movementDate = StockService.today();
            const note = body.note || `Transfer ${fromBranch.name} → ${toBranch.name}`;

            const outMovement = await StockRepository.createMovement({
                tenant_id: tenantId,
                branch_id: fromBranchId,
                treatment_id: treatmentId,
                type: 'transfer_out',
                qty: -qty,
                stock_before: beforeSource,
                stock_after: beforeSource - qty,
                ref_type: 'transfer',
                ref_id: toBranchId,
                note,
                user_id: user.id,
                movement_date: movementDate,
            }, transaction);

            await StockRepository.createMovement({
                tenant_id: tenantId,
                branch_id: toBranchId,
                treatment_id: treatmentId,
                type: 'transfer_in',
                qty,
                stock_before: beforeTarget,
                stock_after: beforeTarget + qty,
                ref_type: 'transfer',
                ref_id: fromBranchId,
                note,
                user_id: user.id,
                movement_date: movementDate,
            }, transaction);

            await transaction.commit();

            return {
                treatment_id: treatmentId,
                treatment_name: treatment.name,
                qty,
                from: { branch_id: fromBranchId, branch_name: fromBranch.name, stock_before: beforeSource, stock_after: beforeSource - qty },
                to: { branch_id: toBranchId, branch_name: toBranch.name, stock_before: beforeTarget, stock_after: beforeTarget + qty },
                movement_id: outMovement.id,
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // ── Dipanggil dari OrderService ──────────────────────────────────────────

    /**
     * Potong stok untuk detail order yang baru dibuat.
     * WAJIB dipanggil di dalam transaction order supaya ikut rollback
     * kalau stok tidak cukup.
     *
     * Barang yang belum punya baris `treatment_stocks` dilewati, jadi
     * tiket/parkir/perahu tetap aman.
     */
    static async deductForOrder(orderDetails, { tenantId, branchId, userId = null, orderId = null }, transaction = null) {
        if (!tenantId || !branchId) return [];

        // Hitung qty per treatment (1 baris order_details = 1 unit)
        const qtyMap = new Map();
        (orderDetails || []).forEach((detail) => {
            const treatmentId = Number(detail.treatment_id);
            if (!treatmentId) return;
            qtyMap.set(treatmentId, (qtyMap.get(treatmentId) || 0) + 1);
        });

        if (!qtyMap.size) return [];

        const results = [];
        const movementDate = StockService.today();

        for (const [treatmentId, qty] of qtyMap.entries()) {
            const row = await StockRepository.findStock(treatmentId, branchId, transaction);

            // Belum di-track → lewati
            if (!row) continue;

            // Dihentikan trackingnya → lewati
            if (row.is_active === false || row.is_active === 0) continue;

            const before = Number(row.stock);
            const after = before - qty;

            if (after < 0) {
                const treatment = await StockRepository.findTreatment(treatmentId, tenantId);
                const name = treatment?.name || `#${treatmentId}`;
                throw new Error(`Stok ${name} tidak cukup (sisa ${before}, butuh ${qty})`);
            }

            await StockRepository.updateStock(row, { stock: after }, transaction);

            await StockRepository.createMovement({
                tenant_id: tenantId,
                branch_id: branchId,
                treatment_id: treatmentId,
                type: 'sale',
                qty: -qty,
                stock_before: before,
                stock_after: after,
                ref_type: 'order',
                ref_id: orderId,
                note: null,
                user_id: userId,
                movement_date: movementDate,
            }, transaction);

            results.push({ treatment_id: treatmentId, qty, stock_before: before, stock_after: after });
        }

        return results;
    }

    /**
     * Kembalikan stok saat order dibatalkan / dihapus.
     * Membaca movement `sale` milik order tersebut, bukan order_details,
     * supaya hasilnya idempotent (tidak dobel kalau dipanggil dua kali).
     */
    static async restoreForOrder(orderId, { tenantId, branchId, userId = null }, transaction = null) {
        if (!orderId) return [];

        const alreadyVoid = await StockRepository.hasOrderVoid(orderId, transaction);
        if (alreadyVoid) return [];

        const sales = await StockRepository.findOrderSales(orderId, transaction);
        if (!sales.length) return [];

        const results = [];
        const movementDate = StockService.today();

        for (const sale of sales) {
            const row = await StockRepository.findStock(sale.treatment_id, sale.branch_id, transaction);
            if (!row) continue;

            const qty = Math.abs(Number(sale.qty));
            const before = Number(row.stock);
            const after = before + qty;

            await StockRepository.updateStock(row, { stock: after }, transaction);

            await StockRepository.createMovement({
                tenant_id: tenantId || sale.tenant_id,
                branch_id: sale.branch_id,
                treatment_id: sale.treatment_id,
                type: 'void',
                qty,
                stock_before: before,
                stock_after: after,
                ref_type: 'order',
                ref_id: orderId,
                note: 'Order dibatalkan, stok dikembalikan',
                user_id: userId,
                movement_date: movementDate,
            }, transaction);

            results.push({ treatment_id: sale.treatment_id, qty, stock_before: before, stock_after: after });
        }

        return results;
    }
}

module.exports = StockService;
