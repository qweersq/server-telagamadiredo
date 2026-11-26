const OrderModalRepository = require('../repositories/orderModalRepository');

class OrderModalService {
  /**
   * Get orders by payment status for modal display
   */
  static async getPaymentStatusOrders(params) {
    try {
      console.log('🔍 OrderModalService.getPaymentStatusOrders - Processing:', params);
      
      const result = await OrderModalRepository.getPaymentStatusOrders(params);
      
      console.log('✅ OrderModalService.getPaymentStatusOrders - Completed:', {
        ordersCount: result.orders.length,
        pagination: result.pagination
      });
      
      return result;
    } catch (error) {
      console.error('❌ OrderModalService.getPaymentStatusOrders - Error:', error);
      throw new Error(error.message);
    }
  }
  
  /**
   * Get orders by service status for modal display
   */
  static async getServiceStatusOrders(params) {
    try {
      console.log('🔍 OrderModalService.getServiceStatusOrders - Processing:', params);
      
      const result = await OrderModalRepository.getServiceStatusOrders(params);
      
      console.log('✅ OrderModalService.getServiceStatusOrders - Completed:', {
        ordersCount: result.orders.length,
        pagination: result.pagination
      });
      
      return result;
    } catch (error) {
      console.error('❌ OrderModalService.getServiceStatusOrders - Error:', error);
      throw new Error(error.message);
    }
  }
}

module.exports = OrderModalService;
