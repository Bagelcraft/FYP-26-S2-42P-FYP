const { validationResult, body } = require('express-validator');
const planService = require('../services/plan.service');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

// Validation rule sets

const createRules = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }),
  body('price_monthly').isFloat({ min: 0 }).withMessage('price_monthly must be a non-negative number'),
  body('price_annual').isFloat({ min: 0 }).withMessage('price_annual must be a non-negative number'),
  body('description').optional({ nullable: true }).isString(),
  body('max_users').optional({ nullable: true }).isInt({ min: 1 }).withMessage('max_users must be a positive integer'),
  body('features').optional().isArray().withMessage('features must be an array of strings'),
  body('features.*').optional().isString().notEmpty().isLength({ max: 200 }),
];

const updateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('price_monthly').optional().isFloat({ min: 0 }),
  body('price_annual').optional().isFloat({ min: 0 }),
  body('description').optional({ nullable: true }).isString(),
  body('max_users').optional({ nullable: true }).isInt({ min: 1 }),
];

const featureRules = [
  body('feature_name').trim().notEmpty().withMessage('feature_name is required').isLength({ max: 200 }),
];

// Handlers

async function list(req, res, next) {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const data = await planService.listPlans(includeInactive);
    ok(res, data);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const data = await planService.getPlan(Number(req.params.id));
    ok(res, data);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await planService.createPlan(req.body);
    ok(res, data, 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await planService.updatePlan(Number(req.params.id), req.body);
    ok(res, data);
  } catch (err) { next(err); }
}

async function deactivate(req, res, next) {
  try {
    const data = await planService.deactivatePlan(Number(req.params.id));
    ok(res, data);
  } catch (err) { next(err); }
}

async function reactivate(req, res, next) {
  try {
    const data = await planService.reactivatePlan(Number(req.params.id));
    ok(res, data);
  } catch (err) { next(err); }
}

async function addFeature(req, res, next) {
  try {
    const data = await planService.addFeature(Number(req.params.id), req.body.feature_name);
    ok(res, data, 201);
  } catch (err) { next(err); }
}

async function removeFeature(req, res, next) {
  try {
    await planService.removeFeature(Number(req.params.id), Number(req.params.featureId));
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = {
  list, getOne,
  createRules, create,
  updateRules, update,
  deactivate, reactivate,
  featureRules, addFeature, removeFeature,
  validate,
};