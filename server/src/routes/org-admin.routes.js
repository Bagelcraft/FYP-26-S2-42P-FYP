const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const c = require('../controllers/org-admin.controller');

const router = express.Router();

router.use(verifyToken, requireRole(['ORG_ADMIN']));

// ─── Departments ──────────────────────────────────────────────

router.get('/departments',         c.listDepts);
router.post('/departments',        c.deptRules,       c.validate, c.createDept);
router.patch('/departments/:id',   c.deptUpdateRules, c.validate, c.updateDept);
router.delete('/departments/:id',  c.deleteDept);

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

// ─── Staff ────────────────────────────────────────────────────

router.get('/staff',                  c.staffQueryRules, c.validate, c.listStaff);
router.post('/staff',                 c.staffRules,      c.validate, c.registerStaff);
router.patch('/staff/:id/deactivate', c.deactivateStaff);

// ─── User Skills ──────────────────────────────────────────────

router.post('/staff/:id/skills',              c.assignSkillRules, c.validate, c.assignSkill);
router.delete('/staff/:id/skills/:skillId',   c.removeSkill);

module.exports = router;