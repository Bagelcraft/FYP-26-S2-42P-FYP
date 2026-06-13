const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const planController = require('../controllers/plan.controller');
const enquiryController = require('../controllers/enquiryController');

const router = express.Router();

router.use(verifyToken, requireRole(['SYSTEM_ADMIN']));

// ─── System health ────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'OK' } });
});

// ─── Organisations (stub) ─────────────────────────────────────

router.get('/organisations', (req, res) => {
  res.json({ message: 'Get all organisations — to be implemented' });
});

router.post('/organisations', (req, res) => {
  res.json({ message: 'Create organisation — to be implemented' });
});

router.put('/organisations/:id/suspend', (req, res) => {
  res.json({ message: 'Suspend organisation — to be implemented' });
});

// ─── Audit logs (stub) ────────────────────────────────────────

router.get('/logs', (req, res) => {
  res.json({ message: 'Get audit logs — to be implemented' });
});

// ─── Enquiries ────────────────────────────────────────────────

router.get('/enquiries', enquiryController.getAllEnquiries);
router.get('/enquiries/:id', enquiryController.getEnquiryById);
router.patch('/enquiries/:id/respond', enquiryController.respondToEnquiry);
router.delete('/enquiries/:id', enquiryController.deleteEnquiry);

// ─── Subscription Plans (Phase 3) ────────────────────────────

router.get('/plans',                                                              planController.list);
router.get('/plans/:id',                                                          planController.getOne);
router.post('/plans',    planController.createRules, planController.validate,    planController.create);
router.patch('/plans/:id', planController.updateRules, planController.validate,  planController.update);
router.patch('/plans/:id/deactivate',                                             planController.deactivate);
router.patch('/plans/:id/reactivate',                                             planController.reactivate);

router.post('/plans/:id/features',
  planController.featureRules, planController.validate,
  planController.addFeature,
);
router.delete('/plans/:id/features/:featureId', planController.removeFeature);
router.delete('/plans/:id', planController.deletePlan);

module.exports = router;