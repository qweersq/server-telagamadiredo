const express = require('express');
const router = express.Router();
const FollowupTemplateController = require('../controllers/followupTemplateController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// =====================================================
// TEMPLATE CRUD ROUTES
// =====================================================

/**
 * @route   GET /followup-templates
 * @desc    Get all followup templates
 * @access  Private (Admin, Manager, Staff)
 * @query   search, is_active, page, limit, branch_id
 */
router.get('/', AuthMiddleware.allow([1, 2, 4]), FollowupTemplateController.getAllTemplates);

/**
 * @route   GET /followup-templates/:id
 * @desc    Get followup template by ID
 * @access  Private (Admin, Manager, Staff)
 */
router.get('/:id', AuthMiddleware.allow([1, 2, 4]), FollowupTemplateController.getTemplateById);

/**
 * @route   POST /followup-templates
 * @desc    Create new followup template
 * @access  Private (Admin, Manager)
 * @body    name, title, description, template_content, variables, is_active, is_default, branch_id
 */
router.post('/', AuthMiddleware.allow([1, 2]), FollowupTemplateController.createTemplate);

/**
 * @route   PUT /followup-templates/:id
 * @desc    Update followup template
 * @access  Private (Admin, Manager)
 * @body    name, title, description, template_content, variables, is_active, is_default, branch_id
 */
router.put('/:id', AuthMiddleware.allow([1, 2]), FollowupTemplateController.updateTemplate);

/**
 * @route   DELETE /followup-templates/:id
 * @desc    Delete followup template
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', AuthMiddleware.allow([1, 2]), FollowupTemplateController.deleteTemplate);

// =====================================================
// TEMPLATE TESTING & PREVIEW ROUTES
// =====================================================

/**
 * @route   POST /followup-templates/:id/preview
 * @desc    Preview template with sample data
 * @access  Private (Admin, Manager, Staff)
 * @body    sample_data (object)
 */
router.post('/:id/preview', AuthMiddleware.allow([1, 2, 4]), FollowupTemplateController.previewTemplate);

/**
 * @route   POST /followup-templates/:id/duplicate
 * @desc    Duplicate template
 * @access  Private (Admin, Manager)
 * @body    new_name
 */
router.post('/:id/duplicate', AuthMiddleware.allow([1, 2]), FollowupTemplateController.duplicateTemplate);

// =====================================================
// UTILITY ROUTES
// =====================================================

/**
 * @route   GET /followup-templates/utils/variables
 * @desc    Get available variables for templates
 * @access  Private (Admin, Manager, Staff)
 */
router.get('/utils/variables', AuthMiddleware.allow([1, 2, 4]), FollowupTemplateController.getAvailableVariables);

/**
 * @route   GET /followup-templates/utils/statistics
 * @desc    Get template statistics
 * @access  Private (Admin, Manager)
 * @query   branch_id
 */
router.get('/utils/statistics', AuthMiddleware.allow([1, 2]), FollowupTemplateController.getTemplateStatistics);

/**
 * @route   GET /followup-templates/utils/export
 * @desc    Export templates
 * @access  Private (Admin, Manager)
 * @query   format (json)
 */
router.get('/utils/export', AuthMiddleware.allow([1, 2]), FollowupTemplateController.exportTemplates);

/**
 * @route   POST /followup-templates/utils/bulk
 * @desc    Bulk operations on templates
 * @access  Private (Admin, Manager)
 * @body    action (activate|deactivate|delete), template_ids, data
 */
router.post('/utils/bulk', AuthMiddleware.allow([1, 2]), FollowupTemplateController.bulkOperations);

module.exports = router;
