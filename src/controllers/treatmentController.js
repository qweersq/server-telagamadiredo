const TreatmentService = require('../services/treatmentService');
const { ResponseHelper } = require('../helpers');

// Dapur produksi: 'outlet' = masak di outlet penjual, 'central' = dapur outlet lain.
// `production_branch_id` hanya bermakna saat produksi 'central'.
const normalizeProductionFields = (body) => {
  const modeRaw = body.production_mode;
  const branchRaw = body.production_branch_id;

  if (modeRaw === undefined && branchRaw === undefined) return {};

  const productionMode = modeRaw === 'central' ? 'central' : modeRaw === 'outlet' ? 'outlet' : undefined;
  const branchId = branchRaw === null || branchRaw === '' || branchRaw === undefined
    ? null
    : Number(branchRaw);

  if (productionMode === 'outlet') {
    return { production_mode: 'outlet', production_branch_id: null };
  }

  const fields = {};
  if (productionMode) fields.production_mode = productionMode;
  if (branchId !== undefined && Number.isFinite(branchId) && branchId > 0) {
    fields.production_branch_id = branchId;
    // Ada dapur spesifik berarti produksi terpusat.
    fields.production_mode = 'central';
  } else if (branchId === null) {
    fields.production_branch_id = null;
  }
  return fields;
};

class TreatmentController {
  static async create(req, res) {
    try {
      const requiresTrackingRaw = req.body.requires_tracking;
      const requiresTracking = requiresTrackingRaw === undefined
        ? undefined
        : (typeof requiresTrackingRaw === 'boolean')
          ? requiresTrackingRaw
          : ['true', '1', 1, 'on', 'yes'].includes(String(requiresTrackingRaw).toLowerCase());

      const raw = {
        name: req.body.name,
        price: req.body.price,
        cost_price: req.body.cost_price,
        type_item: req.body.type_item,
        type_service: req.body.type_service,
        category_id: req.body.category_id,
        description: req.body.description,
        unit: req.body.unit,
        tenant_id: req.user.tenant_id,
        ...normalizeProductionFields(req.body)
      };

      if (requiresTracking !== undefined) {
        raw.requires_tracking = requiresTracking;
      }

      const data = await TreatmentService.create(raw, req.user.tenant_id, req.user.role);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  };

  static async getAll(req, res) {
    try {
      const search = req.query.search;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      // Get is_active filter (optional: true, false, or undefined for all)
      const isActive = req.query.is_active !== undefined 
        ? req.query.is_active === 'true' || req.query.is_active === true
        : undefined;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;
      
      const data = await TreatmentService.getAll(search, tenant_id, req.user.role, page, pageSize, isActive);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      console.error('❌ TreatmentController - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await TreatmentService.getById(id, req.user.tenant_id, req.user.role);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async update(req, res) {
    try {
      const requiresTrackingRaw = req.body.requires_tracking;
      const requiresTracking = requiresTrackingRaw === undefined
        ? undefined
        : (typeof requiresTrackingRaw === 'boolean')
          ? requiresTrackingRaw
          : ['true', '1', 1, 'on', 'yes'].includes(String(requiresTrackingRaw).toLowerCase());

      const raw = {
        id: parseInt(req.params.id, 10),
        name: req.body.name,
        price: req.body.price,
        cost_price: req.body.cost_price,
        type_item: req.body.type_item,
        type_service: req.body.type_service,
        category_id: req.body.category_id,
        description: req.body.description,
        unit: req.body.unit,
        ...normalizeProductionFields(req.body)
      };

      if (requiresTracking !== undefined) {
        raw.requires_tracking = requiresTracking;
      }
      
      const data = await TreatmentService.update(raw, req.user.tenant_id, req.user.role);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await TreatmentService.delete(id, req.user.tenant_id, req.user.role);

      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async toggleStatus(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await TreatmentService.toggleStatus(id, req.user.tenant_id, req.user.role);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getOptions(req, res) {
    try {
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;
      
      const data = await TreatmentService.getOptions(tenant_id, req.user.role);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      console.error('❌ TreatmentController - Error getting options:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };
};

module.exports = TreatmentController;