const express = require('express');
const router = express.Router();
const CustomerDetailController = require('../controllers/customerDetailController');
const { AuthMiddleware } = require('../middlewares');

// Customer Detail Analytics Routes
// All routes require authentication and specific roles

/**
 * Get customer basic info + summary metrics
 * GET /customers/:id/detail
 */
router.get('/customers/:id/detail', 
    AuthMiddleware.allow([1, 2, 4]), 
    CustomerDetailController.getCustomerDetail
);

/**
 * Get customer payment history with pagination
 * GET /customers/:id/payments?page=1&limit=10
 */
router.get('/customers/:id/payments', 
    AuthMiddleware.allow([1, 2, 4]), 
    CustomerDetailController.getCustomerPayments
);

/**
 * Get customer order history with pagination
 * GET /customers/:id/orders?page=1&limit=10
 */
router.get('/customers/:id/orders', 
    AuthMiddleware.allow([1, 2, 4]), 
    CustomerDetailController.getCustomerOrders
);

/**
 * Get customer items & services history with pagination
 * GET /customers/:id/items-services?page=1&limit=20
 */
router.get('/customers/:id/items-services', 
    AuthMiddleware.allow([1, 2, 4]), 
    CustomerDetailController.getCustomerItemsServices
);

/**
 * Get customer follow-up history with pagination
 * GET /customers/:id/follow-ups?page=1&limit=10
 */
router.get('/customers/:id/follow-ups', 
    AuthMiddleware.allow([1, 2, 4]), 
    CustomerDetailController.getCustomerFollowUps
);

/**
 * Get customer shoes photos with pagination
 * GET /customers/:id/shoes-photos?page=1&limit=20
 */
router.get('/customers/:id/shoes-photos', 
    AuthMiddleware.allow([1, 2, 4]), 
    CustomerDetailController.getCustomerShoesPhotos
);

/**
 * Get customer progress photos grouped by order details with pagination
 * GET /customers/:id/progress-photos?page=1&limit=10
 */
router.get('/customers/:id/progress-photos', 
    AuthMiddleware.allow([1, 2, 4]), 
    CustomerDetailController.getCustomerProgressPhotos
);

/**
 * Get customer items history (grouped by item_id)
 * GET /customers/:id/items-history
 */
router.get('/customers/:id/items-history', 
    AuthMiddleware.allow([1, 2, 4]), 
    CustomerDetailController.getCustomerItemsHistory
);

module.exports = router;
