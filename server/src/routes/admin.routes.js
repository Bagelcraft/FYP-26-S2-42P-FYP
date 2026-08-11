const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const planController = require('../controllers/plan.controller');
const enquiryController = require('../controllers/enquiryController');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.use(verifyToken, requireRole(['SYSTEM_ADMIN']));

// ─── System health ────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'OK' } });
});

// ─── Organisation registration requests ──────────────────────

router.get('/registrations',              adminController.listRegistrations);
router.post('/registrations/:id/approve', adminController.approveRegistration);
router.post('/registrations/:id/reject',  adminController.rejectRegistration);

// ─── Organisations ────────────────────────────────────────────

router.get('/organisations',                 adminController.listOrganisations);
router.post('/organisations',                adminController.createOrganisation);
router.put('/organisations/:id/suspend',     adminController.suspendOrganisation);
router.put('/organisations/:id/reactivate',  adminController.reactivateOrganisation);

// ─── Platform settings ────────────────────────────────────────

router.get('/settings',   adminController.getSettings);
router.patch('/settings', adminController.updateSettings);

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