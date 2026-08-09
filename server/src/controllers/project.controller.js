const { body, query, validationResult } = require('express-validator');
const projectService = require('../services/project.service');

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// ─── Validation rules ─────────────────────────────────────────

const createRules = [
  body('name')
    .trim().notEmpty().withMessage('name is required')
    .isLength({ max: 150 }).withMessage('name must be 150 characters or fewer'),
  body('start_date').isISO8601().withMessage('start_date must be a valid ISO 8601 date'),
  body('end_date')
    .isISO8601().withMessage('end_date must be a valid ISO 8601 date')
    .custom((val, { req }) => {
      if (new Date(val) < new Date(req.body.start_date)) {
        throw new Error('end_date must be on or after start_date');
      }
      return true;
    }),
  body('description').optional({ nullable: true }).isString(),
  body('status').optional().isIn(PROJECT_STATUSES).withMessage(`status must be one of: ${PROJECT_STATUSES.join(', ')}`),
  body('manager_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('manager_id must be a positive integer'),
];

const updateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('description').optional({ nullable: true }).isString(),
  body('status').optional().isIn(PROJECT_STATUSES).withMessage(`status must be one of: ${PROJECT_STATUSES.join(', ')}`),
  body('manager_id').optional({ nullable: true }).isInt({ min: 1 }),
];

const listQueryRules = [
  query('status').optional().isIn(PROJECT_STATUSES).withMessage(`status must be one of: ${PROJECT_STATUSES.join(', ')}`),
];

const resourceRules = [
  body('user_ids').optional().isArray().withMessage('user_ids must be an array'),
  body('user_ids.*').isInt({ min: 1 }).withMessage('each user id must be a positive integer'),
  body('user_id').optional().isInt({ min: 1 }).withMessage('user_id must be a positive integer'),
];

// ─── Handlers ─────────────────────────────────────────────────

const list = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const data = await projectService.listProjects(req.user.organisationId, { status: req.query.status });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const data = await projectService.getProject(parseInt(req.params.id, 10), req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const data = await projectService.createProject(req.user.organisationId, req.user.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const data = await projectService.updateProject(parseInt(req.params.id, 10), req.user.organisationId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await projectService.deleteProject(parseInt(req.params.id, 10), req.user.organisationId);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
};

const listResources = async (req, res, next) => {
  try {
    const data = await projectService.listResources(parseInt(req.params.id, 10), req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const listAvailableResources = async (req, res, next) => {
  try {
    const data = await projectService.listAvailableResources(parseInt(req.params.id, 10), req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const addResources = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const ids = req.body.user_ids ?? req.body.user_id;
    const data = await projectService.addResources(parseInt(req.params.id, 10), req.user.organisationId, ids);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const removeResource = async (req, res, next) => {
  try {
    const data = await projectService.removeResource(
      parseInt(req.params.id, 10),
      req.user.organisationId,
      parseInt(req.params.userId, 10),
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = {
  createRules, updateRules, listQueryRules, resourceRules,
  list, getOne, create, update, remove,
  listResources, listAvailableResources, addResources, removeResource,
};
