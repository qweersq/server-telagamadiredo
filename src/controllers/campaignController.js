const { Campaign, CampaignCustomer, Customer, WhatsAppTemplate, Tenant, User, Order } = require('../models');
const { ResponseHelper } = require('../helpers');
const CampaignService = require('../services/campaignService');

class CampaignController {
    /**
     * Create new campaign
     * POST /api/campaigns
     */
    static async createCampaign(req, res) {
        try {
            const {
                name,
                message_content,
                target_audience = 'follow_up_30',
                follow_up_days = 30,
                template_id = null
            } = req.body;

            const tenant_id = req.user.tenant_id;
            const created_by = req.user.id;

            // Validate required fields
            if (!name || !message_content) {
                return res.status(400).json(ResponseHelper.errorResponse('Name and message content are required'));
            }

            const campaignData = {
                tenant_id,
                name,
                message_content,
                target_audience,
                follow_up_days,
                template_id,
                created_by
            };

            const result = await CampaignService.createCampaign(campaignData);

            return res.status(201).json(ResponseHelper.successResponse(result, 'Campaign created successfully'));

        } catch (error) {
            console.error('❌ Error creating campaign:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get all campaigns with pagination
     * GET /api/campaigns
     */
    static async getCampaigns(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                status = null,
                search = null
            } = req.query;

            const tenant_id = req.user.tenant_id;

            const result = await CampaignService.getCampaigns({
                tenant_id,
                page: parseInt(page),
                limit: parseInt(limit),
                status,
                search
            });

            return res.status(200).json(ResponseHelper.successResponse(result, 'Campaigns retrieved successfully'));

        } catch (error) {
            console.error('❌ Error getting campaigns:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get campaign by ID with details
     * GET /api/campaigns/:id
     */
    static async getCampaignById(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;

            const campaign = await CampaignService.getCampaignById(id, tenant_id);

            if (!campaign) {
                return res.status(404).json(ResponseHelper.errorResponse('Campaign not found'));
            }

            return res.status(200).json(ResponseHelper.successResponse(campaign, 'Campaign retrieved successfully'));

        } catch (error) {
            console.error('❌ Error getting campaign:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Update campaign
     * PUT /api/campaigns/:id
     */
    static async updateCampaign(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const tenant_id = req.user.tenant_id;

            const result = await CampaignService.updateCampaign(id, updateData, tenant_id);

            if (!result) {
                return res.status(404).json(ResponseHelper.errorResponse('Campaign not found'));
            }

            return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign updated successfully'));

        } catch (error) {
            console.error('❌ Error updating campaign:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Delete campaign
     * DELETE /api/campaigns/:id
     */
    static async deleteCampaign(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;

            const result = await CampaignService.deleteCampaign(id, tenant_id);

            if (!result) {
                return res.status(404).json(ResponseHelper.errorResponse('Campaign not found'));
            }

            return res.status(200).json(ResponseHelper.successResponse(null, 'Campaign deleted successfully'));

        } catch (error) {
            console.error('❌ Error deleting campaign:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Start campaign execution
     * POST /api/campaigns/:id/start
     */
    static async startCampaign(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;

            const result = await CampaignService.startCampaign(id, tenant_id);

            if (!result) {
                return res.status(404).json(ResponseHelper.errorResponse('Campaign not found'));
            }

            return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign started successfully'));

        } catch (error) {
            console.error('❌ Error starting campaign:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Pause campaign
     * POST /api/campaigns/:id/pause
     */
    static async pauseCampaign(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;

            const result = await CampaignService.pauseCampaign(id, tenant_id);

            if (!result) {
                return res.status(404).json(ResponseHelper.errorResponse('Campaign not found'));
            }

            return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign paused successfully'));

        } catch (error) {
            console.error('❌ Error pausing campaign:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get campaign progress
     * GET /api/campaigns/:id/progress
     */
    static async getCampaignProgress(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;

            const progress = await CampaignService.getCampaignProgress(id, tenant_id);

            if (!progress) {
                return res.status(404).json(ResponseHelper.errorResponse('Campaign not found'));
            }

            return res.status(200).json(ResponseHelper.successResponse(progress, 'Campaign progress retrieved successfully'));

        } catch (error) {
            console.error('❌ Error getting campaign progress:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Resume campaign
     * POST /api/campaigns/:id/resume
     */
    static async resumeCampaign(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;

            const result = await CampaignService.resumeCampaign(id, tenant_id);

            if (!result) {
                return res.status(404).json(ResponseHelper.errorResponse('Campaign not found'));
            }

            return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign resumed successfully'));

        } catch (error) {
            console.error('❌ Error resuming campaign:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get campaign customers
     * GET /api/campaigns/:id/customers
     */
    static async getCampaignCustomers(req, res) {
        try {
            const { id } = req.params;
            const {
                page = 1,
                limit = 20,
                status = null
            } = req.query;

            const tenant_id = req.user.tenant_id;

            const result = await CampaignService.getCampaignCustomers(id, tenant_id, {
                page: parseInt(page),
                limit: parseInt(limit),
                status
            });

            if (!result) {
                return res.status(404).json(ResponseHelper.errorResponse('Campaign not found'));
            }

            return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign customers retrieved successfully'));

        } catch (error) {
            console.error('❌ Error getting campaign customers:', error);
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    }

  /**
   * Reset campaign (after cooldown period)
   * POST /api/campaigns/:id/reset
   */
  static async resetCampaign(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.user.tenant_id;

      const result = await CampaignService.resetCampaign(id, tenant_id);

      if (!result) {
        return res.status(404).json(ResponseHelper.errorResponse('Campaign not found'));
      }

      return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign reset successfully'));

    } catch (error) {
      console.error('❌ Error resetting campaign:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Get customer count statistics
   * GET /api/campaigns/customer-count
   */
  static async getCustomerCount(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      const { target_audience = 'all' } = req.query;

      const result = await CampaignService.getCustomerCount(tenant_id, target_audience);

      return res.status(200).json(ResponseHelper.successResponse(result, 'Customer count retrieved successfully'));

    } catch (error) {
      console.error('❌ Error getting customer count:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Update customer last order date (for cron job)
   * POST /api/campaigns/update-last-order-date
   */
  static async updateLastOrderDate(req, res) {
    try {
      const result = await CampaignService.updateLastOrderDate();

      return res.status(200).json(ResponseHelper.successResponse(result, 'Last order date updated successfully'));

    } catch (error) {
      console.error('❌ Error updating last order date:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Get customer count preview for targeting
   * GET /api/campaigns/customer-count-preview
   */
  static async getCustomerCountPreview(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      const { target_audience = 'follow_up_30', follow_up_days = 30 } = req.query;

      const result = await CampaignService.getCustomerCountPreview(tenant_id, target_audience, follow_up_days);

      return res.status(200).json(ResponseHelper.successResponse(result, 'Customer count preview retrieved successfully'));

    } catch (error) {
      console.error('❌ Error getting customer count preview:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Process campaign batch for cron job (1 customer per campaign per cron run)
   * POST /api/campaigns/cron/process-batch
   */
  static async processCampaignBatch(req, res) {
    try {
      const result = await CampaignService.processCampaignBatch();

      return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign batch processed successfully'));

    } catch (error) {
      console.error('❌ Error processing campaign batch:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }
}

module.exports = CampaignController;
