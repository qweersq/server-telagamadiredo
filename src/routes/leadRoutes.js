const express = require('express');
const router = express.Router();
const LeadController = require('../controllers/LeadController');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.get('/leads/reports', AuthMiddleware.allow([1,2,4]), LeadController.getLeadReports);   
router.get('/leads/follow-up-today', AuthMiddleware.allow([1,2,4]), LeadController.getLeadsForFollowUp);
router.post('/leads', AuthMiddleware.allow([1,2,4]), LeadController.createLead);
router.get('/leads', AuthMiddleware.allow([1,2,4]), LeadController.getLeads);
router.get('/leads/:id', AuthMiddleware.allow([1,2,4]), LeadController.getLead);
router.put('/leads/:id', AuthMiddleware.allow([1,2,4]), LeadController.updateLead);
router.delete('/leads/:id', AuthMiddleware.allow([1,4]), LeadController.deleteLead);

router.post('/leads/:id/follow-up', AuthMiddleware.allow([1,2,4]), LeadController.createFollowUp);
router.get('/leads/:id/follow-up', AuthMiddleware.allow([1,2,4]), LeadController.getLeadRecords);
router.put('/leads/:id/follow-up/:recordId', AuthMiddleware.allow([1,2,4]), LeadController.updateLeadRecord);

module.exports = router; 