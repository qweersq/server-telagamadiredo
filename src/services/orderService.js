const OrderRepository = require('../repositories/orderRepository');
const PaymentRepository = require('../repositories/paymentRepository');
const OrderDetailRepository = require('../repositories/orderDetailRepository');
const ShoePhotoRepository = require('../repositories/shoePhotoRepository');
const CustomerRepository = require('../repositories/customerRepository');
const GenerateInvoiceHelper = require('../helpers/generateInvoiceHelper');
const { normalizeReferralPhone } = require('../helpers/phoneHelper');
const LeadRepository = require('../repositories/LeadRepository');
const PaymentDetailRepository = require('../repositories/paymentDetailRepository');
const PaymentLogRepository = require('../repositories/paymentLogRepository');
const FinanceAccountService = require('./financeAccountService');
const FinanceTransactionRepository = require('../repositories/financeTransactionRepository');
const FinanceAccountRepository = require('../repositories/financeAccountRepository');
const TagSequenceRepository = require('../repositories/tagSequenceRepository');

const WhatsappService = require('./whatsappService');
const InvoiceService = require('./invoiceService');
const StockService = require('./stockService');

const { sequelize, Customer, Branch } = require('../models');
const moment = require('moment');

const CUSTOMER_UMUM_NAME = 'Pelanggan Umum';

// Kategori F&B — hanya boleh dijual di cabang mode 'cafe' / 'mixed'.
const PRODUCT_SERVICE_TYPES = ['Makanan', 'Minuman', 'Snack', 'Souvenir', 'Lainnya'];

// `createdAt` pada model Order memakai defaultValue `sequelize.literal(...)`,
// sehingga nilai pada instance hasil create bisa berupa objek Literal, bukan Date.
const toValidDate = (value, fallback = new Date()) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? fallback : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }
  return fallback;
};

const isProductServiceType = (typeService) =>
  PRODUCT_SERVICE_TYPES.includes(String(typeService || '').trim());

// Kategori yang harus dikerjakan dapur (butuh proses masak/racik).
// Souvenir & Lainnya tidak masuk sini karena barang siap jual.
const KITCHEN_SERVICE_TYPES = ['Makanan', 'Minuman', 'Snack'];

const isKitchenServiceType = (typeService) =>
  KITCHEN_SERVICE_TYPES.includes(String(typeService || '').trim());

// Status awal item dapur (makanan/minuman/snack) saat order dibuat: `antrian`,
// supaya masuk layar Dapur dan berjalan lewat antrian -> on_progress -> done.
// Kategori lain (tiket, parkir, souvenir) tidak perlu disiapkan dapur, jadi
// status dari client dibiarkan apa adanya.
const KITCHEN_INITIAL_STATUS = 'antrian';

const resolveInitialDetailStatus = (typeService, fallback = null) =>
  isKitchenServiceType(typeService) ? KITCHEN_INITIAL_STATUS : fallback;

// Kebutuhan data tamu (nama pemesan + no meja) per mode operasional.
const isGuestMode = (orderMode) => orderMode === 'cafe' || orderMode === 'mixed';

class OrderService {
  static async create(raw, paymentData, orderProductDetails) {
    const transaction = await sequelize.transaction();

    try {
      // Mode cabang: 'cafe' butuh data tamu + no meja, 'loket' tidak
      const branch = await Branch.findByPk(raw.branch_id, {
        attributes: ['id', 'order_mode', 'kitchen_branch_id'],
        transaction
      });
      raw.branch_order_mode = branch?.order_mode || 'loket';

      // Katalog & kebutuhan data tamu ditentukan dari item yang dijual:
      // mode 'mixed' hanya butuh nama pemesan kalau keranjang berisi produk F&B.
      const detailTreatments = await this.fetchDetailTreatments(orderProductDetails, transaction);
      this.assertCatalogMatchesBranchMode(raw, detailTreatments);
      const hasProductItem = detailTreatments.some((treatment) =>
        isProductServiceType(treatment.type_service)
      );
      const needsGuestData = isGuestMode(raw.branch_order_mode) &&
        (raw.branch_order_mode === 'cafe' || hasProductItem);

      // Loket / mixed tanpa item F&B: transaksi tanpa identitas tamu tetap boleh,
      // pakai "Pelanggan Umum".
      if (!raw.customer_id && !raw.customer_name && !needsGuestData) {
        const generalCustomer = await Customer.findOne({
          where: { name: CUSTOMER_UMUM_NAME, branch_id: raw.branch_id },
          transaction
        });
        if (generalCustomer) {
          raw.customer_id = generalCustomer.id;
        } else {
          const created = await Customer.create({
            name: CUSTOMER_UMUM_NAME,
            tenant_id: raw.tenant_id,
            branch_id: raw.branch_id,
          }, { transaction });
          raw.customer_id = created.id;
        }
      }

      // Validate inputs (serve_mode per item dinormalkan sebelum validasi no meja)
      this.normalizeServeMode(raw, orderProductDetails);
      this.validateCreateInputs(raw, paymentData, orderProductDetails, { needsGuestData });

      // Walk-in cafe: kasir cukup menulis nama tamu, customer dibuat otomatis
      if (!raw.customer_id && raw.customer_name) {
        const newCustomer = await Customer.create({
          name: raw.customer_name,
          tenant_id: raw.tenant_id,
          branch_id: raw.branch_id,
        }, { transaction });
        raw.customer_id = newCustomer.id;
        console.log(`✅ Walk-in customer dibuat: ${newCustomer.id} (${raw.customer_name})`);
      }

      const newPayment = await this.processPayment(paymentData, raw, transaction);

      // Create Order
      const newOrder = await this.createOrder(raw, newPayment.id, transaction);

      // Handle points redeem (jika ada) - SETELAH order dibuat untuk dapat order_id
      // ✅ Gunakan points_redeemed dari processPayment (sudah di-adjust jika melebihi subtotal)
      // ✅ FIX: Point redemption tidak perlu finance transaction, cukup di PointTransaction saja
      const pointsToRedeem = newPayment.points_redeemed || paymentData.points_to_redeem || 0;
      if (pointsToRedeem > 0) {
        try {
          const PointService = require('./pointService');

          // Redeem points dengan order_id (menggunakan points_redeemed yang sudah di-adjust)
          const redeemResult = await PointService.redeemPoints(
            raw.customer_id,
            pointsToRedeem, // ✅ Gunakan points_redeemed yang sudah di-adjust
            newOrder.id,
            transaction,
            `Redeem poin untuk order #${newOrder.id}`,
            raw.tenant_id
          );
          console.log(`✅ Points redeemed: ${pointsToRedeem} points for order ${newOrder.id} (discount: Rp ${redeemResult.discount_amount.toLocaleString('id-ID')})`);
          // ✅ FIX: Tidak perlu create finance transaction untuk point redemption
          // Point redemption adalah discount, bukan expense riil, sudah tercatat di PointTransaction
        } catch (error) {
          console.error('❌ Error redeeming points:', error.message);
          throw new Error(`Points redeem failed: ${error.message}`);
        }
      }

      // Create Order Details and Shoe Photos
      const productionRouting = this.buildProductionRouting(detailTreatments, branch, newOrder.branch_id);
      await this.processOrderDetails(newOrder.id, orderProductDetails, transaction, {
        tenant_id: newOrder.tenant_id,
        branch_id: newOrder.branch_id,
        entry_date: newOrder.entry_date,
        created_by: newOrder.created_by || raw.created_by || null,
        production_routing: productionRouting,
        service_types: this.buildServiceTypeMap(detailTreatments),
        cost_prices: this.buildCostPriceMap(detailTreatments),
      });

      // Commit transaction
      await transaction.commit();

      // Notifikasi realtime ke layar operasional cabang terkait (dapur/kasir/antrian).
      // Non-critical: kegagalan di sini tidak boleh membatalkan order yang sudah commit.
      this.publishOrderCreatedEvent({
        order: newOrder,
        payment: newPayment,
        branch,
        routing: productionRouting,
        detailTreatments,
        orderProductDetails,
      }).catch((error) => {
        console.error('⚠️ Gagal mengirim notifikasi order baru (non-critical):', error.message);
      });

      // Trigger: Generate & save invoice token
      await InvoiceService.generateAndSaveInvoiceToken(newOrder.id);

      let getNewOrder = await OrderRepository.funcGetOrderById(newOrder.id, raw.tenant_id, raw.branch_id, 'superadmin', null);

      // ✅ EARNING POIN, REFERRAL BONUS & FIRST ORDER BONUS: Hanya diberikan saat order LUNAS (paid)
      if (newPayment.status === 'paid' && newPayment.paid_amount > 0) {
        try {
          const PointService = require('./pointService');
          const MembershipTierService = require('./membershipTierService');
          const PointTransactionRepository = require('../repositories/pointTransactionRepository');
          const { Order, Payment, Customer, Op } = require('../models');

          // Pelanggan umum / walk-in (tanpa nomor HP) tidak ikut program poin,
          // referral, maupun bonus order pertama — transaksinya murni tiket.
          const orderCustomer = await Customer.findByPk(raw.customer_id);
          const isWalkInCustomer = !orderCustomer?.phone;

          // Earning poin dari paid_amount
          if (!isWalkInCustomer) {
            await PointService.earnPoints(
              raw.customer_id,
              newPayment.paid_amount,
              newOrder.id,
              null, // No transaction (already committed)
              `Earned from order #${newOrder.id}`,
              raw.tenant_id
            );
          } else {
            console.log('ℹ️ Walk-in customer (tanpa HP) — skip earning poin');
          }

          // ✅ REFERRAL BONUS: Diberikan saat order LUNAS (paid)
          if (newOrder.referred_by) {
            try {
              // Get point config for referral bonus
              const pointConfig = await PointService.getPointConfig(raw.tenant_id);
              const referrerBonus = pointConfig.referral_bonus_referrer || 10;

              // 1. Bonus untuk referrer
              if (referrerBonus > 0) {
                const referrerCustomer = await Customer.findByPk(newOrder.referred_by);
                if (referrerCustomer) {
                  const referrerNewPoints = (referrerCustomer.points || 0) + referrerBonus;
                  const referrerNewLifetimePoints = (referrerCustomer.lifetime_points || 0) + referrerBonus;

                  await referrerCustomer.update({
                    points: referrerNewPoints,
                    lifetime_points: referrerNewLifetimePoints
                  });

                  // Create point transaction dengan order_id untuk tracking
                  await PointTransactionRepository.create({
                    customer_id: newOrder.referred_by,
                    order_id: newOrder.id,
                    type: 'bonus',
                    bonus_type: 'referral_referrer',
                    points: referrerBonus,
                    description: `Referral bonus - Customer ${raw.customer_id} (Order #${newOrder.id}) melakukan order pertama`,
                    expires_at: null
                  });

                  console.log(`✅ Referral bonus (+${referrerBonus} points) added to referrer ${newOrder.referred_by}`);

                  // Auto-upgrade tier untuk referrer
                  await MembershipTierService.upgradeTier(
                    newOrder.referred_by,
                    raw.tenant_id,
                    null
                  );
                }
              }

              // 2. Bonus untuk customer baru (jika ini order pertama)
              const previousOrdersForNewCustomer = await Order.count({
                where: {
                  customer_id: raw.customer_id,
                  id: { [Op.ne]: newOrder.id },
                  deletedAt: null
                }
              });

              const newCustomerBonus = pointConfig.referral_bonus_new_customer || 10;

              if (previousOrdersForNewCustomer === 0 && newCustomerBonus > 0) {
                const newCustomer = await Customer.findByPk(raw.customer_id);
                if (newCustomer) {
                  const newCustomerNewPoints = (newCustomer.points || 0) + newCustomerBonus;
                  const newCustomerNewLifetimePoints = (newCustomer.lifetime_points || 0) + newCustomerBonus;

                  await newCustomer.update({
                    points: newCustomerNewPoints,
                    lifetime_points: newCustomerNewLifetimePoints
                  });

                  // Create point transaction dengan order_id untuk tracking
                  await PointTransactionRepository.create({
                    customer_id: raw.customer_id,
                    order_id: newOrder.id,
                    type: 'bonus',
                    bonus_type: 'referral_new_customer',
                    points: newCustomerBonus,
                    description: `Referral bonus - Order #${newOrder.id} (dari referrer ${newOrder.referred_by})`,
                    expires_at: null
                  });

                  console.log(`✅ Referral bonus (+${newCustomerBonus} points) added to new customer ${raw.customer_id}`);
                }
              }
            } catch (error) {
              console.error('⚠️ Error processing referral bonus (non-critical):', error.message);
              // Don't throw - referral bonus is not critical
            }
          }

          // ✅ FIRST ORDER BONUS: Diberikan saat order LUNAS (paid)
          try {
            const previousPaidOrders = await Order.count({
              where: {
                customer_id: raw.customer_id,
                id: { [Op.ne]: newOrder.id },
                deletedAt: null
              },
              include: [{
                model: Payment,
                as: 'payment',
                where: {
                  status: 'paid',
                  paid_amount: { [Op.gt]: 0 }
                },
                required: true
              }]
            });

            // ✅ First order bonus: selalu diberikan jika customer baru dan enabled (bisa dapat bersamaan dengan referral bonus)
            const customer = await Customer.findByPk(raw.customer_id);
            if (isWalkInCustomer) {
              console.log('ℹ️ Walk-in customer (tanpa HP) — skip first order bonus');
            } else if (customer && !customer.has_received_first_order_bonus && previousPaidOrders === 0) {

              // Get point config untuk first order bonus
              const pointConfig = await PointService.getPointConfig(raw.tenant_id);

              // Check if first order bonus is enabled and get bonus amount
              if (pointConfig.first_order_bonus_enabled && pointConfig.first_order_bonus > 0) {
                const firstOrderBonus = pointConfig.first_order_bonus;

                // Update customer points
                const customerNewPoints = (customer.points || 0) + firstOrderBonus;
                const customerNewLifetimePoints = (customer.lifetime_points || 0) + firstOrderBonus;

                await customer.update({
                  points: customerNewPoints,
                  lifetime_points: customerNewLifetimePoints,
                  has_received_first_order_bonus: true
                });

                // Create point transaction dengan order_id untuk tracking
                await PointTransactionRepository.create({
                  customer_id: raw.customer_id,
                  order_id: newOrder.id,
                  type: 'bonus',
                  bonus_type: 'first_order',
                  points: firstOrderBonus,
                  description: `First order bonus untuk order #${newOrder.id}`,
                  expires_at: null
                });

                console.log(`✅ First order bonus (+${firstOrderBonus} points) added successfully, flag set to true, order_id: ${newOrder.id}`);
              } else {
                console.log('ℹ️ First order bonus disabled or amount is 0, skipping');
                // Still set flag to prevent future checks
                await customer.update({
                  has_received_first_order_bonus: true
                });
              }
            } else if (customer && customer.has_received_first_order_bonus) {
              console.log('ℹ️ Customer already received first order bonus, skipping');
            }
          } catch (error) {
            console.error('⚠️ Error processing first order bonus (non-critical):', error.message);
            // Don't throw - first order bonus is not critical
          }

          // Auto-upgrade tier berdasarkan lifetime_points
          // ✅ OPTION C: upgradeTier() akan otomatis skip jika customer punya active paid membership
          if (!isWalkInCustomer) {
            await MembershipTierService.upgradeTier(
              raw.customer_id,
              raw.tenant_id,
              null // No transaction (already committed)
            );
            console.log('✅ Tier upgrade checked successfully');
          }

          // ✅ FIX: Refresh order setelah earning poin selesai untuk mendapatkan customer points terbaru
          console.log('🔄 Refreshing order to get updated customer points...');
          getNewOrder = await OrderRepository.funcGetOrderById(newOrder.id, raw.tenant_id, raw.branch_id, 'superadmin', null);
          console.log('✅ Order refreshed with updated customer points');
        } catch (error) {
          console.error('⚠️ Error processing points/tier (non-critical):', error.message);
          // Don't throw error, just log - points earning is not critical for order creation
        }
      }

      // Update lead status to berhasil jika phone ada di lead  
      console.log('🔄 Updating lead status...');
      await this.updateLeadStatus(getNewOrder.customer_id);
      console.log('✅ Lead status updated successfully');

      console.log('🎉 Order creation completed successfully');
      return getNewOrder;
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Gagal membuat order: ${error.message}`);
    }
  }

  /**
   * Susun payload notifikasi pesanan baru lalu kirim ke bus SSE.
   *
   * Satu order bisa menyentuh beberapa dapur sekaligus (mis. Cwie Mie ke dapur
   * Cafe 1, Popmie tetap di Cafe 2), jadi `productionBranchIds` dikirim sebagai
   * daftar dan klien SSE memfilter sendiri berdasarkan cabangnya.
   */
  static async publishOrderCreatedEvent({ order, payment, branch, routing, detailTreatments, orderProductDetails }) {
    const OrderEventBus = require('../realtime/orderEventBus');

    const treatmentById = new Map(
      (detailTreatments || []).map((treatment) => [String(treatment.id), treatment])
    );

    const sellingBranchId = Number(order.branch_id ?? branch?.id) || null;

    const items = (orderProductDetails || []).map((detail) => {
      const treatment = treatmentById.get(String(detail.treatment_id));
      const routedBranchId = routing?.get(String(detail.treatment_id))
        ?? treatment?.production_branch_id
        ?? sellingBranchId;
      return {
        treatment_id: Number(detail.treatment_id) || null,
        name: treatment?.name || 'Item',
        type_service: treatment?.type_service || null,
        production_branch_id: Number(routedBranchId) || sellingBranchId,
      };
    });

    const productionBranchIds = [
      ...new Set(items.map((item) => Number(item.production_branch_id)).filter(Boolean)),
    ];

    const customer = order.customer_id
      ? await Customer.findByPk(order.customer_id, { attributes: ['id', 'name'] })
      : null;

    const branchName =
      branch?.name
      || (order.branch_id
        ? (await Branch.findByPk(order.branch_id, { attributes: ['id', 'name'] }))?.name
        : null)
      || null;

    OrderEventBus.publishOrderCreated({
      tenantId: Number(order.tenant_id),
      orderId: order.id,
      orderCode: payment?.code || null,
      sellingBranchId,
      sellingBranchName: branchName,
      productionBranchIds,
      customerId: order.customer_id || null,
      customerName: customer?.name || null,
      tableNumber: order.table_number || null,
      customerNote: order.customer_note || null,
      orderType: order.order_type || null,
      createdBy: order.created_by || null,
      totalAmount: Number(payment?.final_price ?? payment?.total_price ?? 0),
      items,
      createdAt: toValidDate(order.createdAt),
    });
  }

  static async updateLeadStatus(customerId) {
    try {
      const customerData = await CustomerRepository.getById(customerId);

      // Validasi customerData
      if (!customerData) {
        return; // Skip lead update jika customer tidak ditemukan
      }

      if (!customerData.phone) {
        return; // Skip lead update jika phone tidak ada
      }

      const lead = await LeadRepository.findByPhone(customerData.phone);

      if (lead) {
        await LeadRepository.update(lead.id, { status: 'Berhasil', is_converted: true, conversion_date: moment().format('YYYY-MM-DD HH:mm:ss') });
      } else {
      }
    } catch (error) {
      // Jangan throw error, hanya log karena ini bukan operasi kritis
    }
  }

  /**
   * Ambil data `type_service` untuk treatment yang dipakai order ini.
   * `onlyNew` dipakai saat update supaya item lama tidak ikut dinilai ulang.
   */
  static async fetchDetailTreatments(orderProductDetails, transaction, { onlyNew = false } = {}) {
    const details = Array.isArray(orderProductDetails) ? orderProductDetails : [];
    const candidates = onlyNew ? details.filter((detail) => !detail.id) : details;
    const treatmentIds = [...new Set(candidates.map((detail) => detail.treatment_id).filter(Boolean))];
    if (treatmentIds.length === 0) return [];

    const { Treatment } = require('../models');
    return Treatment.findAll({
      where: { id: treatmentIds },
      attributes: ['id', 'name', 'type_service', 'production_mode', 'production_branch_id', 'cost_price'],
      transaction
    });
  }

  /**
   * Tentukan cabang produksi satu treatment:
   * - `production_branch_id` diisi → dapur spesifik produk itu (override)
   * - 'outlet'  → dibuat di cabang penjual (item ringan: Popmie, minuman)
   * - 'central' → dikirim ke dapur cabang (`kitchen_branch_id`), fallback cabang penjual
   */
  static resolveProductionBranchId(treatment, branch, fallbackBranchId = null) {
    const sellingBranchId = branch?.id || fallbackBranchId || null;
    if (treatment?.production_branch_id) return Number(treatment.production_branch_id);
    if (treatment?.production_mode === 'outlet') return sellingBranchId;
    return branch?.kitchen_branch_id || sellingBranchId;
  }

  /**
   * Peta `treatment_id → production_branch_id` untuk seluruh item di keranjang.
   * Dipakai saat create & update supaya 1 order campuran bisa pecah jadi
   * beberapa tiket produksi (mis. Popmie lokal + nasi goreng ke Cafe 1).
   */
  static buildServiceTypeMap(detailTreatments = []) {
    const map = new Map();
    detailTreatments.forEach((treatment) => {
      if (treatment?.id != null) map.set(String(treatment.id), treatment.type_service || null);
    });
    return map;
  }

  /**
   * Peta `treatment_id → HPP per unit` untuk snapshot ke `order_details.cost_price`.
   * Snapshot diambil di server supaya client tidak bisa memalsukan HPP, dan supaya
   * perubahan HPP di kemudian hari tidak mengubah laba transaksi yang sudah lewat.
   */
  static buildCostPriceMap(detailTreatments = []) {
    const map = new Map();
    detailTreatments.forEach((treatment) => {
      if (treatment?.id == null) return;
      const raw = treatment.cost_price;
      map.set(String(treatment.id), raw === null || raw === undefined || raw === '' ? null : parseFloat(raw));
    });
    return map;
  }

  static buildProductionRouting(detailTreatments, branch, fallbackBranchId = null) {
    const routing = new Map();
    for (const treatment of Array.isArray(detailTreatments) ? detailTreatments : []) {
      routing.set(String(treatment.id), this.resolveProductionBranchId(treatment, branch, fallbackBranchId));
    }
    return routing;
  }

  /**
   * Katalog tiap mode operasional dipisah:
   * - loket: tiket masuk, retribusi, jasa wisata (tanpa tamu & meja)
   * - cafe : produk F&B saja
   * - mixed: keduanya
   * Frontend sudah menyaring daftar produk, ini pengaman terakhir.
   */
  static assertCatalogMatchesBranchMode(raw, detailTreatments) {
    const mode = raw.branch_order_mode;
    if (mode !== 'loket' && mode !== 'cafe') return;

    const treatments = Array.isArray(detailTreatments) ? detailTreatments : [];
    const blocked = treatments.filter((treatment) =>
      mode === 'loket' ? isProductServiceType(treatment.type_service) : !isProductServiceType(treatment.type_service)
    );
    if (blocked.length > 0) {
      const names = blocked.map((treatment) => treatment.name).join(', ');
      throw new Error(
        mode === 'loket'
          ? `Cabang loket tidak menjual produk cafe. Hapus item: ${names}`
          : `Cabang cafe tidak menjual tiket/paket wisata. Hapus item: ${names}`
      );
    }
  }

  /**
   * Dine-in / bawa pulang punya nilai default di level order (dropdown
   * `orders.order_type`) dan boleh ditimpa per item lewat `serve_mode`.
   *
   * - Loket tidak pernah punya dine-in → semua item dipaksa 'takeaway'.
   * - Item tanpa `serve_mode` mewarisi `order_type` order (kompatibel data lama).
   * - `order_type` eksplisit ('dine-in' | 'takeaway' | 'mixed') dipertahankan,
   *   hanya dinaikkan jadi 'mixed' kalau itemnya benar-benar bercampur.
   */
  static normalizeServeMode(raw, orderProductDetails) {
    const details = Array.isArray(orderProductDetails) ? orderProductDetails : [];
    if (details.length === 0) return;

    const allowed = ['dine-in', 'takeaway'];
    const requestedOrderType = String(raw.order_type || '').trim().toLowerCase();
    const explicitOrderType = ['dine-in', 'takeaway', 'mixed'].includes(requestedOrderType)
      ? requestedOrderType
      : null;
    // 'mixed' bukan mode per item; item baru ikut dine-in lalu bisa diubah sendiri.
    const defaultMode = ['dine-in', 'mixed'].includes(requestedOrderType) ? 'dine-in' : 'takeaway';
    const forceTakeaway = raw.branch_order_mode === 'loket';

    details.forEach((detail) => {
      const requested = String(detail.serve_mode || '').trim().toLowerCase();
      let mode = allowed.includes(requested) ? requested : defaultMode;
      if (forceTakeaway) mode = 'takeaway';
      detail.serve_mode = mode;
      this.normalizeItemOptions(detail);
    });

    const modes = details.map((detail) => detail.serve_mode);
    const hasDineIn = modes.includes('dine-in');
    const hasTakeaway = modes.includes('takeaway');

    if (explicitOrderType) {
      // Dropdown penyajian di level order adalah sumber kebenaran (orders.order_type).
      // Nilai hanya dinaikkan jadi 'mixed' kalau itemnya memang benar-benar bercampur.
      raw.order_type = hasDineIn && hasTakeaway ? 'mixed' : explicitOrderType;
    } else if (hasDineIn && hasTakeaway) {
      raw.order_type = 'mixed';
    } else if (hasDineIn) {
      raw.order_type = 'dine-in';
    } else if (raw.order_type !== 'online') {
      // 'online' dipertahankan karena dipakai untuk alur request pickup
      raw.order_type = 'takeaway';
    }
  }

  /**
   * `options_json` hanya untuk opsi tanpa biaya (less sugar, tanpa es, dll).
   * Dibersihkan supaya tidak ada key/nilai aneh yang bikin CHECK json_valid gagal
   * dan supaya ukurannya tetap kecil.
   */
  static normalizeItemOptions(detail) {
    let parsed = detail.options_json;

    if (parsed === null || parsed === undefined || parsed === '') {
      detail.options_json = null;
      return;
    }

    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {
        detail.options_json = null;
        return;
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      detail.options_json = null;
      return;
    }

    const clean = {};
    Object.entries(parsed).slice(0, 10).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      const safeKey = String(key).trim().slice(0, 32);
      const safeValue = String(value).trim().slice(0, 64);
      if (safeKey && safeValue) clean[safeKey] = safeValue;
    });

    detail.options_json = Object.keys(clean).length > 0 ? clean : null;
  }

  static validateCreateInputs(raw, paymentData, orderProductDetails, { needsGuestData = false } = {}) {
    if (!raw.customer_id && !raw.customer_name) {
      throw new Error('Nama pemesan atau customer ID wajib diisi');
    }
    if (!raw.branch_id) throw new Error('Branch ID is required');
    if (!paymentData) throw new Error('Payment data is required');
    if (!Array.isArray(orderProductDetails) || orderProductDetails.length === 0) {
      throw new Error('Order details are required');
    }
    // Nomor meja hanya relevan kalau ada minimal satu item yang disantap di tempat.
    // Order campuran (mixed) tetap butuh meja karena tamunya duduk.
    const hasDineInItem = orderProductDetails.some((detail) => detail.serve_mode === 'dine-in');
    if (hasDineInItem && !raw.table_number) {
      throw new Error('Nomor meja wajib diisi karena ada item makan di tempat (dine-in)');
    }
    if (needsGuestData && !raw.customer_name && !raw.customer_id) {
      throw new Error('Nama pemesan wajib diisi untuk pesanan dengan produk cafe');
    }
  }

  static async processPayment(paymentData, raw, transaction) {
    try {
      const { Discount } = require('../models');
      const MembershipTierService = require('./membershipTierService');
      const PointService = require('./pointService');

      // Validasi tenant_id
      if (!raw.tenant_id) {
        throw new Error('tenant_id is required but not provided in raw data');
      }

      if (raw.entry_date) raw.entry_date = moment(raw.entry_date).format('YYYY-MM-DD');
      if (paymentData.date) paymentData.date = moment(paymentData.date).format('YYYY-MM-DD');
      paymentData.code = GenerateInvoiceHelper.generateOrderCode(raw.customer_id, raw.entry_date);
      if (paymentData.id) delete paymentData.id;

      // Calculate subtotal from order_details (will be passed via raw or calculated)
      const subtotal = Math.round(parseFloat(paymentData.subtotal) || parseFloat(paymentData.total_price) || 0);

      // 1. Get membership discount (DISABLED - otomatis dari tier)
      // ❌ DISABLED: Membership discount otomatis di-nonaktifkan
      // const membershipDiscount = await MembershipTierService.getMembershipDiscount(
      //   raw.customer_id,
      //   raw.tenant_id
      // );
      // if (membershipDiscount && membershipDiscount.is_active) {
      //   membershipDiscountAmount = Math.round(
      //     subtotal * (membershipDiscount.discount_percentage / 100)
      //   );
      //   console.log(`✅ Membership discount applied: ${membershipDiscount.membership_name} - ${membershipDiscount.discount_percentage}% = Rp ${membershipDiscountAmount.toLocaleString('id-ID')}`);
      // }
      let membershipDiscountAmount = 0; // Set to 0 - no automatic membership discount

      // 2. Calculate subtotal after membership discount
      const subtotalAfterMembership = Math.max(0, subtotal - membershipDiscountAmount);

      // 3. Handle points redeem (jika ada) - validate & calculate discount, redeem akan dilakukan setelah order dibuat
      let pointsDiscountAmount = 0;
      let pointsRedeemed = 0;
      if (paymentData.points_to_redeem && paymentData.points_to_redeem > 0) {
        try {
          // Get point config untuk redeem_rate (dinamis dari settings)
          const pointConfig = await PointService.getPointConfig(raw.tenant_id);
          const redeemRateValue = pointConfig.redeem_rate * 100; // Convert to rupiah (e.g., 50 -> 5000)

          // Validate points
          const validation = await PointService.validatePoints(
            raw.customer_id,
            paymentData.points_to_redeem,
            raw.tenant_id
          );

          if (!validation.valid) {
            throw new Error(validation.message);
          }

          // Calculate discount amount using redeem_rate from settings (100 poin = Rp redeem_rate * 100)
          let calculatedPointsDiscount = Math.floor((paymentData.points_to_redeem / 100) * redeemRateValue);

          // ✅ VALIDASI: Points discount tidak boleh melebihi subtotal setelah membership discount
          // Limit points discount to subtotal after membership
          if (calculatedPointsDiscount > subtotalAfterMembership) {
            // Auto-adjust: hitung maksimal poin yang bisa dipakai
            const maxPointsDiscount = subtotalAfterMembership;
            const maxPointsRedeem = Math.floor((maxPointsDiscount / redeemRateValue) * 100);

            // Round down to nearest 100
            const adjustedPointsRedeem = Math.floor(maxPointsRedeem / 100) * 100;
            const adjustedPointsDiscount = Math.floor((adjustedPointsRedeem / 100) * redeemRateValue);

            pointsDiscountAmount = adjustedPointsDiscount;
            pointsRedeemed = adjustedPointsRedeem;

            console.log(`⚠️ Points discount adjusted: ${paymentData.points_to_redeem} points (Rp ${calculatedPointsDiscount.toLocaleString('id-ID')}) → ${adjustedPointsRedeem} points (Rp ${adjustedPointsDiscount.toLocaleString('id-ID')}) to match subtotal (Rp ${subtotalAfterMembership.toLocaleString('id-ID')})`);
          } else {
            pointsDiscountAmount = calculatedPointsDiscount;
            pointsRedeemed = paymentData.points_to_redeem;
          }

          // Note: Actual redeem akan dilakukan setelah order dibuat untuk dapat order_id
          console.log(`✅ Points redeem validated: ${pointsRedeemed} points = Rp ${pointsDiscountAmount.toLocaleString('id-ID')} discount (redeem_rate: ${pointConfig.redeem_rate}, value: Rp ${redeemRateValue})`);
        } catch (error) {
          console.error('❌ Error validating points:', error.message);
          throw new Error(`Points validation failed: ${error.message}`);
        }
      }

      // 4. Calculate subtotal after membership and points discount
      const subtotalAfterPoints = Math.max(0, subtotalAfterMembership - pointsDiscountAmount);

      // 5. Calculate payment-level discount if discount_id exists (apply to subtotal after membership & points)
      let paymentDiscountAmount = 0;
      let discountId = paymentData.discount_id || null;

      if (discountId) {
        try {
          const paymentDiscount = await Discount.findByPk(discountId, { transaction });
          if (paymentDiscount && paymentDiscount.is_active) {
            const discVal = paymentDiscount.discount != null
              ? Number(paymentDiscount.discount)
              : Number(paymentDiscount.value) || 0;

            if (paymentDiscount.type === 'percent') {
              // Apply to subtotal after membership & points discount
              paymentDiscountAmount = Math.round(subtotalAfterPoints * (discVal / 100));
            } else if (paymentDiscount.type === 'nominal') {
              paymentDiscountAmount = Math.round(discVal);
            }
          } else {
            // Discount tidak aktif atau tidak ditemukan, set discount_id ke null
            discountId = null;
            paymentDiscountAmount = 0;
          }
        } catch (error) {
          console.error('Error fetching payment discount:', error);
          discountId = null;
          paymentDiscountAmount = 0;
        }
      }

      // Calculate final_price: subtotal - membership_discount - points_discount - payment_discount
      const totalDiscount = membershipDiscountAmount + pointsDiscountAmount + paymentDiscountAmount;
      const finalPrice = Math.max(0, Math.round(subtotal - totalDiscount));

      // Calculate paid_amount and remaining_amount
      const paidAmount = Math.round(parseFloat(paymentData.paid_amount) || 0);
      const remainingAmount = Math.max(0, Math.round(finalPrice - paidAmount));

      // Calculate payment status based on finalPrice
      const paymentStatus = remainingAmount === 0 ? 'paid' : (paidAmount > 0 && paidAmount < finalPrice ? 'dp' : 'unpaid');

      const paymentDataTemp = {
        ...paymentData,
        code: paymentData.code || '',
        status: paymentStatus, // Recalculate status based on finalPrice
        total_process_time_cost: 0, // Process time cost dihilangkan
        total_discount: totalDiscount, // Total discount: membership + points + payment discount
        total_service: parseInt(paymentData.total_service || 0),
        paid_amount: paidAmount,
        remaining_amount: remainingAmount, // Recalculate based on finalPrice
        additional_cost: Math.round(parseFloat(paymentData.additional_cost) || 0),
        due_date: paymentData.due_date || null,
        notes: paymentData.notes || null,
        final_price: finalPrice, // Total after all discounts
        subtotal: subtotal, // Subtotal before all discounts
        payment_details: paymentData.payment_details || [],
        tenant_id: raw.tenant_id, // Tambahkan tenant_id dari raw data
        discount_id: discountId, // Payment-level discount ID (validated)
        // Store points info for later use
        points_redeemed: pointsRedeemed || null,
        points_discount: pointsDiscountAmount || null,
        membership_discount: membershipDiscountAmount || null,

        total_price: subtotal, // Total price before discount
        date: paymentData.date || null,
        method: paymentData.method || '',
        money: Math.round(parseFloat(paymentData.money) || 0),
        change: Math.round(parseFloat(paymentData.change) || 0),
      }

      // Logging untuk debugging
      console.log('processPayment - tenant_id value:', paymentDataTemp.tenant_id);
      console.log('processPayment - tenant_id type:', typeof paymentDataTemp.tenant_id);

      const newPayment = await PaymentRepository.create(paymentDataTemp, transaction);

      if (newPayment.status !== 'unpaid') {
        for (const detail of paymentData.payment_details) {
          // ✅ Akun yang mewajibkan bukti bayar harus disertai foto
          const proofAccount = await FinanceAccountRepository.getById(detail.account_id, raw.tenant_id, raw.branch_id);
          if (proofAccount?.requires_payment_proof && !detail.evidence_photo) {
            throw new Error(`Bukti pembayaran wajib diupload untuk akun ${proofAccount.name}`);
          }

          // Debug payment detail processing
          console.log('Processing payment detail - account_id:', detail.account_id, 'tenant_id:', raw.tenant_id);

          const accountName = await FinanceAccountService.getAccountName(detail.account_id, raw.tenant_id, raw.branch_id);

          const financeTransactionData = {
            account_id: detail.account_id,
            is_checked: false,
            category_id: detail.finance_category_id || 1, // ✅ Use finance_category_id from frontend, fallback to 1
            type: 'debit',
            amount: detail.amount,
            total_fee: detail.fee,
            final_amount: detail.final_amount,
            description: 'Uang Masuk: ' + accountName + ' dari ' + newPayment.code,
            date: moment().format('YYYY-MM-DD HH:mm:ss'),
            tenant_id: raw.tenant_id, // Tambahkan tenant_id
            branch_id: raw.branch_id || null  // Tambahkan branch_id dengan fallback ke null
          }

          // Debug finance transaction
          console.log('Creating finance transaction with tenant_id:', financeTransactionData.tenant_id);

          const newFinanceTransaction = await FinanceTransactionRepository.create(
            financeTransactionData.account_id,
            financeTransactionData.category_id,
            financeTransactionData.amount,
            financeTransactionData.final_amount,
            financeTransactionData.description,
            financeTransactionData.date,
            financeTransactionData.tenant_id,
            financeTransactionData.branch_id,
            transaction
          );

          //  create payment detail
          const paymentDetailData = {
            ...detail,
            payment_id: newPayment.id,
            transaction_id: newFinanceTransaction.id,
            method: detail.method === 'transfer' ? 'bank_transfer' : detail.method,
            amount: Math.round(parseFloat(detail.amount) || 0),
            fee: Math.round(parseFloat(detail.fee) || 0),
            interest: Math.round(parseFloat(detail.interest) || 0),
            final_amount: Math.round(parseFloat(detail.final_amount) || 0),
            finance_account_id: detail.account_id || null, // ✅ Map account_id to finance_account_id
            finance_category_id: detail.finance_category_id || 1, // ✅ Add finance_category_id from frontend
            shift_id: detail.shift_id || raw.shift_id || null, // ✅ Prioritize detail.shift_id over raw.shift_id
            payment_method_id: detail.payment_method_id || null, // ✅ Add payment_method_id from frontend
            money_received: detail.money_received || null, // ✅ Cash change tracking: money received from customer
            change_amount: detail.change_amount || null, // ✅ Cash change tracking: change given to customer
            date: moment().format('YYYY-MM-DD HH:mm:ss')
          }
          const newPaymentDetail = await PaymentDetailRepository.create(paymentDetailData, transaction);
          const paymentLogs = {
            payment_detail_id: newPaymentDetail.id,
            changed_by: raw.user_id,
            action: 'create',
            description: 'Pembayaran ' + newPayment.code + ' dibuat',
          }
          await PaymentLogRepository.create(paymentLogs, transaction);

          // update finance account balance
          const financeAccount = await FinanceAccountRepository.getById(detail.account_id, raw.tenant_id, raw.branch_id);
          if (!financeAccount) {
            throw new Error(`Finance account with id ${detail.account_id} not found`);
          }
          const newBalance = parseFloat(financeAccount.balance || 0) + parseFloat(detail.amount);
          await FinanceAccountRepository.updateBalance(detail.account_id, newBalance, raw.tenant_id, transaction);

        }
      }

      return newPayment;
    } catch (error) {
      throw new Error(`Gagal memproses pembayaran: ${error.message}`);
    }
  }

  static async createOrder(raw, paymentId, transaction) {
    try {
      let referredBy = null;
      let referredByPhone = raw.referred_by_phone || null;

      // Normalize referral phone number jika ada
      if (referredByPhone && raw.tenant_id) {
        try {
          // Normalize phone number untuk standarisasi format (08XX → 628XX)
          const normalizedPhone = normalizeReferralPhone(referredByPhone);

          if (normalizedPhone) {
            // Lookup customer dari nomor HP referrer yang sudah dinormalize
            const referrerCustomer = await CustomerRepository.getByPhone(normalizedPhone, raw.tenant_id);

            if (referrerCustomer) {
              referredBy = referrerCustomer.id;
              referredByPhone = normalizedPhone; // Simpan versi normalized
              console.log(`✅ Referral found: Customer ${referredBy} (${normalizedPhone}) referred this order`);
            } else {
              // Jika tidak ditemukan dengan format normalized, coba dengan format asli
              const referrerCustomerOriginal = await CustomerRepository.getByPhone(referredByPhone, raw.tenant_id);

              if (referrerCustomerOriginal) {
                referredBy = referrerCustomerOriginal.id;
                console.log(`✅ Referral found (original format): Customer ${referredBy} (${referredByPhone}) referred this order`);
              } else {
                // Simpan versi normalized untuk konsistensi database
                referredByPhone = normalizedPhone;
                console.log(`⚠️  Referral phone ${normalizedPhone} not found in customers, saving normalized phone`);
              }
            }
          } else {
            console.log(`⚠️  Invalid referral phone format: ${referredByPhone}, saving as is`);
          }
        } catch (error) {
          console.error(`❌ Error looking up referral customer: ${error.message}`);
          // Continue without referral if lookup fails
        }
      }

      const orderData = {
        ...raw,
        payment_id: paymentId,
        referred_by: referredBy,
        referred_by_phone: referredByPhone,
      };
      const newOrder = await OrderRepository.create(orderData, transaction);
      return newOrder;
    } catch (error) {
      throw new Error(`Gagal membuat order: ${error.message}`);
    }
  }

  static async processOrderDetails(orderId, orderProductDetails, transaction, context = {}) {
    try {
      const tagNumbers = await this.buildTagNumbers(context, orderProductDetails.length, transaction);

      const routing = context.production_routing instanceof Map ? context.production_routing : null;
      const serviceTypes = context.service_types instanceof Map ? context.service_types : null;
      const costPrices = context.cost_prices instanceof Map ? context.cost_prices : null;
      const orderDetailsData = orderProductDetails.map((orderDetail, index) => {
        // production_branch_id selalu ditentukan server, jangan ikut payload client
        const { production_branch_id, ...detail } = orderDetail;
        // Item dapur selalu mulai dari `antrian`, bukan langsung selesai.
        const typeService = serviceTypes ? serviceTypes.get(String(detail.treatment_id)) : null;
        return {
          ...detail,
          // HPP di-snapshot dari katalog, bukan dari payload client
          cost_price: costPrices ? (costPrices.get(String(detail.treatment_id)) ?? null) : (detail.cost_price ?? null),
          status: resolveInitialDetailStatus(typeService, detail.status ?? null),
          order_id: orderId,
          production_branch_id: routing
            ? (routing.get(String(detail.treatment_id)) ?? context.branch_id ?? null)
            : (context.branch_id ?? null),
          tag_number: tagNumbers ? tagNumbers[index] : null,
          tag_date: tagNumbers ? moment(context.entry_date).format('YYYY-MM-DD') : null,
        };
      });

      const newOrderDetails = await OrderDetailRepository.bulkCreate(orderDetailsData, transaction);

      const shoePhotoPromises = newOrderDetails.map(async (orderDetail, index) => {
        const shoePhotosData = orderProductDetails[index]?.shoes_photos?.map(photo => ({
          ...photo,
          order_detail_id: orderDetail.id,
        })) || [];
        return ShoePhotoRepository.bulkCreate(shoePhotosData, transaction);
      });
      await Promise.all(shoePhotoPromises);

      // Potong stok barang (Indomie, Popmie, ...) di outlet transaksi.
      // Dilewati untuk treatment yang belum di-track stoknya (tiket, parkir, dll).
      // Error stok kurang melempar error → seluruh transaction order rollback.
      await StockService.deductForOrder(orderProductDetails, {
        tenantId: context.tenant_id || null,
        branchId: context.branch_id || null,
        userId: context.created_by || null,
        orderId,
      }, transaction);
    } catch (error) {
      throw new Error(`Gagal memproses detail order: ${error.message}`);
    }
  }

  static async getAllWithOption() {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const result = await OrderRepository.getAllWithOption(oneMonthAgo);
      if (!result || result.length === 0) throw new Error('No order found');

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getAll({ page, pageSize, startDate, endDate, search, dueStartDate, dueEndDate, paymentStartDate, paymentEndDate }, user_tenant_id = null, user_branch_id = null, user_role = null) {
    try {
      const offset = (page - 1) * pageSize;
      const pageSizeInt = parseInt(pageSize, 10);

      const totalCount = await OrderRepository.getTotalCount({ startDate, endDate, search, dueStartDate, dueEndDate, paymentStartDate, paymentEndDate, user_tenant_id, user_branch_id, user_role });
      const orders = await OrderRepository.getAllOrder({ offset, pageSizeInt, startDate, endDate, search, dueStartDate, dueEndDate, paymentStartDate, paymentEndDate, user_tenant_id, user_branch_id, user_role });

      const pagination = {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      };

      let statistics = {
        count_transaction: orders.length,
        count_services: 0,
        sum_revenue: 0,
        paid_revenue: 0,
        unpaid_revenue: 0,
        dp_revenue: 0,
        quantity_items: 0,
        payment_status: { paid: 0, unpaid: 0, dp: 0 },
        payment_method: { cash: 0, bank_transfer: 0, qris: 0 },
        service_status: {
          not_yet: 0,
          antrian: 0,
          on_progress: 0,
          pengeringan: 0,
          siap: 0,
          siap_diambil: 0,
          siap_dikirim: 0,
          done: 0,
          selesai: 0,
          cancelled: 0
        },
        payment_details: {
          total_paid: 0,
          methods: {
            cash: { count: 0, amount: 0 },
            bank_transfer: { count: 0, amount: 0 },
            qris: { count: 0, amount: 0 }
          }
        }
      };

      orders.forEach((order) => {
        // Hitung jumlah layanan dan item
        statistics.count_services += order.order_details.length;
        // ✅ Total Item = jumlah BARANG unik per order (item_id yang sama dipakai
        //    2 layanan tetap 1 item). ⚠️ JANGAN pakai order.quantity — itu angka
        //    isian kasir yang sering tidak akurat.
        const distinctItemIds = new Set();
        order.order_details.forEach((detail) => {
          if (detail.item_id) distinctItemIds.add(detail.item_id);
        });
        statistics.quantity_items += distinctItemIds.size;

        const finalPrice = parseFloat(order.payment.final_price);
        statistics.sum_revenue += finalPrice;

        // Kalkulasi pembayaran dari payment_details
        const totalPaid = order.payment.payment_details?.reduce((total, detail) => {
          const amount = parseFloat(detail.final_amount || 0);

          // Update statistik metode pembayaran
          if (detail.method) {
            statistics.payment_details.methods[detail.method].count++;
            statistics.payment_details.methods[detail.method].amount += amount;
          }

          return total + amount;
        }, 0) || 0;

        statistics.payment_details.total_paid += totalPaid;

        // Update status pembayaran
        if (totalPaid >= finalPrice) {
          statistics.paid_revenue += finalPrice;
          statistics.payment_status.paid++;
        } else if (totalPaid === 0) {
          statistics.unpaid_revenue += finalPrice;
          statistics.payment_status.unpaid++;
        } else {
          statistics.dp_revenue += totalPaid;
          // Sisa yang belum dibayar masuk ke unpaid_revenue
          statistics.unpaid_revenue += (finalPrice - totalPaid);
          statistics.payment_status.dp++;
        }

        // Update status layanan
        order.order_details.forEach((detail) => {
          if (detail.status && statistics.service_status.hasOwnProperty(detail.status)) {
            statistics.service_status[detail.status]++;
          }
        });
      });

      // Menghitung total transaksi per metode pembayaran
      Object.keys(statistics.payment_details.methods).forEach(method => {
        statistics.payment_method[method] = statistics.payment_details.methods[method].count;
      });

      return { statistics, orders, pagination }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getAllNew({ page, pageSize, filter }, user_tenant_id = null, user_branch_id = null, user_role = null) {
    try {
      const offset = (page - 1) * pageSize;
      const pageSizeInt = parseInt(pageSize, 10);

      // Kirim filter dinamis ke repository
      const { totalCount, orders } = await OrderRepository.getAllOrderNew({ offset, pageSizeInt, filter, user_tenant_id, user_branch_id, user_role });

      const pagination = {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      };

      // Hitung statistics dari seluruh dataset (tanpa pagination)
      // Filter hanya untuk date range, search, status, dll - TIDAK untuk pagination
      const statistics = await OrderRepository.getStatisticsNew({ filter, user_tenant_id, user_branch_id, user_role });

      return { statistics, orders, pagination };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getById(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
    try {
      const result = await OrderRepository.funcGetOrderById(id, user_tenant_id, user_branch_id, user_role);
      if (!result) throw new Error('Order not found');

      // `options_json` disimpan sebagai longtext, jadi Sequelize mengembalikannya
      // sebagai string. Parse dulu supaya FE menerima object (bukan karakter).
      const order = typeof result.toJSON === 'function' ? result.toJSON() : result;
      if (Array.isArray(order.order_details)) {
        order.order_details.forEach((detail) => OrderService.normalizeItemOptions(detail));
      }

      return order;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // static async update(raw, paymentData, orderProductDetails) {
  //   const transaction = await sequelize.transaction();
  //   try {
  //     if (!raw.id) throw new Error('Order ID is required');

  //     const existingOrder = await OrderRepository.getById(raw.id);
  //     if (!existingOrder) throw new Error('Order not found');

  //     // Format dates
  //     if (raw.entry_date) raw.entry_date = moment(raw.entry_date).format('YYYY-MM-DD');
  //     if (paymentData.date) paymentData.date = moment(paymentData.date).format('YYYY-MM-DD');
  //     if (orderProductDetails.due_date) orderProductDetails.due_date = moment(orderProductDetails.due_date).format('YYYY-MM-DD');

  //     // 1. Update Payment
  //     if (paymentData && existingOrder.payment_id) {
  //       await PaymentRepository.update(existingOrder.payment_id, paymentData, { transaction });
  //     }

  //     // 2. Update Order
  //     const orderData = { ...raw };
  //     delete orderData.id;
  //     await OrderRepository.update(raw.id, orderData, { transaction });

  //     // 3. Handle Order Details and Photos
  //     if (orderProductDetails?.length > 0) {
  //       // Get existing order details
  //       const existingOrderDetails = await OrderDetailRepository.getAllByOrderId(raw.id);

  //       // Delete order details (and their photos) that are not in the new data
  //       await Promise.all(
  //         existingOrderDetails.map(async (existingOrderDetail) => {
  //           const stillExists = orderProductDetails.find(detail => detail.id == existingOrderDetail.id);
  //           if (!stillExists) {
  //             await ShoePhotoRepository.deleteByOrderDetailId(existingOrderDetail.id, { transaction });
  //             await OrderDetailRepository.delete(existingOrderDetail.id, { transaction });
  //           }
  //         })
  //       );

  //       // Process each order detail
  //       await Promise.all(
  //         orderProductDetails.map(async (orderDetail) => {
  //           const orderDetailData = { ...orderDetail };
  //           const detailId = parseInt(orderDetail.id);

  //           // Cek apakah order detail baru atau existing
  //           if (detailId && detailId !== 0) {
  //             // Update existing order detail
  //             await OrderDetailRepository.update(detailId, orderDetailData, { transaction });

  //             // Handle photos for existing order detail
  //             const existingPhotos = await ShoePhotoRepository.getAllByOrderDetailId(detailId);
  //             const existingPhotoIds = existingPhotos.map(photo => photo.id);
  //             const newPhotoIds = orderDetail.shoes_photos.map(photo => photo.id);

  //             // Delete photos that are not in new data
  //             const photosToDelete = existingPhotoIds.filter(id => !newPhotoIds.includes(id));
  //             if (photosToDelete.length > 0) {
  //               await ShoePhotoRepository.bulkDelete(photosToDelete, { transaction });
  //             }

  //             // Update or create photos
  //             await Promise.all(
  //               orderDetail.shoes_photos.map(async (photo) => {
  //                 const photoData = { ...photo };
  //                 const photoId = parseInt(photo.id);

  //                 if (photoId && photoId !== 0) {
  //                   const existingPhoto = await ShoePhotoRepository.getById(photoId);
  //                   if (existingPhoto) {
  //                     await ShoePhotoRepository.update(photoId, photoData, { transaction });
  //                   } else {
  //                     delete photoData.id;
  //                     photoData.order_detail_id = detailId;
  //                     await ShoePhotoRepository.create(photoData, { transaction });
  //                   }
  //                 } else {
  //                   delete photoData.id;
  //                   photoData.order_detail_id = detailId;
  //                   await ShoePhotoRepository.create(photoData, { transaction });
  //                 }
  //               })
  //             );
  //           } else {
  //             // Create new order detail
  //             delete orderDetailData.id;
  //             orderDetailData.order_id = raw.id; // Pastikan order_id terisi
  //             const newOrderDetail = await OrderDetailRepository.create(orderDetailData, { transaction });

  //             // Create photos for new order detail
  //             await Promise.all(
  //               orderDetail.shoes_photos.map(async (photo) => {
  //                 const photoData = {
  //                   ...photo,
  //                   order_detail_id: newOrderDetail.id
  //                 };
  //                 delete photoData.id;
  //                 await ShoePhotoRepository.create(photoData, { transaction });
  //               })
  //             );
  //           }
  //         })
  //       );
  //     }

  //     await transaction.commit();

  //     const data = await OrderRepository.funcGetOrderById(raw.id);
  //     // update lead status to berhasil jika phone ada di lead
  //     // const lead = await LeadRepository.findByPhone(data.customer.phone);
  //     // if (lead) {
  //     //   await LeadRepository.update(lead.id, { status: 'Berhasil', is_converted: true, conversion_date: moment().format('YYYY-MM-DD HH:mm:ss') });
  //     // }

  //     return data;
  //   } catch (error) {
  //     await transaction.rollback();
  //     console.error('Update order error:', error.message);
  //     throw new Error(`Gagal mengupdate order: ${error.message}`);
  //   }
  // }


  static async update(raw, paymentData, orderProductDetails) {
    const transaction = await sequelize.transaction();
    let transactionCommitted = false; // ✅ FIX: Flag untuk track apakah transaction sudah di-commit
    let oldPaidAmount = 0; // Store untuk recalculate poin nanti (di scope function)
    try {
      // 0. Get original order to preserve the original branch_id for finance operations
      // This ensures cross-branch edits work (e.g., Pusat editing Droppoint orders)
      const originalOrder = await OrderRepository.getById(raw.id);
      if (!originalOrder) throw new Error('Order not found');
      const originalBranchId = originalOrder.branch_id;

      // Nomor antrian reset harian → kalau tanggal masuk berubah, nomor harus di-reissue
      const entryDateChanged = Boolean(raw.entry_date) && Boolean(originalOrder.entry_date) &&
        moment(raw.entry_date).format('YYYY-MM-DD') !== moment(originalOrder.entry_date).format('YYYY-MM-DD');

      // Override raw.branch_id with original for finance operations
      const rawWithOriginalBranch = { ...raw, branch_id: originalBranchId };

      // Dine-in / bawa pulang per item → ringkas ulang jadi order_type
      // (dine-in / takeaway / mixed) saat item diubah.
      const orderBranch = await Branch.findByPk(originalBranchId, {
        attributes: ['id', 'order_mode', 'kitchen_branch_id'],
        transaction
      });
      raw.branch_order_mode = orderBranch?.order_mode || 'loket';
      const newDetailTreatments = await this.fetchDetailTreatments(orderProductDetails, transaction, { onlyNew: true });
      this.assertCatalogMatchesBranchMode(raw, newDetailTreatments);
      const productionRouting = this.buildProductionRouting(newDetailTreatments, orderBranch, originalBranchId);
      this.normalizeServeMode(raw, orderProductDetails);

      // 1. Update Order
      // Note: branch_id is excluded to preserve the original order's branch (e.g., when Pusat edits Droppoint order)
      const { id, shift_id, branch_id, ...orderUpdatePayload } = raw;
      await OrderRepository.update(id, orderUpdatePayload, transaction);

      // 2. Update Payment
      await PaymentRepository.update(raw.payment_id, paymentData, transaction);

      // 3. Process Payment Details (use rawWithOriginalBranch for correct finance operations)
      try {
        const existingPaymentDetails = await PaymentDetailRepository.getByPaymentId(raw.payment_id);
        const paymentDetailsChanges = await this.detectChanges(existingPaymentDetails, paymentData.payment_details, 'id');
        await this.processUpdatePaymentDetails(paymentDetailsChanges, raw.payment_id, paymentData, rawWithOriginalBranch, transaction);
      } catch (error) {
        throw new Error(`Gagal mengupdate payment details: ${error.message}`);
      }

      // 4. Process Order Details (SEBELUM update payment, karena payment perlu order details yang sudah di-update)
      try {
        const existingOrderDetails = await OrderDetailRepository.getByOrderId(raw.id);
        const orderDetailsChanges = await this.detectChanges(existingOrderDetails, orderProductDetails, 'id');

        // Get old subtotal untuk compare
        const oldSubtotal = existingOrderDetails.reduce((sum, detail) => sum + parseFloat(detail.final_price || 0), 0);
        const newSubtotal = orderProductDetails.reduce((sum, detail) => sum + parseFloat(detail.final_price || 0), 0);
        const orderDetailsChanged = oldSubtotal !== newSubtotal || orderDetailsChanges.toDelete.length > 0 || orderDetailsChanges.toAdd.length > 0;

        await this.processUpdateOrderDetails(orderDetailsChanges, raw.id, transaction, {
          tenant_id: raw.tenant_id,
          branch_id: originalBranchId,
          entry_date: raw.entry_date || originalOrder.entry_date,
          // Kalau tanggal masuk berubah, penomoran ditunda ke reissueTagNumbers()
          // supaya tidak ada nomor yang terpakai dua kali.
          assignTagNumbers: !entryDateChanged,
          production_routing: productionRouting,
          service_types: this.buildServiceTypeMap(newDetailTreatments),
          cost_prices: this.buildCostPriceMap(newDetailTreatments),
        });

        // 4b. Reissue nomor antrian kalau tanggal masuk berubah
        if (entryDateChanged) {
          await this.reissueTagNumbers(
            raw.id,
            raw.tenant_id || originalOrder.tenant_id,
            originalBranchId,
            raw.entry_date,
            transaction
          );
        }

        // 5. Process Shoe Photos
        try {
          for (const orderDetail of orderDetailsChanges.toUpdate) {
            const existingPhotos = existingOrderDetails.find(detail => detail.id === orderDetail.id)?.shoes_photos || [];
            const shoePhotosChanges = await this.detectChanges(existingPhotos, orderDetail.shoes_photos, 'id');
            await this.processUpdateShoePhotos(orderDetail.id, shoePhotosChanges, transaction);
          }
        } catch (error) {
          throw new Error(`Gagal mengupdate shoe photos: ${error.message}`);
        }

        // 6. Recalculate payment SETELAH order details di-update (selalu, karena order details mungkin berubah)
        // Recalculate payment dengan order details baru (setelah order details di-update)
        const updatedPaymentData = await this.updatePayment(raw.payment_id, paymentData, orderProductDetails, transaction);

        // Store old status & paid_amount untuk handle poin nanti
        oldPaidAmount = updatedPaymentData._oldPaidAmount || 0;
        const oldPaymentStatus = updatedPaymentData._oldStatus;
        const newPaymentStatus = updatedPaymentData._newStatus;

        // Handle earning poin berdasarkan PointTransaction (lebih reliable daripada cek status change)
        try {
          const PointService = require('./pointService');
          const PointTransactionRepository = require('../repositories/pointTransactionRepository');
          const { Customer, Payment } = require('../models');

          // Get current payment status (dari database, bukan dari variable)
          const currentPayment = await Payment.findByPk(raw.payment_id, { transaction });
          if (!currentPayment) {
            throw new Error('Payment not found');
          }

          // Get existing earned points for this order (cek PointTransaction sebagai flag)
          const existingEarns = await PointTransactionRepository.getByOrderId(
            raw.id,
            raw.tenant_id
          );
          const earnedTransactions = existingEarns.filter(pt =>
            pt.customer_id === raw.customer_id &&
            pt.type === 'earn' &&
            pt.order_id === raw.id &&
            !pt.description?.includes('Refund') &&
            !pt.description?.includes('Recalculate') &&
            !pt.description?.includes('Reverse')
          );
          const totalEarnedPoints = earnedTransactions.reduce((sum, pt) => sum + (pt.points || 0), 0);
          // ✅ FIX: Calculate expectedPoints menggunakan earn_rate yang sama dengan PointService.earnPoints
          const pointConfig = await PointService.getPointConfig(raw.tenant_id);
          const expectedPoints = Math.floor(currentPayment.paid_amount / pointConfig.earn_rate);

          // Case 1: Status = 'paid' dan paid_amount > 0 → Pastikan poin sesuai dengan paid_amount
          // ✅ FIX: Selalu compare totalEarnedPoints dengan expectedPoints, bukan cek === 0
          // Ini mencegah duplikasi poin ketika payment detail dihapus lalu ditambah lagi
          if (currentPayment.status === 'paid' && currentPayment.paid_amount > 0) {
            if (totalEarnedPoints !== expectedPoints) {
              console.log(`🔄 Adjusting points: order #${raw.id} is paid (paid_amount: ${currentPayment.paid_amount}), earned=${totalEarnedPoints}, expected=${expectedPoints}`);

              const customer = await Customer.findByPk(raw.customer_id, { transaction });
              if (customer) {
                // Jika ada poin lama yang perlu di-reverse (soft delete transactions)
                if (totalEarnedPoints > 0) {
                  const { PointTransaction } = require('../models');
                  const earnedTransactionIds = earnedTransactions.map(tx => tx.id);
                  if (earnedTransactionIds.length > 0) {
                    // Reverse poin customer dulu sebelum soft delete transactions
                    const currentPoints = customer.points || 0;
                    const currentLifetimePoints = customer.lifetime_points || 0;
                    const reversedPoints = Math.max(0, currentPoints - totalEarnedPoints);
                    const reversedLifetimePoints = Math.max(0, currentLifetimePoints - totalEarnedPoints);

                    await customer.update({
                      points: reversedPoints,
                      lifetime_points: reversedLifetimePoints
                    }, { transaction });

                    await PointTransaction.destroy({
                      where: {
                        id: earnedTransactionIds
                      },
                      transaction
                    });
                    console.log(`✅ Reversed and soft deleted ${earnedTransactionIds.length} old earned point transactions (${totalEarnedPoints} points)`);

                    // Update customer reference untuk earnPoints berikutnya
                    await customer.reload({ transaction });
                  }
                }

                // Create new earn transaction (selalu jika expectedPoints > 0, karena poin lama sudah di-reverse)
                if (expectedPoints > 0) {
                  // ✅ FIX: earnPoints akan update customer points sendiri
                  await PointService.earnPoints(
                    raw.customer_id,
                    currentPayment.paid_amount,
                    raw.id,
                    transaction,
                    totalEarnedPoints > 0
                      ? `Recalculate poin dari update order #${raw.id} (paid_amount berubah menjadi ${currentPayment.paid_amount})`
                      : `Earned karena order #${raw.id} berstatus 'paid' dengan paid_amount ${currentPayment.paid_amount}`,
                    raw.tenant_id
                  );
                  console.log(`✅ Earned ${expectedPoints} points (replaced ${totalEarnedPoints} old points)`);
                }

                // Reload customer untuk mendapatkan points terbaru
                await customer.reload({ transaction });

                // ✅ REFERRAL BONUS: Diberikan saat order LUNAS (paid) - hanya saat first earn
                if (totalEarnedPoints === 0 && expectedPoints > 0) {
                  try {
                    // Get order untuk tahu referred_by
                    const { Order } = require('../models');
                    const order = await Order.findByPk(raw.id, { transaction });

                    if (order && order.referred_by) {
                      // Cek apakah sudah ada referral bonus transaction untuk order ini
                      // Cek dari semua point transactions untuk order ini, bukan hanya earned
                      const allOrderTransactions = await PointTransactionRepository.getByOrderId(
                        raw.id,
                        raw.tenant_id
                      );
                      const existingReferralBonus = allOrderTransactions.filter(pt =>
                        pt.type === 'bonus' &&
                        (pt.bonus_type === 'referral_referrer' || pt.bonus_type === 'referral_new_customer') &&
                        !pt.deletedAt
                      );

                      // Hanya berikan referral bonus jika belum ada (first earn)
                      if (existingReferralBonus.length === 0) {
                        const MembershipTierService = require('./membershipTierService');
                        const pointConfig = await PointService.getPointConfig(raw.tenant_id);
                        const referrerBonus = pointConfig.referral_bonus_referrer || 10;

                        // 1. Bonus untuk referrer
                        if (referrerBonus > 0) {
                          const referrerCustomer = await Customer.findByPk(order.referred_by, { transaction });
                          if (referrerCustomer) {
                            const referrerNewPoints = (referrerCustomer.points || 0) + referrerBonus;
                            const referrerNewLifetimePoints = (referrerCustomer.lifetime_points || 0) + referrerBonus;

                            await referrerCustomer.update({
                              points: referrerNewPoints,
                              lifetime_points: referrerNewLifetimePoints
                            }, { transaction });

                            // Create point transaction dengan order_id untuk tracking
                            await PointTransactionRepository.create({
                              customer_id: order.referred_by,
                              order_id: raw.id,
                              type: 'bonus',
                              bonus_type: 'referral_referrer',
                              points: referrerBonus,
                              description: `Referral bonus - Customer ${raw.customer_id} (Order #${raw.id}) melakukan order pertama`,
                              expires_at: null
                            }, transaction);

                            console.log(`✅ Referral bonus (+${referrerBonus} points) added to referrer ${order.referred_by}`);

                            // Auto-upgrade tier untuk referrer
                            await MembershipTierService.upgradeTier(
                              order.referred_by,
                              raw.tenant_id,
                              transaction
                            );
                          }
                        }

                        // 2. Bonus untuk customer baru (jika ini order pertama)
                        const { Op } = require('sequelize');
                        const previousOrdersForNewCustomer = await Order.count({
                          where: {
                            customer_id: raw.customer_id,
                            id: { [Op.ne]: raw.id },
                            deletedAt: null
                          },
                          transaction
                        });

                        const newCustomerBonus = pointConfig.referral_bonus_new_customer || 10;

                        if (previousOrdersForNewCustomer === 0 && newCustomerBonus > 0) {
                          const newCustomerPoints = (customer.points || 0) + newCustomerBonus;
                          const newCustomerLifetimePoints = (customer.lifetime_points || 0) + newCustomerBonus;

                          await customer.update({
                            points: newCustomerPoints,
                            lifetime_points: newCustomerLifetimePoints
                          }, { transaction });

                          // Create point transaction dengan order_id untuk tracking
                          await PointTransactionRepository.create({
                            customer_id: raw.customer_id,
                            order_id: raw.id,
                            type: 'bonus',
                            bonus_type: 'referral_new_customer',
                            points: newCustomerBonus,
                            description: `Referral bonus - Order #${raw.id} (dari referrer ${order.referred_by})`,
                            expires_at: null
                          }, transaction);

                          console.log(`✅ Referral bonus (+${newCustomerBonus} points) added to new customer ${raw.customer_id}`);
                        }
                      }

                      // Reload customer setelah referral bonus selesai (jika ada perubahan)
                      if (order.referred_by) {
                        await customer.reload({ transaction });
                      }
                    }
                  } catch (error) {
                    console.error('⚠️ Error processing referral bonus (non-critical):', error.message);
                    // Don't throw - referral bonus is not critical
                  }
                }

                // ✅ Check if this is first paid order untuk first order bonus (hanya saat first earn)
                if (totalEarnedPoints === 0 && expectedPoints > 0) {
                  try {
                    // Reload customer untuk memastikan points terbaru (setelah referral bonus jika ada)
                    await customer.reload({ transaction });

                    const { Op } = require('sequelize');
                    const { Order } = require('../models');
                    const previousPaidOrders = await Order.count({
                      where: {
                        customer_id: raw.customer_id,
                        id: { [Op.ne]: raw.id }, // Exclude current order
                        deletedAt: null
                      },
                      include: [{
                        model: Payment,
                        as: 'payment',
                        where: {
                          status: 'paid',
                          paid_amount: { [Op.gt]: 0 }
                        },
                        required: true
                      }],
                      transaction
                    });

                    // ✅ First order bonus: selalu diberikan jika customer baru dan enabled (bisa dapat bersamaan dengan referral bonus)
                    if (customer && !customer.has_received_first_order_bonus && previousPaidOrders === 0) {
                      console.log('🎉 First paid order detected! Checking first order bonus eligibility...');

                      // Get point config untuk first order bonus
                      const pointConfig = await PointService.getPointConfig(raw.tenant_id);

                      // Check if first order bonus is enabled and get bonus amount
                      if (pointConfig.first_order_bonus_enabled && pointConfig.first_order_bonus > 0) {
                        const firstOrderBonus = pointConfig.first_order_bonus;

                        // ✅ FIX: Customer sudah di-reload sebelumnya, gunakan points terbaru
                        const currentCustomerPoints = customer.points || 0;
                        const currentCustomerLifetimePoints = customer.lifetime_points || 0;

                        await customer.update({
                          points: currentCustomerPoints + firstOrderBonus,
                          lifetime_points: currentCustomerLifetimePoints + firstOrderBonus,
                          has_received_first_order_bonus: true
                        }, { transaction });

                        // Create point transaction dengan order_id untuk tracking
                        await PointTransactionRepository.create({
                          customer_id: raw.customer_id,
                          order_id: raw.id, // ✅ Set order_id untuk tracking
                          type: 'bonus',
                          bonus_type: 'first_order', // ✅ Spesifik jenis bonus
                          points: firstOrderBonus,
                          description: `First order bonus untuk order #${raw.id}`,
                          expires_at: null // First order bonus doesn't expire
                        }, transaction);

                        console.log(`✅ First order bonus (+${firstOrderBonus} points) added successfully, flag set to true, order_id: ${raw.id}`);
                      } else {
                        console.log('ℹ️ First order bonus disabled or amount is 0, skipping');
                        // Still set flag to prevent future checks
                        await customer.update({
                          has_received_first_order_bonus: true
                        }, { transaction });
                      }
                    } else if (customer && customer.has_received_first_order_bonus) {
                      console.log('ℹ️ Customer already received first order bonus, skipping');
                    }
                  } catch (error) {
                    console.error('⚠️ Error processing first order bonus (non-critical):', error.message);
                    // Don't throw - first order bonus is not critical
                  }
                }

                // Auto-upgrade tier berdasarkan lifetime_points
                // ✅ OPTION C: upgradeTier() akan otomatis skip jika customer punya active paid membership
                const MembershipTierService = require('./membershipTierService');
                await MembershipTierService.upgradeTier(
                  raw.customer_id,
                  raw.tenant_id,
                  transaction
                );
                console.log('✅ Tier upgrade checked after points adjustment');
              }
            } else {
              console.log(`ℹ️ Points already correct for order #${raw.id} (earned=${totalEarnedPoints}, expected=${expectedPoints}), skipping`);
            }
          }
          // Case 2: Status bukan 'paid' atau paid_amount = 0, tapi ada earned points → Reverse poin & soft delete earned transactions
          else if ((currentPayment.status !== 'paid' || currentPayment.paid_amount === 0) && totalEarnedPoints > 0) {
            console.log(`🔄 Reversing points: order #${raw.id} status is '${currentPayment.status}' with paid_amount=${currentPayment.paid_amount}, but has ${totalEarnedPoints} earned points`);
            const customer = await Customer.findByPk(raw.customer_id, { transaction });
            if (customer) {
              // ✅ Reverse earned points: kurangi points & lifetime_points (koreksi earning, bukan redeem)
              const currentPoints = customer.points || 0;
              const currentLifetimePoints = customer.lifetime_points || 0;
              let newPoints = Math.max(0, currentPoints - totalEarnedPoints);
              let newLifetimePoints = Math.max(0, currentLifetimePoints - totalEarnedPoints);

              // ✅ Reverse ALL bonus points (first order bonus + referral bonus) untuk customer ini
              // Semua bonus harus dihapus ketika status menjadi unpaid/dp
              const { Op } = require('sequelize');
              const { PointTransaction } = require('../models');

              // Cek semua bonus transactions untuk customer ini dan order ini
              const bonusTransactions = await PointTransaction.findAll({
                where: {
                  customer_id: raw.customer_id,
                  order_id: raw.id,
                  type: 'bonus',
                  deletedAt: null
                },
                transaction
              });

              let totalBonusPoints = 0;
              let hasFirstOrderBonus = false;

              if (bonusTransactions.length > 0) {
                // Filter dan calculate bonus points
                for (const bonusTx of bonusTransactions) {
                  const bonusType = bonusTx.bonus_type || '';
                  const description = bonusTx.description || '';

                  // Skip referral bonus untuk referrer (customer lain)
                  if (bonusType === 'referral_referrer') {
                    continue;
                  }

                  totalBonusPoints += (bonusTx.points || 0);
                  if (bonusType === 'first_order' || description.includes('First order bonus')) {
                    hasFirstOrderBonus = true;
                  }
                }

                if (totalBonusPoints > 0) {
                  // Reverse all bonus points: kurangi points & lifetime_points
                  newPoints = Math.max(0, newPoints - totalBonusPoints);
                  newLifetimePoints = Math.max(0, newLifetimePoints - totalBonusPoints);

                  // Soft delete all bonus transactions untuk customer ini
                  const bonusIds = bonusTransactions
                    .filter(tx => {
                      const bonusType = tx.bonus_type || '';
                      return bonusType !== 'referral_referrer'; // Skip referrer bonus (customer lain)
                    })
                    .map(tx => tx.id);

                  if (bonusIds.length > 0) {
                    await PointTransaction.destroy({
                      where: {
                        id: bonusIds
                      },
                      transaction
                    });
                  }

                  // Reset has_received_first_order_bonus flag jika ada first order bonus dan ini order pertama
                  if (hasFirstOrderBonus) {
                    const { Order } = require('../models');
                    const previousPaidOrders = await Order.count({
                      where: {
                        customer_id: raw.customer_id,
                        id: { [Op.ne]: raw.id },
                        deletedAt: null
                      },
                      include: [{
                        model: Payment,
                        as: 'payment',
                        where: {
                          status: 'paid',
                          paid_amount: { [Op.gt]: 0 }
                        },
                        required: true
                      }],
                      transaction
                    });

                    if (previousPaidOrders === 0) {
                      await customer.update({
                        has_received_first_order_bonus: false
                      }, { transaction });
                    }
                  }

                  console.log(`✅ Reversed ${totalBonusPoints} bonus points (first order + referral bonus)`);
                }
              }

              // Update customer points (sudah termasuk reverse earned + all bonuses)
              await customer.update({
                points: newPoints,
                lifetime_points: newLifetimePoints
              }, { transaction });

              // ✅ Handle referral bonus untuk referrer (customer lain) jika ada
              // Cek apakah ada referral bonus untuk referrer di order ini
              const referrerBonusTransactions = await PointTransaction.findAll({
                where: {
                  order_id: raw.id,
                  type: 'bonus',
                  bonus_type: 'referral_referrer',
                  deletedAt: null
                },
                transaction
              });

              if (referrerBonusTransactions.length > 0) {
                for (const referrerTx of referrerBonusTransactions) {
                  const referrerCustomerId = referrerTx.customer_id;
                  const referrerBonusPoints = referrerTx.points || 0;

                  if (referrerBonusPoints > 0 && referrerCustomerId !== raw.customer_id) {
                    // Reverse referral bonus untuk referrer
                    const referrerCustomer = await Customer.findByPk(referrerCustomerId, { transaction });
                    if (referrerCustomer) {
                      const referrerCurrentPoints = referrerCustomer.points || 0;
                      const referrerCurrentLifetimePoints = referrerCustomer.lifetime_points || 0;
                      const referrerNewPoints = Math.max(0, referrerCurrentPoints - referrerBonusPoints);
                      const referrerNewLifetimePoints = Math.max(0, referrerCurrentLifetimePoints - referrerBonusPoints);

                      await referrerCustomer.update({
                        points: referrerNewPoints,
                        lifetime_points: referrerNewLifetimePoints
                      }, { transaction });

                      // Soft delete referrer bonus transaction
                      await PointTransaction.destroy({
                        where: {
                          id: referrerTx.id
                        },
                        transaction
                      });

                      console.log(`✅ Reversed ${referrerBonusPoints} referral bonus untuk referrer ${referrerCustomerId} (points: ${referrerCurrentPoints} → ${referrerNewPoints})`);
                    }
                  }
                }
              }

              // Soft delete earned transactions yang lama
              const earnedTransactionIds = earnedTransactions.map(tx => tx.id);
              if (earnedTransactionIds.length > 0) {
                await PointTransaction.destroy({
                  where: {
                    id: earnedTransactionIds
                  },
                  transaction
                });
                console.log(`✅ Soft deleted ${earnedTransactionIds.length} earned point transactions`);
              }

              // ✅ FIX: Tidak perlu membuat transaction reverse earned poin
              // Karena:
              // 1. Customer points sudah dikurangi secara langsung di customer table (line 1340)
              // 2. Earned transactions sudah di-soft delete di atas
              // 3. Membuat transaction reverse akan menyebabkan double deduction
              // Transaction sudah tercatat melalui soft delete, tidak perlu create reverse transaction

              console.log(`✅ Reversed ${totalEarnedPoints} earned points + ${totalBonusPoints} bonus points (points: ${currentPoints} → ${newPoints}, lifetime: ${currentLifetimePoints} → ${newLifetimePoints})`);
            }
          }
        } catch (error) {
          console.error('⚠️ Error handling points (non-critical):', error.message);
        }

        // Handle points redeem/refund if changed + finance transaction
        if (updatedPaymentData._oldPointsRedeemed !== updatedPaymentData._newPointsToRedeem) {
          try {
            const PointService = require('./pointService');
            const PointTransactionRepository = require('../repositories/pointTransactionRepository');
            const { Customer, FinanceAccount, FinanceTransaction, Op } = require('../models');

            // ✅ FIX: Refund old points if exists (tidak perlu reverse finance transaction)
            // Catatan: oldPointsRedeemed adalah total dari semua redeem transactions untuk order ini
            // Jadi tidak perlu mencari exact match dengan single transaction, langsung refund total
            // ✅ IMPORTANT: Refund redeemed points hanya menambah points, TIDAK menambah lifetime_points
            // karena saat redeem tidak mengurangi lifetime_points
            if (updatedPaymentData._oldPointsRedeemed > 0) {
              const customer = await Customer.findByPk(updatedPaymentData._customerId, { transaction });
              if (customer) {
                // ✅ Refund poin langsung (tambah kembali ke customer points saja, TIDAK lifetime_points)
                await customer.update({
                  points: (customer.points || 0) + updatedPaymentData._oldPointsRedeemed
                  // ✅ TIDAK update lifetime_points karena saat redeem tidak mengurangi lifetime_points
                }, { transaction });

                // ✅ Create refund transaction record dengan type 'earn' untuk tracking
                // Type 'earn' digunakan untuk konsistensi, tapi tidak menambah lifetime_points
                await PointTransactionRepository.create({
                  customer_id: updatedPaymentData._customerId,
                  order_id: updatedPaymentData._orderId,
                  type: 'earn',
                  points: updatedPaymentData._oldPointsRedeemed,
                  description: `Refund poin dari update order #${updatedPaymentData._orderId} (sebelumnya ${updatedPaymentData._oldPointsRedeemed} poin diredeem) - TIDAK menambah lifetime_points`
                }, transaction);

                console.log(`✅ Refunded ${updatedPaymentData._oldPointsRedeemed} points from previous redeem (customer points: ${customer.points} → ${(customer.points || 0) + updatedPaymentData._oldPointsRedeemed}, lifetime_points unchanged)`);
              }
              // ✅ FIX: Tidak perlu reverse finance transaction untuk point redemption
              // Point redemption adalah discount, bukan expense riil, sudah tercatat di PointTransaction
            }

            // ✅ FIX: Redeem new points if exists (tidak perlu create finance transaction)
            if (updatedPaymentData._newPointsToRedeem > 0) {
              const redeemResult = await PointService.redeemPoints(
                updatedPaymentData._customerId,
                updatedPaymentData._newPointsToRedeem,
                updatedPaymentData._orderId,
                transaction,
                `Redeem poin untuk update order #${updatedPaymentData._orderId}`,
                updatedPaymentData._tenantId
              );
              console.log(`✅ Redeemed ${updatedPaymentData._newPointsToRedeem} points for updated order (discount: Rp ${redeemResult.discount_amount.toLocaleString('id-ID')})`);
              // ✅ FIX: Tidak perlu create finance transaction untuk point redemption
              // Point redemption adalah discount, bukan expense riil, sudah tercatat di PointTransaction
            }
          } catch (error) {
            console.error('⚠️ Error handling points redeem/refund (non-critical):', error.message);
          }
        }
      } catch (error) {
        throw new Error(`Gagal mengupdate order details: ${error.message}`);
      }

      await transaction.commit();
      // ✅ FIX: Set flag setelah commit untuk mencegah rollback di catch block
      transactionCommitted = true;

      let data = await OrderRepository.funcGetOrderById(raw.id, raw.tenant_id, raw.branch_id, 'superadmin', null);

      // Recalculate poin jika paid_amount berubah (karena order detail dihapus/ditambah)
      // Catatan: Earning poin utama sudah di-handle di atas (menggunakan PointTransaction sebagai flag)
      try {
        const { Payment } = require('../models');
        const PointTransactionRepository = require('../repositories/pointTransactionRepository');
        const updatedPayment = await Payment.findByPk(raw.payment_id);

        // oldPaidAmount dari variable yang disimpan sebelum commit

        // Hanya recalculate jika paid_amount berubah (karena order detail dihapus/ditambah)
        if (updatedPayment.status === 'paid' && updatedPayment.paid_amount > 0) {
          // Get existing earned points for this order
          const existingEarns = await PointTransactionRepository.getByOrderId(
            raw.id,
            raw.tenant_id
          );
          const earnedTransactions = existingEarns.filter(pt =>
            pt.customer_id === raw.customer_id &&
            pt.type === 'earn' &&
            pt.order_id === raw.id &&
            !pt.description?.includes('Refund') && // Exclude refund transactions
            !pt.description?.includes('Recalculate') && // Exclude previous recalculate transactions
            !pt.description?.includes('Reverse') // Exclude reverse transactions
          );

          const totalEarnedPoints = earnedTransactions.reduce((sum, pt) => sum + (pt.points || 0), 0);
          const expectedPoints = Math.floor(updatedPayment.paid_amount / 1000);

          // Recalculate poin hanya jika paid_amount berubah (karena order detail dihapus/ditambah)
          // oldPaidAmount dari variable yang disimpan sebelum commit
          const paidAmountChanged = oldPaidAmount !== 0 && oldPaidAmount !== updatedPayment.paid_amount;

          // Hanya recalculate jika paid_amount berubah DAN poin tidak sesuai
          // Jangan recalculate jika hanya update biasa tanpa perubahan paid_amount
          if (paidAmountChanged && totalEarnedPoints !== expectedPoints) {
            console.log(`🔄 Recalculating points: earned=${totalEarnedPoints}, expected=${expectedPoints} (paid_amount changed from ${oldPaidAmount} to ${updatedPayment.paid_amount})`);
            const PointService = require('./pointService');
            const { Customer } = require('../models');

            // Adjust poin customer
            const customer = await Customer.findByPk(raw.customer_id);
            if (customer) {
              const pointsDifference = expectedPoints - totalEarnedPoints;

              if (pointsDifference !== 0) {
                // Update customer points & lifetime_points
                const newPoints = (customer.points || 0) + pointsDifference;
                const newLifetimePoints = (customer.lifetime_points || 0) + pointsDifference;

                await customer.update({
                  points: newPoints,
                  lifetime_points: newLifetimePoints
                });

                // Create adjustment transaction
                await PointTransactionRepository.create({
                  customer_id: raw.customer_id,
                  order_id: raw.id,
                  type: pointsDifference > 0 ? 'earn' : 'redeem', // Positive = earn, negative = reverse
                  points: pointsDifference,
                  description: `Recalculate poin dari update order #${raw.id} (paid_amount berubah dari ${oldPaidAmount} ke ${updatedPayment.paid_amount})`
                });

                console.log(`✅ Points recalculated: ${pointsDifference > 0 ? '+' : ''}${pointsDifference} points`);

                // Auto-upgrade tier setelah recalculate
                const MembershipTierService = require('./membershipTierService');
                await MembershipTierService.upgradeTier(
                  raw.customer_id,
                  raw.tenant_id,
                  null
                );
                console.log('✅ Tier upgrade checked after points recalculation');
              }
            }
          } else {
            // Poin sudah benar atau tidak ada perubahan paid_amount
            if (totalEarnedPoints === expectedPoints && totalEarnedPoints > 0) {
              console.log('ℹ️ Points already correct, no recalculation needed');
            } else if (!paidAmountChanged && totalEarnedPoints === 0) {
              // Poin belum ada, tapi tidak perlu recalculate karena akan di-handle oleh logika di atas
              console.log('ℹ️ No paid_amount change detected, points will be handled by main earning logic');
            }
          }
        } else if (updatedPayment.status !== 'paid' && updatedPayment.paid_amount === 0) {
          // Status bukan 'paid' dan paid_amount = 0: pastikan tidak ada poin yang sudah earned
          const existingEarns = await PointTransactionRepository.getByOrderId(
            raw.id,
            raw.tenant_id
          );
          const earnedTransactions = existingEarns.filter(pt =>
            pt.customer_id === raw.customer_id &&
            pt.type === 'earn' &&
            pt.order_id === raw.id &&
            !pt.description?.includes('Refund') &&
            !pt.description?.includes('Recalculate') &&
            !pt.description?.includes('Reverse')
          );
          const totalEarnedPoints = earnedTransactions.reduce((sum, pt) => sum + (pt.points || 0), 0);

          // Reverse poin jika ada yang sudah earned & soft delete earned transactions
          if (totalEarnedPoints > 0) {
            console.log(`🔄 Reversing points: payment status is '${updatedPayment.status}' with paid_amount=0`);
            const { Customer, PointTransaction } = require('../models');

            const customer = await Customer.findByPk(raw.customer_id);
            if (customer) {
              // Reverse poin: kurangi points & lifetime_points (koreksi earning, bukan redeem)
              const currentPoints = customer.points || 0;
              const currentLifetimePoints = customer.lifetime_points || 0;
              const newPoints = Math.max(0, currentPoints - totalEarnedPoints);
              const newLifetimePoints = Math.max(0, currentLifetimePoints - totalEarnedPoints);

              await customer.update({
                points: newPoints,
                lifetime_points: newLifetimePoints
              });

              // Soft delete earned transactions yang lama
              const earnedTransactionIds = earnedTransactions.map(tx => tx.id);
              if (earnedTransactionIds.length > 0) {
                await PointTransaction.destroy({
                  where: {
                    id: earnedTransactionIds
                  }
                });
                console.log(`✅ Soft deleted ${earnedTransactionIds.length} earned point transactions`);
              }

              await PointTransactionRepository.create({
                customer_id: raw.customer_id,
                order_id: raw.id,
                type: 'redeem',
                points: -totalEarnedPoints,
                description: `Reverse poin karena payment status '${updatedPayment.status}' dengan paid_amount=0 untuk order #${raw.id}`
              });

              console.log(`✅ Reversed ${totalEarnedPoints} points (points: ${currentPoints} → ${newPoints}, lifetime: ${currentLifetimePoints} → ${newLifetimePoints})`);
            }
          }
        }
      } catch (error) {
        console.error('⚠️ Error processing points/tier from order update (non-critical):', error.message);
        // Don't throw error - points earning is not critical for order update
      }

      // ✅ FIX: Refresh order setelah semua logic poin selesai untuk mendapatkan customer points terbaru
      console.log('🔄 Refreshing order to get updated customer points...');
      data = await OrderRepository.funcGetOrderById(raw.id, raw.tenant_id, raw.branch_id, 'superadmin', null);
      console.log('✅ Order refreshed with updated customer points');

      return data;
    } catch (error) {
      // ✅ FIX: Hanya rollback jika transaction belum di-commit
      if (!transactionCommitted && transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw new Error(`Failed to update order: ${error.message}`);
    }
  }

  static async detectChanges(existingData, newData, key = 'id') {
    const toAdd = [];
    const toUpdate = [];
    const toDelete = [];

    // Buat map dari existing data berdasarkan key (biasanya 'id')
    const existingMap = new Map(existingData.map(item => [item[key], item]));

    // Cek data baru
    newData.forEach(item => {
      const existingItem = existingMap.get(item[key]);
      if (existingItem) {
        // Jika ditemukan dan berbeda, masukkan ke `toUpdate`
        const isDifferent = JSON.stringify(existingItem) !== JSON.stringify(item);
        if (isDifferent) {
          toUpdate.push(item);
        }
        // Hapus dari existingMap untuk menandai bahwa data ini masih ada
        existingMap.delete(item[key]);
      } else {
        // Jika tidak ditemukan, masukkan ke `toAdd`
        toAdd.push(item);
      }
    });

    // Data yang tersisa di existingMap adalah data yang tidak ada di input → `toDelete`
    existingMap.forEach((_, id) => toDelete.push(id));

    return { toAdd, toUpdate, toDelete };
  }

  static async updatePayment(paymentId, paymentData, orderProductDetails, transaction) {
    const { Discount, Order } = require('../models');
    const MembershipTierService = require('./membershipTierService');
    const PointService = require('./pointService');

    // Get order untuk dapat customer_id dan tenant_id (via order.payment_id)
    const order = await Order.findOne({
      where: { payment_id: paymentId },
      transaction
    });

    if (!order) {
      throw new Error(`Order with payment_id ${paymentId} not found`);
    }

    const payment = await PaymentRepository.getById(paymentId, order.tenant_id, null, transaction);
    if (!payment) {
      throw new Error(`Payment with id ${paymentId} not found`);
    }

    // Store old status untuk comparison
    const oldStatus = payment.status;
    const oldPaidAmount = payment.paid_amount || 0;
    if (!order) {
      throw new Error('Order not found for payment');
    }

    const totalService = orderProductDetails.length || 0;
    const totalProcessTimeCost = 0; // Process time cost dihilangkan

    // Calculate subtotal from order_details
    // subtotal = total dari final_price (setelah diskon item-level)
    const subtotal = Math.round(orderProductDetails.reduce((total, detail) => total + parseFloat(detail.final_price || 0), 0));
    // totalPrice = total dari price (harga asli sebelum diskon item-level) - digunakan untuk membership discount
    const totalPrice = Math.round(orderProductDetails.reduce((total, detail) => total + parseFloat(detail.price || 0), 0));

    // 1. Get membership discount (DISABLED - otomatis dari tier)
    // ❌ DISABLED: Membership discount otomatis di-nonaktifkan
    // const membershipDiscount = await MembershipTierService.getMembershipDiscount(
    //   order.customer_id,
    //   order.tenant_id
    // );
    // if (membershipDiscount && membershipDiscount.is_active) {
    //   membershipDiscountAmount = Math.round(
    //     totalPrice * (membershipDiscount.discount_percentage / 100)
    //   );
    //   console.log(`✅ UpdatePayment - Membership discount: ${membershipDiscount.membership_name} - ${membershipDiscount.discount_percentage}% = Rp ${membershipDiscountAmount.toLocaleString('id-ID')} (calculated from totalPrice: ${totalPrice.toLocaleString('id-ID')})`);
    // }
    let membershipDiscountAmount = 0; // Set to 0 - no automatic membership discount

    // 2. Calculate subtotal after membership discount
    const subtotalAfterMembership = Math.max(0, subtotal - membershipDiscountAmount);

    // 3. Handle points redeem (jika ada) - validate & calculate discount
    let pointsDiscountAmount = 0;
    let pointsRedeemed = 0;

    // Get point config untuk redeem_rate (dinamis dari settings) - dipanggil sekali untuk efisiensi
    const pointConfig = await PointService.getPointConfig(order.tenant_id);
    const redeemRateValue = pointConfig.redeem_rate * 100; // Convert to rupiah (e.g., 50 -> 5000)

    // ✅ FIX: Get oldPointsRedeemed dari PointTransaction (karena field tidak ada di Payment model)
    const PointTransactionRepository = require('../repositories/pointTransactionRepository');
    let oldPointsRedeemed = 0;
    try {
      const existingPointTransactions = await PointTransactionRepository.getByOrderId(
        order.id,
        order.tenant_id
      );

      // Filter redeem transactions (type: 'redeem' dengan points < 0)
      const redeemTransactions = existingPointTransactions.filter(pt =>
        pt.customer_id === order.customer_id &&
        pt.type === 'redeem' &&
        pt.points < 0 &&
        !pt.description?.includes('Refund') &&
        !pt.description?.includes('Reverse')
      );

      // Calculate total points redeemed (absolute value karena points < 0)
      if (redeemTransactions.length > 0) {
        oldPointsRedeemed = Math.abs(redeemTransactions.reduce((sum, tx) => sum + (tx.points || 0), 0));
        console.log(`✅ UpdatePayment - Found oldPointsRedeemed from PointTransaction: ${oldPointsRedeemed} points (${redeemTransactions.length} transactions)`);
      } else {
        console.log(`ℹ️ UpdatePayment - No redeem transactions found for order ${order.id}, oldPointsRedeemed = 0`);
      }
    } catch (error) {
      console.error('⚠️ UpdatePayment - Error getting oldPointsRedeemed from PointTransaction:', error.message);
      // Continue with oldPointsRedeemed = 0 if error
    }

    // ✅ FIX: Jika points_to_redeem tidak dikirim (undefined), pertahankan yang sudah ada
    // Jika dikirim sebagai 0 atau null, berarti user ingin menghapus points redeem
    const newPointsToRedeem = paymentData.hasOwnProperty('points_to_redeem')
      ? (paymentData.points_to_redeem || 0) // Jika dikirim (termasuk 0/null), gunakan nilainya
      : oldPointsRedeemed; // Jika tidak dikirim sama sekali, pertahankan yang sudah ada

    if (newPointsToRedeem > 0) {
      try {
        // ✅ FIX: Jika points tidak berubah, langsung preserve tanpa validasi
        // Tidak perlu cek points_discount, cukup cek apakah newPointsToRedeem === oldPointsRedeemed
        if (newPointsToRedeem === oldPointsRedeemed && oldPointsRedeemed > 0) {
          // Hitung points_discount dari oldPointsRedeemed (karena field tidak ada di Payment model)
          pointsDiscountAmount = Math.floor((oldPointsRedeemed / 100) * redeemRateValue);
          pointsRedeemed = oldPointsRedeemed;
          console.log(`✅ UpdatePayment - Preserving existing points redeem: ${pointsRedeemed} points = Rp ${pointsDiscountAmount.toLocaleString('id-ID')} discount (no validation needed)`);
        } else {
          // Points berubah, perlu validasi
          const validation = await PointService.validatePoints(
            order.customer_id,
            newPointsToRedeem,
            order.tenant_id
          );

          if (!validation.valid) {
            throw new Error(validation.message);
          }

          // Calculate discount amount using redeem_rate from settings (100 poin = Rp redeem_rate * 100)
          pointsDiscountAmount = Math.floor((newPointsToRedeem / 100) * redeemRateValue);
          pointsRedeemed = newPointsToRedeem;

          console.log(`✅ UpdatePayment - Points redeem validated: ${pointsRedeemed} points = Rp ${pointsDiscountAmount.toLocaleString('id-ID')} discount (redeem_rate: ${pointConfig.redeem_rate}, value: Rp ${redeemRateValue})`);
        }
      } catch (error) {
        console.error('❌ UpdatePayment - Error validating points:', error.message);
        throw new Error(`Points validation failed: ${error.message}`);
      }
    } else if (newPointsToRedeem === 0 && oldPointsRedeemed > 0) {
      // ✅ FIX: Jika points_to_redeem di-set ke 0 dan sebelumnya ada points, berarti user ingin menghapus points redeem
      pointsDiscountAmount = 0;
      pointsRedeemed = 0;
      console.log(`✅ UpdatePayment - Points redeem removed (was ${oldPointsRedeemed} points)`);
    }

    // 4. Calculate subtotal after membership and points discount
    const subtotalAfterPoints = Math.max(0, subtotalAfterMembership - pointsDiscountAmount);

    // 5. Calculate payment-level discount if discount_id exists (apply to subtotal after membership & points)
    let paymentDiscountAmount = 0;
    let discountId = paymentData.discount_id || null;

    if (discountId) {
      try {
        const paymentDiscount = await Discount.findByPk(discountId, { transaction });
        if (paymentDiscount && paymentDiscount.is_active) {
          const discVal = paymentDiscount.discount != null
            ? Number(paymentDiscount.discount)
            : Number(paymentDiscount.value) || 0;

          if (paymentDiscount.type === 'percent') {
            // Apply to subtotal after membership & points discount
            paymentDiscountAmount = Math.round(subtotalAfterPoints * (discVal / 100));
          } else if (paymentDiscount.type === 'nominal') {
            paymentDiscountAmount = Math.round(discVal);
          }
        } else {
          // Discount tidak aktif atau tidak ditemukan, set discount_id ke null
          discountId = null;
        }
      } catch (error) {
        console.error('Error fetching payment discount:', error);
        discountId = null;
      }
    }

    // Calculate final_price: subtotal - membership_discount - points_discount - payment_discount
    const totalDiscount = membershipDiscountAmount + pointsDiscountAmount + paymentDiscountAmount;
    const finalPrice = Math.max(0, Math.round(subtotal - totalDiscount));

    const totalPaid = Math.round(paymentData.payment_details.reduce((total, detail) => total + parseFloat(detail.final_amount || 0), 0));
    const remainingAmount = Math.round(finalPrice - totalPaid);
    const status = remainingAmount === 0 ? 'paid' : remainingAmount > 0 && remainingAmount < totalPrice ? 'dp' : 'unpaid';
    const method = paymentData.payment_details.map(detail => detail.method).join(', ');

    const newPaymentData = {
      ...payment,
      status: status,
      method: method,
      total_process_time_cost: totalProcessTimeCost,
      total_discount: totalDiscount, // Total: membership + points + payment discount
      total_price: totalPrice,
      final_price: finalPrice,
      discount_id: discountId, // Simpan discount_id
      date: moment().format('YYYY-MM-DD HH:mm:ss'),
      // Store points info for later use
      points_redeemed: pointsRedeemed || null,
      points_discount: pointsDiscountAmount || null,
      membership_discount: membershipDiscountAmount || null,

      total_service: totalService,
      subtotal: subtotal,
      paid_amount: totalPaid,
      remaining_amount: remainingAmount,
      updatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    }
    await PaymentRepository.update(paymentId, newPaymentData, transaction);

    // Handle points redeem/refund if changed (akan dilakukan di update() setelah order dibuat)
    // Store info untuk digunakan nanti
    newPaymentData._oldPointsRedeemed = oldPointsRedeemed;
    newPaymentData._newPointsToRedeem = newPointsToRedeem;
    newPaymentData._orderId = order.id;
    newPaymentData._customerId = order.customer_id;
    newPaymentData._tenantId = order.tenant_id;
    newPaymentData._oldStatus = oldStatus;
    newPaymentData._newStatus = status;
    newPaymentData._oldPaidAmount = oldPaidAmount;
    newPaymentData._newPaidAmount = totalPaid;

    return newPaymentData;
  }

  static async processUpdatePaymentDetails(changes, paymentId, paymentData, raw, transaction) {
    try {
      console.log('🔍 processUpdatePaymentDetails - Starting with changes:', {
        toDelete: changes.toDelete.length,
        toAdd: changes.toAdd.length,
        toUpdate: changes.toUpdate.length,
        paymentId,
        tenant_id: raw.tenant_id,
        branch_id: raw.branch_id
      });

      // Get payment status before changes untuk handle poin
      const { Payment, Order } = require('../models');
      const payment = await PaymentRepository.getById(paymentId, raw.tenant_id, null, transaction);
      if (!payment) {
        throw new Error(`Payment with id ${paymentId} not found`);
      }
      const order = await Order.findOne({ where: { payment_id: paymentId }, transaction });
      const paymentStatusBefore = payment.status;
      const paidAmountBefore = payment.paid_amount || 0;

      if (changes.toDelete.length > 0) {
        const deletedPaymentDetails = await PaymentDetailRepository.bulkDelete(changes.toDelete, transaction);


        for (const detail of deletedPaymentDetails) {
          console.log('🔍 processUpdatePaymentDetails - Deleting payment detail:', detail);

          // Ambil data finance transaction SEBELUM dihapus
          const financeTransaction = await FinanceTransactionRepository.getById(detail.transaction_id, raw.tenant_id, raw.branch_id, transaction);
          console.log('🔍 processUpdatePaymentDetails - Retrieved finance transaction before delete:', financeTransaction);

          // Validasi financeTransaction dan account_id
          if (!financeTransaction) {
            console.log('⚠️ processUpdatePaymentDetails - financeTransaction not found, skipping balance update');
            continue;
          }

          if (!financeTransaction.account_id) {
            console.log('⚠️ processUpdatePaymentDetails - financeTransaction.account_id is null, skipping balance update');
            continue;
          }

          // Hapus finance transaction
          const deleteResult = await FinanceTransactionRepository.delete(detail.transaction_id, raw.tenant_id, raw.branch_id, transaction);
          console.log('🔍 processUpdatePaymentDetails - Delete result:', deleteResult);

          // update finance account balance
          const financeAccount = await FinanceAccountRepository.getById(financeTransaction.account_id, raw.tenant_id, raw.branch_id, transaction);
          console.log('🔍 processUpdatePaymentDetails - financeAccount:', financeAccount ? 'found' : 'not found');

          if (financeAccount) {
            const newBalance = parseFloat(financeAccount.balance || 0) - parseFloat(financeTransaction.final_amount || 0);
            await FinanceAccountRepository.updateBalance(financeTransaction.account_id, newBalance, raw.tenant_id, transaction);
            console.log('✅ processUpdatePaymentDetails - Updated balance for account:', financeTransaction.account_id);
          }
        }
      }

      if (changes.toAdd.length > 0) {
        // add finance transaction
        for (const detail of changes.toAdd) {
          console.log('🔍 processUpdatePaymentDetails - Adding payment detail:', detail);
          console.log('🔍 processUpdatePaymentDetails - raw.tenant_id:', raw.tenant_id, 'raw.branch_id:', raw.branch_id);

          // Validasi account_id dan dapatkan account
          const financeAccount = await FinanceAccountRepository.getById(detail.account_id, raw.tenant_id, raw.branch_id, transaction);
          console.log('🔍 processUpdatePaymentDetails - financeAccount:', financeAccount ? 'found' : 'not found');

          if (!financeAccount) {
            throw new Error(`Finance account with id ${detail.account_id} not found`);
          }

          // ✅ Akun yang mewajibkan bukti bayar harus disertai foto
          if (financeAccount.requires_payment_proof && !detail.evidence_photo) {
            throw new Error(`Bukti pembayaran wajib diupload untuk akun ${financeAccount.name}`);
          }

          // Validasi dan fallback untuk data yang diperlukan
          const amount = parseFloat(detail.amount) || 0;
          const fee = parseFloat(detail.fee) || 0;
          const finalAmount = parseFloat(detail.final_amount) || amount; // fallback ke amount jika final_amount null

          console.log('🔍 processUpdatePaymentDetails - Calculated values:', {
            amount,
            fee,
            finalAmount,
            detailAmount: detail.amount,
            detailFee: detail.fee,
            detailFinalAmount: detail.final_amount
          });

          const financeTransactionData = {
            account_id: detail.account_id,
            is_checked: false,
            category_id: detail.finance_category_id || 1, // ✅ Use finance_category_id from frontend, fallback to 1
            amount: Math.round(amount),
            total_fee: Math.round(fee),
            final_amount: Math.round(finalAmount),
            description: `Uang Masuk ke ${financeAccount.name} dari ${paymentData?.code || 'Unknown Payment'}`,
            date: moment().format('YYYY-MM-DD HH:mm:ss'),
            tenant_id: raw.tenant_id, // Tambahkan tenant_id
            branch_id: raw.branch_id, // Tambahkan branch_id
            createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
            updatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
          }

          console.log('🔍 processUpdatePaymentDetails - financeTransactionData:', financeTransactionData);

          try {
            // Create finance transaction
            const newFinanceTransaction = await FinanceTransactionRepository.create(
              financeTransactionData.account_id,
              financeTransactionData.category_id,
              financeTransactionData.amount,
              financeTransactionData.final_amount,
              financeTransactionData.description,
              financeTransactionData.date,
              financeTransactionData.tenant_id,
              financeTransactionData.branch_id,
              transaction
            );

            // Create payment detail
            const paymentDetailData = {
              method: detail.method,
              amount: Math.round(parseFloat(detail.amount) || 0),
              fee: Math.round(parseFloat(detail.fee) || 0),
              interest: Math.round(parseFloat(detail.interest) || 0),
              final_amount: Math.round(parseFloat(detail.final_amount) || 0),
              evidence_photo: detail.evidence_photo,
              transaction_id: newFinanceTransaction.id,
              payment_id: paymentId,
              finance_account_id: detail.account_id || null, // ✅ Map account_id to finance_account_id
              finance_category_id: detail.finance_category_id || 1, // ✅ Add finance_category_id from frontend
              shift_id: detail.shift_id || raw.shift_id || null, // ✅ Prioritize detail.shift_id over raw.shift_id
              payment_method_id: detail.payment_method_id || null, // ✅ Add payment_method_id from frontend
              money_received: detail.money_received || null, // ✅ Cash change tracking: money received from customer
              change_amount: detail.change_amount || null, // ✅ Cash change tracking: change given to customer
              createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
              updatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
            }
            await PaymentDetailRepository.create(paymentDetailData, transaction);

            // Update finance account balance
            if (financeAccount) {
              const newBalance = Math.round(parseFloat(financeAccount.balance || 0) + parseFloat(detail.amount || 0));
              await FinanceAccountRepository.updateBalance(detail.account_id, newBalance, raw.tenant_id, transaction);
            }
          } catch (error) {
            console.error('Error processing payment detail:', error);
            throw new Error(`Failed to process payment detail: ${error.message}`);
          }
        }
      }

      if (changes.toUpdate.length > 0) {
        for (const detail of changes.toUpdate) {
          console.log('🔍 processUpdatePaymentDetails - Updating payment detail:', detail);
          const data = {
            method: detail.method,
            amount: Math.round(parseFloat(detail.amount) || 0),
            fee: Math.round(parseFloat(detail.fee) || 0),
            interest: Math.round(parseFloat(detail.interest) || 0),
            final_amount: Math.round(parseFloat(detail.final_amount) || 0),
            evidence_photo: detail.evidence_photo,
            money_received: detail.money_received || null, // ✅ Cash change tracking: money received from customer
            change_amount: detail.change_amount || null, // ✅ Cash change tracking: change given to customer
            updatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
          }
          await PaymentDetailRepository.update(detail.id, data, transaction);

          // get transaction
          const financeTransaction = await FinanceTransactionRepository.getById(detail.transaction_id, raw.tenant_id, raw.branch_id, transaction);
          console.log('🔍 processUpdatePaymentDetails - Retrieved finance transaction:', financeTransaction);

          // Validasi financeTransaction dan account_id
          if (!financeTransaction) {
            console.log('⚠️ processUpdatePaymentDetails - financeTransaction is null, skipping balance update');
            continue;
          }

          if (!financeTransaction.account_id) {
            console.log('⚠️ processUpdatePaymentDetails - financeTransaction.account_id is null, skipping balance update');
            continue;
          }

          // update finance account balance
          const financeAccount = await FinanceAccountRepository.getById(financeTransaction.account_id, raw.tenant_id, raw.branch_id, transaction);
          console.log('🔍 processUpdatePaymentDetails - financeAccount:', financeAccount ? 'found' : 'not found');

          // ✅ FIX: Update finance account balance with difference logic (OldBalance - OldAmount + NewAmount)
          // Saat ini financeTransaction masih pegang data LAMA karena belum diupdate
          const oldAmount = parseFloat(financeTransaction.amount || 0);
          const newAmount = parseFloat(detail.amount || 0);

          // 1. Update Finance Transaction Record first
          await FinanceTransactionRepository.update(
            financeTransaction.id,
            financeTransaction.account_id,
            financeTransaction.category_id,
            newAmount, // Update amount
            detail.final_amount, // Update final amount
            financeTransaction.description,
            financeTransaction.date,
            financeTransaction.is_checked,
            raw.tenant_id,
            raw.branch_id,
            transaction
          );

          if (financeAccount) {
            // 2. Update Finance Account Balance
            // Logic: Balance saat ini - Jumlah Lama + Jumlah Baru
            const currentBalance = parseFloat(financeAccount.balance || 0);
            const newBalance = Math.round(currentBalance - oldAmount + newAmount);

            await FinanceAccountRepository.updateBalance(financeTransaction.account_id, newBalance, raw.tenant_id, transaction);
            console.log(`✅ processUpdatePaymentDetails - Fixed balance update: ${currentBalance} - ${oldAmount} + ${newAmount} = ${newBalance}`);
          }
        }
      }

      // Handle poin setelah payment details berubah (akan di-handle di updatePayment setelah status di-recalculate)
      // Note: Poin akan di-handle di updatePayment() setelah status final diketahui

    } catch (error) {
      console.error('Error in processUpdatePaymentDetails:', error);
      throw new Error(`Gagal mengupdate payment details: ${error.message}`);
    }
  }

  static async processUpdateOrderDetails(changes, orderId, transaction, context = {}) {
    const routing = context.production_routing instanceof Map ? context.production_routing : null;
    const serviceTypes = context.service_types instanceof Map ? context.service_types : null;
    const costPrices = context.cost_prices instanceof Map ? context.cost_prices : null;

    if (changes.toDelete.length > 0) {
      await OrderDetailRepository.bulkDelete(changes.toDelete, transaction);
    }
    if (changes.toAdd.length > 0) {
      // Kalau tanggal masuk berubah, penomoran ditunda ke reissueTagNumbers()
      const shouldAssign = context.assignTagNumbers !== false;
      const tagNumbers = shouldAssign
        ? await this.buildTagNumbers(context, changes.toAdd.length, transaction)
        : null;
      const seqDate = tagNumbers ? moment(context.entry_date).format('YYYY-MM-DD') : null;

      let addIndex = 0;
      for (const detail of changes.toAdd) {
        // remove id from detail
        delete detail.id;
        // Nomor tag & cabang produksi selalu ditentukan server, jangan ikut payload client
        delete detail.tag_number;
        delete detail.tag_date;
        const productionBranchId = routing
          ? (routing.get(String(detail.treatment_id)) ?? context.branch_id ?? null)
          : (context.branch_id ?? null);
        const orderDetailData = {
          ...detail,
          // HPP di-snapshot dari katalog saat item ditambahkan
          ...(costPrices ? { cost_price: costPrices.get(String(detail.treatment_id)) ?? null } : {}),
          status: resolveInitialDetailStatus(
            serviceTypes ? serviceTypes.get(String(detail.treatment_id)) : null,
            detail.status ?? null
          ),
          order_id: orderId,
          production_branch_id: productionBranchId,
          tag_number: tagNumbers ? tagNumbers[addIndex] : null,
          tag_date: seqDate,
        }
        addIndex += 1;
        const newOrderDetail = await OrderDetailRepository.create(orderDetailData, transaction);
        const shoePhotosData = detail.shoes_photos.map(photo => ({
          ...photo,
          order_detail_id: newOrderDetail.id
        }));
        await ShoePhotoRepository.bulkCreate(shoePhotosData, transaction);
      }
    }
    if (changes.toUpdate.length > 0) {
      for (const detail of changes.toUpdate) {
        // Jangan biarkan client menimpa nomor tag yang sudah tersimpan,
        // dan HPP tetap memakai snapshot saat transaksi dibuat.
        const { tag_number, tag_date, cost_price, ...updatePayload } = detail;
        const routedBranchId = routing?.get(String(updatePayload.treatment_id));
        if (routedBranchId !== undefined) {
          updatePayload.production_branch_id = routedBranchId;
        } else {
          // Treatment tidak ikut berubah → cabang produksi tetap seperti tersimpan
          delete updatePayload.production_branch_id;
        }
        await OrderDetailRepository.update(updatePayload.id, updatePayload, transaction);
      }
    }
  }

  /**
   * Hitung nomor antrian tag untuk sejumlah item baru.
   * Reset harian per cabang, dasar tanggal = entry_date order.
   * Kalau context tidak lengkap (mis. order lama tanpa tenant/branch), kembalikan null (tidak diberi nomor).
   */
  static async buildTagNumbers(context = {}, count = 0, transaction = null) {
    if (!count || count <= 0) return [];
    const { tenant_id, branch_id, entry_date } = context;
    if (!tenant_id || !branch_id || !entry_date) return null;

    const seqDate = moment(entry_date).format('YYYY-MM-DD');
    return TagSequenceRepository.allocateBatch(tenant_id, branch_id, seqDate, count, transaction);
  }

  /**
   * Backfill / normalisasi nomor tag.
   * - Item yang belum punya nomor → diberi nomor.
   * - Item yang tanggal dasarnya (tag_date) beda dengan entry_date order
   *   (mis. tanggal masuk sudah diedit) → dinomori ulang dari tanggal baru.
   */
  static async assignTagNumbers(orderId, tenantId = null, branchId = null) {
    const { Order, OrderDetail } = require('../models');

    const order = await Order.findByPk(orderId);
    if (!order) throw new Error('Order tidak ditemukan');

    const effectiveTenantId = tenantId || order.tenant_id;
    const effectiveBranchId = branchId || order.branch_id;
    if (!effectiveTenantId || !effectiveBranchId) {
      throw new Error('Order tidak memiliki tenant_id/branch_id, tidak bisa diberi nomor antrian');
    }
    if (!order.entry_date) {
      throw new Error('Order tidak memiliki tanggal masuk (entry_date)');
    }

    const transaction = await sequelize.transaction();
    try {
      // Semua detail order (id asc) — yang sudah punya nomor tetap dipakai ulang
      const details = await OrderDetail.findAll({
        where: { order_id: orderId },
        order: [['id', 'ASC']],
        transaction,
      });

      const seqDate = moment(order.entry_date).format('YYYY-MM-DD');

      // Item yang perlu (re)nomor: belum punya nomor, atau tag_date sudah beda
      // dengan tanggal masuk order saat ini.
      const missingDetails = details.filter(detail => {
        if (detail.tag_number == null) return true;
        if (!detail.tag_date) return true;
        return moment(detail.tag_date).format('YYYY-MM-DD') !== seqDate;
      });

      if (missingDetails.length > 0) {
        const numbers = await TagSequenceRepository.allocateBatch(
          effectiveTenantId,
          effectiveBranchId,
          seqDate,
          missingDetails.length,
          transaction
        );

        for (let i = 0; i < missingDetails.length; i += 1) {
          await missingDetails[i].update(
            { tag_number: numbers[i], tag_date: seqDate },
            { transaction }
          );
        }
      }

      await transaction.commit();

      // Kembalikan seluruh nomor tag order ini (termasuk yang sudah ada sebelumnya)
      return details.map(detail => ({
        order_detail_id: detail.id,
        tag_number: detail.tag_number != null ? detail.tag_number : null,
      }));
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw new Error(`Gagal memberi nomor antrian: ${error.message}`);
    }
  }

  /**
   * Renumber SEMUA item aktif dalam satu order dari tanggal masuk baru.
   * Dipakai saat entry_date order diubah: nomor antrian lama (tanggal lama) hangus,
   * order ini dapat nomor baru dari counter tanggal baru.
   * Harus dipanggil di dalam transaksi update order agar counter ikut rollback.
   */
  static async reissueTagNumbers(orderId, tenantId, branchId, entryDate, transaction = null) {
    const { OrderDetail } = require('../models');

    if (!orderId || !tenantId || !branchId || !entryDate) return [];

    const seqDate = moment(entryDate).format('YYYY-MM-DD');

    const details = await OrderDetail.findAll({
      where: { order_id: orderId },
      order: [['id', 'ASC']],
      transaction,
    });

    if (details.length === 0) return [];

    const numbers = await TagSequenceRepository.allocateBatch(
      tenantId,
      branchId,
      seqDate,
      details.length,
      transaction
    );

    if (!numbers) return [];

    for (let i = 0; i < details.length; i += 1) {
      await details[i].update(
        { tag_number: numbers[i], tag_date: seqDate },
        { transaction }
      );
    }

    return details.map((detail, index) => ({
      order_detail_id: detail.id,
      tag_number: numbers[index],
    }));
  }

  static async processUpdateShoePhotos(orderDetailId, changes, transaction) {
    if (changes.toDelete.length > 0) {
      await ShoePhotoRepository.bulkDelete(changes.toDelete, transaction);
    }
    if (changes.toAdd.length > 0) {
      for (const photo of changes.toAdd) {
        const shoePhotoData = {
          ...photo,
          order_detail_id: orderDetailId,
        }
        await ShoePhotoRepository.create(shoePhotoData, transaction);
      }
    }
    if (changes.toUpdate.length > 0) {
      for (const photo of changes.toUpdate) {
        await ShoePhotoRepository.update(photo.id, photo, transaction);
      }
    }
  }



  static async delete(id, user_tenant_id, user_branch_id) {
    const transaction = await sequelize.transaction();
    try {
      console.log('🗑️ OrderService.delete - Starting deletion for order:', id);

      // 1. Get order with payment details
      const order = await OrderRepository.getById(id);
      if (!order) throw new Error('Order not found');

      console.log('🔍 OrderService.delete - Order found:', {
        id: order.id,
        payment_id: order.payment_id,
        tenant_id: order.tenant_id,
        branch_id: order.branch_id
      });

      // 2. Get payment details to handle finance transactions
      let paymentDetails = [];
      if (order.payment_id) {
        // ✅ FIX: Gunakan includeDeleted = true agar PaymentDetail yang sudah soft-deleted
        // juga diambil, sehingga FinanceTransaction terkait bisa di-soft-delete
        paymentDetails = await PaymentDetailRepository.getByPaymentId(order.payment_id, true);
        console.log('🔍 OrderService.delete - Payment details found (including deleted):', paymentDetails.length);

        // 3. Handle finance transactions reversal
        // NOTE: Use order.branch_id (not user_branch_id) for finance operations
        // This ensures cross-branch deletions work (e.g., Pusat deleting Droppoint orders)
        const orderBranchId = order.branch_id;
        for (const paymentDetail of paymentDetails) {
          if (paymentDetail.transaction_id) {
            console.log('🔍 OrderService.delete - Processing finance transaction:', paymentDetail.transaction_id);

            // Get finance transaction before deletion (use order's branch_id)
            const financeTransaction = await FinanceTransactionRepository.getById(paymentDetail.transaction_id, user_tenant_id, orderBranchId, transaction);
            if (financeTransaction && financeTransaction.account_id) {
              console.log('🔍 OrderService.delete - Finance transaction found:', {
                id: financeTransaction.id,
                account_id: financeTransaction.account_id,
                amount: financeTransaction.amount,
                final_amount: financeTransaction.final_amount
              });

              // Update finance account balance (REVERSE the transaction)
              const financeAccount = await FinanceAccountRepository.getById(financeTransaction.account_id, user_tenant_id, orderBranchId, transaction);
              if (financeAccount) {
                const newBalance = parseFloat(financeAccount.balance || 0) - parseFloat(financeTransaction.final_amount || 0);
                await FinanceAccountRepository.updateBalance(
                  financeTransaction.account_id,
                  newBalance,
                  user_tenant_id,
                  transaction
                );
                console.log('✅ OrderService.delete - Updated finance account balance:', {
                  account_id: financeTransaction.account_id,
                  old_balance: financeAccount.balance,
                  new_balance: newBalance
                });
              }

              // Soft delete finance transaction
              await FinanceTransactionRepository.delete(financeTransaction.id, user_tenant_id, orderBranchId, transaction);
              console.log('✅ OrderService.delete - Soft deleted finance transaction:', financeTransaction.id);
            }
          }
        }
      }

      // 4. Handle points refund (jika ada poin yang sudah diredeem) + reverse finance transaction
      try {
        const PointTransactionRepository = require('../repositories/pointTransactionRepository');
        const { Customer, FinanceTransaction, Payment, Op } = require('../models');

        // ✅ FIX: Get payment data untuk cek apakah pernah paid (untuk reverse earned points)
        let payment = null;
        if (order.payment_id) {
          payment = await Payment.findByPk(order.payment_id, { transaction });
        }

        // Get all point transactions for this order
        const pointTransactions = await PointTransactionRepository.getByOrderId(
          id,
          user_tenant_id
        );

        console.log('🔍 OrderService.delete - Point transactions found:', pointTransactions.length);
        console.log('🔍 OrderService.delete - Payment info:', {
          status: payment?.status,
          paid_amount: payment?.paid_amount,
          final_price: payment?.final_price,
          total_price: payment?.total_price,
          subtotal: payment?.subtotal
        });
        console.log('🔍 OrderService.delete - Point transactions details:', pointTransactions.map(pt => ({
          id: pt.id,
          type: pt.type,
          points: pt.points,
          description: pt.description,
          order_id: pt.order_id
        })));

        // ✅ FIX: Ambil customer state AWAL sebelum semua operasi untuk menghindari perhitungan salah
        const customer = await Customer.findByPk(order.customer_id, { transaction });
        if (!customer) {
          console.log('⚠️ OrderService.delete - Customer not found, skipping points handling');
        } else {
          // Get initial customer state
          const initialPoints = customer.points || 0;
          const initialLifetimePoints = customer.lifetime_points || 0;

          // Calculate all point changes
          let totalPointsChange = 0;
          let totalLifetimePointsChange = 0;
          let totalEarnedPoints = 0; // ✅ FIX: Declare di scope yang lebih luas untuk bisa diakses di bonus reversal

          // 4.0. Handle redeemed points and refund transactions
          // ✅ IMPORTANT: Saat delete order, kita perlu:
          // 1. Reverse semua refund transactions yang sudah menambah poin (karena mereka bagian dari order yang dihapus)
          // 2. Reverse redeemed transactions (dengan cara mengurangi poin yang sama dengan yang diredeem)
          // Net effect: poin dikembalikan ke state sebelum ada redeemed/refund dari order ini
          const redeemedTransactions = pointTransactions.filter(pt =>
            pt.type === 'redeem' && pt.points < 0 && pt.customer_id === order.customer_id
          );

          // ✅ FIX: Reverse refund transactions yang sudah ada (mereka sudah menambah poin, perlu di-reverse saat delete)
          const existingRefundTransactions = pointTransactions.filter(pt =>
            pt.type === 'earn' &&
            pt.customer_id === order.customer_id &&
            pt.order_id === id &&
            pt.description?.includes('Refund poin')
          );

          // Calculate total refunded points to reverse
          let totalRefundedToReverse = 0;
          for (const refundTx of existingRefundTransactions) {
            totalRefundedToReverse += (refundTx.points || 0);
          }

          // Calculate total redeemed points
          let totalPointsRedeemed = 0;
          for (const redeemTx of redeemedTransactions) {
            totalPointsRedeemed += Math.abs(redeemTx.points || 0);
          }

          // ✅ FIX: Net effect: 
          // - Reverse refund transactions: -totalRefundedToReverse (karena refund sudah menambah poin)
          // - Reverse redeemed: +totalPointsRedeemed (karena redeemed mengurangi poin, reverse berarti tambah kembali)
          // Net = -totalRefundedToReverse + totalPointsRedeemed
          // Tapi karena refund mengembalikan poin yang diredeem, net effect sebenarnya adalah:
          // Jika refund > redeemed: kita perlu kurangi excess refund
          // Jika refund < redeemed: kita perlu tambah kembali sisa redeemed yang belum di-refund
          // Jika refund = redeemed: net = 0 (sudah balance)

          if (redeemedTransactions.length > 0 || existingRefundTransactions.length > 0) {
            console.log('🔍 OrderService.delete - Found redeemed/refund points:', {
              redeemed: totalPointsRedeemed,
              refunded: totalRefundedToReverse,
              redeemedCount: redeemedTransactions.length,
              refundedCount: existingRefundTransactions.length
            });

            // ✅ FIX: Net change untuk redeemed/refund
            // Jika sudah ada refund transactions, mereka sudah menambah poin, jadi perlu di-reverse
            // Jika ada redeemed yang belum di-refund, perlu di-refund
            const netRedeemedRefundChange = totalPointsRedeemed - totalRefundedToReverse;

            if (netRedeemedRefundChange !== 0) {
              totalPointsChange += netRedeemedRefundChange;
              // lifetime_points TIDAK berubah karena refund/redeem tidak mempengaruhi lifetime

              console.log(`✅ OrderService.delete - Net redeemed/refund change: ${netRedeemedRefundChange > 0 ? '+' : ''}${netRedeemedRefundChange} points (redeemed: ${totalPointsRedeemed}, refunded: ${totalRefundedToReverse}, lifetime unchanged)`);
            } else {
              console.log(`ℹ️ OrderService.delete - Redeemed/refund already balanced (redeemed: ${totalPointsRedeemed}, refunded: ${totalRefundedToReverse}), no change needed`);
            }
            // ✅ FIX: Tidak perlu reverse finance transaction untuk point redemption
            // Point redemption adalah discount, bukan expense riil, sudah tercatat di PointTransaction
          } else {
            console.log('ℹ️ OrderService.delete - No redeemed/refund points found, skipping');
          }

          // 4.1. Reverse earned points (type: 'earn') - MENGURANGI points & lifetime_points
          // ✅ FIX: Cek dari PointTransaction DAN dari payment status untuk memastikan tidak ada yang terlewat
          // ✅ IMPORTANT: Hanya reverse REGULAR earning (bukan refund redeemed points)
          // Refund redeemed points TIDAK menambah lifetime_points, jadi TIDAK perlu di-reverse
          try {
            // Cek dari PointTransaction yang ada
            // ✅ FIX: Exclude refund transactions karena refund tidak menambah lifetime_points
            // Refund transactions adalah poin yang dikembalikan dari redeem, bukan earning baru
            // ✅ FIX: Filter earned transactions yang BELUM di-soft delete (deletedAt === null)
            // Jika sudah di-soft delete, berarti sudah di-reverse sebelumnya, jangan reverse lagi
            const earnedTransactions = pointTransactions.filter(pt =>
              pt.type === 'earn' &&
              pt.customer_id === order.customer_id &&
              pt.order_id === id &&
              !pt.deletedAt && // ✅ Exclude yang sudah di-soft delete
              !pt.description?.includes('Refund') &&
              !pt.description?.includes('Recalculate') &&
              !pt.description?.includes('Reverse')
            );

            // ✅ FIX: totalEarnedPoints sudah dideklarasikan di scope yang lebih luas
            if (earnedTransactions.length > 0) {
              console.log('🔍 OrderService.delete - Found active earned points from PointTransaction:', earnedTransactions.length);

              // Calculate total earned points to reverse (hanya regular earning yang belum di-soft delete)
              for (const earnTx of earnedTransactions) {
                totalEarnedPoints += (earnTx.points || 0);
              }
              console.log(`✅ OrderService.delete - Total active earned points to reverse: ${totalEarnedPoints}`);
            } else {
              // ✅ FIX: Jika tidak ada earned transactions yang aktif, cek apakah ada yang sudah di-soft delete
              const softDeletedEarned = pointTransactions.filter(pt =>
                pt.type === 'earn' &&
                pt.customer_id === order.customer_id &&
                pt.order_id === id &&
                pt.deletedAt && // Sudah di-soft delete
                !pt.description?.includes('Refund') &&
                !pt.description?.includes('Recalculate') &&
                !pt.description?.includes('Reverse')
              );

              if (softDeletedEarned.length > 0) {
                console.log('🔍 OrderService.delete - Earned transactions already soft-deleted (already reversed in previous update), skipping earned points reversal');
                totalEarnedPoints = 0; // Sudah di-reverse sebelumnya, jangan reverse lagi
              }
            }

            // ✅ FIX: Jika tidak ada earned points dari PointTransaction, cek beberapa kemungkinan:
            // 1. Payment masih paid (status = 'paid' dan paid_amount > 0)
            // 2. Payment sudah unpaid tapi ada redeemed points (berarti pernah paid dan earn points)
            //    - Cek dari payment.final_price atau payment history untuk tahu berapa yang pernah dibayar
            if (totalEarnedPoints === 0) {
              // Case 1: Payment masih paid
              if (payment && payment.status === 'paid' && payment.paid_amount > 0) {
                // Calculate expected points dari paid_amount (1 poin = Rp 1.000)
                const expectedPoints = Math.floor(payment.paid_amount / 1000);
                if (expectedPoints > 0) {
                  console.log(`⚠️ OrderService.delete - No earned points found in PointTransaction, but payment is paid (paid_amount: ${payment.paid_amount}), calculating from paid_amount: ${expectedPoints} points`);
                  totalEarnedPoints = expectedPoints;
                }
              }
              // Case 2: Payment sudah unpaid, tapi ada redeemed points (berarti pernah paid dan earn points)
              // ✅ FIX: Tapi jika earned transactions sudah di-soft delete, berarti sudah di-reverse sebelumnya
              // Jangan calculate lagi dari payment.final_price
              else if (redeemedTransactions.length > 0 && payment && earnedTransactions.length === 0) {
                // ✅ FIX: Jika tidak ada earned transactions sama sekali (semua sudah di-soft delete),
                // berarti earned points sudah di-reverse sebelumnya saat update payment
                // Jangan reverse lagi
                console.log('🔍 OrderService.delete - Payment is unpaid and no earned transactions found (already reversed), skipping earned points reversal');
                totalEarnedPoints = 0;
              } else if (redeemedTransactions.length > 0 && payment && earnedTransactions.length > 0) {
                // ✅ FIX: Hanya jika masih ada earned transactions yang belum di-soft delete
                // Cek dari payment.final_price untuk tahu berapa yang pernah dibayar (meskipun sekarang unpaid)
                // Atau cek dari payment history jika ada

                // Cek payment.final_price (ini biasanya tetap ada meskipun payment sudah dihapus/diubah)
                if (payment.final_price && payment.final_price > 0) {
                  // Calculate expected points dari final_price yang pernah dibayar (1 poin = Rp 1.000)
                  const expectedPoints = Math.floor(payment.final_price / 1000);
                  if (expectedPoints > 0) {
                    console.log(`⚠️ OrderService.delete - No earned points found in PointTransaction, but found redeemed points and payment.final_price exists (final_price: ${payment.final_price}), calculating from final_price: ${expectedPoints} points`);
                    totalEarnedPoints = expectedPoints;
                  }
                }
                // Jika final_price tidak ada, coba cek dari payment.total_price atau subtotal
                else if (payment.total_price && payment.total_price > 0) {
                  const expectedPoints = Math.floor(payment.total_price / 1000);
                  if (expectedPoints > 0) {
                    console.log(`⚠️ OrderService.delete - No earned points found in PointTransaction, but found redeemed points and payment.total_price exists (total_price: ${payment.total_price}), calculating from total_price: ${expectedPoints} points`);
                    totalEarnedPoints = expectedPoints;
                  }
                }
                // Jika masih tidak ada, log warning
                else {
                  console.log(`⚠️ OrderService.delete - Found redeemed points but cannot determine earned points (payment.final_price and total_price not available). Order likely was paid before but payment details were deleted. Points may need manual adjustment.`);
                }
              }
            }

            if (totalEarnedPoints > 0) {
              // Reverse earned points: kurangi points & lifetime_points
              totalPointsChange -= totalEarnedPoints;
              totalLifetimePointsChange -= totalEarnedPoints;

              // Create reverse transaction record
              await PointTransactionRepository.create({
                customer_id: order.customer_id,
                order_id: id,
                type: 'redeem', // Reverse as redeem
                points: -totalEarnedPoints, // Negative for reverse
                description: `Reverse earned poin dari delete order #${id} (${earnedTransactions.length > 0 ? `${earnedTransactions.length} transaksi` : `calculated from paid_amount ${payment?.paid_amount || 0}`})`
              }, transaction);

              console.log(`✅ OrderService.delete - Calculated reverse earned: -${totalEarnedPoints} points, -${totalEarnedPoints} lifetime_points`);
            } else {
              if (redeemedTransactions.length > 0) {
                console.log(`⚠️ OrderService.delete - Found redeemed points but cannot determine earned points to reverse (payment was deleted). Points may need manual adjustment.`);
              } else {
                console.log('ℹ️ OrderService.delete - No earned points to reverse (no PointTransaction and payment not paid)');
              }
            }
          } catch (error) {
            console.error('⚠️ OrderService.delete - Error handling earned points reversal (non-critical):', error.message);
            // Don't throw - earned points reversal is not critical for order deletion
          }

          // 4.2. Reverse bonus points (first order bonus & referral bonus) - MENGURANGI points & lifetime_points
          // ✅ FIX: Logic simple - ikuti perubahan order, jika order pertama dihapus, reverse bonus
          // Note: Bonus bisa untuk customer yang berbeda (referrer vs new customer)
          try {
            // Cek bonus dari PointTransaction yang ada
            const bonusTransactions = pointTransactions.filter(pt =>
              (pt.type === 'bonus' || pt.type === 'adjust') &&
              (pt.bonus_type === 'first_order' || pt.bonus_type === 'referral_referrer' || pt.bonus_type === 'referral_new_customer' || (pt.bonus_type === null && (pt.description?.includes('First order bonus') || pt.description?.includes('Referral bonus')))) // ✅ Gunakan bonus_type, dengan fallback ke description untuk backward compatibility
            );

            // ✅ FIX: Cek apakah ini order pertama customer (sebelum order ini dihapus)
            // Jika ya, dan tidak ada bonus transaction yang ditemukan, mungkin bonus sudah di-soft delete
            // Tapi kita tetap perlu cek apakah customer seharusnya dapat bonus dari order ini
            const { Order } = require('../models');
            const previousOrders = await Order.count({
              where: {
                customer_id: order.customer_id,
                id: { [Op.ne]: id }, // Exclude current order
                deletedAt: null
              },
              transaction
            });
            const isFirstOrder = previousOrders === 0;

            console.log('🔍 OrderService.delete - Order info:', {
              isFirstOrder,
              bonusTransactionsFound: bonusTransactions.length,
              customer_id: order.customer_id,
              referred_by: order.referred_by,
              referred_by_phone: order.referred_by_phone
            });

            // Group bonus by customer_id (karena bisa berbeda customer untuk referral)
            const bonusByCustomer = new Map();

            // Add bonus transactions yang ditemukan
            for (const bonusTx of bonusTransactions) {
              const customerId = bonusTx.customer_id;
              if (!bonusByCustomer.has(customerId)) {
                bonusByCustomer.set(customerId, []);
              }
              bonusByCustomer.get(customerId).push(bonusTx);
            }

            // ✅ FIX: Jika ini order pertama dan tidak ada bonus transaction yang ditemukan,
            // cek apakah customer pernah dapat first order bonus atau referral bonus
            // Logic: jika ini order pertama, kemungkinan besar customer dapat bonus dari order ini
            // Reverse bonus tersebut meskipun PointTransaction tidak ditemukan atau payment sudah unpaid
            // ✅ FIX: Cek flag has_received_first_order_bonus untuk tahu apakah customer pernah dapat first order bonus
            const customerForBonus = await Customer.findByPk(order.customer_id, { transaction });
            const hasReceivedFirstOrderBonus = customerForBonus?.has_received_first_order_bonus || false;

            if (isFirstOrder && bonusTransactions.length === 0) {
              // Ini order pertama, berarti customer mungkin dapat:
              // 1. First order bonus jika pernah paid DAN flag = true
              // 2. Referral bonus jika ada referral
              // 3. Referral bonus untuk referrer jika ada referral

              // Get point config untuk bonus values (fallback jika PointTransaction tidak ditemukan)
              const PointService = require('./pointService');
              const pointConfig = await PointService.getPointConfig(order.tenant_id);
              const firstOrderBonus = pointConfig.first_order_bonus || 10; // ✅ First order bonus dari settings (terpisah dari referral bonus)
              const referralBonusNewCustomer = pointConfig.referral_bonus_new_customer || 10;
              const referralBonusReferrer = pointConfig.referral_bonus_referrer || 10;

              let bonusToReverse = 0;

              // ✅ FIX: Cek apakah pernah paid
              // Jika final_price > 0 dan ada earned points yang di-reverse, berarti pernah paid
              // Atau jika payment status masih paid, berarti masih paid
              // Atau jika final_price > 0 dan ada redeemed points, berarti pernah paid (karena redeem hanya bisa jika ada poin dari paid order)
              const hasEarnedPoints = totalEarnedPoints > 0; // Dari scope sebelumnya
              const hasRedeemedPoints = redeemedTransactions.length > 0;
              const wasPaid = payment && (
                (payment.status === 'paid' && payment.paid_amount > 0) ||
                (payment.final_price > 0 && (hasEarnedPoints || hasRedeemedPoints)) // Ada earned atau redeemed points, berarti pernah paid
              );

              // Cek apakah ada referral
              const hasReferral = order.referred_by || order.referred_by_phone;

              // ✅ FIX: Cek flag has_received_first_order_bonus, bukan hanya wasPaid
              if (wasPaid && hasReceivedFirstOrderBonus) {
                // Jika pernah paid DAN flag = true, berarti dapat first order bonus
                bonusToReverse += firstOrderBonus;
                console.log(`⚠️ OrderService.delete - First order was paid and flag is true, assuming first order bonus (+${firstOrderBonus}) was given`);

                // ✅ Reset flag karena bonus di-reverse (customer bisa dapat lagi di order berikutnya jika masih first order)
                if (customerForBonus) {
                  await customerForBonus.update({
                    has_received_first_order_bonus: false
                  }, { transaction });
                  console.log(`✅ OrderService.delete - Reset has_received_first_order_bonus flag to false`);
                }
              } else if (wasPaid && !hasReceivedFirstOrderBonus) {
                console.log(`ℹ️ OrderService.delete - First order was paid but flag is false, skipping first order bonus reversal`);
              }

              if (hasReferral) {
                // Jika ada referral, customer baru dapat referral bonus
                bonusToReverse += referralBonusNewCustomer;
                console.log(`⚠️ OrderService.delete - First order has referral but no bonus transaction found, assuming referral bonus (+${referralBonusNewCustomer}) was given to new customer`);

                // Referrer juga dapat bonus, tapi itu customer lain, handle separately
                if (order.referred_by && order.referred_by !== order.customer_id) {
                  if (!bonusByCustomer.has(order.referred_by)) {
                    bonusByCustomer.set(order.referred_by, []);
                  }
                  bonusByCustomer.get(order.referred_by).push({
                    customer_id: order.referred_by,
                    points: referralBonusReferrer,
                    description: 'Referral bonus for referrer (virtual - transaction not found)'
                  });
                  console.log(`⚠️ OrderService.delete - Referrer bonus (+${referralBonusReferrer}) will be reversed for customer`, order.referred_by);
                }
              }

              // Add bonus untuk order customer jika ada
              if (bonusToReverse > 0) {
                if (!bonusByCustomer.has(order.customer_id)) {
                  bonusByCustomer.set(order.customer_id, []);
                }
                bonusByCustomer.get(order.customer_id).push({
                  customer_id: order.customer_id,
                  points: bonusToReverse,
                  description: `First order bonus${hasReferral ? ' + referral bonus' : ''} (virtual - transaction not found)`
                });
              }
            }

            if (bonusByCustomer.size > 0) {
              console.log('🔍 OrderService.delete - Found bonus points to reverse:', bonusByCustomer.size, 'customers');

              // Handle bonus reversal per customer
              for (const [bonusCustomerId, bonusTxs] of bonusByCustomer) {
                try {
                  // Calculate total bonus points to reverse for this customer
                  let totalBonusPoints = 0;
                  for (const bonusTx of bonusTxs) {
                    totalBonusPoints += Math.abs(bonusTx.points || 0);
                  }

                  if (totalBonusPoints > 0) {
                    // Jika bonus untuk customer yang sama dengan order customer, kurangi dari total change
                    if (bonusCustomerId === order.customer_id) {
                      totalPointsChange -= totalBonusPoints;
                      totalLifetimePointsChange -= totalBonusPoints;

                      // Create reverse transaction record
                      await PointTransactionRepository.create({
                        customer_id: bonusCustomerId,
                        order_id: id,
                        type: 'redeem', // Reverse as redeem
                        points: -totalBonusPoints, // Negative for reverse
                        description: `Reverse bonus poin dari delete order #${id} (${bonusTxs.length} transaksi${isFirstOrder && bonusTransactions.length === 0 ? ' - first order bonus' : ''})`
                      }, transaction);

                      console.log(`✅ OrderService.delete - Calculated reverse bonus for customer ${bonusCustomerId}: -${totalBonusPoints} points, -${totalBonusPoints} lifetime_points`);
                    } else {
                      // Bonus untuk customer lain (misalnya referrer), handle separately
                      const bonusCustomer = await Customer.findByPk(bonusCustomerId, { transaction });
                      if (bonusCustomer) {
                        const bonusCurrentPoints = bonusCustomer.points || 0;
                        const bonusCurrentLifetimePoints = bonusCustomer.lifetime_points || 0;
                        const bonusNewPoints = Math.max(0, bonusCurrentPoints - totalBonusPoints);
                        const bonusNewLifetimePoints = Math.max(0, bonusCurrentLifetimePoints - totalBonusPoints);

                        await bonusCustomer.update({
                          points: bonusNewPoints,
                          lifetime_points: bonusNewLifetimePoints
                        }, { transaction });

                        // Create reverse transaction record
                        await PointTransactionRepository.create({
                          customer_id: bonusCustomerId,
                          order_id: id,
                          type: 'redeem', // Reverse as redeem
                          points: -totalBonusPoints, // Negative for reverse
                          description: `Reverse ${bonusTxs[0].bonus_type === 'first_order' ? 'first order' : (bonusTxs[0].bonus_type === 'referral_referrer' || bonusTxs[0].bonus_type === 'referral_new_customer' ? 'referral' : (bonusTxs[0].description?.includes('First order') ? 'first order' : 'referral'))} bonus dari delete order #${id}` // ✅ Gunakan bonus_type, dengan fallback ke description untuk backward compatibility
                        }, transaction);

                        console.log(`✅ OrderService.delete - Reversed ${totalBonusPoints} bonus points from customer ${bonusCustomerId} (points: ${bonusCurrentPoints} → ${bonusNewPoints}, lifetime: ${bonusCurrentLifetimePoints} → ${bonusNewLifetimePoints})`);
                      } else {
                        console.log(`⚠️ OrderService.delete - Customer ${bonusCustomerId} not found for bonus reversal, skipping`);
                      }
                    }
                  }
                } catch (error) {
                  console.error(`⚠️ OrderService.delete - Error reversing bonus for customer ${bonusCustomerId}:`, error.message);
                  // Continue with other bonus reversals
                }
              }
            } else {
              console.log('ℹ️ OrderService.delete - No bonus points found, skipping reversal');
            }

            // ✅ FIX: Reset has_received_first_order_bonus flag jika tidak ada paid order lain setelah delete
            // Ini penting agar customer bisa dapat first order bonus lagi di order berikutnya jika masih first order
            try {
              const { Customer } = require('../models');
              const customerForFlagReset = await Customer.findByPk(order.customer_id, { transaction });
              if (customerForFlagReset && customerForFlagReset.has_received_first_order_bonus) {
                // Cek apakah masih ada paid order lain untuk customer ini (setelah order ini dihapus)
                const { Order: OrderModel, Payment } = require('../models');
                const { Op } = require('sequelize');
                const remainingPaidOrders = await OrderModel.count({
                  where: {
                    customer_id: order.customer_id,
                    id: { [Op.ne]: id }, // Exclude current order yang akan dihapus
                    deletedAt: null
                  },
                  include: [{
                    model: Payment,
                    as: 'payment',
                    where: {
                      status: 'paid',
                      paid_amount: { [Op.gt]: 0 }
                    },
                    required: true
                  }],
                  transaction
                });

                // Jika tidak ada paid order lain, reset flag
                if (remainingPaidOrders === 0) {
                  await customerForFlagReset.update({
                    has_received_first_order_bonus: false
                  }, { transaction });
                  console.log(`✅ OrderService.delete - Reset has_received_first_order_bonus flag to false (no remaining paid orders for customer ${order.customer_id})`);
                } else {
                  console.log(`ℹ️ OrderService.delete - Keeping has_received_first_order_bonus flag true (customer ${order.customer_id} still has ${remainingPaidOrders} paid order(s))`);
                }
              }
            } catch (error) {
              console.error('⚠️ OrderService.delete - Error resetting has_received_first_order_bonus flag (non-critical):', error.message);
              // Don't throw - flag reset is not critical for order deletion
            }
          } catch (error) {
            console.error('⚠️ OrderService.delete - Error handling bonus points reversal (non-critical):', error.message);
            // Don't throw - bonus reversal is not critical for order deletion
          }

          // ✅ FIX: Update customer SEKALI dengan total perubahan (hanya untuk order customer, bukan bonus customer lain)
          if (totalPointsChange !== 0 || totalLifetimePointsChange !== 0) {
            const finalPoints = Math.max(0, initialPoints + totalPointsChange);
            const finalLifetimePoints = Math.max(0, initialLifetimePoints + totalLifetimePointsChange);

            await customer.update({
              points: finalPoints,
              lifetime_points: finalLifetimePoints
            }, { transaction });

            console.log(`✅ OrderService.delete - Updated customer ${order.customer_id} points: ${initialPoints} → ${finalPoints} (change: ${totalPointsChange > 0 ? '+' : ''}${totalPointsChange}), lifetime: ${initialLifetimePoints} → ${finalLifetimePoints} (change: ${totalLifetimePointsChange > 0 ? '+' : ''}${totalLifetimePointsChange})`);

            // ✅ OPTION C: Re-evaluate tier setelah reverse poin, tapi skip jika ada active paid membership
            try {
              const { CustomerMembership } = require('../models');
              const MembershipTierService = require('./membershipTierService');

              // Reload customer dengan current_membership untuk cek paid membership
              await customer.reload({
                include: [{
                  model: CustomerMembership,
                  as: 'current_membership',
                  required: false
                }],
                transaction
              });

              // Cek apakah customer punya active paid membership
              const hasActivePaidMembership = customer.current_membership &&
                customer.current_membership.status === 'active' &&
                customer.current_membership.payment_id !== null &&
                customer.current_membership.payment_id !== undefined;

              if (hasActivePaidMembership) {
                console.log(`ℹ️ OrderService.delete - Customer ${order.customer_id} has active paid membership, skipping tier re-evaluation`);
              } else {
                // Re-evaluate tier berdasarkan lifetime_points yang baru
                await MembershipTierService.upgradeTier(
                  order.customer_id,
                  user_tenant_id,
                  transaction
                );
                console.log(`✅ OrderService.delete - Tier re-evaluated after points reversal for customer ${order.customer_id}`);
              }
            } catch (error) {
              console.error('⚠️ OrderService.delete - Error re-evaluating tier (non-critical):', error.message);
              // Don't throw - tier re-evaluation is not critical for order deletion
            }
          } else {
            console.log('ℹ️ OrderService.delete - No points changes for customer, skipping update');
          }
        }

        // 4.3. Soft delete all PointTransactions for this order
        try {
          const { PointTransaction } = require('../models');
          const deletedCount = await PointTransaction.destroy({
            where: {
              order_id: id
            },
            transaction
          });
          console.log(`✅ OrderService.delete - Soft deleted ${deletedCount} point transactions for order #${id}`);
        } catch (error) {
          console.error('⚠️ OrderService.delete - Error soft deleting point transactions (non-critical):', error.message);
          // Don't throw - point transaction deletion is not critical for order deletion
        }
      } catch (error) {
        console.error('⚠️ OrderService.delete - Error handling points refund (non-critical):', error.message);
        // Don't throw - points refund is not critical for order deletion
        // Continue with order deletion even if points refund fails
      }

      // 5. Soft delete Payment dan PaymentDetails secara eksplisit
      if (order.payment_id) {
        console.log('🔍 OrderService.delete - Soft deleting payment:', order.payment_id);

        // Soft delete Payment
        await PaymentRepository.delete(order.payment_id, transaction);
        console.log('✅ OrderService.delete - Soft deleted payment:', order.payment_id);

        // Soft delete PaymentDetails
        const paymentDetailIds = paymentDetails.map(detail => detail.id);
        if (paymentDetailIds.length > 0) {
          console.log('🔍 OrderService.delete - Soft deleting payment details:', paymentDetailIds);
          await PaymentDetailRepository.bulkDelete(paymentDetailIds, transaction);
          console.log('✅ OrderService.delete - Soft deleted payment details:', paymentDetailIds);
        }
      }

      // 5.5. Kembalikan stok barang yang terpotong saat order dibuat
      try {
        await StockService.restoreForOrder(id, {
          tenantId: order.tenant_id,
          branchId: order.branch_id,
          userId: order.created_by || null,
        }, transaction);
        console.log('✅ OrderService.delete - Stock restored for order:', id);
      } catch (error) {
        console.error('⚠️ OrderService.delete - Error restoring stock (non-critical):', error.message);
      }

      // 6. Soft delete order
      const { Order } = require('../models');
      const orderToDelete = await Order.findByPk(id, { transaction });
      if (orderToDelete) {
        await orderToDelete.destroy({ transaction });
        console.log('✅ OrderService.delete - Soft deleted order:', id);
      } else {
        throw new Error('Order not found for deletion');
      }

      await transaction.commit();
      console.log('✅ OrderService.delete - Transaction committed successfully');

      return { message: 'Order deleted successfully', order_id: id };
    } catch (error) {
      await transaction.rollback();
      console.error('❌ OrderService.delete - Error:', error.message);
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  };
}

module.exports = OrderService;