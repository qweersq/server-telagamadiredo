const OperationPanelRepository = require('../repositories/operationPanelRepository');

class OperationPanelService {
  static async getOrderDetails({ page, pageSize, status, sort_by, sort_dir, start_date, end_date, search, user_tenant_id, user_branch_id, user_role }) {
    const offset = (page - 1) * pageSize;
    const { totalCount, orderDetails } = await OperationPanelRepository.getOrderDetails({
      offset,
      pageSize,
      status,
      sort_by,
      sort_dir,
      start_date,
      end_date,
      search,
      user_tenant_id,
      user_branch_id,
      user_role,
    });

    return {
      orderDetails,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      },
    };
  }
}

module.exports = OperationPanelService;
