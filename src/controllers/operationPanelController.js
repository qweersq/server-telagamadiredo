const OperationPanelService = require('../services/operationPanelService');
const ResponseHelper = require('../helpers/responseHelper');

class OperationPanelController {
  static async getOrderDetails(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const pageSize = parseInt(req.query.pageSize, 10) || 20;
      const status = req.query.status || null;
      const sort_by = req.query.sort_by || 'entry_date';   // 'entry_date' | 'due_date'
      const sort_dir = req.query.sort_dir || 'asc';        // 'asc' | 'desc'
      const start_date = req.query.start_date || null;
      const end_date = req.query.end_date || null;
      const search = req.query.search || null;
      const branch_id = req.query.branch_id
        ? parseInt(req.query.branch_id, 10)
        : req.user.branch_id;

      const data = await OperationPanelService.getOrderDetails({
        page,
        pageSize,
        status,
        sort_by,
        sort_dir,
        start_date,
        end_date,
        search,
        user_tenant_id: req.user.tenant_id,
        user_branch_id: branch_id,
        user_role: req.user.role,
      });

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      console.error('❌ OperationPanelController.getOrderDetails:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }
}

module.exports = OperationPanelController;
