// Fungsi untuk grouping order detail berdasarkan treatment, discount, due_date, custom_price yang sama
// ✅ Match dengan frontend OrderDetail grouping logic
function groupOrderDetailsForInvoice(orderDetails = []) {
  if (!orderDetails.length) return [];
  const groupKey = (od) => [
    od.treatment_id,
    od.discount_id || 'null',
    od.due_date || '',
    od.custom_price != null ? od.custom_price : 'no_custom',
    od.custom_price_reason || 'no_reason'
  ].join('-');

  const groupMap = {};
  orderDetails.forEach(od => {
    const key = groupKey(od);
    if (!groupMap[key]) {
      groupMap[key] = {
        treatment_id: od.treatment_id,
        treatment: od.treatment || null,
        process_time: od.process_time || null,
        discount_id: od.discount_id || null,
        discount: od.discount || null,
        custom_price: od.custom_price != null ? od.custom_price : null,
        custom_price_reason: od.custom_price_reason || null,
        items: [],
        price: od.price,
        process_time_cost: od.process_time_cost,
        final_price: od.final_price,
        status: od.status,
        description: od.description,
      };
    }
    // tambahkan shoes photos kedalam item
    const shoesPhotos = od.shoes_photos || [];
    const due_date = od.due_date || null;
    const status = od.status || null;
    // Attach status_logs ke item (untuk progress photos & technician info)
    const statusLogs = od.status_logs || [];
    groupMap[key].items.push({
      ...od.item || od.item_id,
      shoes_photos: shoesPhotos,
      due_date,
      status,
      status_logs: statusLogs,
    });
  });
  return Object.values(groupMap);
}

// Fungsi utama transformasi order ke response invoice FE
function transformOrderToInvoiceResponse(order) {
  if (!order) return null;
  // Group order details
  const groupedOrderDetails = groupOrderDetailsForInvoice(order.order_details || []);

  // Transform payment (optional, bisa disesuaikan)
  const payment = order.payment || null;
  // Transform customer (optional, bisa disesuaikan)
  const customer = order.customer || null;

  return {
    id: order.id,
    customer,
    branch_id: order.branch_id,
    entry_date: order.entry_date,
    quantity: order.quantity,
    order_type: order.order_type,
    order_details: groupedOrderDetails,
    payment,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

module.exports = {
  groupOrderDetailsForInvoice,
  transformOrderToInvoiceResponse,
}; 