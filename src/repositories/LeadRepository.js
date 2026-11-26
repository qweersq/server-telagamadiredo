const { Lead, LeadRecord, Op, sequelize, User } = require('../models');

class LeadRepository {
  static async create(data) {
    const transaction = await sequelize.transaction();
    try {
      const result = await Lead.create(data, { transaction });
      await transaction.commit();

      return result;
    } catch (error) {
      await transaction.rollback();
      throw new Error(error.message);
    }
  }

  static async findById(id) {
    return await Lead.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name']
        },
        {
          model: LeadRecord,
          as: 'lead_records',
          include: [
            {
              model: User,
              as: 'followUpBy',
              attributes: ['id', 'name']
            }
          ],
          order: [['follow_up_at', 'DESC']]
        }
      ]
    });
  }

  static async findAll(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { phone: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    const result = await Lead.findAll({
      where,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name']
        },
        {
          model: LeadRecord,
          as: 'lead_records',
          include: [
            {
              model: User,
              as: 'followUpBy',
              attributes: ['id', 'name']
            }
          ],
          order: [['follow_up_at', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return result;
  }

  static async findAllForFollowUp(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.next_follow_up_date) where.next_follow_up_date = filters.next_follow_up_date;
    if (filters.follow_up_count) where.follow_up_count = filters.follow_up_count;
    return await Lead.findAll({ where });
  }

  static async update(id, data, transaction) {
    try {
      const lead = await Lead.findByPk(id);
      if (!lead) return null;
      const result = await lead.update(data, { transaction });

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      const lead = await Lead.findByPk(id, { transaction });
      if (!lead) return false;
      await lead.destroy({ transaction });
      await transaction.commit();

      return true;
    } catch (error) {
      await transaction.rollback();
      throw new Error(error.message);
    }
  }

  static async findByPhone(phone) {
    try {
      const result = await Lead.findOne({ where: { phone } });

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getLeadsForReport(startDate, endDate) {
    try {
      const result = await Lead.findAll({
        where: {
          createdAt: { [Op.between]: [startDate, endDate] }
        }
      });
  
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = LeadRepository;