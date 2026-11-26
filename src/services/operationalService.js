const OperationalRepository = require('../repositories/operationalRepository');
const FinanceRepository = require('../repositories/financeRepository');
const ReferralService = require('../services/referralService');
const PointReportRepository = require('../repositories/pointReportRepository');
const PointsSettingsService = require('../services/pointsSettingsService');
const PDFDocument = require('pdfkit');
const { Tenant, Branch } = require('../models');

class OperationalService {
  /**
   * Get comprehensive operational report
   */
  static async getOperationalReport(filters = {}) {
    try {
      console.log('🔍 OperationalService.getOperationalReport - Filters:', filters);

      // Validate required parameters
      const { tenant_id, branch_id, start_date, end_date } = filters;

      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }

      // Validate date range
      if (new Date(start_date) > new Date(end_date)) {
        throw new Error('start_date cannot be greater than end_date');
      }

      console.log('📊 OperationalService.getOperationalReport - Processing:', {
        tenant_id,
        branch_id,
        start_date,
        end_date
      });

      // Check if points are enabled
      let pointsEnabled = false;
      try {
        const pointsSettings = await PointsSettingsService.getSettings(tenant_id);
        pointsEnabled = pointsSettings?.enabled === true;
      } catch (err) {
        console.error('❌ Error fetching points settings:', err);
        pointsEnabled = false;
      }

      // Get all operational data in parallel
      const [
        summary,
        topServices,
        topCustomers,
        discountAnalysis,
        itemAnalysis,
        membershipAnalysis,
        trends,
        referralData,
        pointData
      ] = await Promise.all([
        OperationalRepository.getOperationalSummary(tenant_id, branch_id, start_date, end_date),
        OperationalRepository.getTopServices(tenant_id, branch_id, start_date, end_date),
        OperationalRepository.getTopCustomers(tenant_id, branch_id, start_date, end_date, 10),
        OperationalRepository.getDiscountAnalysis(tenant_id, branch_id, start_date, end_date),
        OperationalRepository.getItemAnalysis(tenant_id, branch_id, start_date, end_date),
        OperationalRepository.getMembershipAnalysis(tenant_id, branch_id, start_date, end_date),
        OperationalRepository.getOperationalTrends(tenant_id, branch_id, start_date, end_date),
        ReferralService.getReferralReport({
          tenant_id,
          branch_id,
          start_date,
          end_date
        }).catch(err => {
          console.error('❌ Error fetching referral data:', err);
          return null;
        }),
        pointsEnabled ? PointReportRepository.getPointReport({
          tenant_id,
          branch_id,
          start_date,
          end_date
        }).catch(err => {
          console.error('❌ Error fetching point data:', err);
          return null;
        }) : Promise.resolve(null)
      ]);

      // Add referral summary to main summary if available
      if (referralData && referralData.summary) {
        summary.total_referral_orders = referralData.summary.total_referral_orders || 0;
        summary.total_referrers = referralData.summary.total_referrers || 0;
        summary.conversion_rate = referralData.summary.conversion_rate || 0;
        summary.total_revenue_from_referral = referralData.summary.total_revenue_from_referral || 0;
      }

      // Add point summary to main summary if available
      if (pointData && pointData.summary) {
        summary.total_points_given = pointData.summary.total_points_given || 0;
        summary.total_points_redeemed = pointData.summary.total_points_redeemed || 0;
        summary.total_active_customers_points = pointData.summary.total_active_customers || 0;
        summary.conversion_rate_points = pointData.summary.conversion_rate || 0;
      }

      // Build comprehensive report
      const report = {
        period: {
          start_date,
          end_date,
          tenant_id: tenant_id,
          branch_id: branch_id
        },
        summary: summary,
        top_services: topServices,
        top_customers: topCustomers,
        discount_analysis: discountAnalysis,
        item_analysis: itemAnalysis,
        membership_analysis: membershipAnalysis,
        trends: trends,
        referral: referralData,
        point: pointData,
        generated_at: new Date().toISOString()
      };

      console.log('✅ OperationalService.getOperationalReport - Completed:', {
        summary_count: Object.keys(summary).length,
        top_services_count: topServices.length,
        top_customers_count: topCustomers.length,
        discount_analysis_count: discountAnalysis.length,
        item_analysis_count: itemAnalysis.length,
        membership_analysis_count: membershipAnalysis.length,
        trends_count: trends.length
      });

      return report;
    } catch (error) {
      console.error('❌ OperationalService.getOperationalReport - Error:', error);
      throw new Error(`Failed to get operational report: ${error.message}`);
    }
  }

  /**
   * Get operational summary only
   */
  static async getOperationalSummary(filters = {}) {
    try {
      console.log('🔍 OperationalService.getOperationalSummary - Filters:', filters);

      const { tenant_id, branch_id, start_date, end_date } = filters;

      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }

      const summary = await OperationalRepository.getOperationalSummary(
        tenant_id,
        branch_id,
        start_date,
        end_date
      );

      console.log('✅ OperationalService.getOperationalSummary - Completed:', summary);
      return summary;
    } catch (error) {
      console.error('❌ OperationalService.getOperationalSummary - Error:', error);
      throw new Error(`Failed to get operational summary: ${error.message}`);
    }
  }

  /**
   * Hitung periode pembanding: rentang dengan panjang SAMA, tepat sebelum periode ini.
   * Contoh: 1–30 Sep → 2–31 Agu.
   *
   * ⚠️ Sengaja pakai `T00:00:00Z` (UTC), bukan waktu lokal. Kalau pakai waktu lokal,
   *    di zona WIB (UTC+7) `toISOString()` bisa menggeser tanggalnya 1 hari ke belakang.
   *
   * @param {string} start_date format YYYY-MM-DD
   * @param {string} end_date   format YYYY-MM-DD
   * @returns {{ prevStartDate: string, prevEndDate: string }}
   */
  static buildPreviousPeriod(start_date, end_date) {
    const toUtcDate = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00Z`);

    const start = toUtcDate(start_date);
    const end = toUtcDate(end_date);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('start_date and end_date must use YYYY-MM-DD format');
    }

    if (start > end) {
      throw new Error('start_date cannot be greater than end_date');
    }

    const dayInMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round((end - start) / dayInMs) + 1);
    const prevEnd = new Date(start.getTime() - dayInMs);
    const prevStart = new Date(prevEnd.getTime() - (totalDays - 1) * dayInMs);
    const formatUtc = (date) => date.toISOString().slice(0, 10);

    return {
      prevStartDate: formatUtc(prevStart),
      prevEndDate: formatUtc(prevEnd)
    };
  }

  /**
   * Performa per cabang untuk beranda Supervisor ("Top Cabang").
   *
   * Menggabungkan DUA sumber yang definisinya sudah ada di aplikasi ini, supaya
   * angka di beranda supervisor selalu sama dengan yang dilihat owner:
   *
   *   - Omzet / order / layanan / item
   *     → `OperationalRepository.getBranchesPerformance` (definisi sama dengan
   *       "Laporan Operasional" milik owner)
   *   - Uang Masuk
   *     → `FinanceRepository.getCashInByBranch` (buku besar, definisi sama dengan
   *       kartu "Uang Masuk" di "Laporan Keuangan" milik owner)
   *
   * Definisi uang sengaja tidak ditulis ulang di sini — masing-masing ranah
   * menyimpan rumusnya sendiri supaya tidak pernah bercabang dua.
   *
   * @param {Object} filters { tenant_id, start_date, end_date }
   * @returns {Promise<Object>} { [branch_id]: { revenue, cashIn, treatments, items, orders, delta } }
   */
  static async getBranchesPerformance(filters = {}) {
    try {
      console.log('🔍 OperationalService.getBranchesPerformance - Filters:', filters);

      const { tenant_id, start_date, end_date } = filters;

      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }

      const { prevStartDate, prevEndDate } = this.buildPreviousPeriod(start_date, end_date);

      const [branchRows, cashInByBranch] = await Promise.all([
        OperationalRepository.getBranchesPerformance(
          tenant_id,
          start_date,
          end_date,
          prevStartDate,
          prevEndDate
        ),
        FinanceRepository.getCashInByBranch(tenant_id, start_date, end_date)
      ]);

      const metrics = {};

      branchRows.forEach((row) => {
        // Delta hanya bisa dihitung kalau periode pembanding memang punya omzet.
        // Cabang baru (atau periode pembanding kosong) → null, UI menampilkan "—".
        const delta =
          row.revenue_prev > 0
            ? Math.round(((row.revenue - row.revenue_prev) / row.revenue_prev) * 1000) / 10
            : null;

        metrics[row.branch_id] = {
          revenue: row.revenue,
          cashIn: cashInByBranch[row.branch_id] || 0,
          treatments: row.treatments,
          items: row.items,
          orders: row.orders,
          delta
        };
      });

      console.log('✅ OperationalService.getBranchesPerformance - Completed:', {
        branches: Object.keys(metrics).length,
        period: `${start_date} s/d ${end_date}`,
        comparePeriod: `${prevStartDate} s/d ${prevEndDate}`
      });

      return metrics;
    } catch (error) {
      console.error('❌ OperationalService.getBranchesPerformance - Error:', error);
      throw new Error(`Failed to get branches performance: ${error.message}`);
    }
  }

  /**
   * Get top services only
   */
  static async getTopServices(filters = {}) {
    try {
      console.log('🔍 OperationalService.getTopServices - Filters:', filters);

      const { tenant_id, branch_id, start_date, end_date } = filters;

      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }

      const topServices = await OperationalRepository.getTopServices(
        tenant_id,
        branch_id,
        start_date,
        end_date
      );

      console.log('✅ OperationalService.getTopServices - Completed:', topServices);
      return topServices;
    } catch (error) {
      console.error('❌ OperationalService.getTopServices - Error:', error);
      throw new Error(`Failed to get top services: ${error.message}`);
    }
  }

  /**
   * Get top customers only
   */
  static async getTopCustomers(filters = {}) {
    try {
      console.log('🔍 OperationalService.getTopCustomers - Filters:', filters);

      const { tenant_id, branch_id, start_date, end_date, limit = 10 } = filters;

      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }

      const topCustomers = await OperationalRepository.getTopCustomers(
        tenant_id,
        branch_id,
        start_date,
        end_date,
        limit
      );

      console.log('✅ OperationalService.getTopCustomers - Completed:', topCustomers);
      return topCustomers;
    } catch (error) {
      console.error('❌ OperationalService.getTopCustomers - Error:', error);
      throw new Error(`Failed to get top customers: ${error.message}`);
    }
  }

  /**
   * Get discount analysis only
   */
  static async getDiscountAnalysis(filters = {}) {
    try {
      console.log('🔍 OperationalService.getDiscountAnalysis - Filters:', filters);

      const { tenant_id, branch_id, start_date, end_date } = filters;

      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }

      const discountAnalysis = await OperationalRepository.getDiscountAnalysis(
        tenant_id,
        branch_id,
        start_date,
        end_date
      );

      console.log('✅ OperationalService.getDiscountAnalysis - Completed:', discountAnalysis);
      return discountAnalysis;
    } catch (error) {
      console.error('❌ OperationalService.getDiscountAnalysis - Error:', error);
      throw new Error(`Failed to get discount analysis: ${error.message}`);
    }
  }

  /**
   * Get item analysis only
   */
  static async getItemAnalysis(filters = {}) {
    try {
      console.log('🔍 OperationalService.getItemAnalysis - Filters:', filters);

      const { tenant_id, branch_id, start_date, end_date } = filters;

      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }

      const itemAnalysis = await OperationalRepository.getItemAnalysis(
        tenant_id,
        branch_id,
        start_date,
        end_date
      );

      console.log('✅ OperationalService.getItemAnalysis - Completed:', itemAnalysis);
      return itemAnalysis;
    } catch (error) {
      console.error('❌ OperationalService.getItemAnalysis - Error:', error);
      throw new Error(`Failed to get item analysis: ${error.message}`);
    }
  }

  /**
   * Get membership analysis only
   */
  static async getMembershipAnalysis(filters = {}) {
    try {
      console.log('🔍 OperationalService.getMembershipAnalysis - Filters:', filters);

      const { tenant_id, branch_id, start_date, end_date } = filters;

      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }

      const membershipAnalysis = await OperationalRepository.getMembershipAnalysis(
        tenant_id,
        branch_id,
        start_date,
        end_date
      );

      console.log('✅ OperationalService.getMembershipAnalysis - Completed:', membershipAnalysis);
      return membershipAnalysis;
    } catch (error) {
      console.error('❌ OperationalService.getMembershipAnalysis - Error:', error);
      throw new Error(`Failed to get membership analysis: ${error.message}`);
    }
  }

  /**
   * Get operational trends only
   */
  static async getOperationalTrends(filters = {}) {
    try {
      console.log('🔍 OperationalService.getOperationalTrends - Filters:', filters);

      const { tenant_id, branch_id, start_date, end_date } = filters;

      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required');
      }

      const trends = await OperationalRepository.getOperationalTrends(
        tenant_id,
        branch_id,
        start_date,
        end_date
      );

      console.log('✅ OperationalService.getOperationalTrends - Completed:', trends);
      return trends;
    } catch (error) {
      console.error('❌ OperationalService.getOperationalTrends - Error:', error);
      throw new Error(`Failed to get operational trends: ${error.message}`);
    }
  }

  /**
   * Generate operational report PDF
   */
  static async generateOperationalReportPDF(filters = {}) {
    try {
      const { start_date, end_date, tenant_id, branch_id } = filters;

      // Validate inputs
      if (!start_date || !end_date || !tenant_id) {
        throw new Error('start_date, end_date, and tenant_id are required');
      }

      // Get operational report data
      const reportData = await this.getOperationalReport(filters);

      // Get tenant and branch data
      const tenant = await Tenant.findByPk(tenant_id);
      const branch = branch_id ? await Branch.findByPk(branch_id) : null;

      // Format dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const startDateStr = startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const endDateStr = endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      // Helper function untuk format currency
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount || 0);
      };

      // Helper function untuk format number
      const formatNumber = (num) => {
        return new Intl.NumberFormat('id-ID').format(num || 0);
      };

      // Helper function untuk format date
      const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (error) {
          return dateString;
        }
      };

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Buffer untuk menyimpan PDF
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {});

      // Page dimensions - A4 size in points
      const pageHeight = 842; // A4 height in points
      const pageWidth = 595; // A4 width in points

      // Colors (RGB format for PDFKit)
      const colors = {
        primary: [59, 130, 246],      // #3B82F6 (blue)
        secondary: [25, 118, 210],    // #1976D2
        dark: [17, 24, 39],           // #111827
        gray: [107, 114, 128],        // #6B7280
        light: [243, 244, 246],       // #F3F4F6
      };

      // Header Section
      doc.rect(0, 0, 595, 100)
        .fillColor(colors.primary)
        .fill();
      doc.fillColor('white')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('LAPORAN OPERASIONAL', { align: 'center', y: 30 });

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
        .text(`${startDateStr} - ${endDateStr}`, 120, yPosition);

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
        .text('RINGKASAN OPERASIONAL', 50, yPosition);

      yPosition += 20;

      // Summary Table
      const summaryData = [
        ['Total Layanan', formatNumber(reportData.summary?.total_services || 0), 'Layanan tersedia'],
        ['Customer Aktif', formatNumber(reportData.summary?.total_customers || 0), 'Customer dalam periode'],
        ['Customer Baru', formatNumber(reportData.summary?.total_new_customers || 0), 'Customer baru'],
        ['Total Diskon', formatCurrency(reportData.summary?.total_discounts || 0), 'Diskon diberikan'],
        ['Item Dirawat', formatNumber(reportData.summary?.total_items || 0), 'Item yang dirawat'],
        ['Membership Aktif', formatNumber(reportData.summary?.total_memberships || 0), 'Member aktif'],
        ['Total Order Referral', formatNumber(reportData.summary?.total_referral_orders || 0), 'Order dari referral'],
        ['Total Referrer', formatNumber(reportData.summary?.total_referrers || 0), 'Customer referrer'],
        ['Conversion Rate', `${(reportData.summary?.conversion_rate || 0).toFixed(1)}%`, 'Tingkat konversi'],
        ['Revenue Referral', formatCurrency(reportData.summary?.total_revenue_from_referral || 0), 'Pendapatan referral']
      ];

      // Add point data to summary if available
      if (reportData.point && reportData.point.summary) {
        summaryData.push(
          ['Total Poin Diberikan', formatNumber(reportData.point.summary.total_points_given || 0), 'Poin diberikan'],
          ['Total Poin Ditebus', formatNumber(reportData.point.summary.total_points_redeemed || 0), 'Poin ditebus'],
          ['Customer Aktif Poin', formatNumber(reportData.point.summary.total_active_customers || 0), 'Customer aktif poin'],
          ['Conversion Rate Poin', `${(reportData.point.summary.conversion_rate || 0).toFixed(1)}%`, 'Tingkat konversi poin']
        );
      }

      doc.fillColor(colors.dark)
        .fontSize(9)
        .font('Helvetica-Bold');

      // Table header - aligned with data columns
      doc.text('Item', 50, yPosition, { width: 180 })
        .text('Jumlah', 250, yPosition, { width: 140, align: 'right' })
        .text('Keterangan', 400, yPosition, { width: 145 });

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

      yPosition += 20;

      // Top Services Section
      if (reportData.top_services && reportData.top_services.length > 0) {
        // Check if need new page
        if (yPosition > 750) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 10;
        doc.fillColor(colors.dark)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('LAYANAN TERBANYAK', 50, yPosition);

        yPosition += 20;

        doc.fillColor(colors.dark)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('No', 50, yPosition, { width: 25, align: 'center' })
          .text('Layanan', 80, yPosition, { width: 280 })
          .text('Jumlah Order', 370, yPosition, { width: 90, align: 'center' })
          .text('Total Revenue', 470, yPosition, { width: 75, align: 'right' });

        yPosition += 15;
        doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

        yPosition += 10;
        doc.font('Helvetica');

        reportData.top_services.slice(0, 10).forEach((service, index) => {
          doc.text((index + 1).toString(), 50, yPosition, { width: 25, align: 'center' })
            .text(service.treatment_name || '-', 80, yPosition, { width: 280, ellipsis: true })
            .text(formatNumber(service.total_orders || 0), 370, yPosition, { width: 90, align: 'center' })
            .text(formatCurrency(service.total_revenue || 0), 470, yPosition, { width: 75, align: 'right' });
          yPosition += 15;
        });

        yPosition += 20;
      }

      // Top Customers Section
      if (reportData.top_customers && reportData.top_customers.length > 0) {
        const marginBottom = 50;
        const minSpaceNeeded = 60; // Minimum space needed for header + 1 row
        
        // Check if need new page before section
        if (yPosition > pageHeight - marginBottom - minSpaceNeeded) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 10;
        doc.fillColor(colors.dark)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('CUSTOMER TERBANYAK', 50, yPosition);

        yPosition += 20;

        doc.fillColor(colors.dark)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('No', 50, yPosition, { width: 25, align: 'center' })
          .text('Customer', 80, yPosition, { width: 150 })
          .text('No. Telepon', 240, yPosition, { width: 120 })
          .text('Total Order', 370, yPosition, { width: 85, align: 'center' })
          .text('Total Spent', 465, yPosition, { width: 80, align: 'right' });

        yPosition += 15;
        doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

        yPosition += 10;
        doc.font('Helvetica');

        reportData.top_customers.slice(0, 10).forEach((customer, index) => {
          // Check if need new page before each row
          const rowHeight = 15; // Standard row height
          if (yPosition + rowHeight > pageHeight - marginBottom) {
            doc.addPage();
            yPosition = 50;
            
            // Re-print header on new page
            doc.fillColor(colors.dark)
              .fontSize(14)
              .font('Helvetica-Bold')
              .text('CUSTOMER TERBANYAK (Lanjutan)', 50, yPosition);
            
            yPosition += 20;
            
            doc.fillColor(colors.dark)
              .fontSize(9)
              .font('Helvetica-Bold')
              .text('No', 50, yPosition, { width: 25, align: 'center' })
              .text('Customer', 80, yPosition, { width: 150 })
              .text('No. Telepon', 240, yPosition, { width: 120 })
              .text('Total Order', 370, yPosition, { width: 85, align: 'center' })
              .text('Total Spent', 465, yPosition, { width: 80, align: 'right' });
            
            yPosition += 15;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();
            yPosition += 10;
            doc.font('Helvetica');
          }
          
          // Calculate if text needs wrapping (check height after text)
          const customerName = customer.customer_name || '-';
          const phone = customer.phone || '-';
          
          // Text with wrapping enabled
          const nameHeight = doc.heightOfString(customerName, { width: 150 });
          const phoneHeight = doc.heightOfString(phone, { width: 120 });
          const maxRowHeight = Math.max(nameHeight, phoneHeight, 15);
          
          doc.text((index + 1).toString(), 50, yPosition, { width: 25, align: 'center' })
            .text(customerName, 80, yPosition, { width: 150, ellipsis: true })
            .text(phone, 240, yPosition, { width: 120, ellipsis: true })
            .text(formatNumber(customer.total_orders || 0), 370, yPosition, { width: 85, align: 'center' })
            .text(formatCurrency(customer.total_spent || 0), 465, yPosition, { width: 80, align: 'right' });
          
          yPosition += maxRowHeight;
        });

        yPosition += 20;
      }

      // Discount Analysis Section
      if (reportData.discount_analysis && reportData.discount_analysis.length > 0) {
        // Check if need new page
        if (yPosition > 750) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 10;
        doc.fillColor(colors.dark)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('ANALISA DISKON', 50, yPosition);

        yPosition += 20;

        doc.fillColor(colors.dark)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('No', 50, yPosition, { width: 25, align: 'center' })
          .text('Nama Diskon', 80, yPosition, { width: 160 })
          .text('Tipe', 250, yPosition, { width: 60 })
          .text('Nilai', 320, yPosition, { width: 70, align: 'center' })
          .text('Penggunaan', 400, yPosition, { width: 70, align: 'center' })
          .text('Total Diskon', 480, yPosition, { width: 65, align: 'right' });

        yPosition += 15;
        doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

        yPosition += 10;
        doc.font('Helvetica');

        reportData.discount_analysis.forEach((discount, index) => {
          const discountType = discount.discount_type === 'percentage' ? 'Persentase' : 
                              discount.discount_type === 'nominal' ? 'Nominal' : 
                              discount.discount_type || '-';
          const discountValue = discount.discount_type === 'percentage' 
            ? `${discount.discount_value || 0}%` 
            : formatCurrency(discount.discount_value || 0);

          doc.text((index + 1).toString(), 50, yPosition, { width: 25, align: 'center' })
            .text(discount.discount_name || '-', 80, yPosition, { width: 160 })
            .text(discountType, 250, yPosition, { width: 60 })
            .text(discountValue, 320, yPosition, { width: 70, align: 'center' })
            .text(formatNumber(discount.usage_count || 0), 400, yPosition, { width: 70, align: 'center' })
            .text(formatCurrency(discount.total_discount_given || 0), 480, yPosition, { width: 65, align: 'right' });
          yPosition += 15;
        });

        yPosition += 20;
      }

      // Item Analysis Section
      if (reportData.item_analysis && reportData.item_analysis.length > 0) {
        // Check if need new page
        if (yPosition > 750) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 10;
        doc.fillColor(colors.dark)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('ITEM TERBANYAK', 50, yPosition);

        yPosition += 20;

        doc.fillColor(colors.dark)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('No', 50, yPosition, { width: 25, align: 'center' })
          .text('Item', 80, yPosition, { width: 165 })
          .text('Brand', 260, yPosition, { width: 70 })
          .text('Tipe', 340, yPosition, { width: 80 })
          .text('Warna', 430, yPosition, { width: 75 })
          .text('Jumlah', 515, yPosition, { width: 35, align: 'center' });

        yPosition += 15;
        doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

        yPosition += 10;
        doc.font('Helvetica');

        reportData.item_analysis.slice(0, 10).forEach((item, index) => {
          doc.text((index + 1).toString(), 50, yPosition, { width: 25, align: 'center' })
            .text(item.item_name || '-', 80, yPosition, { width: 170, ellipsis: true })
            .text(item.brand || '-', 260, yPosition, { width: 70, ellipsis: true })
            .text(item.type || '-', 340, yPosition, { width: 80, ellipsis: true })
            .text((item.color || '-').toString(), 430, yPosition, { width: 75, ellipsis: true })
            .text(formatNumber(item.total_treatments || 0), 515, yPosition, { width: 30, align: 'center' });
          yPosition += 15;
        });

        yPosition += 20;
      }

      // Top Customers by Points Section
      if (reportData.point && reportData.point.top_customers && reportData.point.top_customers.length > 0) {
        const marginBottom = 50;
        const minSpaceNeeded = 60; // Minimum space needed for header + 1 row
        
        // Check if need new page before section
        if (yPosition > pageHeight - marginBottom - minSpaceNeeded) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 10;
        doc.fillColor(colors.dark)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('TOP 10 CUSTOMER POIN', 50, yPosition);

        yPosition += 20;

        doc.fillColor(colors.dark)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('No', 50, yPosition, { width: 25, align: 'center' })
          .text('Customer', 80, yPosition, { width: 140 })
          .text('No. Telepon', 230, yPosition, { width: 100 })
          .text('Poin Saat Ini', 340, yPosition, { width: 70, align: 'right' })
          .text('Diberikan', 420, yPosition, { width: 60, align: 'right' })
          .text('Ditebus', 490, yPosition, { width: 55, align: 'right' });

        yPosition += 15;
        doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();

        yPosition += 10;
        doc.font('Helvetica');

        reportData.point.top_customers.slice(0, 10).forEach((customer, index) => {
          // Check if need new page before each row
          const rowHeight = 15; // Standard row height
          if (yPosition + rowHeight > pageHeight - marginBottom) {
            doc.addPage();
            yPosition = 50;
            
            // Re-print header on new page
            doc.fillColor(colors.dark)
              .fontSize(14)
              .font('Helvetica-Bold')
              .text('TOP 10 CUSTOMER POIN (Lanjutan)', 50, yPosition);
            
            yPosition += 20;
            
            doc.fillColor(colors.dark)
              .fontSize(9)
              .font('Helvetica-Bold')
              .text('No', 50, yPosition, { width: 25, align: 'center' })
              .text('Customer', 80, yPosition, { width: 140 })
              .text('No. Telepon', 230, yPosition, { width: 100 })
              .text('Poin Saat Ini', 340, yPosition, { width: 70, align: 'right' })
              .text('Diberikan', 420, yPosition, { width: 60, align: 'right' })
              .text('Ditebus', 490, yPosition, { width: 55, align: 'right' });
            
            yPosition += 15;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();
            yPosition += 10;
            doc.font('Helvetica');
          }
          
          const customerName = customer.customer_name || '-';
          const phone = customer.customer_phone || '-';
          const currentPoints = parseInt(customer.current_points) || 0;
          const totalGiven = parseInt(customer.total_points_given) || 0;
          const totalRedeemed = parseInt(customer.total_points_redeemed) || 0;
          
          doc.text((index + 1).toString(), 50, yPosition, { width: 25, align: 'center' })
            .text(customerName, 80, yPosition, { width: 140, ellipsis: true })
            .text(phone, 230, yPosition, { width: 100, ellipsis: true })
            .text(formatNumber(currentPoints), 340, yPosition, { width: 70, align: 'right' })
            .text(formatNumber(totalGiven), 420, yPosition, { width: 60, align: 'right' })
            .text(formatNumber(totalRedeemed), 490, yPosition, { width: 55, align: 'right' });
          
          yPosition += 15;
        });

        yPosition += 20;
      }

      // Footer - Check if there's enough space on current page
      const marginBottom = 50;
      const footerHeight = 80;
      
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
        .text('• Laporan ini dibuat berdasarkan data operasional yang tercatat dalam sistem', 50, yPosition + 8, { width: 495 })
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
      console.error('❌ OperationalService.generateOperationalReportPDF - Error:', error);
      throw new Error(`Failed to generate operational report PDF: ${error.message}`);
    }
  }
}

module.exports = OperationalService;
