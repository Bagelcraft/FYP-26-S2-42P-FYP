const { validationResult } = require('express-validator');
const managerService = require('../services/manager.service');

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// GET /pm/team
const getTeam = async (req, res, next) => {
  try {
    const data = await managerService.getTeam(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /pm/leave
const listLeave = async (req, res, next) => {
  try {
    const data = await managerService.listLeave(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// PATCH /pm/leave/:id  { status: 'APPROVED' | 'REJECTED' }
const decideLeave = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const data = await managerService.decideLeave(
      parseInt(req.params.id, 10),
      req.user.organisationId,
      req.body.status,
      req.user.userId,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /pm/leave-balance
const listLeaveBalances = async (req, res, next) => {
  try {
    const data = await managerService.listLeaveBalances(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// PATCH /pm/leave-balance/:userId  { annual:{entitled,used}, medical:{entitled,used} }
const updateLeaveBalance = async (req, res, next) => {
  try {
    const data = await managerService.updateLeaveBalance(
      parseInt(req.params.userId, 10),
      req.user.organisationId,
      req.body,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /pm/subscription
const getSubscription = async (req, res, next) => {
  try {
    const data = await managerService.getSubscription(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /pm/billing
const listBilling = async (req, res, next) => {
  try {
    const data = await managerService.listBilling(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /pm/departments
const getDepartments = async (req, res, next) => {
  try {
    const data = await managerService.getDepartments(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /pm/skills
const getSkills = async (req, res, next) => {
  try {
    const data = await managerService.getSkills(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = {
  getTeam, listLeave, decideLeave, listLeaveBalances, updateLeaveBalance, getSubscription, listBilling,
  getDepartments, getSkills,
};
