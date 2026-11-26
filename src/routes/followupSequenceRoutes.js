const express = require('express');
const router = express.Router();
const FollowupSequenceController = require('../controllers/followupSequenceController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// =====================================================
// SEQUENCE MANAGEMENT ROUTES
// =====================================================

/**
 * @route   GET /api/followup-sequences
 * @desc    Get all followup sequences
 * @access  Private (Admin, Manager, Staff)
 * @query   page, limit, branch_id
 */
router.get('/', AuthMiddleware.allow([1, 2, 4]), FollowupSequenceController.getAllSequences);

/**
 * @route   GET /api/followup-sequences/:id
 * @desc    Get followup sequence by ID
 * @access  Private (Admin, Manager, Staff)
 */
router.get('/:id', AuthMiddleware.allow([1, 2, 4]), FollowupSequenceController.getSequenceById);

/**
 * @route   POST /api/followup-sequences
 * @desc    Create new followup sequence
 * @access  Private (Admin, Manager)
 * @body    name, description, is_active, is_default, branch_id
 */
router.post('/', AuthMiddleware.allow([1, 2]), FollowupSequenceController.createSequence);

/**
 * @route   PUT /api/followup-sequences/:id
 * @desc    Update followup sequence
 * @access  Private (Admin, Manager)
 * @body    name, description, is_active, is_default, branch_id
 */
router.put('/:id', AuthMiddleware.allow([1, 2]), FollowupSequenceController.updateSequence);

/**
 * @route   DELETE /api/followup-sequences/:id
 * @desc    Delete followup sequence
 * @access  Private (Admin only)
 */
router.delete('/:id', AuthMiddleware.allow([1]), FollowupSequenceController.deleteSequence);

// =====================================================
// SEQUENCE TEMPLATE MANAGEMENT ROUTES
// =====================================================

/**
 * @route   GET /api/followup-sequences/:id/templates
 * @desc    Get templates for a sequence
 * @access  Private (Admin, Manager, Staff)
 */
router.get('/:id/templates', AuthMiddleware.allow([1, 2, 4]), FollowupSequenceController.getSequenceTemplates);

/**
 * @route   POST /api/followup-sequences/:id/templates
 * @desc    Add template to sequence
 * @access  Private (Admin, Manager)
 * @body    step_number, delay_days, template_id, is_active, send_time, conditions
 */
router.post('/:id/templates', AuthMiddleware.allow([1, 2]), FollowupSequenceController.createSequenceTemplate);

/**
 * @route   PUT /api/followup-sequence-templates/:id
 * @desc    Update sequence template
 * @access  Private (Admin, Manager)
 * @body    step_number, delay_days, template_id, is_active, send_time, conditions
 */
router.put('/templates/:id', AuthMiddleware.allow([1, 2]), FollowupSequenceController.updateSequenceTemplate);

/**
 * @route   DELETE /api/followup-sequence-templates/:id
 * @desc    Delete sequence template
 * @access  Private (Admin, Manager)
 */
router.delete('/templates/:id', AuthMiddleware.allow([1, 2]), FollowupSequenceController.deleteSequenceTemplate);

// =====================================================
// CUSTOMER SEQUENCE MANAGEMENT ROUTES
// =====================================================

/**
 * @route   POST /api/followup-sequences/:id/customers
 * @desc    Add customers to sequence
 * @access  Private (Admin, Manager, Staff)
 * @body    customer_ids (array)
 */
router.post('/:id/customers', AuthMiddleware.allow([1, 2, 4]), FollowupSequenceController.addCustomersToSequence);

/**
 * @route   GET /api/followup-sequences/ready-customers
 * @desc    Get customers ready for followup
 * @access  Private (Admin, Manager, Staff)
 * @query   branch_id
 */
router.get('/ready/customers', AuthMiddleware.allow([1, 2, 4]), FollowupSequenceController.getCustomersReadyForFollowup);

/**
 * @route   POST /api/followup-sequences/execute
 * @desc    Execute followup for ready customers
 * @access  Private (Admin, Manager)
 * @body    branch_id, limit
 */
router.post('/execute/followup', AuthMiddleware.allow([1, 2]), FollowupSequenceController.executeFollowup);

// =====================================================
// TESTING & PREVIEW ROUTES
// =====================================================

/**
 * @route   POST /api/followup-sequences/test-template
 * @desc    Test followup template with customer data
 * @access  Private (Admin, Manager, Staff)
 * @body    template_id, customer_id
 */
router.post('/test/template', AuthMiddleware.allow([1, 2, 4]), FollowupSequenceController.testTemplate);

/**
 * @route   POST /api/followup-sequences/:id/preview
 * @desc    Preview sequence for customer
 * @access  Private (Admin, Manager, Staff)
 * @body    customer_id
 */
router.post('/:id/preview', AuthMiddleware.allow([1, 2, 4]), FollowupSequenceController.previewSequence);

// =====================================================
// ANALYTICS & REPORTING ROUTES
// =====================================================

/**
 * @route   GET /api/followup-sequences/analytics/statistics
 * @desc    Get followup statistics
 * @access  Private (Admin, Manager)
 * @query   branch_id, start_date, end_date
 */
router.get('/analytics/statistics', AuthMiddleware.allow([1, 2]), FollowupSequenceController.getStatistics);

/**
 * @route   GET /api/followup-sequences/reports/monthly
 * @desc    Get monthly followup report
 * @access  Private (Admin, Manager)
 * @query   year, month, branch_id
 */
router.get('/reports/monthly', AuthMiddleware.allow([1, 2]), FollowupSequenceController.getMonthlyReport);

// =====================================================
// BROADCAST ROUTES
// =====================================================

/**
 * @route   POST /followup-sequences/broadcast
 * @desc    Send broadcast message to customers
 * @access  Private (Admin, Manager)
 * @body    template_id, message_content, recipient_filter, branch_id, max_recipients
 */
router.post('/broadcast', AuthMiddleware.allow([1, 2]), FollowupSequenceController.sendBroadcast);

/**
 * @route   GET /followup-sequences/broadcast/history
 * @desc    Get broadcast history
 * @access  Private (Admin, Manager, Staff)
 * @query   page, limit, branch_id
 */
router.get('/broadcast/history', AuthMiddleware.allow([1, 2, 4]), FollowupSequenceController.getBroadcastHistory);

// =====================================================
// LIMITS & QUOTA ROUTES
// =====================================================

/**
 * @route   GET /followup-sequences/limits/status
 * @desc    Get tenant limits status and usage
 * @access  Private (Admin, Manager, Staff)
 */
router.get('/limits/status', AuthMiddleware.allow([1, 2, 4]), FollowupSequenceController.getTenantLimitsStatus);

/**
 * @route   GET /followup-sequences/queue
 * @desc    Get message queue status
 * @access  Private (Admin, Manager)
 * @query   status, limit
 */
router.get('/queue', AuthMiddleware.allow([1, 2]), FollowupSequenceController.getMessageQueue);

module.exports = router;
