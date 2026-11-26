const { Absent, Branch } = require('../models');

/**
 * Custom tenant access control untuk Absent
 * Absent tidak punya tenant_id langsung, tapi via Branch
 */
const absentAccessControl = async (req, res, next) => {
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
      const absent = await Absent.findByPk(resourceId, {
        include: [{ model: Branch, attributes: ['id', 'tenant_id'] }]
      });
      
      if (!absent) {
        return res.status(404).json({ 
          success: false, 
          message: 'Absent not found' 
        });
      }
      
      req.resource = absent;
      return next();
    }

    const { userTenantId, resourceId } = req.tenantValidation;
    
    // Query langsung dengan JOIN untuk cek tenant_id
    const sequelize = require('../config/database');
    const [results] = await sequelize.query(`
      SELECT a.id, a.branch_id, b.tenant_id 
      FROM absents a 
      INNER JOIN branches b ON a.branch_id = b.id 
      WHERE a.id = :absentId AND b.tenant_id = :userTenantId
    `, {
      replacements: { absentId: resourceId, userTenantId: userTenantId },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!results || results.length === 0) {
      // Cek apakah Absent ada tapi tenant berbeda
      const [checkExists] = await sequelize.query(`
        SELECT a.id, b.tenant_id 
        FROM absents a 
        INNER JOIN branches b ON a.branch_id = b.id 
        WHERE a.id = :absentId
      `, {
        replacements: { absentId: resourceId },
        type: sequelize.QueryTypes.SELECT
      });
      
      if (!checkExists || checkExists.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Absent not found' 
        });
      }
      
      // Absent ada tapi tenant berbeda
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: Absent belongs to different tenant' 
      });
    }

    // Absent milik tenant user, ambil data lengkap untuk controller
    const absent = await Absent.findByPk(resourceId);
    if (!absent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Absent not found' 
      });
    }

    // Store resource for controller
    req.resource = absent;
    next();
  } catch (error) {
    console.error('Absent access control error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Access control failed',
      error: error.message 
    });
  }
};

module.exports = absentAccessControl;

