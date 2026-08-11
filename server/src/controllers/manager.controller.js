const { body, validationResult } = require('express-validator');
const managerService = require('../services/manager.service');
// The roster belongs to the organisation, not to the admin portal — these are the
// same org-scoped functions the Org Admin uses, reached by a different role.
const rosterService = require('../services/org-admin.service');

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

// GET /pm/reports
const getReports = async (req, res, next) => {
  try {
    const data = await managerService.getReports(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// Parse ?from=&to= (YYYY-MM-DD); default to the current calendar month.
function monthRange(fromQ, toQ) {
  if (fromQ && toQ) return { from: new Date(`${fromQ}T00:00:00`), to: new Date(`${toQ}T23:59:59`) };
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
    to:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  };
}

// GET /pm/calendar?from=&to=
const getCalendar = async (req, res, next) => {
  try {
    const { from, to } = monthRange(req.query.from, req.query.to);
    const data = await managerService.getCalendar(req.user.organisationId, from, to);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /pm/availability?from=&to=&skills=1,2
const getAvailability = async (req, res, next) => {
  try {
    const { from, to } = monthRange(req.query.from, req.query.to);
    const skillIds = (req.query.skills ? String(req.query.skills).split(',') : []).map(Number).filter(Boolean);
    const data = await managerService.getAvailabilityByDay(req.user.organisationId, from, to, skillIds);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /pm/org-info
const getOrgInfo = async (req, res, next) => {
  try {
    const data = await managerService.getOrgInfo(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /pm/shift-templates
const getShiftTemplates = async (req, res, next) => {
  try {
    const data = await managerService.getShiftTemplates(req.user.organisationId);
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

// GET /pm/testimonials
const listTestimonials = async (req, res, next) => {
  try {
    const data = await managerService.listTestimonials(req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// POST /pm/testimonials  { rating, review_text, profile_image? }
const createTestimonial = async (req, res, next) => {
  try {
    const data = await managerService.createTestimonial(req.user.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

// PUT /pm/testimonials/:id
const updateTestimonial = async (req, res, next) => {
  try {
    const data = await managerService.updateTestimonial(parseInt(req.params.id, 10), req.user.organisationId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// DELETE /pm/testimonials/:id
const deleteTestimonial = async (req, res, next) => {
  try {
    const data = await managerService.deleteTestimonial(parseInt(req.params.id, 10), req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── Roster (shift-based organisations) ───────────────────────
// Managers own the week-to-week roster: which people work which shift, on which
// days. Shift *templates* stay with the Org Admin — a manager schedules against
// them rather than inventing new ones.

const rosterAssignRules = [
  body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
  body('shift_id').isInt({ min: 1 }).withMessage('shift_id is required'),
  body('date').isISO8601().withMessage('date must be a valid date'),
];

const rosterBulkRules = [
  body('user_ids').isArray({ min: 1 }).withMessage('Select at least one employee'),
  body('user_ids.*').isInt({ min: 1 }),
  body('shift_id').isInt({ min: 1 }).withMessage('shift_id is required'),
  body('weekdays').isArray({ min: 1 }).withMessage('Select at least one working day'),
  body('weekdays.*').isInt({ min: 0, max: 6 }),
  body('from').isISO8601().withMessage('from must be a valid date'),
  body('to').isISO8601().withMessage('to must be a valid date'),
];

const listRoster = async (req, res, next) => {
  try {
    res.json({ success: true, data: await rosterService.listShiftAssignments(req.user.organisationId) });
  } catch (err) { next(err); }
};

const createRosterEntry = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const data = await rosterService.createShiftAssignment(req.user.organisationId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const bulkRoster = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const data = await rosterService.bulkCreateShiftAssignments(req.user.organisationId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const deleteRosterEntry = async (req, res, next) => {
  try {
    const data = await rosterService.deleteShiftAssignment(req.user.organisationId, parseInt(req.params.id, 10));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = {
  rosterAssignRules, rosterBulkRules,
  listRoster, createRosterEntry, bulkRoster, deleteRosterEntry,
  getTeam, listLeave, decideLeave, listLeaveBalances, updateLeaveBalance, getReports, getCalendar, getAvailability,
  getOrgInfo, getShiftTemplates, getDepartments, getSkills,
  listTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
};
