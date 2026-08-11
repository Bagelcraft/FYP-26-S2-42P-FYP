const express = require('express');
const { body, query } = require('express-validator');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { requireOrgType, attachOrgType } = require('../middleware/orgType.middleware');
const { requireActiveOrganisation } = require('../middleware/orgActive.middleware');
const taskController = require('../controllers/task.controller');
const allocationController = require('../controllers/allocation.controller');
const managerController = require('../controllers/manager.controller');
const projectController = require('../controllers/project.controller');
const updateRequestController = require('../controllers/task-update-request.controller');

const router = express.Router();

router.use(verifyToken, requireRole(['PROJECT_MANAGER']), requireActiveOrganisation, attachOrgType);

// ─── Validation rules ─────────────────────────────────────────────────────

const TASK_STATUSES = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED'];

const createRules = [
  body('title')
    .trim().notEmpty().withMessage('title is required')
    .isLength({ max: 200 }).withMessage('title must be 200 characters or fewer'),
  body('start_datetime')
    .isISO8601().withMessage('start_datetime must be a valid ISO 8601 datetime'),
  body('end_datetime')
    .isISO8601().withMessage('end_datetime must be a valid ISO 8601 datetime')
    .custom((val, { req }) => {
      if (new Date(val) <= new Date(req.body.start_datetime)) {
        throw new Error('end_datetime must be after start_datetime');
      }
      return true;
    }),
  body('description').optional({ nullable: true }).isString(),
  body('department_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('department_id must be a positive integer'),
  body('project_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('project_id must be a positive integer'),
  // NEW — multi-skill. Accept an array of skill ids.
  body('required_skill_ids')
    .optional({ nullable: true })
    .isArray().withMessage('required_skill_ids must be an array'),
  body('required_skill_ids.*')
    .isInt({ min: 1 }).withMessage('each required skill id must be a positive integer'),
  // Legacy single-skill still accepted for backward compatibility.
  body('required_skill_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('required_skill_id must be a positive integer'),
];

const updateRules = [
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('status')
    .optional()
    .isIn(TASK_STATUSES).withMessage(`status must be one of: ${TASK_STATUSES.join(', ')}`),
  body('start_datetime').optional().isISO8601(),
  body('end_datetime').optional().isISO8601(),
  body('description').optional({ nullable: true }).isString(),
  body('department_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('department_id must be a positive integer'),
  body('project_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('project_id must be a positive integer'),
  body('required_skill_ids')
    .optional({ nullable: true })
    .isArray().withMessage('required_skill_ids must be an array'),
  body('required_skill_ids.*')
    .isInt({ min: 1 }).withMessage('each required skill id must be a positive integer'),
  body('required_skill_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('required_skill_id must be a positive integer'),
];

const listQueryRules = [
  query('status').optional().isIn(TASK_STATUSES).withMessage(`status must be one of: ${TASK_STATUSES.join(', ')}`),
  query('department_id').optional().isInt({ min: 1 }).withMessage('department_id must be a positive integer'),
  query('project_id').optional().custom((v) => v === 'unassigned' || /^[1-9]\d*$/.test(v))
    .withMessage('project_id must be a positive integer or "unassigned"'),
  query('date').optional().isISO8601().withMessage('date must be a valid ISO 8601 date'),
];

const leaveDecisionRules = [
  body('status').isIn(['APPROVED', 'REJECTED']).withMessage('status must be APPROVED or REJECTED'),
];

// ─── Projects (PROJECT organisations only) ────────────────────────────────
//
// Task → Resource → Duration. A project owns its tasks, names the pool of
// workers who may take them, and bounds when the work can be scheduled.

const projectsOnly = requireOrgType('PROJECT');

router.get('/projects',       projectsOnly, projectController.listQueryRules, projectController.list);
router.get('/projects/:id',   projectsOnly, projectController.getOne);
router.post('/projects',      projectsOnly, projectController.createRules,    projectController.create);
router.patch('/projects/:id', projectsOnly, projectController.updateRules,    projectController.update);
router.delete('/projects/:id', projectsOnly, projectController.remove);

// Resources — who is able to work on this project
router.get('/projects/:id/resources',            projectsOnly, projectController.listResources);
router.get('/projects/:id/available-resources',  projectsOnly, projectController.listAvailableResources);
router.post('/projects/:id/resources',           projectsOnly, projectController.resourceRules, projectController.addResources);
router.delete('/projects/:id/resources/:userId', projectsOnly, projectController.removeResource);

// ─── Task CRUD (manager view with filters) ────────────────────────────────

router.get('/tasks',        listQueryRules, taskController.list);
router.get('/tasks/:id',                   taskController.getOne);
router.post('/tasks',       createRules,   taskController.create);
router.patch('/tasks/:id',  updateRules,   taskController.update);
router.delete('/tasks/:id',                taskController.remove);

// ─── Allocation engine ─────────────────────────────────────────────────────

router.get('/tasks/:id/eligible-staff', allocationController.getEligibleStaff);
router.post('/tasks/:id/assign',      allocationController.assignBodyRules, allocationController.manualAssign);
router.post('/tasks/:id/reallocate',  allocationController.assignBodyRules, allocationController.reallocate);
router.post('/tasks/:id/auto-allocate', allocationController.autoAllocate);
router.get('/tasks/:id/allocation-history', allocationController.getHistory);

// Task update requests (manager → worker "please update"): create + list
router.post('/tasks/:id/update-requests', updateRequestController.createRules, updateRequestController.create);
router.get('/tasks/:id/update-requests',  updateRequestController.list);

// Completion approval (freelancer flow): approve/reject a SUBMITTED task
router.patch('/tasks/:id/approve-completion', taskController.approveCompletion);
router.patch('/tasks/:id/reject-completion',  taskController.rejectCompletion);

// ─── Manager portal ────────────────────────────────────────────────────────

// Team — view all members with skills, weekly capacity, availability
router.get('/team', managerController.getTeam);

// Leave — track, approve/reject, adjust balances
router.get('/leave',                         managerController.listLeave);
router.patch('/leave/:id',  leaveDecisionRules, managerController.decideLeave);
router.get('/leave-balance',                 managerController.listLeaveBalances);
router.patch('/leave-balance/:userId',       managerController.updateLeaveBalance);

// Reports — working hours + task completion (gated: plan must include "Advanced Reports")
// SmartTask sells a single tier, so there is no "upgrade" for a manager to buy —
// gating reports behind a plan feature could only ever produce a dead end. The
// requireFeature middleware is kept for if tiers ever return.
router.get('/reports', managerController.getReports);

// Calendar — shifts, unavailability and task start/deadline across a date range
router.get('/calendar', managerController.getCalendar);

// Availability — per-day count of skill-matching workers (for the task date picker)
router.get('/availability', managerController.getAvailability);

// Lookups for Create/Edit Task dropdowns (manager-accessible, read-only)
router.get('/org-info',        managerController.getOrgInfo);
router.get('/shift-templates', managerController.getShiftTemplates);

// ─── Roster — shift-based organisations only ──────────────────
// A project-based company has no roster, so these are gated the same way the
// Org Admin roster endpoints are.
const shiftOrgOnly = requireOrgType('NON_PROJECT');

router.get('/shift-assignments',         shiftOrgOnly, managerController.listRoster);
router.post('/shift-assignments',        shiftOrgOnly, managerController.rosterAssignRules, managerController.createRosterEntry);
router.post('/shift-assignments/bulk',   shiftOrgOnly, managerController.rosterBulkRules,   managerController.bulkRoster);
router.delete('/shift-assignments/:id',  shiftOrgOnly, managerController.deleteRosterEntry);
router.get('/departments',     managerController.getDepartments);
router.get('/skills',          managerController.getSkills);

module.exports = router;
