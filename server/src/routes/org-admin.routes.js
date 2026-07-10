const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const c = require('../controllers/org-admin.controller');
const pcr = require('../controllers/profileChangeRequest.controller');
const scr = require('../controllers/shiftChangeRequest.controller');

const router = express.Router();

router.use(verifyToken, requireRole(['ORG_ADMIN']));

// ─── Organisation Profile ─────────────────────────────────────

router.get('/profile',    c.getProfile);
router.patch('/profile',  c.profileUpdateRules, c.validate, c.updateProfile);

// ─── Departments ──────────────────────────────────────────────

router.get('/departments',                    c.listDepts);
router.post('/departments',                   c.deptRules,        c.validate, c.createDept);
router.patch('/departments/:id',              c.deptUpdateRules,  c.validate, c.updateDept);
router.delete('/departments/:id',             c.deleteDept);
router.post('/departments/:id/assign-staff',  c.assignStaffRules, c.validate, c.assignStaffToDept);

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

router.get('/subscription',         c.getSubscription);
router.get('/billing',              c.listBilling);
router.post('/subscription/renew',  c.renewSubscription);
router.post('/subscription/cancel', c.cancelSubscription);

// ─── Shift Templates ──────────────────────────────────────────

router.get('/shifts',        c.listShifts);
router.post('/shifts',       c.shiftRules,       c.validate, c.createShift);
router.patch('/shifts/:id',  c.shiftUpdateRules, c.validate, c.updateShift);
router.delete('/shifts/:id', c.deleteShift);

// ─── Shift Assignments (roster) ───────────────────────────────
router.get('/shift-assignments',        c.listShiftAssignments);
router.post('/shift-assignments',       c.shiftAssignRules, c.validate, c.createShiftAssignment);
router.delete('/shift-assignments/:id', c.deleteShiftAssignment);

// ─── Shift-change requests (review) ───────────────────────────
router.get('/shift-change-requests',       scr.listForOrg);
router.patch('/shift-change-requests/:id', scr.reviewRules, scr.reviewRequest);

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