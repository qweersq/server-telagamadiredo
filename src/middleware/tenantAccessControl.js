const tenantAccessControl = (Model, tenantField = 'tenant_id') => {
  return async (req, res, next) => {
    try {
      // Skip validation HANYA untuk superapp-superadmin (pemilik aplikasi)
      // superadmin (owner tenant) HARUS validasi tenant seperti user biasa
      if (req.user.role === 'superapp-superadmin') {
        const { resourceId } = req.tenantValidation;
        const resource = await Model.findByPk(resourceId);
        
        if (!resource) {
          return res.status(404).json({ 
            success: false, 
            message: 'Resource not found' 
          });
        }
        
        req.resource = resource;
        return next();
      }

      const { userTenantId, resourceId } = req.tenantValidation;
      
      // Find resource and check tenant
      const resource = await Model.findByPk(resourceId);
      
      if (!resource) {
        return res.status(404).json({ 
          success: false, 
          message: 'Resource not found' 
        });
      }

      // Check tenant access
      if (resource[tenantField] !== userTenantId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: Resource belongs to different tenant' 
        });
      }

      // Store resource for controller
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Tenant access control error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Access control failed' 
      });
    }
  };
};

module.exports = tenantAccessControl;
