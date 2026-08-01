const { body, query, validationResult } = require('express-validator');
const svc = require('../services/org-admin.service');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
}

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

const orgId = (req) => req.user.organisationId;
const id    = (req) => Number(req.params.id);

// ─── Organisation Profile ─────────────────────────────────────

async function getProfile(req, res, next) {
  try { ok(res, await svc.getOrgProfile(orgId(req))); } catch (e) { next(e); }
}

const profileUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('name is required').isLength({ max: 150 }),
  body('fiscal_year_start_month').optional().isInt({ min: 1, max: 12 }).withMessage('fiscal_year_start_month must be 1–12'),
];

async function updateProfile(req, res, next) {
  try { ok(res, await svc.updateOrgProfile(orgId(req), req.body)); } catch (e) { next(e); }
}

// ─── Departments ──────────────────────────────────────────────

const deptRules = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }),
];

const deptUpdateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
];

async function listDepts(req, res, next) {
  try { ok(res, await svc.listDepartments(orgId(req))); } catch (e) { next(e); }
}
async function createDept(req, res, next) {
  try { ok(res, await svc.createDepartment(orgId(req), req.body), 201); } catch (e) { next(e); }
}
async function updateDept(req, res, next) {
  try { ok(res, await svc.updateDepartment(orgId(req), id(req), req.body)); } catch (e) { next(e); }
}
async function deleteDept(req, res, next) {
  try { await svc.deleteDepartment(orgId(req), id(req)); res.status(204).end(); } catch (e) { next(e); }
}

// ─── Staff Roles ──────────────────────────────────────────────

const roleRules = [
  body('role_name').trim().notEmpty().withMessage('role_name is required').isLength({ max: 100 }),
  body('max_working_hours').optional({ nullable: true }).isInt({ min: 1 }),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('skill_ids').optional().isArray().withMessage('skill_ids must be an array'),
  body('skill_ids.*').optional().isInt({ min: 1 }),
];

const roleUpdateRules = [
  body('role_name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('max_working_hours').optional({ nullable: true }).isInt({ min: 1 }),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('skill_ids').optional().isArray().withMessage('skill_ids must be an array'),
  body('skill_ids.*').optional().isInt({ min: 1 }),
];

async function listRoles(req, res, next) {
  try { ok(res, await svc.listRoles(orgId(req))); } catch (e) { next(e); }
}
async function createRole(req, res, next) {
  try { ok(res, await svc.createRole(orgId(req), req.body), 201); } catch (e) { next(e); }
}
async function updateRole(req, res, next) {
  try { ok(res, await svc.updateRole(orgId(req), id(req), req.body)); } catch (e) { next(e); }
}
async function deleteRole(req, res, next) {
  try { await svc.deleteRole(orgId(req), id(req)); res.status(204).end(); } catch (e) { next(e); }
}

// ─── Skills ───────────────────────────────────────────────────

const skillRules = [
  body('skill_name').trim().notEmpty().withMessage('skill_name is required').isLength({ max: 100 }),
  body('cert_required').optional().isBoolean(),
];

const skillUpdateRules = [
  body('skill_name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('cert_required').optional().isBoolean(),
];

async function listSkills(req, res, next) {
  try { ok(res, await svc.listSkills(orgId(req))); } catch (e) { next(e); }
}
async function createSkill(req, res, next) {
  try { ok(res, await svc.createSkill(orgId(req), req.body), 201); } catch (e) { next(e); }
}
async function updateSkill(req, res, next) {
  try { ok(res, await svc.updateSkill(orgId(req), id(req), req.body)); } catch (e) { next(e); }
}
async function deleteSkill(req, res, next) {
  try { await svc.deleteSkill(orgId(req), id(req)); res.status(204).end(); } catch (e) { next(e); }
}

// ─── Shift Templates ─────────────────────────────────────────

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const shiftRules = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }),
  body('start_time').matches(TIME_RE).withMessage('start_time must be HH:MM (24h)'),
  body('end_time').matches(TIME_RE).withMessage('end_time must be HH:MM (24h)'),
];

const shiftUpdateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('start_time').optional().matches(TIME_RE).withMessage('start_time must be HH:MM (24h)'),
  body('end_time').optional().matches(TIME_RE).withMessage('end_time must be HH:MM (24h)'),
];

async function listShifts(req, res, next) {
  try { ok(res, await svc.listShiftTemplates(orgId(req))); } catch (e) { next(e); }
}
async function createShift(req, res, next) {
  try { ok(res, await svc.createShiftTemplate(orgId(req), req.body), 201); } catch (e) { next(e); }
}
async function updateShift(req, res, next) {
  try { ok(res, await svc.updateShiftTemplate(orgId(req), id(req), req.body)); } catch (e) { next(e); }
}
async function deleteShift(req, res, next) {
  try { await svc.deleteShiftTemplate(orgId(req), id(req)); res.status(204).end(); } catch (e) { next(e); }
}

// ─── Staff ────────────────────────────────────────────────────

const WORKER_TYPES = ['PERMANENT_WORKER', 'TEMPORARY_WORKER', 'PROJECT_MANAGER', 'ORG_ADMIN'];

const staffRules = [
  body('full_name').trim().notEmpty().withMessage('full_name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('user_type').isIn(WORKER_TYPES).withMessage(`user_type must be one of: ${WORKER_TYPES.join(', ')}`),
  body('role_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('password').optional().isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  body('skill_ids').optional().isArray().withMessage('skill_ids must be an array'),
  body('skill_ids.*').optional().isInt({ min: 1 }),
  body('annual_entitled').optional({ nullable: true }).isInt({ min: 0 }),
  body('medical_entitled').optional({ nullable: true }).isInt({ min: 0 }),
  body('prorate_leave').optional().isBoolean(),
  body('join_date').optional({ nullable: true }).isISO8601().withMessage('join_date must be a valid date'),
];

const staffQueryRules = [
  query('user_type').optional().isIn(WORKER_TYPES),
  query('search').optional().isString(),
];

const staffUpdateRules = [
  body('full_name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('user_type').optional().isIn(WORKER_TYPES).withMessage(`user_type must be one of: ${WORKER_TYPES.join(', ')}`),
  body('role_id').optional({ nullable: true }).isInt({ min: 1 }),
];

async function listStaff(req, res, next) {
  try {
    ok(res, await svc.listStaff(orgId(req), { user_type: req.query.user_type, search: req.query.search }));
  } catch (e) { next(e); }
}
async function registerStaff(req, res, next) {
  try { ok(res, await svc.registerStaff(orgId(req), req.body), 201); } catch (e) { next(e); }
}
async function updateStaff(req, res, next) {
  try { ok(res, await svc.updateStaff(orgId(req), id(req), req.body)); } catch (e) { next(e); }
}
async function deactivateStaff(req, res, next) {
  try { ok(res, await svc.deactivateStaff(orgId(req), id(req))); } catch (e) { next(e); }
}
async function reactivateStaff(req, res, next) {
  try { ok(res, await svc.reactivateStaff(orgId(req), id(req))); } catch (e) { next(e); }
}

// ─── User Skills ──────────────────────────────────────────────

const assignSkillRules = [
  body('skill_id').isInt({ min: 1 }).withMessage('skill_id is required'),
];

async function assignSkill(req, res, next) {
  try { ok(res, await svc.assignSkillToStaff(orgId(req), id(req), req.body.skill_id), 201); } catch (e) { next(e); }
}
async function removeSkill(req, res, next) {
  try {
    await svc.removeSkillFromStaff(orgId(req), id(req), Number(req.params.skillId));
    res.status(204).end();
  } catch (e) { next(e); }
}

// ─── Shift Assignments (roster) ───────────────────────────────
const shiftAssignRules = [
  body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
  body('shift_id').isInt({ min: 1 }).withMessage('shift_id is required'),
  body('date').isISO8601().withMessage('date must be a valid date'),
];
async function listShiftAssignments(req, res, next) {
  try { ok(res, await svc.listShiftAssignments(orgId(req))); } catch (e) { next(e); }
}
async function createShiftAssignment(req, res, next) {
  try { ok(res, await svc.createShiftAssignment(orgId(req), req.body), 201); } catch (e) { next(e); }
}
const shiftBulkAssignRules = [
  body('user_ids').isArray({ min: 1 }).withMessage('Select at least one employee'),
  body('user_ids.*').isInt({ min: 1 }),
  body('shift_id').isInt({ min: 1 }).withMessage('shift_id is required'),
  body('weekdays').isArray({ min: 1 }).withMessage('Select at least one working day'),
  body('weekdays.*').isInt({ min: 0, max: 6 }),
  body('from').isISO8601().withMessage('from must be a valid date'),
  body('to').isISO8601().withMessage('to must be a valid date'),
];
async function bulkCreateShiftAssignments(req, res, next) {
  try { ok(res, await svc.bulkCreateShiftAssignments(orgId(req), req.body), 201); } catch (e) { next(e); }
}
async function deleteShiftAssignment(req, res, next) {
  try { await svc.deleteShiftAssignment(orgId(req), id(req)); res.status(204).end(); } catch (e) { next(e); }
}

// ─── Subscription & Billing ───────────────────────────────────
async function getSubscription(req, res, next) {
  try { ok(res, await svc.getSubscription(orgId(req))); } catch (e) { next(e); }
}
async function listBilling(req, res, next) {
  try { ok(res, await svc.listBilling(orgId(req))); } catch (e) { next(e); }
}
async function renewSubscription(req, res, next) {
  try { ok(res, await svc.renewSubscription(orgId(req))); } catch (e) { next(e); }
}
async function cancelSubscription(req, res, next) {
  try { ok(res, await svc.cancelSubscription(orgId(req))); } catch (e) { next(e); }
}

module.exports = {
  validate,
  getProfile, profileUpdateRules, updateProfile,
  getSubscription, listBilling, renewSubscription, cancelSubscription,
  deptRules, deptUpdateRules, listDepts, createDept, updateDept, deleteDept,
  roleRules, roleUpdateRules, listRoles, createRole, updateRole, deleteRole,
  skillRules, skillUpdateRules, listSkills, createSkill, updateSkill, deleteSkill,
  shiftRules, shiftUpdateRules, listShifts, createShift, updateShift, deleteShift,
  shiftAssignRules, listShiftAssignments, createShiftAssignment, deleteShiftAssignment,
  shiftBulkAssignRules, bulkCreateShiftAssignments,
  staffRules, staffQueryRules, staffUpdateRules, listStaff, registerStaff, updateStaff, deactivateStaff, reactivateStaff,
  assignSkillRules, assignSkill, removeSkill,
};