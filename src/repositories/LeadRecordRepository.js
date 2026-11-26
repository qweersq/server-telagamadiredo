const { LeadRecord, sequelize, User } = require('../models');

class LeadRecordRepository {
  static async create(data) {
    const transaction = await sequelize.transaction();
    try {
      const result = await LeadRecord.create(data, { transaction });
      await transaction.commit();

      return result;
    } catch (error) {
      await transaction.rollback();
      throw new Error(error.message);
    }
  }

  static async findByLeadId(leadId, page = 1, limit = 10) {
    const transaction = await sequelize.transaction();
    try {
      const offset = (page - 1) * limit;
      const result = await LeadRecord.findAll({
        where: { lead_id: leadId },
        include: [
          {
            model: User,
            as: 'followUpBy',
            attributes: ['id', 'name']
          }
        ],
        limit,
        offset,
        order: [['follow_up_at', 'DESC']]
      });

      return result;
    } catch (error) {
      await transaction.rollback();
      throw new Error(error.message);
    }
  }

  static async update(id, data) {
    const transaction = await sequelize.transaction();
    try {
      const result = await LeadRecord.update(data, { where: { id }, transaction });
      await transaction.commit();

      return result;
    } catch (error) {
      await transaction.rollback();
      throw new Error(error.message);
    }
  }
}

module.exports = LeadRecordRepository;