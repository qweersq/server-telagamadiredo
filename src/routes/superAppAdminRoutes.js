const express = require('express');
const router = express.Router();
const SuperAppAdminController = require('../controllers/superAppAdminController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// All routes require superapp-superadmin role (role_id: 4)
router.get('/statistics',
    AuthMiddleware.allow([4]), // superapp-superadmin only
    SuperAppAdminController.getStatistics
);

router.get('/statistics/tenants',
    AuthMiddleware.allow([4]), // superapp-superadmin only
    SuperAppAdminController.getTenantStatistics
);

router.get('/statistics/users',
    AuthMiddleware.allow([4]), // superapp-superadmin only
    SuperAppAdminController.getUserStatistics
);

router.get('/statistics/revenue',
    AuthMiddleware.allow([4]), // superapp-superadmin only
    SuperAppAdminController.getRevenueStatistics
);

module.exports = router;
