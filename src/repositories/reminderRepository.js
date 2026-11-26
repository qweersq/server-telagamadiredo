const { Op } = require('sequelize');
const { Order, Customer, ReminderLog } = require('../models');

const getReminders = async ({ category, search }) => {
  // Query dasar: order yang memenuhi kriteria reminder
  let where = {};
  // Filter kategori
  if (category === 'belum-diambil') {
    where = {
      status: 'selesai',
      taken_at: null,
      finished_at: { [Op.lte]: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    };
  } else if (category === 'belum-lunas') {
    where = {
      status: 'selesai',
      remaining_payment: { [Op.gt]: 0 },
    };
  } else if (category === 'keterlambatan') {
    where = {
      status: 'diproses',
      due_date: { [Op.lt]: new Date() },
    };
  } else if (category === 'jadwal-antar') {
    where = {
      delivery_date: { [Op.eq]: new Date().toISOString().slice(0, 10) },
    };
  }
  // Search by customer name or order number
  let customerWhere = {};
  if (search) {
    customerWhere = {
      name: { [Op.iLike]: `%${search}%` },
    };
    where = {
      ...where,
      [Op.or]: [
        { order_number: { [Op.iLike]: `%${search}%` } },
      ],
    };
  }
  // Query orders beserta customer
  const orders = await Order.findAll({
    where,
    include: [
      {
        model: Customer,
        as: 'customer',
        where: customerWhere,
        required: Object.keys(customerWhere).length > 0,
      },
    ],
    order: [['updatedAt', 'DESC']],
  });
  return orders;
};

module.exports = { getReminders }; 