const reminderRepository = require('../repositories/reminderRepository');

const getReminders = async (params) => {
  const orders = await reminderRepository.getReminders(params);
  // Mapping prioritas
  const reminders = orders.map(order => {
    let priority = 'normal';
    if (order.status === 'diproses' && order.due_date && new Date(order.due_date) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)) {
      priority = 'high';
    } else if (order.status === 'selesai' && order.taken_at == null && order.finished_at && new Date(order.finished_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
      priority = 'medium';
    }
    return {
      id: order.id,
      order_number: order.order_number,
      customer: order.customer,
      status: order.status,
      due_date: order.due_date,
      finished_at: order.finished_at,
      remaining_payment: order.remaining_payment,
      priority,
      updatedAt: order.updatedAt,
    };
  });
  return reminders;
};

module.exports = { getReminders }; 