const { body, validationResult } = require('express-validator');
const allocationService = require('../services/allocation.service');

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// GET /pm/tasks/:id/eligible-staff
// Returns ranked list of eligible candidates (3a-3c)
const getEligibleStaff = async (req, res, next) => {
  try {
    const result = await allocationService.getEligibleStaff(
      parseInt(req.params.id, 10),
      req.user.organisationId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// POST /pm/tasks/:id/assign  — manual allocation (3d + 4)
const manualAssign = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const task = await allocationService.assignTask(
      parseInt(req.params.id, 10),
      req.user.organisationId,
      req.body.assigned_to,
      req.user.userId,
      'MANUAL',
    );
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// POST /pm/tasks/:id/reallocate  — reassign to a different worker (4)
const reallocate = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const task = await allocationService.assignTask(
      parseInt(req.params.id, 10),
      req.user.organisationId,
      req.body.assigned_to,
      req.user.userId,
      'MANUAL',
    );
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// POST /pm/tasks/:id/auto-allocate  — engine picks best candidate (3d)
const autoAllocate = async (req, res, next) => {
  try {
    const task = await allocationService.autoAllocate(
      parseInt(req.params.id, 10),
      req.user.organisationId,
      req.user.userId,
    );
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// GET /pm/tasks/:id/allocation-history
const getHistory = async (req, res, next) => {
  try {
    const data = await allocationService.getAllocationHistory(
      parseInt(req.params.id, 10),
      req.user.organisationId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const assignBodyRules = [
  body('assigned_to')
    .isInt({ min: 1 }).withMessage('assigned_to must be a valid user ID'),
];

module.exports = { getEligibleStaff, manualAssign, reallocate, autoAllocate, getHistory, assignBodyRules };