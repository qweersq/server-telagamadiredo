const CalendarRepository = require('../repositories/calendarRepository');

class CalendarService {
  /**
   * Get calendar summary untuk sebulan
   * @param {Object} params - { month, year, type, user_tenant_id, user_branch_id, user_role }
   * @returns {Object} - { summary: { date: { counts } } }
   */
  static async getSummary({ month, year, type, user_tenant_id, user_branch_id, user_role }) {
    try {
      if (type === 'items') {
        // Summary untuk items berdasarkan due_date
        const summary = await CalendarRepository.getItemsSummaryByMonth({
          month,
          year,
          user_tenant_id,
          user_branch_id,
          user_role
        });
        return { summary };
      } else if (type === 'payments') {
        // Summary untuk payments berdasarkan entry_date
        const summary = await CalendarRepository.getPaymentsSummaryByMonth({
          month,
          year,
          user_tenant_id,
          user_branch_id,
          user_role
        });
        return { summary };
      } else {
        throw new Error('Invalid type. Must be "items" or "payments"');
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Get detail orders untuk tanggal tertentu
   * @param {Object} params - { date, type, user_tenant_id, user_branch_id, user_role, includeOtherItems }
   *   includeOtherItems = true (khusus type 'items') -> order tetap difilter
   *   berdasarkan due_date, tapi seluruh item milik order ikut dikembalikan
   *   agar frontend bisa menampilkan "item lainnya" (collapsed default).
   * @returns {Object} - { orders: [...] } (structure sama seperti orders-new-raw)
   */
  static async getDateDetails({ date, type, user_tenant_id, user_branch_id, user_role, includeOtherItems = false }) {
    try {
      if (type === 'items') {
        // Get orders dengan order_details yang due_date = date
        const orders = await CalendarRepository.getOrdersByDueDate({
          date,
          user_tenant_id,
          user_branch_id,
          user_role,
          includeOtherItems
        });
        return { orders };
      } else if (type === 'payments') {
        // Get orders dengan entry_date = date
        const orders = await CalendarRepository.getOrdersByEntryDate({
          date,
          user_tenant_id,
          user_branch_id,
          user_role
        });
        return { orders };
      } else {
        throw new Error('Invalid type. Must be "items" or "payments"');
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = CalendarService;

