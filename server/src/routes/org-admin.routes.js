const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { requireOrgType, attachOrgType } = require('../middleware/orgType.middleware');
const c = require('../controllers/org-admin.controller');
const pcr = require('../controllers/profileChangeRequest.controller');
const scr = require('../controllers/shiftChangeRequest.controller');

const router = express.Router();

router.use(verifyToken, requireRole(['ORG_ADMIN']), attachOrgType);

// Shift work belongs to shift-based organisations. A project-based organisation
// has no roster at all — its temporary workers stay free of shifts until a task
// activates them, and its permanent staff are scheduled by task, not by shift.
const shiftOrgOnly = requireOrgType('NON_PROJECT');

// ─── Organisation Profile ─────────────────────────────────────

router.get('/profile',    c.getProfile);
router.patch('/profile',  c.profileUpdateRules, c.validate, c.updateProfile);

// ─── Departments ──────────────────────────────────────────────

router.get('/departments',                    c.listDepts);
router.post('/departments',                   c.deptRules,        c.validate, c.createDept);
router.patch('/departments/:id',              c.deptUpdateRules,  c.validate, c.updateDept);
router.delete('/departments/:id',             c.deleteDept);

// ─── Staff Roles ──────────────────────────────────────────────

router.get('/roles',         c.listRoles);
router.post('/roles',        c.roleRules,       c.validate, c.createRole);
router.patch('/roles/:id',   c.roleUpdateRules, c.validate, c.updateRole);
router.delete('/roles/:id',  c.deleteRole);

// ─── Skills ───────────────────────────────────────────────────

router.get('/skills',         c.listSkills);
router.post('/skills',        c.skillRules,       c.validate, c.createSkill);
router.patch('/skills/:id',   c.skillUpdateRules, c.validate, c.updateSkill);
router.delete('/skills/:id',  c.deleteSkill);

// ─── Subscription & Billing ───────────────────────────────────

router.get('/subscription',           c.getSubscription);
router.get('/billing',                c.listBilling);
router.get('/plans',                  c.listPlans);
router.post('/subscription/renew',    c.renewSubscription);
router.post('/subscription/cancel',   c.cancelSubscription);
router.post('/subscription/change-plan', c.changePlan);

// ─── Shift Templates ──────────────────────────────────────────

router.get('/shifts',        shiftOrgOnly, c.listShifts);
router.post('/shifts',       shiftOrgOnly, c.shiftRules,       c.validate, c.createShift);
router.patch('/shifts/:id',  shiftOrgOnly, c.shiftUpdateRules, c.validate, c.updateShift);
router.delete('/shifts/:id', shiftOrgOnly, c.deleteShift);

// ─── Shift Assignments (roster) ───────────────────────────────
router.get('/shift-assignments',        shiftOrgOnly, c.listShiftAssignments);
router.post('/shift-assignments',       shiftOrgOnly, c.shiftAssignRules, c.validate, c.createShiftAssignment);
router.post('/shift-assignments/bulk',  shiftOrgOnly, c.shiftBulkAssignRules, c.validate, c.bulkCreateShiftAssignments);
router.delete('/shift-assignments/:id', shiftOrgOnly, c.deleteShiftAssignment);

// ─── Shift-change requests (review) ───────────────────────────
// ─── Audit logs (this organisation only) ──────────────────────

router.get('/audit-logs', c.getAuditLogs);

router.get('/shift-change-requests',       shiftOrgOnly, scr.listForOrg);
router.patch('/shift-change-requests/:id', shiftOrgOnly, scr.reviewRules, scr.reviewRequest);

// ─── Staff ────────────────────────────────────────────────────

router.get('/staff',                  c.staffQueryRules,  c.validate, c.listStaff);
router.post('/staff',                 c.staffRules,       c.validate, c.registerStaff);
router.patch('/staff/:id',            c.staffUpdateRules, c.validate, c.updateStaff);
router.patch('/staff/:id/deactivate', c.deactivateStaff);
router.patch('/staff/:id/reactivate', c.reactivateStaff);

// ─── User Skills ──────────────────────────────────────────────

router.post('/staff/:id/skills',              c.assignSkillRules, c.validate, c.assignSkill);
router.delete('/staff/:id/skills/:skillId',   c.removeSkill);

// ─── Profile Change Requests ──────────────────────────────────

router.get('/profile-change-requests',          pcr.listRequests);
router.patch('/profile-change-requests/:id',    pcr.reviewRules, pcr.reviewRequest);

module.exports = router;