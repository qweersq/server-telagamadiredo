const { DeliveryDetail, Order } = require('../models');

/**
 * Custom tenant access control untuk DeliveryDetail
 * DeliveryDetail tidak punya tenant_id langsung, tapi via Order
 */
const deliveryDetailAccessControl = async (req, res, next) => {
  try {
    // Pastikan tenantValidation sudah jalan
    if (!req.tenantValidation) {
      return res.status(500).json({ 
        success: false, 
        message: 'Tenant validation required' 
      });
    }
    
    // Skip validation HANYA untuk superapp-superadmin (pemilik aplikasi)
    // superadmin (owner tenant) HARUS validasi tenant seperti user biasa
    if (req.user.role === 'superapp-superadmin') {
      const { resourceId } = req.tenantValidation;
      const deliveryDetail = await DeliveryDetail.findByPk(resourceId, {
        include: [{ model: Order, attributes: ['id', 'tenant_id'] }]
      });
      
      if (!deliveryDetail) {
        return res.status(404).json({ 
          success: false, 
          message: 'DeliveryDetail not found' 
        });
      }
      
      req.resource = deliveryDetail;
      return next();
    }

    const { userTenantId, resourceId } = req.tenantValidation;
    
    // Query langsung dengan JOIN untuk cek tenant_id
    const sequelize = require('../config/database');
    const [results] = await sequelize.query(`
      SELECT dd.id, dd.order_id, o.tenant_id 
      FROM delivery_details dd 
      INNER JOIN orders o ON dd.order_id = o.id 
      WHERE dd.id = :deliveryDetailId AND o.tenant_id = :userTenantId
    `, {
      replacements: { deliveryDetailId: resourceId, userTenantId: userTenantId },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!results || results.length === 0) {
      // Cek apakah DeliveryDetail ada tapi tenant berbeda
      const [checkExists] = await sequelize.query(`
        SELECT dd.id, o.tenant_id 
        FROM delivery_details dd 
        INNER JOIN orders o ON dd.order_id = o.id 
        WHERE dd.id = :deliveryDetailId
      `, {
        replacements: { deliveryDetailId: resourceId },
        type: sequelize.QueryTypes.SELECT
      });
      
      if (!checkExists || checkExists.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'DeliveryDetail not found' 
        });
      }
      
      // DeliveryDetail ada tapi tenant berbeda
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: DeliveryDetail belongs to different tenant' 
      });
    }

    // DeliveryDetail milik tenant user, ambil data lengkap untuk controller
    const deliveryDetail = await DeliveryDetail.findByPk(resourceId);
    if (!deliveryDetail) {
      return res.status(404).json({ 
        success: false, 
        message: 'DeliveryDetail not found' 
      });
    }

    // Store resource for controller
    req.resource = deliveryDetail;
    next();
  } catch (error) {
    console.error('DeliveryDetail access control error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Access control failed',
      error: error.message 
    });
  }
};

module.exports = deliveryDetailAccessControl;

