const { Op } = require('sequelize');
const {
    sequelize, Order, OrderDetail, OrderDetailStatusLog, Treatment, Customer, Branch, Payment, User,
} = require('../models');

/**
 * Kitchen ticket = perintah produksi untuk SATU dapur.
 *
 * Satu order bisa pecah jadi beberapa tiket karena tiap item punya
 * `production_branch_id` (outlet penjual atau dapur pusat). Tiket dikelompokkan
 * per pasangan (order_id, production_branch_id).
 *
 * Alur ini mengikuti pola print "tag item": frontend memakai data order yang
 * sudah ada, jadi endpoint hanya menyiapkan payload siap cetak.
 */

const OPTION_LABELS = {
    lesssugar: 'Less Sugar',
    normalsugar: 'Normal Sugar',
    nosugar: 'Tanpa Gula',
    noice: 'Tanpa Es',
    normalice: 'Es Normal',
    hot: 'Panas',
    cold: 'Dingin',
};

// Label kunci opsi (kunci dari options_json) supaya enak dibaca di tiket dapur.
const OPTION_KEY_LABELS = {
    sugar: 'Gula',
    ice: 'Es',
    size: 'Ukuran',
    topping: 'Topping',
    spicy: 'Level Pedas',
    temperature: 'Suhu',
};

const normalizeKey = (value) => String(value).replace(/[\s_-]/g, '').toLowerCase();

const humanize = (value) =>
    String(value).replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const optionLabel = (value) => OPTION_LABELS[normalizeKey(value)] || humanize(value);

// Opsi disimpan sebagai longtext, jadi perlu di-parse manual.
const parseOptions = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
};

const formatOptions = (raw) =>
    Object.entries(parseOptions(raw)).map(([key, value]) => {
        const keyLabel = OPTION_KEY_LABELS[normalizeKey(key)] || humanize(key);
        return `${keyLabel}: ${optionLabel(value)}`;
    });

const formatServeMode = (serveMode, orderType) => {
    if (serveMode === 'dine-in' || orderType === 'dine-in') return 'Dine In';
    if (serveMode === 'takeaway' || orderType === 'takeaway') return 'Bawa Pulang';
    return null;
};

// Kode invoice ada di `payments.code`, bukan di tabel orders.
const ORDER_ATTRIBUTES = [
    'id', 'order_type', 'table_number', 'entry_date', 'branch_id',
    'customer_note', 'createdAt',
];

const ORDER_INCLUDE = [
    { model: Customer, as: 'customer', attributes: ['id', 'name'], required: false },
    { model: Branch, as: 'branch', attributes: ['id', 'name'], required: false },
    { model: Payment, as: 'payment', attributes: ['id', 'code'], required: false },
    // Kasir pembuat order — dipakai di tiket dapur & invoice
    { model: User, as: 'creator', attributes: ['id', 'name'], required: false },
];

const DETAIL_ATTRIBUTES = [
    'id', 'order_id', 'treatment_id', 'price', 'final_price', 'status', 'description',
    'serve_mode', 'options_json', 'tag_number', 'production_branch_id', 'createdAt',
];

const DETAIL_INCLUDE = [
    { model: Treatment, as: 'treatment', attributes: ['id', 'name'], required: false },
    { model: Branch, as: 'productionBranch', attributes: ['id', 'name'], required: false },
];

class KitchenService {
    /**
     * Tiket dapur untuk SATU order (dipakai tombol print di halaman detail pesanan).
     * `productionBranchId` opsional: kalau diisi, hanya tiket dapur itu yang diambil.
     */
    static async getTicketsByOrder(orderId, user_tenant_id = null, productionBranchId = null) {
        const order = await Order.findOne({
            where: { id: orderId, ...(user_tenant_id ? { tenant_id: user_tenant_id } : {}) },
            attributes: ORDER_ATTRIBUTES,
            include: ORDER_INCLUDE,
        });

        if (!order) throw new Error('Order tidak ditemukan');

        const details = await OrderDetail.findAll({
            where: { order_id: orderId },
            attributes: DETAIL_ATTRIBUTES,
            include: DETAIL_INCLUDE,
            order: [['id', 'ASC']],
        });

        const tickets = this.buildTickets(order, details).filter(
            (ticket) => !productionBranchId || ticket.production_branch_id === Number(productionBranchId)
        );

        return {
            order: {
                id: order.id,
                code: order.payment?.code || null,
                order_type: order.order_type,
                table_number: order.table_number,
                entry_date: order.entry_date,
                customer_note: order.customer_note,
                customer_name: order.customer?.name || null,
                cashier_name: order.creator?.name || null,
                branch_id: order.branch_id,
                branch_name: order.branch?.name || null,
                created_at: order.createdAt,
            },
            tickets,
        };
    }

    /**
     * Daftar tiket yang masuk ke satu dapur pada satu tanggal.
     * Dipakai untuk display dapur / reprint tiket yang tertinggal.
     * `status=pending` → item yang belum selesai (antrian & on_progress).
     */
    static async getTicketsByBranch({ branchId, date = null, status = null, tenantId = null } = {}) {
        if (!branchId) throw new Error('branch_id wajib diisi');

        const whereDetails = { production_branch_id: Number(branchId) };
        if (status === 'pending') {
            // `pending` = belum selesai (antrian, on_progress, atau status kosong)
            whereDetails[Op.or] = [{ status: { [Op.ne]: 'done' } }, { status: null }];
        } else if (status) {
            whereDetails.status = status;
        }

        const whereOrder = {};
        if (tenantId) whereOrder.tenant_id = tenantId;
        if (date) whereOrder.entry_date = date;

        const details = await OrderDetail.findAll({
            where: whereDetails,
            attributes: DETAIL_ATTRIBUTES,
            include: [
                {
                    model: Order,
                    required: true,
                    where: whereOrder,
                    attributes: ORDER_ATTRIBUTES,
                    include: ORDER_INCLUDE,
                },
                ...DETAIL_INCLUDE,
            ],
            order: [['order_id', 'ASC'], ['id', 'ASC']],
        });

        // Kumpulkan detail per order supaya tiap order jadi satu tiket.
        const perOrder = new Map();
        for (const detail of details) {
            const order = detail.order;
            if (!order) continue;
            if (!perOrder.has(order.id)) perOrder.set(order.id, { order, details: [] });
            perOrder.get(order.id).details.push(detail);
        }

        const tickets = [];
        for (const { order, details: orderDetails } of perOrder.values()) {
            tickets.push(...this.buildTickets(order, orderDetails));
        }

        return { branch_id: Number(branchId), date, status, total: tickets.length, tickets };
    }

    /**
     * Ubah status satu item dari layar dapur.
     * Alur: `antrian` -> `on_progress` -> `done`. Setiap perubahan dicatat ke
     * `order_detail_status_logs` supaya riwayat pengerjaan tetap terlacak.
     */
    static async updateItemStatus({ orderDetailId, status, userId = null, tenantId = null }) {
        const allowed = ['antrian', 'on_progress', 'done'];
        if (!allowed.includes(status)) {
            throw new Error(`Status tidak valid. Pilihan: ${allowed.join(', ')}`);
        }

        const detail = await OrderDetail.findByPk(orderDetailId, {
            include: [
                {
                    model: Order,
                    required: true,
                    attributes: ['id', 'branch_id', 'tenant_id'],
                },
            ],
        });

        if (!detail) throw new Error('Item pesanan tidak ditemukan');
        if (tenantId && detail.order?.tenant_id && detail.order.tenant_id !== tenantId) {
            throw new Error('Item pesanan bukan milik tenant ini');
        }

        const oldStatus = detail.status || null;
        if (oldStatus === status) {
            return { order_detail_id: detail.id, old_status: oldStatus, new_status: status, changed: false };
        }

        await sequelize.transaction(async (t) => {
            await detail.update({ status }, { transaction: t });
            await OrderDetailStatusLog.create({
                order_detail_id: detail.id,
                old_status: oldStatus,
                new_status: status,
                updated_by: userId || null,
            }, { transaction: t });
        });

        return { order_detail_id: detail.id, old_status: oldStatus, new_status: status, changed: true };
    }

    /**
     * Susun tiket dari sekumpulan detail satu order, dikelompokkan per dapur.
     */
    static buildTickets(order, details) {
        const map = new Map();

        for (const detail of details) {
            const productionBranchId = detail.production_branch_id || order.branch_id || null;
            const key = String(productionBranchId ?? 'unknown');

            if (!map.has(key)) {
                map.set(key, {
                    production_branch_id: productionBranchId,
                    production_branch_name: detail.productionBranch?.name || null,
                    order_id: order.id,
                    order_code: order.payment?.code || null,
                    order_type: order.order_type,
                    table_number: order.table_number,
                    customer_name: order.customer?.name || null,
                    cashier_name: order.creator?.name || null,
                    selling_branch_id: order.branch_id,
                    selling_branch_name: order.branch?.name || null,
                    customer_note: order.customer_note || null,
                    entry_date: order.entry_date,
                    created_at: order.createdAt,
                    items: [],
                });
            }

            const ticket = map.get(key);
            const options = formatOptions(detail.options_json);
            const serveMode = formatServeMode(detail.serve_mode, order.order_type);
            const note = detail.description || null;
            // Baris dengan treatment + opsi + penyajian + catatan sama digabung jadi satu baris qty.
            const signature = [detail.treatment_id, options.join('|'), serveMode, note].join('::');

            const existing = ticket.items.find((item) => item.signature === signature);
            if (existing) {
                existing.qty += 1;
                existing.order_detail_ids.push(detail.id);
                if (detail.tag_number != null) existing.tag_numbers.push(detail.tag_number);
                continue;
            }

            ticket.items.push({
                signature,
                order_detail_ids: [detail.id],
                treatment_id: detail.treatment_id,
                treatment_name: detail.treatment?.name || 'Item',
                qty: 1,
                serve_mode: serveMode,
                options,
                note,
                status: detail.status || null,
                tag_number: detail.tag_number != null ? detail.tag_number : null,
                tag_numbers: detail.tag_number != null ? [detail.tag_number] : [],
                created_at: detail.createdAt,
            });
        }

        return [...map.values()].map((ticket) => {
            const items = ticket.items
                .map(({ signature, ...item }) => item)
                .sort((a, b) => (a.tag_number || 0) - (b.tag_number || 0));

            return {
                ...ticket,
                items,
                total_qty: items.reduce((sum, item) => sum + item.qty, 0),
                all_done: items.every((item) => item.status === 'done'),
            };
        });
    }
}

module.exports = KitchenService;
