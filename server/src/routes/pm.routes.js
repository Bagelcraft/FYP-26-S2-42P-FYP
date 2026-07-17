const express = require('express');
const { body, query } = require('express-validator');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const taskController = require('../controllers/task.controller');
const allocationController = require('../controllers/allocation.controller');
const managerController = require('../controllers/manager.controller');
const updateRequestController = require('../controllers/task-update-request.controller');

const router = express.Router();

router.use(verifyToken, requireRole(['PROJECT_MANAGER']));

// ─── Validation rules ─────────────────────────────────────────────────────

const TASK_STATUSES = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

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
  query('date').optional().isISO8601().withMessage('date must be a valid ISO 8601 date'),
];

const leaveDecisionRules = [
  body('status').isIn(['APPROVED', 'REJECTED']).withMessage('status must be APPROVED or REJECTED'),
];

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

// Reports — working hours + task completion
router.get('/reports', managerController.getReports);

// Calendar — shifts, unavailability and task start/deadline across a date range
router.get('/calendar', managerController.getCalendar);

// Availability — per-day count of skill-matching workers (for the task date picker)
router.get('/availability', managerController.getAvailability);

// Lookups for Create/Edit Task dropdowns (manager-accessible, read-only)
router.get('/org-info',        managerController.getOrgInfo);
router.get('/shift-templates', managerController.getShiftTemplates);
router.get('/departments',     managerController.getDepartments);
router.get('/skills',          managerController.getSkills);

module.exports = router;
