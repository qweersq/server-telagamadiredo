const express = require('express');
const OperationalController = require('../controllers/operationalController');
const { AuthMiddleware } = require('../middlewares');

const router = express.Router();

/**
 * Operational Routes
 * All routes require authentication and appropriate roles
 */

// Comprehensive operational report
router.get('/operational/report', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  OperationalController.getOperationalReport
);

// Operational report PDF export
router.get('/operational/report/pdf', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  OperationalController.getOperationalReportPDF
);

// Individual operational endpoints
router.get('/operational/summary', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  OperationalController.getOperationalSummary
);

router.get('/operational/top-services', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  OperationalController.getTopServices
);

router.get('/operational/top-customers', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  OperationalController.getTopCustomers
);

router.get('/operational/discount-analysis', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  OperationalController.getDiscountAnalysis
);

router.get('/operational/item-analysis', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  OperationalController.getItemAnalysis
);

router.get('/operational/membership-analysis', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  OperationalController.getMembershipAnalysis
);

router.get('/operational/trends', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  OperationalController.getOperationalTrends
);

// Performa per cabang (omzet, uang masuk, layanan, item) — beranda Supervisor "Top Cabang"
// Omzet dari data operasional (sama dengan Laporan Operasional),
// Uang Masuk dari buku besar (sama dengan kartu "Uang Masuk" di Laporan Keuangan owner).
// Cukup `allow([1, 2, 4])` — supervisor otomatis ikut lolos (lihat RoleHelper.getEffectiveRoleId).
router.get('/operational/branches-performance', 
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner (+ supervisor via effective role)
  OperationalController.getBranchesPerformance
);

module.exports = router;
