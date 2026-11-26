const OrderModalService = require('../services/orderModalService');
const ResponseHelper = require('../helpers/responseHelper');

class OrderModalController {
  /**
   * Get orders by payment status for modal display
   */
  static async getPaymentStatusOrders(req, res) {
    try {
      const { status } = req.params;
      const { startDate, endDate, page, pageSize, search } = req.query;
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.user.branch_id;
      const user_role = req.user.role;
      
      console.log('🔍 OrderModalController.getPaymentStatusOrders - Params:', {
        status,
        startDate,
        endDate,
        page,
        pageSize,
        search,
        user_tenant_id,
        user_branch_id,
        user_role
      });
      
      const result = await OrderModalService.getPaymentStatusOrders({
        status,
        startDate,
        endDate,
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 50,
        search,
        user_tenant_id,
        user_branch_id,
        user_role
      });
      
      console.log('✅ OrderModalController.getPaymentStatusOrders - Success:', {
        ordersCount: result.orders.length,
        pagination: result.pagination
      });
      
      res.json(ResponseHelper.successResponse(result, 'Payment status orders retrieved successfully'));
    } catch (error) {
      console.error('❌ OrderModalController.getPaymentStatusOrders - Error:', error);
      res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }
  
  /**
   * Get orders by service status for modal display
   */
  static async getServiceStatusOrders(req, res) {
    try {
      const { status } = req.params;
      const { startDate, endDate, page, pageSize, search } = req.query;
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.user.branch_id;
      const user_role = req.user.role;
      
      console.log('🔍 OrderModalController.getServiceStatusOrders - Params:', {
        status,
        startDate,
        endDate,
        page,
        pageSize,
        search,
        user_tenant_id,
        user_branch_id,
        user_role
      });
      
      const result = await OrderModalService.getServiceStatusOrders({
        status,
        startDate,
        endDate,
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 50,
        search,
        user_tenant_id,
        user_branch_id,
        user_role
      });
      
      console.log('✅ OrderModalController.getServiceStatusOrders - Success:', {
        ordersCount: result.orders.length,
        pagination: result.pagination
      });
      
      res.json(ResponseHelper.successResponse(result, 'Service status orders retrieved successfully'));
    } catch (error) {
      console.error('❌ OrderModalController.getServiceStatusOrders - Error:', error);
      res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }
}

module.exports = OrderModalController;
