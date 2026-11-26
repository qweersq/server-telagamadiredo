const express = require('express');
const router = express.Router();
const WhatsAppTemplateController = require('../controllers/whatsappTemplateController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// Get all templates
router.get('/', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.getAllTemplates);

// Get system templates
router.get('/system', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.getSystemTemplates);

// Get available templates for category
router.get('/available/:category', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.getAvailableTemplates);

// Get template by ID
router.get('/:id', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.getTemplateById);

// Get default template for category
router.get('/default/:category', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.getDefaultTemplate);

// Get available variables for category
router.get('/variables/:category', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.getAvailableVariables);

// Create new template
router.post('/', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.createTemplate);

// Update template
router.put('/:id', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.updateTemplate);

// Delete template
router.delete('/:id', AuthMiddleware.allow([1, 4]), WhatsAppTemplateController.deleteTemplate);

// Process template with variables
router.post('/:id/process', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.processTemplate);

// Duplicate template
router.post('/:id/duplicate', AuthMiddleware.allow([1, 2, 4]), WhatsAppTemplateController.duplicateTemplate);

module.exports = router;
