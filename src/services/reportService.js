const { Op } = require('sequelize');
const {
  sequelize,
  Order,
  Payment,
  PaymentDetail,
  Customer,
  FinanceTransaction,
  Lead,
  LeadRecord,
  Treatment,
  OrderDetail,
  Item,
  Absent,
  User,
  Shift,
  FinanceCategory,
  FinanceAccount
} = require('../models');
const dayjs = require('dayjs');
const { toRupiah } = require('../helpers/currencyHelper');

const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return { percent: '∞', class: 'positive' };
  const change = ((current - previous) / previous) * 100;
  return {
    percent: change.toFixed(1),
    class: change >= 0 ? 'positive' : 'negative',
  };
};

const getReportData = async () => {
  // const thisWeek = getDateRange(0);
  // const lastWeek = getDateRange(1);
  const now = dayjs().subtract(1, 'day'); // cron job minggu

  const thisWeek = {
    start: now.startOf('week').toDate(),
    end: now.endOf('week').toDate(),
  };

  const lastWeek = {
    start: now.subtract(1, 'week').startOf('week').toDate(),
    end: now.subtract(1, 'week').endOf('week').toDate(),
  };

  const thisMonth = {
    start: now.startOf('month').toDate(),
    end: now.endOf('month').toDate(),
  };

  const lastMonth = {
    start: now.subtract(1, 'month').startOf('month').toDate(),
    end: now.subtract(1, 'month').endOf('month').toDate(),
  };

  const threeMonthsAgo = {
    start: now.subtract(3, 'month').startOf('month').toDate(),
    end: now.subtract(3, 'month').endOf('month').toDate(),
  };

  const oneYearAgo = {
    start: now.subtract(1, 'year').startOf('month').toDate(),
    end: now.subtract(1, 'year').endOf('month').toDate(),
  };

  // 1. Total Orders & Revenue
  const [orderNow, orderLast] = await Promise.all([
    Order.count({ where: { createdAt: { [Op.between]: [thisWeek.start, thisWeek.end] }, deletedAt: null } }),
    Order.count({ where: { createdAt: { [Op.between]: [lastWeek.start, lastWeek.end] }, deletedAt: null } }),
  ]);

  const [revenueNow, revenueLast] = await Promise.all([
    PaymentDetail.sum('amount', { where: { createdAt: { [Op.between]: [thisWeek.start, thisWeek.end] }, deletedAt: null } }),
    PaymentDetail.sum('amount', { where: { createdAt: { [Op.between]: [lastWeek.start, lastWeek.end] }, deletedAt: null } }),
  ]);

  // 2. Outstanding
  const outstanding = await Payment.sum('remaining_amount', {
    where: {
      remaining_amount: { [Op.gt]: 0 },
      deletedAt: null,
    },
  });

  // 3. Payment Breakdown
  const methods = ['cash', 'transfer', 'qris'];
  const paymentByMethod = {};
  for (const method of methods) {
    const sum = await PaymentDetail.sum('amount', {
      where: {
        method,
        createdAt: { [Op.between]: [thisWeek.start, thisWeek.end] },
        deletedAt: null,
      },
    });
    paymentByMethod[method] = sum || 0;
  }

  // 4. Expenses
  const [expenseNow, expenseLast] = await Promise.all([
    FinanceTransaction.sum('final_amount', {
      where: {
        date: { [Op.between]: [thisWeek.start, thisWeek.end] },
        deletedAt: null,
      },
      include: [
        {
          model: FinanceCategory,
          association: 'finance_category',
          where: { type: 'debit' },
          required: true,
          attributes: [], // 👈 penting: jangan tarik kolom dari category!
        },
      ]
    }),
    FinanceTransaction.sum('final_amount', {
      where: {
        date: { [Op.between]: [lastWeek.start, lastWeek.end] },
        deletedAt: null,
      },
      include: [
        {
          model: FinanceCategory,
          association: 'finance_category',
          where: { type: 'debit' },
          required: true,
          attributes: [], // 👈 penting: jangan tarik kolom dari category!
        },
      ]
    }),
  ]);


  // 5. Profit
  const profitNow = (revenueNow || 0) - (expenseNow || 0);
  const profitLast = (revenueLast || 0) - (expenseLast || 0);

  // 6. Customer Baru
  const customerBaru = await Customer.count({
    where: {
      createdAt: { [Op.between]: [thisWeek.start, thisWeek.end] },
      deletedAt: null,
    },
  });

  // 7. Leads Masuk & Follow-up
  const [leadsNow, leadsFollowedUp] = await Promise.all([
    Lead.count({ where: { createdAt: { [Op.between]: [thisWeek.start, thisWeek.end] }, deletedAt: null } }),
    LeadRecord.count({ where: { follow_up_at: { [Op.between]: [thisWeek.start, thisWeek.end] } } }),
  ]);

  // 8. treatment
  const topTreatments = await OrderDetail.findAll({
    attributes: [
      'treatment_id',
      [sequelize.fn('COUNT', sequelize.col('treatment_id')), 'count'],
    ],
    where: {
      deletedAt: null,
      createdAt: {
        [Op.between]: [thisWeek.start, thisWeek.end],
      },
    },
    include: [
      {
        model: Treatment,
        as: 'treatment',
        attributes: ['id', 'name'],
      },
    ],
    group: ['treatment_id', 'treatment.id'],
    order: [[sequelize.literal('count'), 'DESC']],
    limit: 3,
  });

  // Repeat order dalam minggu ini
  const repeatWeekly = await Order.findAll({
    attributes: [
      'customer_id',
      [sequelize.fn('COUNT', sequelize.col('customer_id')), 'order_count'],
    ],
    include: [
      {
        model: Customer,
        attributes: ['id','name'],
        as: 'customer',
      },
    ],
    where: {
      createdAt: { [Op.between]: [thisWeek.start, thisWeek.end] },
      deletedAt: null,
    },
    group: ['customer_id', 'customer.id'],
    having: sequelize.literal('COUNT(customer_id) > 1'),
  });


  // Retensi pelanggan bulan lalu → kembali bulan ini
  const customerLastMonth = await Order.findAll({
    attributes: ['customer_id'],
    where: {
      createdAt: { [Op.between]: [lastMonth.start, lastMonth.end] },
      deletedAt: null,
    },
    group: ['customer_id'],
  });
  const idsLastMonth = customerLastMonth.map((o) => o.customer_id);

  const returnedFromLastMonth = await Order.count({
    where: {
      customer_id: { [Op.in]: idsLastMonth },
      createdAt: { [Op.between]: [thisMonth.start, thisMonth.end] },
      deletedAt: null,
    },
    distinct: true,
    col: 'customer_id',
  });
  const returnedFromLastMonthCustomers = await Order.findAll({
    attributes: ['customer_id'],
    where: {
      customer_id: { [Op.in]: idsLastMonth },
      createdAt: { [Op.between]: [thisMonth.start, thisMonth.end] },
      deletedAt: null,
    },
    include: [
      {
        model: Customer,
        attributes: ['name'],
        as: 'customer',
      },
    ],
    group: ['customer_id'],
  });

  const customer3MonthsAgo = await Order.findAll({
    attributes: ['customer_id'],
    where: {
      createdAt: { [Op.between]: [threeMonthsAgo.start, threeMonthsAgo.end] },
      deletedAt: null,
    },
    group: ['customer_id'],
  });
  const ids3Months = customer3MonthsAgo.map((o) => o.customer_id);

  const returnedFrom3Months = await Order.count({
    where: {
      customer_id: { [Op.in]: ids3Months },
      createdAt: { [Op.between]: [thisMonth.start, thisMonth.end] },
      deletedAt: null,
    },
    distinct: true,
    col: 'customer_id',
  });
  const returnedFrom3MonthsCustomers = await Order.findAll({
    attributes: ['customer_id'],
    where: {
      customer_id: { [Op.in]: ids3Months },
      createdAt: { [Op.between]: [thisMonth.start, thisMonth.end] },
      deletedAt: null,
    },
    include: [
      {
        model: Customer,
        attributes: ['id', 'name'],
        as: 'customer',
      },
    ],
    group: ['customer_id', 'customer.id'],
  });


  const customer1YearAgo = await Order.findAll({
    attributes: ['customer_id'],
    where: {
      createdAt: { [Op.between]: [oneYearAgo.start, oneYearAgo.end] },
      deletedAt: null,
    },
    group: ['customer_id'],
  });
  const ids1Year = customer1YearAgo.map((o) => o.customer_id);

  const returnedFrom1Year = await Order.count({
    where: {
      customer_id: { [Op.in]: ids1Year },
      createdAt: { [Op.between]: [thisMonth.start, thisMonth.end] },
      deletedAt: null,
    },
    distinct: true,
    col: 'customer_id',
  });

  const allCustomerIds = await Order.findAll({
    attributes: ['customer_id'],
    where: {
      createdAt: { [Op.lt]: thisMonth.start },
      deletedAt: null,
    },
    group: ['customer_id'],
  });
  const idsAll = allCustomerIds.map((o) => o.customer_id);

  const returnedFromAll = await Order.count({
    where: {
      customer_id: { [Op.in]: idsAll },
      createdAt: { [Op.between]: [thisMonth.start, thisMonth.end] },
      deletedAt: null,
    },
    distinct: true,
    col: 'customer_id',
  });


  // Trends
  const trendOrder = calculateTrend(orderNow, orderLast);
  const trendRevenue = calculateTrend(revenueNow, revenueLast);
  const trendExpense = calculateTrend(expenseNow, expenseLast);
  const trendProfit = calculateTrend(profitNow, profitLast);

  return {
    period: `${thisWeek.start.toLocaleDateString('id-ID')} – ${thisWeek.end.toLocaleDateString('id-ID')}`,
    totalOrders: orderNow,
    ordersChange: `${trendOrder.percent}%`,
    ordersTrend: trendOrder.class,

    totalRevenue: `Rp ${revenueNow?.toLocaleString('id-ID') || '0'}`,
    revenueChange: `${trendRevenue.percent}%`,
    revenueTrend: trendRevenue.class,

    expenses: `Rp ${expenseNow?.toLocaleString('id-ID') || '0'}`,
    expensesChange: `${trendExpense.percent}%`,
    expenseTrend: trendExpense.class,

    profit: `Rp ${profitNow?.toLocaleString('id-ID') || '0'}`,
    profitTrend: trendProfit.class,

    avgOrder: `Rp ${Math.round((revenueNow || 0) / (orderNow || 1)).toLocaleString('id-ID')}`,
    outstanding: `Rp ${outstanding?.toLocaleString('id-ID') || 0}`,
    cash: `Rp ${paymentByMethod.cash?.toLocaleString('id-ID') || 0}`,
    transfer: `Rp ${paymentByMethod.transfer?.toLocaleString('id-ID') || 0}`,
    qris: `Rp ${paymentByMethod.qris?.toLocaleString('id-ID') || 0}`,

    topTreatments: topTreatments
      .map((t) => `<li>${t.treatment.name} – ${t.dataValues.count}x</li>`)
      .join(''),

    customerBaru,
    leadsNow,
    leadsFollowedUp,

    repeatWeeklyCount: repeatWeekly.length,
    repeatWeeklyList: repeatWeekly
      .map((entry) => `<li>${entry.customer.name} – ${entry.dataValues.order_count}x</li>`)
      .join(''),

    returnedFromLastMonth,
    returnedFromLastMonthList: returnedFromLastMonthCustomers
      .map((entry) => `<li>${entry.customer.name}</li>`)
      .join(''),

    returnedFrom3Months,
    returnedFrom3MonthsList: returnedFrom3MonthsCustomers
      .map((entry) => `<li>${entry.customer.name}</li>`)
      .join(''),

    returnedFrom1Year,
    returnedFromAll,

  };
};

const getReportDailyData = async () => {
  const now = dayjs().subtract(1, 'day');

  const startOfDay = now.startOf('day').toDate();
  const endOfDay = now.endOf('day').toDate();

  const oneWeekAgo = dayjs().subtract(7, 'day').toDate();
  const oneMonthAgo = dayjs().subtract(30, 'day').startOf('day').toDate();

  // Ambil order yang masuk hari ini
  const ordersToday = await Order.findAll({
    where: {
      entry_date: {
        [Op.between]: [startOfDay, endOfDay],
      },
      deletedAt: null,
    },
    include: [
      {
        model: OrderDetail,
        attributes: ['price', 'final_price'],
        as: 'order_details'
      },
      {
        model: Payment,
        as: 'payment',
        include: [
          {
            model: PaymentDetail,
            attributes: ['amount'],
            as: 'payment_details'
          },
        ],
      },
    ],
  });

  const totalOrders = ordersToday.length;

  let totalItems = 0;
  let estimatedRevenue = 0;
  let dpPaid = 0;
  let unpaidCount = 0;
  let unpaidAmount = 0;

  for (const order of ordersToday) {
    totalItems += order.order_details.length;

    for (const detail of order.order_details) {
      estimatedRevenue += Number(detail.final_price || 0);
    }

    const totalPaid = order.payment?.payment_details?.reduce(
      (sum, pd) => sum + Number(pd.amount || 0),
      0
    );

    dpPaid += totalPaid;

    if (totalPaid === 0) {
      unpaidCount++;
      unpaidAmount += order.order_details.reduce(
        (sum, detail) => sum + Number(detail.final_price || 0),
        0
      );
    }
  }


  const oldUnpaidOrders = await Order.findAll({
    where: {
      entry_date: { [Op.between]: [oneMonthAgo, now], },
      deletedAt: null,
    },
    include: [
      {
        model: OrderDetail,
        attributes: ['final_price', 'price', 'due_date'],
        as: 'order_details'
      },
      {
        model: Customer,
        as: 'customer',
        attributes: ['name']
      },
      {
        model: Payment,
        as: 'payment',
        include: [
          {
            model: PaymentDetail,
            attributes: ['amount'],
            as: 'payment_details'
          },
        ],
      },
    ],
  });

  let oldUnpaidList = [];

  for (const order of oldUnpaidOrders) {
    const totalHarga = order.order_details.reduce((sum, d) =>
      sum + Number(d.final_price || 0), 0);

    const latestDueDate = order.order_details.reduce((latest, detail) => {
      const current = new Date(detail.due_date);
      return current > latest ? current : latest;
    }, new Date(0)); // Mulai dari tanggal sangat awal


    const totalPaid = order.payment?.payment_details?.reduce((sum, p) =>
      sum + Number(p.amount || 0), 0);

    if (totalPaid < totalHarga) {
      const daysAgo = dayjs().diff(dayjs(order.entry_date), 'day');

      oldUnpaidList.push({
        code: order.id,
        customerName: order.customer?.name || 'Tanpa Nama',
        date: dayjs(order.entry_date).format('DD MMM'),
        amount: totalHarga - totalPaid,
        daysAgo,
        due_date: dayjs(latestDueDate).format('DD MMM YYYY')
      });
    }
  }

  // Dari order yang mana saja (kode atau ID-nya) yang uangnya masuk ke rekening bank (misal BCA), dan total jumlahnya.
  const transferPayments = await PaymentDetail.findAll({
    where: {
      method: 'bank_transfer', // atau cek: 'Bank Transfer', dsb
      createdAt: {
        [Op.between]: [startOfDay, endOfDay],
      },
      deletedAt: null,
    },
    include: [
      {
        model: Payment,
        as: 'payment',
        attributes: ['id', 'date'],
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'entry_date', 'customer_id'],
            include: [
              {
                model: Customer,
                as: 'customer',
                attributes: ['name'],
              },
            ],
          },
        ],
      },
    ],
  });

  const transferOrders = transferPayments.map((p) => {
    const order = Array.isArray(p.payment?.order) ? p.payment.order[0] : p.payment?.order;
    const customer = Array.isArray(order?.customer) ? order.customer[0] : order?.customer;
    return {
      orderId: order?.id,
      customerName: customer?.name || 'Tidak Diketahui',
      amount: Number(p.amount),
    };
  });

  const transferTotal = transferOrders.reduce((sum, o) => sum + o.amount, 0);

  const lateItems = await OrderDetail.findAll({
    where: {
      due_date: { [Op.between]: [oneWeekAgo, now], },
      status: { [Op.ne]: 'done' },
      deletedAt: null,
    },
    include: [
      {
        model: Order,
        as: 'order',
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['name'],
          },
        ],
      },
      {
        model: Item,
        as: 'item',
        attributes: ['name'],
      },
    ],
    order: [['due_date', 'ASC']],
  });

  const dueYesterdayItems = await OrderDetail.findAll({
    where: {
      due_date: {
        [Op.between]: [startOfDay, endOfDay],
      },
      deletedAt: null,
    },
    include: [
      {
        model: Order,
        as: 'order',
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['name'],
          },
        ],
      },
      {
        model: Item,
        as: 'item',
        attributes: ['name'],
      }
    ],
  });

  const absentsToday = await Absent.findAll({
    where: {
      date: {
        [Op.between]: [startOfDay, endOfDay],
      },
      deletedAt: null,
    },
    include: [
      {
        model: User,
        as: 'employee_absent',
        attributes: ['name'],
      },
    ],
  });

  const absensiListHtml = absentsToday.map((a) => {
    const name = a.employee_absent?.name || 'Tidak diketahui';
    const clockIn = a.clock_in || '—';
    const clockOut = a.clock_out || '—';
    const duration = `${a.work_duration} jam` || '—';

    return `<li>${name} – Masuk: ${clockIn} – Pulang: ${clockOut} – Durasi: ${duration}</li>`;
  }).join('');


  const todayShifts = await Shift.findAll({
    where: {
      start_time: {
        [Op.between]: [startOfDay, endOfDay],
      },
      deletedAt: null,
    },
    include: [
      {
        model: User,
        as: 'employee_shift', // pastikan ini sesuai alias relasi di model Shift
        attributes: ['name'],
      },
    ],
  });

  const expensesToday = await FinanceTransaction.findAll({
    where: {
      date: {
        [Op.between]: [startOfDay, endOfDay],
      },
      deletedAt: null,
    },
    include: [
      {
        model: FinanceCategory,
        as: 'finance_category',
        where: { type: 'debit' },
        attributes: ['name'],
      },
    ],
  });

  const accounts = await FinanceAccount.findAll({ raw: true });

  const transactions = await FinanceTransaction.findAll({
    where: {
      date: {
        [Op.between]: [startOfDay, endOfDay], // dayjs().startOf('day'), endOf('day')
      },
      deletedAt: null,
    },
    include: [
      {
        model: FinanceCategory,
        as: 'finance_category',
        attributes: ['type'], // credit / debit
      },
    ],
    raw: true,
  });

  const accountMap = {};

  for (const acc of accounts) {
    accountMap[acc.id] = {
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      income: 0,
      expense: 0,
    };
  }

  let totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

  for (const t of transactions) {
    const acc = accountMap[t.account_id];
    if (!acc) continue;

    if (t['finance_category.type'] === 'credit') {
      acc.income += Number(t.final_amount || 0);
    } else if (t['finance_category.type'] === 'debit') {
      acc.expense += Number(t.final_amount || 0);
    }
  }


  const accountSummaryHtml = Object.values(accountMap)
    .map(acc => `
    <tr>
      <td>${acc.name}</td>
      <td>${acc.type}</td>
      <td>${toRupiah(acc.balance)}</td>
      <td style="color:green;">${toRupiah(acc.income)}</td>
      <td style="color:red;">Rp ${toRupiah(acc.expense)}</td>
  `)
    .join('') + `
    <tr style="font-weight:bold;">
     <td colspan="2">Total Saldo Akhir</td>
      <td colspan="3">${toRupiah(totalBalance)}</td>
    </tr>
  `;

  const expensesTotal = expensesToday.reduce((sum, tx) => sum + Number(tx.final_amount || 0), 0);
  const expensesCount = expensesToday.length;
  const expensesListHtml = expensesToday.map((tx) => {
    const cat = tx.finance_category?.name || '—';
    const desc = tx.description || '—';
    return `<li> ${dayjs(tx.date).format('HH:mm')
      } – ${desc} – ${cat} (${toRupiah(tx.final_amount)})</> `;
  }).join('');

  const shiftReportHtml = todayShifts.map((shift) => {
    const name = shift.employee_shift?.name || 'Tidak diketahui';
    const start = dayjs(shift.start_time).format('HH:mm');
    const end = dayjs(shift.end_time).format('HH:mm');
    const initial = toRupiah((shift.cash_initial || 0));
    const cashIn = toRupiah(shift.cash_expected || 0)
    const actual = toRupiah(shift.cash_actual || 0);
    const selisih = toRupiah(shift.cash_actual - (shift.cash_initial + shift.cash_expected));

    return `<li> ${name} – ${start} s / d ${end} – UA: ${initial} – UM: ${cashIn}  – UE: ${actual} – Selisih: ${selisih}</li> `;
  }).join('');

  const totalDifferenceShift = todayShifts.reduce((sum, s) => sum + ((s.cash_actual || 0) - ((s.cash_initial || 0) + (s.cash_expected || 0))), 0);

  const doneCount = dueYesterdayItems.length;
  const doneListHtml = dueYesterdayItems.map((i) => {
    const customer = i.order?.customer?.name || 'Tidak diketahui';
    const itemName = i.item?.name || '-';
    const due_date = dayjs(i.due_date).format('DD MMM') || '-';
    return `<li> ${customer} – ${itemName} – ${due_date}</li> `;
  }).join('');

  const lateItemsCount = lateItems.length;
  const lateItemsHtml = lateItems.map((item) => {
    const customerName = item.order?.customer?.name || 'Tidak Diketahui';
    const itemName = item.item?.name || '–';
    const dueDate = dayjs(item.due_date).format('DD MMM');
    const status = item.status; // e.g., 'not_yet', 'on_process', 'done'

    return `<li> ${customerName} – ${itemName} (Due: ${dueDate}) – Status: <b>${status}</b></li> `;
  }).join('');

  const transferOrdersCount = transferOrders.length;
  const transferOrdersHtml = transferOrders
    .map((o) => `<li> Order #${o.orderId} – ${o.customerName} – Rp ${o.amount.toLocaleString()}</li> `)
    .join('');

  const oldUnpaidListCount = oldUnpaidList.length;
  const totalOldUnpaidAmount = oldUnpaidList.reduce((sum, item) => {
    return sum + Number(item.amount || 0);
  }, 0);
  const unpaidOldOrdersHtml = oldUnpaidList
    .map(o =>
      `<li> ${o.customerName} – (Masuk: ${o.date}, ${o.daysAgo} hari lalu) – Selesai ${o.due_date} - Belum bayar Rp ${o.amount.toLocaleString()}</li> `
    )
    .join('');


  return {
    date: now.format('dddd, D MMMM YYYY'),
    totalOrders,
    totalItems,
    estimatedRevenue: toRupiah(estimatedRevenue),
    dpPaid: toRupiah(dpPaid),
    unpaidOrders: `${unpaidCount} Order(${toRupiah(unpaidAmount)})`,
    transferTotal: toRupiah(transferTotal),
    oldUnpaidListCount,
    totalOldUnpaidAmount: toRupiah(totalOldUnpaidAmount),
    unpaidOldOrdersHtml,
    transferOrdersCount,
    transferOrdersHtml,
    lateItemsCount,
    lateItemsHtml,
    doneCount,
    doneListHtml,
    absensiListHtml,
    shiftReportHtml,
    totalDifferenceShift,
    expensesCount,
    expensesTotal: toRupiah(expensesTotal),
    expensesListHtml,
    accountSummaryHtml
  }

}

module.exports = {
  getReportData,
  getReportDailyData
};
