const { WaSession, Branch, Tenant, sequelize } = require('../models');

/**
 * Get session history for a branch
 */
exports.getSessionHistory = async (req, res) => {
  try {
    const { branch_id, tenant_id, status, session_type = 'tenant', page = 1, limit = 10 } = req.query;
    
    console.log('🔍 WA Session History Debug:', {
      branch_id,
      tenant_id,
      status,
      session_type,
      page,
      limit,
      query: req.query
    });
    
    const whereClause = {};
    if (branch_id) whereClause.branch_id = branch_id;
    if (tenant_id) whereClause.tenant_id = tenant_id;
    if (status) whereClause.status = status;
    if (session_type) whereClause.session_type = session_type;

    const offset = (page - 1) * limit;

    const { count, rows: sessions } = await WaSession.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'address']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'business_name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: sessions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error getting session history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session history',
      error: error.message
    });
  }
};

/**
 * Get active session for a branch (single active session per branch)
 */
exports.getActiveSession = async (req, res) => {
  try {
    const { branchId } = req.params;
    
    console.log('🔍 Getting active session for branch:', branchId);
    
    // Get branch info to get tenant_id
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }
    
    // Find the most recent active session for this branch
    const activeSession = await WaSession.findOne({
      where: {
        branch_id: branchId,
        tenant_id: branch.tenant_id,
        status: ['PENDING', 'READY']
      },
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'address']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'business_name']
        }
      ],
      order: [['updated_at', 'DESC']] // Get the most recent one
    });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: 'No active WhatsApp session found for this branch'
      });
    }

    console.log('✅ Found active session:', activeSession.session_id, 'status:', activeSession.status);

    res.json({
      success: true,
      data: {
        id: activeSession.id,
        session_id: activeSession.session_id,
        status: activeSession.status,
        phone_number: activeSession.phone_number,
        last_activity: activeSession.last_activity,
        branch: activeSession.branch,
        tenant: activeSession.tenant
      }
    });
  } catch (error) {
    console.error('❌ Error getting active session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active session',
      error: error.message
    });
  }
};

/**
 * Cleanup old sessions for a branch (destroy all old sessions before creating new one)
 */
exports.cleanupSessions = async (req, res) => {
  try {
    const { branchId } = req.params;
    
    console.log('🧹 Cleaning up sessions for branch:', branchId);
    
    // Get branch info
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Find old sessions
    const oldSessions = await WaSession.findAll({
      where: {
        branch_id: branchId,
        tenant_id: branch.tenant_id,
        status: ['PENDING', 'READY', 'DISCONNECTED', 'FAILED']
      }
    });

    if (oldSessions.length === 0) {
      console.log('✅ No old sessions to cleanup');
      return res.json({
        success: true,
        message: 'No old sessions to cleanup',
        data: { cleaned: 0 }
      });
    }

    console.log(`🗑️ Found ${oldSessions.length} old sessions to cleanup`);

    // Import waGatewayHelper to destroy sessions in WA Gateway
    const waGatewayHelper = require('../helpers/waGatewayHelper');
    
    // Destroy each session in WA Gateway first
    let destroyedCount = 0;
    for (const session of oldSessions) {
      try {
        console.log(`🔄 Destroying session in WA Gateway: ${session.session_id}`);
        const destroyResult = await waGatewayHelper.logoutSession(session.session_id);
        
        if (destroyResult.success) {
          destroyedCount++;
          console.log(`✅ Successfully destroyed session: ${session.session_id}`);
        } else {
          console.log(`⚠️ Failed to destroy session in WA Gateway: ${session.session_id} - ${destroyResult.message}`);
        }
      } catch (error) {
        console.error(`❌ Error destroying session ${session.session_id}:`, error.message);
      }
    }

    // Mark old sessions as DESTROYED in database regardless of WA Gateway result
    await WaSession.update(
      { status: 'DESTROYED' },
      {
        where: {
          branch_id: branchId,
          tenant_id: branch.tenant_id,
          status: ['PENDING', 'READY', 'DISCONNECTED', 'FAILED']
        }
      }
    );

    console.log(`✅ Cleanup completed: ${oldSessions.length} sessions marked as DESTROYED`);

    res.json({
      success: true,
      message: `Cleaned up ${oldSessions.length} old sessions (${destroyedCount} destroyed in WA Gateway)`,
      data: { 
        cleaned: oldSessions.length,
        destroyed_in_gateway: destroyedCount
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning up sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup sessions',
      error: error.message
    });
  }
};

/**
 * Get session statistics
 */
exports.getSessionStats = async (req, res) => {
  try {
    const { branch_id, tenant_id, session_type = 'tenant' } = req.query;
    
    console.log('🔍 WA Session Stats Debug:', {
      branch_id,
      tenant_id,
      session_type,
      query: req.query
    });
    
    const whereClause = {};
    if (branch_id) whereClause.branch_id = branch_id;
    if (tenant_id) whereClause.tenant_id = tenant_id;
    if (session_type) whereClause.session_type = session_type;

    const stats = await WaSession.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const totalSessions = await WaSession.count({ where: whereClause });
    const activeSessions = await WaSession.count({
      where: {
        ...whereClause,
        status: ['PENDING', 'READY']
      }
    });

    res.json({
      success: true,
      data: {
        total: totalSessions,
        active: activeSessions,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat.status] = parseInt(stat.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session statistics',
      error: error.message
    });
  }
};

