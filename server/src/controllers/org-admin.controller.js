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

// ─── Departments ──────────────────────────────────────────────

const deptRules = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }),
  body('head_user_id').optional({ nullable: true }).isInt({ min: 1 }),
];

const deptUpdateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('head_user_id').optional({ nullable: true }).isInt({ min: 1 }),
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

const assignStaffRules = [
  body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
];

async function assignStaffToDept(req, res, next) {
  try { ok(res, await svc.assignStaffToDept(orgId(req), id(req), req.body.user_id)); } catch (e) { next(e); }
}

// ─── Staff Roles ──────────────────────────────────────────────

const roleRules = [
  body('role_name').trim().notEmpty().withMessage('role_name is required').isLength({ max: 100 }),
  body('max_working_hours').optional({ nullable: true }).isInt({ min: 1 }),
];

const roleUpdateRules = [
  body('role_name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('max_working_hours').optional({ nullable: true }).isInt({ min: 1 }),
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

// ─── Staff ────────────────────────────────────────────────────

const WORKER_TYPES = ['PERMANENT_WORKER', 'TEMPORARY_WORKER', 'PROJECT_MANAGER', 'ORG_ADMIN'];

const staffRules = [
  body('full_name').trim().notEmpty().withMessage('full_name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('user_type').isIn(WORKER_TYPES).withMessage(`user_type must be one of: ${WORKER_TYPES.join(', ')}`),
  body('role_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('password').optional().isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
];

const staffQueryRules = [
  query('user_type').optional().isIn(WORKER_TYPES),
  query('search').optional().isString(),
];

async function listStaff(req, res, next) {
  try {
    ok(res, await svc.listStaff(orgId(req), { user_type: req.query.user_type, search: req.query.search }));
  } catch (e) { next(e); }
}
async function registerStaff(req, res, next) {
  try { ok(res, await svc.registerStaff(orgId(req), req.body), 201); } catch (e) { next(e); }
}
async function deactivateStaff(req, res, next) {
  try { ok(res, await svc.deactivateStaff(orgId(req), id(req))); } catch (e) { next(e); }
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

module.exports = {
  validate,
  deptRules, deptUpdateRules, listDepts, createDept, updateDept, deleteDept, assignStaffRules, assignStaffToDept,
  roleRules, roleUpdateRules, listRoles, createRole, updateRole, deleteRole,
  skillRules, skillUpdateRules, listSkills, createSkill, updateSkill, deleteSkill,
  staffRules, staffQueryRules, listStaff, registerStaff, deactivateStaff,
  assignSkillRules, assignSkill, removeSkill,
};