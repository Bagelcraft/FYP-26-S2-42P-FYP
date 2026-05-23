const express = require('express');
const { body } = require('express-validator');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const taskController = require('../controllers/task.controller');

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
  body('description')
    .optional({ nullable: true }).isString(),
  body('department_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('department_id must be a positive integer'),
  body('required_skill_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('required_skill_id must be a positive integer'),
];

const updateRules = [
  body('title')
    .optional().trim().notEmpty().isLength({ max: 200 }),
  body('status')
    .optional()
    .isIn(TASK_STATUSES).withMessage(`status must be one of: ${TASK_STATUSES.join(', ')}`),
  body('start_datetime')
    .optional().isISO8601().withMessage('start_datetime must be a valid ISO 8601 datetime'),
  body('end_datetime')
    .optional().isISO8601().withMessage('end_datetime must be a valid ISO 8601 datetime'),
  body('description')
    .optional({ nullable: true }).isString(),
  body('department_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('department_id must be a positive integer'),
  body('required_skill_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('required_skill_id must be a positive integer'),
];

// ─── Task CRUD ────────────────────────────────────────────────────────────

router.get('/tasks',         taskController.list);
router.get('/tasks/:id',     taskController.getOne);
router.post('/tasks',        createRules, taskController.create);
router.patch('/tasks/:id',   updateRules, taskController.update);
router.delete('/tasks/:id',  taskController.remove);

// ─── Allocation (sprint 2) ────────────────────────────────────────────────

router.post('/tasks/:id/allocate', (req, res) => {
  res.json({ message: 'Manual allocate task — to be implemented' });
});
router.get('/tasks/:id/eligible-staff', (req, res) => {
  res.json({ message: 'Get eligible staff — to be implemented' });
});
router.post('/tasks/:id/auto-allocate', (req, res) => {
  res.json({ message: 'Auto-allocate task — to be implemented' });
});
router.get('/reports/hours', (req, res) => {
  res.json({ message: 'Working hours report — to be implemented' });
});

module.exports = router;