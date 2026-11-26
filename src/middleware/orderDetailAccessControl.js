const { OrderDetail, Order } = require('../models');

/**
 * Custom tenant access control untuk OrderDetail
 * OrderDetail tidak punya tenant_id langsung, tapi via Order
 */
const orderDetailAccessControl = async (req, res, next) => {
  console.log('🔒 orderDetailAccessControl middleware DIPANGGIL!');
  console.log('   URL:', req.url);
  console.log('   Method:', req.method);
  console.log('   Resource ID:', req.params?.id);
  console.log('   Tenant Validation:', req.tenantValidation);
  console.log('   User:', req.user);
  
  try {
    // Pastikan tenantValidation sudah jalan
    if (!req.tenantValidation) {
      console.error('❌ tenantValidation belum jalan!');
      return res.status(500).json({ 
        success: false, 
        message: 'Tenant validation required' 
      });
    }
    // Skip validation HANYA untuk superapp-superadmin (pemilik aplikasi)
    // superadmin (owner tenant) HARUS validasi tenant seperti user biasa
    if (req.user.role === 'superapp-superadmin') {
      const { resourceId } = req.tenantValidation;
      const orderDetail = await OrderDetail.findByPk(resourceId, {
        include: [{ model: Order, attributes: ['id', 'tenant_id'] }]
      });
      
      if (!orderDetail) {
        return res.status(404).json({ 
          success: false, 
          message: 'OrderDetail not found' 
        });
      }
      
      req.resource = orderDetail;
      return next();
    }

    const { userTenantId, resourceId } = req.tenantValidation;
    
    // Query langsung dengan JOIN untuk cek tenant_id
    const sequelize = require('../config/database');
    const [results] = await sequelize.query(`
      SELECT od.id, od.order_id, o.tenant_id 
      FROM order_details od 
      INNER JOIN orders o ON od.order_id = o.id 
      WHERE od.id = :orderDetailId AND o.tenant_id = :userTenantId
    `, {
      replacements: { orderDetailId: resourceId, userTenantId: userTenantId },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!results || results.length === 0) {
      // Cek apakah OrderDetail ada tapi tenant berbeda
      const [checkExists] = await sequelize.query(`
        SELECT od.id, o.tenant_id 
        FROM order_details od 
        INNER JOIN orders o ON od.order_id = o.id 
        WHERE od.id = :orderDetailId
      `, {
        replacements: { orderDetailId: resourceId },
        type: sequelize.QueryTypes.SELECT
      });
      
      if (!checkExists || checkExists.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'OrderDetail not found' 
        });
      }
      
      // OrderDetail ada tapi tenant berbeda
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: OrderDetail belongs to different tenant' 
      });
    }

    // OrderDetail milik tenant user, ambil data lengkap untuk controller
    const orderDetail = await OrderDetail.findByPk(resourceId);
    if (!orderDetail) {
      return res.status(404).json({ 
        success: false, 
        message: 'OrderDetail not found' 
      });
    }

    // Store resource for controller
    req.resource = orderDetail;
    next();
  } catch (error) {
    console.error('OrderDetail access control error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Access control failed',
      error: error.message 
    });
  }
};

module.exports = orderDetailAccessControl;

