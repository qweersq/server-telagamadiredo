const tenantValidation = (req, res, next) => {
  try {
    // Get user tenant from JWT
    const userTenantId = req.user?.tenant_id;
    
    if (!userTenantId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User tenant not found' 
      });
    }

    // Get resource ID from params
    const resourceId = req.params.id;
    
    if (!resourceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resource ID required' 
      });
    }

    // Store validation info for controller
    req.tenantValidation = {
      userTenantId,
      resourceId
    };

    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Tenant validation failed' 
    });
  }
};

module.exports = tenantValidation;
