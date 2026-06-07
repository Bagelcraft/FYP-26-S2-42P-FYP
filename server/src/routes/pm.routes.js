const express = require('express');
const { body, query } = require('express-validator');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const taskController = require('../controllers/task.controller');
const allocationController = require('../controllers/allocation.controller');
const managerController = require('../controllers/manager.controller'); // NEW

const router = express.Router();

router.use(verifyToken, requireRole(['PROJECT_MANAGER', 'ORG_ADMIN']));

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

// ─── Task CRUD (5 — manager view with filters) ────────────────────────────

router.get('/tasks',        listQueryRules, taskController.list);
router.get('/tasks/:id',                   taskController.getOne);
router.post('/tasks',       createRules,   taskController.create);
router.patch('/tasks/:id',  updateRules,   taskController.update);
router.delete('/tasks/:id',                taskController.remove);

// ─── Allocation engine (3 + 4) ────────────────────────────────────────────

router.get('/tasks/:id/eligible-staff', allocationController.getEligibleStaff);
router.post('/tasks/:id/assign',      allocationController.assignBodyRules, allocationController.manualAssign);
router.post('/tasks/:id/reallocate',  allocationController.assignBodyRules, allocationController.reallocate);
router.post('/tasks/:id/auto-allocate', allocationController.autoAllocate);

// ─── Manager portal (NEW — Weishi) ────────────────────────────────────────

// Team — view all members with skills, weekly capacity, availability
router.get('/team', managerController.getTeam);

// Leave — track, approve/reject, adjust balances
router.get('/leave',                         managerController.listLeave);
router.patch('/leave/:id',  leaveDecisionRules, managerController.decideLeave);
router.get('/leave-balance',                 managerController.listLeaveBalances);
router.patch('/leave-balance/:userId',       managerController.updateLeaveBalance);

// Subscription — current plan + billing history
router.get('/subscription', managerController.getSubscription);
router.get('/billing',      managerController.listBilling);

// Lookups for Create/Edit Task dropdowns (manager-accessible, read-only)
router.get('/departments', managerController.getDepartments);
router.get('/skills',      managerController.getSkills);

// Testimonials CRUD (Weishi) — real `Testimonial` model (user-authored), scoped
// to the manager's org. Exposed under /pm so the PROJECT_MANAGER guard applies.
router.get('/testimonials',        managerController.listTestimonials);
router.post('/testimonials',       managerController.createTestimonial);
router.put('/testimonials/:id',    managerController.updateTestimonial);
router.delete('/testimonials/:id', managerController.deleteTestimonial);

module.exports = router;
