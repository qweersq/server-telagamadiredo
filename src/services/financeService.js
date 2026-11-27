const FinanceRepository = require('../repositories/financeRepository');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const { Tenant, Branch } = require('../models');

class FinanceService {
    static async getDailyTransactions(filters = {}) {
        try {
            const { date, type, startDate, endDate, period, page = 1, limit = 20, tenant_id, branch_id } = filters;

            // Validate filters
            if (date && !moment(date).isValid()) {
                throw new Error('Invalid date format');
            }

            if (startDate && endDate && moment(startDate).isAfter(moment(endDate))) {
                throw new Error('Start date cannot be later than end date');
            }

            if (type && !['income', 'expense', 'all'].includes(type)) {
                throw new Error('Invalid type. Must be income, expense, or all');
            }

            // Validate pagination
            if (page < 1) throw new Error('Page must be greater than 0');
            if (limit < 1 || limit > 100) throw new Error('Limit must be between 1 and 100');

            const result = await FinanceRepository.getDailyTransactions(filters);


            // Transform data to match frontend requirements
            const transformedTransactions = result.transactions.map(transaction => {
                const baseTransaction = {
                    id: transaction.id,
                    amount: parseFloat(transaction.final_amount),
                    date: transaction.date,
                    description: transaction.description,
                    category_name: transaction.finance_category?.name,
                    account_name: transaction.finance_account?.name
                };


                // Determine transaction type and add source info
                if (transaction.finance_category?.type === 'credit') {
                    // Income transaction
                    const paymentDetail = transaction.payment_details?.[0];

                    if (paymentDetail) {

                        // Access payment data from the merged structure
                        const payment = paymentDetail.payment;
                        const order = payment?.order;
                        const customer = order?.customer;

                        // Build description with customer name and order ID
                        let description = baseTransaction.description;
                        if (customer?.name && order?.id) {
                            description = `Pembayaran dari ${customer.name} - Pesanan #${order.id}`;
                        } else if (customer?.name) {
                            description = `Pembayaran dari ${customer.name}`;
                        }

                        return {
                            ...baseTransaction,
                            description, // Updated description
                            type: 'income',
                            source: {
                                order_id: order?.id,
                                customer_name: customer?.name,
                                customer_phone: customer?.phone,
                                order_type: order?.order_type,
                                payment_method: paymentDetail.method,
                                entry_date: order?.entry_date,
                                payment: {
                                    id: payment?.id,
                                    final_price: payment?.final_price,
                                    status: payment?.status
                                }
                            }
                        };
                    } else {
                        // Income transaction without PaymentDetail (manual income)
                        return {
                            ...baseTransaction,
                            type: 'income',
                            source: {
                                payment: {}
                            }
                        };
                    }
                } else {
                    // Expense transaction
                    const expense = transaction.expenses?.[0];

                    return {
                        ...baseTransaction,
                        type: 'expense',
                        source: {
                            expense_name: expense?.name,
                            expense_description: expense?.description,
                            expense_id: expense?.id,
                            amount: expense?.amount
                        }
                    };
                }
            });

            return {
                period: period || 'daily',
                date: date || moment().format('YYYY-MM-DD'),
                transactions: transformedTransactions,
                pagination: result.pagination
            };
        } catch (error) {
            throw new Error(`Failed to get daily transactions: ${error.message}`);
        }
    }

    static async getDailySummary(filters = {}) {
        try {
            const { date, startDate, endDate, period, tenant_id, branch_id, is_active, filter_info } = filters;

            // Validate filters
            if (date && !moment(date).isValid()) {
                throw new Error('Invalid date format');
            }

            if (startDate && endDate && moment(startDate).isAfter(moment(endDate))) {
                throw new Error('Start date cannot be later than end date');
            }

            const summary = await FinanceRepository.getDailySummary(filters);

            return {
                period: period || 'daily',
                date: date || moment().format('YYYY-MM-DD'),
                filter_info: filter_info || {
                    is_all_branches: true,
                    is_specific_branch: false,
                    branch_id: null,
                    user_role: 'unknown'
                },
                ...summary
            };
        } catch (error) {
            throw new Error(`Failed to get daily summary: ${error.message}`);
        }
    }

    static async getTransactionDetail(transactionId) {
        try {
            if (!transactionId || isNaN(transactionId)) {
                throw new Error('Invalid transaction ID');
            }

            const transaction = await FinanceRepository.getTransactionDetail(transactionId);

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            // Transform data to match frontend requirements
            const baseTransaction = {
                id: transaction.id,
                amount: parseFloat(transaction.final_amount),
                date: transaction.date,
                description: transaction.description,
                category_name: transaction.finance_category?.name,
                account_name: transaction.finance_account?.name,
                is_checked: transaction.is_checked
            };

            if (transaction.finance_category?.type === 'credit') {
                // Income transaction
                const paymentDetail = transaction.payment_details?.[0];

                if (paymentDetail) {
                    // Debug: log the payment detail structure
                    console.log('PaymentDetail in getTransactionDetail:', JSON.stringify(paymentDetail, null, 2));

                    // Access payment data from the merged structure
                    const payment = paymentDetail.payment;
                    const order = payment?.order;
                    const customer = order?.customer;

                    // Build description with customer name and order ID
                    let description = baseTransaction.description;
                    if (customer?.name && order?.id) {
                        description = `Pembayaran dari ${customer.name} - Pesanan #${order.id}`;
                    } else if (customer?.name) {
                        description = `Pembayaran dari ${customer.name}`;
                    }

                    return {
                        ...baseTransaction,
                        description, // Updated description
                        type: 'income',
                        source: {
                            order_id: order?.id,
                            customer_name: customer?.name,
                            customer_phone: customer?.phone,
                            order_type: order?.order_type,
                            payment_method: paymentDetail.method,
                            entry_date: order?.entry_date,
                            payment: {
                                id: payment?.id,
                                final_price: payment?.final_price,
                                status: payment?.status
                            }
                        }
                    };
                } else {
                    // Income transaction without PaymentDetail (manual income)
                    return {
                        ...baseTransaction,
                        type: 'income',
                        source: {
                            payment: {}
                        }
                    };
                }
            } else {
                // Expense transaction
                const expense = transaction.expenses?.[0];

                return {
                    ...baseTransaction,
                    type: 'expense',
                    source: {
                        expense_id: expense?.id,
                        expense_name: expense?.name,
                        payment_method: expense?.payment_method,
                        expense_description: expense?.description
                    }
                };
            }
        } catch (error) {
            throw new Error(`Failed to get transaction detail: ${error.message}`);
        }
    }

    static async getPeriods() {
        try {
            const periods = await FinanceRepository.getPeriods();
            return periods;
        } catch (error) {
            throw new Error(`Failed to get periods: ${error.message}`);
        }
    }

    static async getAccountSummary(filters = {}) {
        try {
            const { date, startDate, endDate, period, type, tenant_id, branch_id } = filters;

            // Validate filters
            if (date && !moment(date).isValid()) {
                throw new Error('Invalid date format');
            }

            if (startDate && endDate && moment(startDate).isAfter(moment(endDate))) {
                throw new Error('Start date cannot be later than end date');
            }

            if (type && !['income', 'expense', 'all'].includes(type)) {
                throw new Error('Invalid type. Must be income, expense, or all');
            }

            const summary = await FinanceRepository.getAccountSummary(filters);

            return {
                period: period || 'daily',
                date: date || moment().format('YYYY-MM-DD'),
                type: type || 'all',
                account_summary: summary
            };
        } catch (error) {
            throw new Error(`Failed to get account summary: ${error.message}`);
        }
    }

    static async getAccountSummaryCounts(filters = {}) {
        try {
            const { date, startDate, endDate, period, type, tenant_id, branch_id } = filters;

            // Validate filters
            if (date && !moment(date).isValid()) {
                throw new Error('Invalid date format');
            }

            if (startDate && endDate && moment(startDate).isAfter(moment(endDate))) {
                throw new Error('Start date cannot be later than end date');
            }

            if (type && !['income', 'expense', 'all'].includes(type)) {
                throw new Error('Invalid type. Must be income, expense, or all');
            }

            const counts = await FinanceRepository.getAccountSummaryCounts(filters);

            return {
                period: period || 'daily',
                date: date || moment().format('YYYY-MM-DD'),
                type: type || 'all',
                counts: counts
            };
        } catch (error) {
            throw new Error(`Failed to get account summary counts: ${error.message}`);
        }
    }

    static async getFinancialReport(filters = {}) {
        try {
            const { month, year, tenant_id, branch_id } = filters;

            // Validate inputs
            if (!month || !year || !tenant_id) {
                throw new Error('Month, year, and tenant_id are required');
            }

            if (month < 1 || month > 12) {
                throw new Error('Month must be between 1 and 12');
            }

            if (year < 2020 || year > new Date().getFullYear() + 1) {
                throw new Error('Invalid year');
            }

            const result = await FinanceRepository.getFinancialReport(filters);

            return {
                success: true,
                data: result
            };

        } catch (error) {
            throw new Error(`Failed to get financial report: ${error.message}`);
        }
    }

    static async generateFinancialReportPDF(filters = {}) {
        try {
            const { month, year, tenant_id, branch_id } = filters;

            // Validate inputs
            if (!month || !year || !tenant_id) {
                throw new Error('Month, year, and tenant_id are required');
            }

            if (month < 1 || month > 12) {
                throw new Error('Month must be between 1 and 12');
            }

            if (year < 2020 || year > new Date().getFullYear() + 1) {
                throw new Error('Invalid year');
            }

            // Get financial report data
            const reportResult = await FinanceRepository.getFinancialReport(filters);
            const reportData = reportResult.data || reportResult;

            // Get tenant and branch data
            const tenant = await Tenant.findByPk(tenant_id);
            const branch = await Branch.findByPk(branch_id);

            // Month names
            const months = [
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
            ];
            const monthName = months[month - 1];

            // Helper function untuk format currency
            const formatCurrency = (amount) => {
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(amount || 0);
            };

            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            // Buffer untuk menyimpan PDF
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => { });

            // Colors (RGB format for PDFKit)
            const colors = {
                primary: [46, 125, 50],      // #2E7D32
                secondary: [25, 118, 210],   // #1976D2
                dark: [51, 51, 51],          // #333333
                gray: [102, 102, 102],       // #666666
            };

            // Header Section
            doc.rect(0, 0, 595, 100)
                .fillColor(colors.primary)
                .fill();
            doc.fillColor('white')
                .fontSize(24)
                .font('Helvetica-Bold')
                .text('LAPORAN KEUANGAN BULANAN', { align: 'center', y: 30 });

            doc.fontSize(14)
                .font('Helvetica')
                .text(tenant?.business_name || 'Nama Bisnis', { align: 'center', y: 60 });

            // Business Info
            let yPosition = 120;
            doc.fillColor(colors.dark)
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('Cabang:', 50, yPosition)
                .font('Helvetica')
                .text(branch?.name || 'Semua Cabang', 120, yPosition);

            yPosition += 15;
            doc.font('Helvetica-Bold')
                .text('Periode:', 50, yPosition)
                .font('Helvetica')
                .text(`${monthName} ${year}`, 120, yPosition);

            yPosition += 15;
            doc.font('Helvetica-Bold')
                .text('Tanggal Laporan:', 50, yPosition)
                .font('Helvetica')
                .text(new Date().toLocaleDateString('id-ID'), 150, yPosition);

            yPosition += 25;

            // Summary Section
            yPosition += 10;
            doc.fillColor(colors.dark)
                .fontSize(14)
                .font('Helvetica-Bold')
                .text('RINGKASAN KEUANGAN', 50, yPosition);

            yPosition += 20;

            // Summary Table
            const summaryData = [
                ['Total Pemasukan', formatCurrency(reportData.summary?.total_income), `${reportData.summary?.income_transactions || 0} transaksi`],
                ['Pendapatan Membership', formatCurrency(reportData.summary?.membership_revenue || 0), `${reportData.summary?.membership_count || 0} membership`],
                ['Total Pengeluaran', formatCurrency(reportData.summary?.total_expense), `${reportData.summary?.expense_transactions || 0} transaksi`],
                ['Arus Kas Bersih', formatCurrency(reportData.summary?.net_balance), `${reportData.summary?.total_income ? ((reportData.summary.net_balance / reportData.summary.total_income) * 100).toFixed(1) : 0}% dari pemasukan`],
                ['Omzet Penjualan Item', formatCurrency(reportData.summary?.sales_revenue || 0), `${reportData.hpp_breakdown?.total_items || 0} item terjual`],
                ['HPP (Harga Pokok)', formatCurrency(reportData.summary?.hpp_total || 0), `${reportData.hpp_breakdown?.items_without_hpp || 0} item HPP kosong`],
                ['Laba Kotor', formatCurrency(reportData.summary?.gross_profit || 0), `${(reportData.summary?.gross_margin_percent || 0).toFixed(1)}% margin`],
                ['Total Transaksi', (reportData.summary?.transaction_count || 0).toString(), 'Semua transaksi']
            ];

            doc.fillColor(colors.dark)
                .fontSize(9)
                .font('Helvetica-Bold');

            // Table header
            doc.text('Item', 50, yPosition)
                .text('Jumlah', 250, yPosition)
                .text('Keterangan', 400, yPosition);

            yPosition += 15;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

            yPosition += 10;
            doc.font('Helvetica');

            summaryData.forEach((row) => {
                doc.text(row[0], 50, yPosition, { width: 180 })
                    .text(row[1], 250, yPosition, { width: 140, align: 'right' })
                    .text(row[2], 400, yPosition, { width: 145 });
                yPosition += 15;
            });

            yPosition += 15;

            // Category Breakdown - Income
            const incomeCategories = reportData.category_breakdown?.filter(cat => cat.category_type === 'credit') || [];
            if (incomeCategories.length > 0) {
                yPosition += 10;
                doc.fillColor(colors.dark)
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('PEMASUKAN PER KATEGORI', 50, yPosition);

                yPosition += 20;

                doc.fillColor(colors.dark)
                    .fontSize(9)
                    .font('Helvetica-Bold')
                    .text('Kategori', 50, yPosition)
                    .text('Jumlah', 250, yPosition)
                    .text('Persentase', 400, yPosition)
                    .text('Transaksi', 480, yPosition);

                yPosition += 15;
                doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

                yPosition += 10;
                doc.font('Helvetica');

                incomeCategories.forEach((cat) => {
                    doc.text(cat.category_name, 50, yPosition, { width: 180 })
                        .text(formatCurrency(cat.total_amount), 250, yPosition, { width: 140, align: 'right' })
                        .text(`${cat.percentage?.toFixed(1) || 0}%`, 400, yPosition, { width: 70, align: 'center' })
                        .text(cat.transaction_count?.toString() || '0', 480, yPosition, { width: 65, align: 'center' });
                    yPosition += 15;
                });

                yPosition += 15;
            }

            // Category Breakdown - Expense
            const expenseCategories = reportData.category_breakdown?.filter(cat => cat.category_type === 'debit') || [];
            if (expenseCategories.length > 0) {
                yPosition += 10;
                doc.fillColor(colors.dark)
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('PENGELUARAN PER KATEGORI', 50, yPosition);

                yPosition += 20;

                doc.fillColor(colors.dark)
                    .fontSize(9)
                    .font('Helvetica-Bold')
                    .text('Kategori', 50, yPosition)
                    .text('Jumlah', 250, yPosition)
                    .text('Persentase', 400, yPosition)
                    .text('Transaksi', 480, yPosition);

                yPosition += 15;
                doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

                yPosition += 10;
                doc.font('Helvetica');

                expenseCategories.forEach((cat) => {
                    doc.text(cat.category_name, 50, yPosition, { width: 180 })
                        .text(formatCurrency(cat.total_amount), 250, yPosition, { width: 140, align: 'right' })
                        .text(`${cat.percentage?.toFixed(1) || 0}%`, 400, yPosition, { width: 70, align: 'center' })
                        .text(cat.transaction_count?.toString() || '0', 480, yPosition, { width: 65, align: 'center' });
                    yPosition += 15;
                });

                yPosition += 15;
            }

            // Detailed Expense Transactions
            const expenseTransactions = reportData.expense_transactions_list || [];
            if (expenseTransactions.length > 0) {
                // Check if we need a new page for the section header
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                } else {
                    yPosition += 10;
                }

                doc.fillColor(colors.dark)
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('RINCIAN TRANSAKSI PENGELUARAN', 50, yPosition);

                yPosition += 20;

                // Print Table Header
                doc.fillColor(colors.dark)
                    .fontSize(9)
                    .font('Helvetica-Bold')
                    .text('Tanggal', 50, yPosition)
                    .text('Deskripsi', 120, yPosition)
                    .text('Kategori', 250, yPosition)
                    .text('Akun', 370, yPosition)
                    .text('Nominal', 450, yPosition);

                yPosition += 15;
                doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

                yPosition += 10;
                doc.font('Helvetica');

                expenseTransactions.forEach((t) => {
                    // Check if current row will overflow current page
                    if (yPosition > 750) {
                        doc.addPage();
                        yPosition = 50;

                        // Redraw Table Header on new page
                        doc.fillColor(colors.dark)
                            .fontSize(9)
                            .font('Helvetica-Bold')
                            .text('Tanggal', 50, yPosition)
                            .text('Deskripsi', 120, yPosition)
                            .text('Kategori', 250, yPosition)
                            .text('Akun', 370, yPosition)
                            .text('Nominal', 450, yPosition);

                        yPosition += 15;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

                        yPosition += 10;
                        doc.font('Helvetica');
                    }

                    const formattedDate = t.date ? new Date(t.date).toLocaleDateString('id-ID') : '-';
                    const amountStr = formatCurrency(t.final_amount || t.amount || 0);

                    doc.text(formattedDate, 50, yPosition, { width: 65 })
                        .text(t.description || '-', 120, yPosition, { width: 125 })
                        .text(t.category?.name || '-', 250, yPosition, { width: 115 })
                        .text(t.account?.name || '-', 370, yPosition, { width: 75 })
                        .text(amountStr, 450, yPosition, { width: 95, align: 'right' });

                    // Increment yPosition dynamically depending on height of description text
                    const textHeight = doc.heightOfString(t.description || '-', { width: 125 });
                    const rowHeight = Math.max(textHeight, 15);
                    yPosition += rowHeight + 5;
                });

                yPosition += 15;
            }

            // Payment Method Breakdown
            if (reportData.payment_method_breakdown?.length > 0) {
                yPosition += 10;
                doc.fillColor(colors.dark)
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('METODE PEMBAYARAN', 50, yPosition);

                yPosition += 20;

                doc.fillColor(colors.dark)
                    .fontSize(9)
                    .font('Helvetica-Bold')
                    .text('Metode', 50, yPosition)
                    .text('Jumlah', 250, yPosition)
                    .text('Persentase', 400, yPosition)
                    .text('Transaksi', 480, yPosition);

                yPosition += 15;
                doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

                yPosition += 10;
                doc.font('Helvetica');

                reportData.payment_method_breakdown.forEach((method) => {
                    doc.text(method.payment_method_name, 50, yPosition, { width: 180 })
                        .text(formatCurrency(method.total_amount), 250, yPosition, { width: 140, align: 'right' })
                        .text(`${method.percentage?.toFixed(1) || 0}%`, 400, yPosition, { width: 70, align: 'center' })
                        .text(method.transaction_count?.toString() || '0', 480, yPosition, { width: 65, align: 'center' });
                    yPosition += 15;
                });

                yPosition += 15;
            }

            // Account Balances
            if (reportData.account_balances?.length > 0) {
                yPosition += 10;
                doc.fillColor(colors.dark)
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('SALDO AKUN KEUANGAN', 50, yPosition);

                yPosition += 20;

                doc.fillColor(colors.dark)
                    .fontSize(9)
                    .font('Helvetica-Bold')
                    .text('Nama Akun', 50, yPosition)
                    .text('Saldo Saat Ini', 250, yPosition)
                    .text('Transaksi', 400, yPosition);

                yPosition += 15;
                doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

                yPosition += 10;
                doc.font('Helvetica');

                reportData.account_balances.forEach((account) => {
                    doc.text(account.account_name, 50, yPosition, { width: 180 })
                        .text(formatCurrency(account.current_balance), 250, yPosition, { width: 140, align: 'right' })
                        .text(account.transaction_count?.toString() || '0', 400, yPosition, { width: 145, align: 'center' });
                    yPosition += 15;
                });

                yPosition += 15;
            }

            // Footer - Check if there's enough space on current page, otherwise add new page
            const pageHeight = 842; // A4 height in points
            const marginBottom = 50;
            const footerHeight = 80; // Estimated footer height

            if (yPosition + footerHeight > pageHeight - marginBottom) {
                doc.addPage();
                yPosition = 50;
            } else {
                yPosition += 20;
            }

            doc.fillColor(colors.gray)
                .fontSize(8)
                .font('Helvetica')
                .text('Laporan dibuat oleh sistem NotaSepatu', 50, yPosition)
                .text(`Dibuat pada: ${new Date().toLocaleString('id-ID')}`, 50, yPosition + 8);

            yPosition += 15;
            doc.font('Helvetica-Bold')
                .fontSize(8)
                .text('Catatan:', 50, yPosition)
                .font('Helvetica')
                .text('• Laporan ini dibuat berdasarkan data transaksi keuangan yang tercatat dalam sistem', 50, yPosition + 8, { width: 495 })
                .text('• Semua nominal dalam Rupiah (IDR)', 50, yPosition + 16, { width: 495 })
                .text('• Data diambil dari periode yang dipilih', 50, yPosition + 24, { width: 495 })
                .text('• Jika ada pertanyaan, hubungi admin NotaSepatu', 50, yPosition + 32, { width: 495 });

            // Finalize PDF
            doc.end();

            // Wait for PDF to be generated
            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    resolve(pdfBuffer);
                });
                doc.on('error', (error) => {
                    reject(new Error(`Failed to generate PDF: ${error.message}`));
                });
            });

        } catch (error) {
            throw new Error(`Failed to generate financial report PDF: ${error.message}`);
        }
    }

    // ===== EXPORT TRANSACTIONS LIST PDF =====
    static async generateTransactionsPDF(filters = {}) {
        try {
            const { date, startDate, endDate, period, type, tenant_id, branch_id } = filters;

            // Get transaction data (reuse existing logic, ordered by newest)
            const transactionFilters = {
                date,
                startDate,
                endDate,
                period: period || 'daily',
                type: type || 'all',
                page: 1,
                limit: 9999, // Get all transactions for the period
                tenant_id,
                branch_id
            };

            const result = await FinanceRepository.getDailyTransactions(transactionFilters);
            const transactions = result.transactions || [];

            // Calculate summary
            let totalIncome = 0;
            let totalExpense = 0;
            let incomeCount = 0;
            let expenseCount = 0;

            transactions.forEach(t => {
                const amount = parseFloat(t.final_amount || 0);
                if (t.finance_category?.type === 'credit') {
                    totalIncome += amount;
                    incomeCount++;
                } else if (t.finance_category?.type === 'debit') {
                    totalExpense += amount;
                    expenseCount++;
                }
            });

            // Get tenant info
            const tenant = await require('../models').Tenant.findByPk(tenant_id);
            const branch = branch_id ? await require('../models').Branch.findByPk(branch_id) : null;

            // Helper format currency
            const formatCurrency = (amount) => {
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(amount || 0);
            };

            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 40, right: 40 }
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));

            const colors = {
                primary: [25, 118, 210],    // Blue
                green: [46, 125, 50],        // Green
                red: [198, 40, 40],          // Red
                dark: [51, 51, 51],
                gray: [102, 102, 102],
                lightGray: [245, 245, 245],
            };

            // ===== HEADER =====
            doc.rect(0, 0, 595, 90)
                .fillColor(colors.primary)
                .fill();
            doc.fillColor('white')
                .fontSize(22)
                .font('Helvetica-Bold')
                .text('DAFTAR TRANSAKSI', { align: 'center', y: 25 });

            doc.fontSize(13)
                .font('Helvetica')
                .text(tenant?.business_name || 'NotaSepatu', { align: 'center', y: 55 });

            // ===== FILTER INFO =====
            let yPosition = 110;
            doc.fillColor(colors.dark)
                .fontSize(10)
                .font('Helvetica-Bold');

            const periodLabels = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };
            const periodLabel = periodLabels[period] || period;
            const dateDisplay = date || (startDate && endDate ? `${startDate} s/d ${endDate}` : '-');

            doc.text('Periode:', 40, yPosition)
                .font('Helvetica')
                .text(`${periodLabel} - ${dateDisplay}`, 120, yPosition);

            yPosition += 18;
            doc.font('Helvetica-Bold')
                .text('Cabang:', 40, yPosition)
                .font('Helvetica')
                .text(branch?.name || 'Semua Cabang', 120, yPosition);

            yPosition += 18;
            doc.font('Helvetica-Bold')
                .text('Tipe:', 40, yPosition)
                .font('Helvetica')
                .text(type === 'all' ? 'Semua Transaksi' : type === 'income' ? 'Pemasukan' : 'Pengeluaran', 120, yPosition);

            yPosition += 18;
            doc.font('Helvetica-Bold')
                .text('Tanggal Cetak:', 40, yPosition)
                .font('Helvetica')
                .text(new Date().toLocaleString('id-ID'), 120, yPosition);

            yPosition += 25;

            // ===== SUMMARY =====
            doc.fillColor(colors.dark)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('RINGKASAN', 40, yPosition);

            yPosition += 20;

            // Summary boxes
            const boxWidth = 160;
            const boxHeight = 50;
            const boxGap = 15;
            const boxY = yPosition;

            // Income box
            doc.roundedRect(40, boxY, boxWidth, boxHeight, 8)
                .fillColor(colors.green)
                .fill();
            doc.fillColor('white')
                .fontSize(9)
                .font('Helvetica')
                .text('Total Pemasukan', 40, boxY + 8, { width: boxWidth, align: 'center' })
                .fontSize(11)
                .font('Helvetica-Bold')
                .text(formatCurrency(totalIncome), 40, boxY + 22, { width: boxWidth, align: 'center' });

            // Expense box
            doc.roundedRect(40 + boxWidth + boxGap, boxY, boxWidth, boxHeight, 8)
                .fillColor(colors.red)
                .fill();
            doc.fillColor('white')
                .fontSize(9)
                .font('Helvetica')
                .text('Total Pengeluaran', 40 + boxWidth + boxGap, boxY + 8, { width: boxWidth, align: 'center' })
                .fontSize(11)
                .font('Helvetica-Bold')
                .text(formatCurrency(totalExpense), 40 + boxWidth + boxGap, boxY + 22, { width: boxWidth, align: 'center' });

            // Profit box
            const profit = totalIncome - totalExpense;
            const profitColor = profit >= 0 ? colors.green : colors.red;
            doc.roundedRect(40 + (boxWidth + boxGap) * 2, boxY, boxWidth, boxHeight, 8)
                .fillColor(profitColor)
                .fill();
            doc.fillColor('white')
                .fontSize(9)
                .font('Helvetica')
                .text('Laba Bersih', 40 + (boxWidth + boxGap) * 2, boxY + 8, { width: boxWidth, align: 'center' })
                .fontSize(11)
                .font('Helvetica-Bold')
                .text(formatCurrency(profit), 40 + (boxWidth + boxGap) * 2, boxY + 22, { width: boxWidth, align: 'center' });

            yPosition = boxY + boxHeight + 25;

            // ===== TRANSACTION TABLE =====
            doc.fillColor(colors.dark)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('DAFTAR TRANSAKSI', 40, yPosition);

            yPosition += 20;

            // Table column positions
            const colNo = 40;
            const colDate = 75;
            const colDesc = 185;
            const colAccount = 330;
            const colCategory = 410;
            const colAmount = 480;
            const tableWidth = 515;

            if (transactions.length === 0) {
                doc.fillColor(colors.gray)
                    .fontSize(10)
                    .font('Helvetica')
                    .text('Tidak ada transaksi untuk periode ini.', 40, yPosition);
                yPosition += 20;
            } else {
                // Table Header
                doc.fillColor(colors.dark)
                    .fontSize(8)
                    .font('Helvetica-Bold');

                doc.text('No', colNo, yPosition)
                    .text('Tanggal', colDate, yPosition)
                    .text('Deskripsi', colDesc, yPosition)
                    .text('Akun', colAccount, yPosition)
                    .text('Kategori', colCategory, yPosition)
                    .text('Jumlah', colAmount, yPosition);

                yPosition += 15;
                doc.moveTo(40, yPosition).lineTo(tableWidth, yPosition).stroke();
                yPosition += 8;
                doc.font('Helvetica');

                // Table rows (already sorted DESC by date from repository)
                transactions.forEach((t, index) => {
                    // Check page overflow
                    if (yPosition > 750) {
                        doc.addPage();
                        yPosition = 50;

                        // Redraw header
                        doc.fillColor(colors.dark)
                            .fontSize(8)
                            .font('Helvetica-Bold');
                        doc.text('No', colNo, yPosition)
                            .text('Tanggal', colDate, yPosition)
                            .text('Deskripsi', colDesc, yPosition)
                            .text('Akun', colAccount, yPosition)
                            .text('Kategori', colCategory, yPosition)
                            .text('Jumlah', colAmount, yPosition);
                        yPosition += 15;
                        doc.moveTo(40, yPosition).lineTo(tableWidth, yPosition).stroke();
                        yPosition += 8;
                        doc.font('Helvetica');
                    }

                    // Alternating row background
                    if (index % 2 === 0) {
                        doc.rect(40, yPosition - 3, tableWidth - 40, 18)
                            .fillColor(colors.lightGray)
                            .fill();
                    }

                    const isIncome = t.finance_category?.type === 'credit';
                    const formattedDate = t.date ? new Date(t.date).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric'
                    }) : '-';

                    // Build description
                    let description = t.description || '';
                    if (isIncome) {
                        const pd = t.payment_details?.[0];
                        const customer = pd?.payment?.order?.customer;
                        const orderId = pd?.payment?.order?.id;
                        if (customer?.name && orderId) {
                            description = `Pembayaran dari ${customer.name} - Pesanan #${orderId}`;
                        } else if (customer?.name) {
                            description = `Pembayaran dari ${customer.name}`;
                        }
                    } else {
                        const expense = t.expenses?.[0];
                        if (expense?.name) {
                            description = expense.name;
                        }
                    }

                    const accountName = t.finance_account?.name || '-';
                    const categoryName = t.finance_category?.name || '-';
                    const amount = parseFloat(t.final_amount || 0);

                    const amountColor = isIncome ? colors.green : colors.red;

                    // Row number
                    doc.fillColor(colors.dark)
                        .fontSize(7)
                        .font('Helvetica')
                        .text((index + 1).toString(), colNo, yPosition, { width: 30 });

                    // Date
                    doc.text(formattedDate, colDate, yPosition, { width: 105 });

                    // Description (truncated)
                    doc.text(description, colDesc, yPosition, { width: 140 });

                    // Account name
                    doc.text(accountName, colAccount, yPosition, { width: 75 });

                    // Category name
                    doc.text(categoryName, colCategory, yPosition, { width: 65 });

                    // Amount
                    doc.fillColor(amountColor)
                        .font('Helvetica-Bold')
                        .text(formatCurrency(amount), colAmount, yPosition, { width: 55, align: 'right' });

                    doc.fillColor(colors.dark)
                        .font('Helvetica');

                    yPosition += 18;
                });
            }

            yPosition += 15;

            // ===== FOOTER =====
            const pageHeight = 842;
            if (yPosition + 80 > pageHeight - 50) {
                doc.addPage();
                yPosition = 50;
            } else {
                yPosition += 10;
            }

            doc.fillColor(colors.gray)
                .fontSize(8)
                .font('Helvetica')
                .text('Dokumen ini dibuat secara otomatis oleh sistem NotaSepatu', 40, yPosition)
                .text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 40, yPosition + 10);

            yPosition += 25;
            doc.font('Helvetica-Bold')
                .fontSize(8)
                .text('Ringkasan:', 40, yPosition)
                .font('Helvetica')
                .text(`${incomeCount} transaksi pemasukan, ${expenseCount} transaksi pengeluaran`, 40, yPosition + 10)
                .text(`Total: ${formatCurrency(totalIncome)} pemasukan - ${formatCurrency(totalExpense)} pengeluaran`, 40, yPosition + 18)
                .text(`Laba bersih: ${formatCurrency(profit)}`, 40, yPosition + 26);

            // Finalize
            doc.end();

            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    resolve(pdfBuffer);
                });
                doc.on('error', (error) => {
                    reject(new Error(`Failed to generate PDF: ${error.message}`));
                });
            });

        } catch (error) {
            throw new Error(`Failed to generate transactions PDF: ${error.message}`);
        }
    }
}

module.exports = FinanceService;
