const WaConnection = require('../models/WaConnection');
const { Op } = require('sequelize');

class WaConnectionRepository {
  /**
   * Create a new WhatsApp connection
   */
  static async create(connectionData) {
    try {
      return await WaConnection.create(connectionData);
    } catch (error) {
      throw new Error(`Failed to create WhatsApp connection: ${error.message}`);
    }
  }

  /**
   * Get connection by ID
   */
  static async getById(id) {
    try {
      return await WaConnection.findByPk(id);
    } catch (error) {
      throw new Error(`Failed to get WhatsApp connection: ${error.message}`);
    }
  }

  /**
   * Get connection by connection_id
   */
  static async getByConnectionId(connectionId) {
    try {
      return await WaConnection.findOne({
        where: { connection_id: connectionId }
      });
    } catch (error) {
      throw new Error(`Failed to get WhatsApp connection: ${error.message}`);
    }
  }

  /**
   * Update connection
   */
  static async update(id, updateData) {
    try {
      const connection = await WaConnection.findByPk(id);
      if (connection) {
        return await connection.update(updateData);
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to update WhatsApp connection: ${error.message}`);
    }
  }

  /**
   * Update connection by connection_id
   */
  static async updateByConnectionId(connectionId, updateData) {
    try {
      const connection = await WaConnection.findOne({
        where: { connection_id: connectionId }
      });
      if (connection) {
        return await connection.update(updateData);
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to update WhatsApp connection: ${error.message}`);
    }
  }

  /**
   * Get connections by type
   */
  static async getByType(connectionType, options = {}) {
    try {
      const whereClause = { connection_type: connectionType };
      
      if (options.tenant_id) {
        whereClause.tenant_id = options.tenant_id;
      }
      if (options.branch_id) {
        whereClause.branch_id = options.branch_id;
      }
      if (options.status) {
        whereClause.status = options.status;
      }

      return await WaConnection.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: options.limit || 10,
        offset: options.offset || 0
      });
    } catch (error) {
      throw new Error(`Failed to get WhatsApp connections: ${error.message}`);
    }
  }

  /**
   * Get active connections by type
   */
  static async getActiveByType(connectionType, options = {}) {
    try {
      const whereClause = { 
        connection_type: connectionType,
        status: ['PENDING', 'READY']
      };
      
      if (options.tenant_id) {
        whereClause.tenant_id = options.tenant_id;
      }
      if (options.branch_id) {
        whereClause.branch_id = options.branch_id;
      }

      return await WaConnection.findAll({
        where: whereClause,
        order: [['updated_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to get active WhatsApp connections: ${error.message}`);
    }
  }

  /**
   * Get connection statistics by type
   */
  static async getStatsByType(connectionType, options = {}) {
    try {
      const whereClause = { connection_type: connectionType };
      
      if (options.tenant_id) {
        whereClause.tenant_id = options.tenant_id;
      }
      if (options.branch_id) {
        whereClause.branch_id = options.branch_id;
      }

      const stats = await WaConnection.findAll({
        where: whereClause,
        attributes: [
          'status',
          [WaConnection.sequelize.fn('COUNT', WaConnection.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const totalConnections = await WaConnection.count({ where: whereClause });
      const activeConnections = await WaConnection.count({
        where: {
          ...whereClause,
          status: ['PENDING', 'READY']
        }
      });

      return {
        total: totalConnections,
        active: activeConnections,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat.status] = parseInt(stat.count);
          return acc;
        }, {})
      };
    } catch (error) {
      throw new Error(`Failed to get WhatsApp connection statistics: ${error.message}`);
    }
  }

  /**
   * Cleanup old connections by type
   */
  static async cleanupByType(connectionType, options = {}) {
    try {
      const whereClause = { 
        connection_type: connectionType,
        status: ['PENDING', 'READY', 'DISCONNECTED', 'FAILED']
      };
      
      if (options.tenant_id) {
        whereClause.tenant_id = options.tenant_id;
      }
      if (options.branch_id) {
        whereClause.branch_id = options.branch_id;
      }

      const oldConnections = await WaConnection.findAll({
        where: whereClause
      });

      if (oldConnections.length === 0) {
        return { cleaned: 0 };
      }

      console.log(`🗑️ Found ${oldConnections.length} old ${connectionType} connections to cleanup`);

      // Import waGatewayHelper to destroy sessions in WA Gateway
      const waGatewayHelper = require('../helpers/waGatewayHelper');
      
      // Destroy each connection in WA Gateway first
      let destroyedCount = 0;
      for (const connection of oldConnections) {
        try {
          console.log(`🔄 Destroying ${connectionType} connection in WA Gateway: ${connection.connection_id}`);
          const destroyResult = await waGatewayHelper.logoutSession(connection.connection_id);
          
          if (destroyResult.success) {
            destroyedCount++;
            console.log(`✅ Successfully destroyed ${connectionType} connection: ${connection.connection_id}`);
          } else {
            console.log(`⚠️ Failed to destroy ${connectionType} connection in WA Gateway: ${connection.connection_id} - ${destroyResult.message}`);
          }
        } catch (error) {
          console.error(`❌ Error destroying ${connectionType} connection ${connection.connection_id}:`, error.message);
        }
      }

      // Mark old connections as DESTROYED in database regardless of WA Gateway result
      await WaConnection.update(
        { status: 'DESTROYED' },
        { where: whereClause }
      );

      console.log(`✅ Cleanup completed: ${oldConnections.length} ${connectionType} connections marked as DESTROYED`);

      return { 
        cleaned: oldConnections.length,
        destroyed_in_gateway: destroyedCount
      };
    } catch (error) {
      throw new Error(`Failed to cleanup WhatsApp connections: ${error.message}`);
    }
  }

  /**
   * Delete connection
   */
  static async delete(id) {
    try {
      const connection = await WaConnection.findByPk(id);
      if (connection) {
        await connection.destroy();
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to delete WhatsApp connection: ${error.message}`);
    }
  }

  /**
   * Get connection history with pagination
   */
  static async getHistory(connectionType, options = {}) {
    try {
      const whereClause = { connection_type: connectionType };
      
      if (options.tenant_id) {
        whereClause.tenant_id = options.tenant_id;
      }
      if (options.branch_id) {
        whereClause.branch_id = options.branch_id;
      }
      if (options.status) {
        whereClause.status = options.status;
      }

      const limit = options.limit || 10;
      const offset = (options.page - 1) * limit || 0;

      const { count, rows: connections } = await WaConnection.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: limit,
        offset: offset
      });

      return {
        connections,
        pagination: {
          total: count,
          page: options.page || 1,
          limit: limit,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get WhatsApp connection history: ${error.message}`);
    }
  }
}

module.exports = WaConnectionRepository;
