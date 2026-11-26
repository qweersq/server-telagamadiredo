const LeadService = require('../services/LeadService');
const { ResponseHelper } = require('../helpers');


class LeadController {
  static async createLead(req, res) {
    try {
        const userId = req.user.id;
        const lead = await LeadService.createLead(userId, req.body);
        return res.status(201).send(ResponseHelper.successResponse(lead));
    } catch (error) {
        return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
}


  static async getLeads(req, res) {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const leads = await LeadService.getLeads(filters, page, limit);
      return res.status(200).send(ResponseHelper.successResponse(leads));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async getLead(req, res) {
    try {
      const lead = await LeadService.getLead(req.params.id);
      return res.status(200).send(ResponseHelper.successResponse(lead));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async updateLead(req, res) {
    try {
      const lead = await LeadService.updateLead(req.params.id, req.body);
      return res.status(200).send(ResponseHelper.successResponse(lead));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async deleteLead(req, res) {
    try {
        await LeadService.deleteLead(req.params.id);
      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async createFollowUp(req, res) {
    try {
      const record = await LeadService.createFollowUp(req.params.id, {
        ...req.body,
        follow_up_by: req.user.id,
        follow_up_at: new Date()
      });
      return res.status(201).send(ResponseHelper.successResponse(record));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async getLeadRecords(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const records = await LeadService.getLeadRecords(req.params.id, page, limit);
      return res.status(200).send(ResponseHelper.successResponse(records));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async updateLeadRecord(req, res) {
    try {
      const record = await LeadService.updateLeadRecord(req.params.id, req.body);
      return res.status(200).send(ResponseHelper.successResponse(record));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async getLeadsForFollowUp(req, res) {
    try {
      const leads = await LeadService.getLeadsForFollowUp();
      return res.status(200).send(ResponseHelper.successResponse(leads));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async getLeadReports(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const report = await LeadService.getLeadReports(
        new Date(startDate), 
        new Date(endDate)
      );
      return res.status(200).send(ResponseHelper.successResponse(report));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message));
    }
  }
}

module.exports = LeadController;