const { body, validationResult } = require('express-validator');
const taskService = require('../services/task.service');
const workerService = require('../services/worker.service');

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// GET /worker/tasks  or  /temp-worker/tasks
// Returns all tasks assigned to the calling worker (5 — worker view)
const listMyTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.listWorkerTasks(
      req.user.userId,
      req.user.organisationId,
      { status: req.query.status },
    );
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

// GET /worker/tasks/:id  (5 — worker read-only view)
const getMyTask = async (req, res, next) => {
  try {
    const task = await taskService.getWorkerTask(
      parseInt(req.params.id, 10),
      req.user.userId,
      req.user.organisationId,
    );
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// PATCH /worker/tasks/:id/acknowledge
// Worker confirms they have seen the task → sets status to IN_PROGRESS
const acknowledge = async (req, res, next) => {
  try {
    const task = await taskService.acknowledgeTask(
      parseInt(req.params.id, 10),
      req.user.userId,
      req.user.organisationId,
    );
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// PATCH /worker/tasks/:id/progress
// Worker updates task status (IN_PROGRESS or COMPLETED)
const updateProgress = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const task = await taskService.updateTaskStatus(
      parseInt(req.params.id, 10),
      req.user.userId,
      req.user.organisationId,
      req.body.status,
    );
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// PATCH /temp-worker/tasks/:id/submit — submit finished work for manager approval
const submitTask = async (req, res, next) => {
  try {
    const data = await taskService.submitTaskCompletion(parseInt(req.params.id, 10), req.user.userId, req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// PATCH /temp-worker/tasks/:id/decline — decline assigned work
const declineTask = async (req, res, next) => {
  try {
    const data = await taskService.declineTask(parseInt(req.params.id, 10), req.user.userId, req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /temp-worker/hours — approved (completed) work + total hours
const getMyHours = async (req, res, next) => {
  try {
    const data = await taskService.getWorkerHours(req.user.userId, req.user.organisationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /temp-worker/tasks/available
// Temp workers see PENDING tasks that match their skills (the task pool)
const listAvailableTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.listAvailableTasks(
      req.user.userId,
      req.user.organisationId,
    );
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

const progressRules = [
  body('status')
    .isIn(['IN_PROGRESS', 'COMPLETED'])
    .withMessage('status must be IN_PROGRESS or COMPLETED'),
];

const profileUpdateRules = [
  body('requested_changes')
    .notEmpty()
    .withMessage('requested_changes is required'),
  body('reason')
    .optional()
    .isString()
    .withMessage('reason must be text'),
];

const updateMyProfile = async (req, res, next) => {
  try {
    const updatedUser = await workerService.updateMyProfile(
      req.user.userId,
      req.body
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Leave (worker self-service) ──────────────────────────────

const LEAVE_TYPES = ['ANNUAL', 'MEDICAL', 'UNPAID', 'OTHER'];

const leaveRules = [
  body('leave_type').isIn(LEAVE_TYPES).withMessage(`leave_type must be one of: ${LEAVE_TYPES.join(', ')}`),
  body('start_date').isISO8601().withMessage('start_date must be a valid ISO 8601 date'),
  body('end_date')
    .isISO8601().withMessage('end_date must be a valid ISO 8601 date')
    .custom((val, { req }) => {
      if (new Date(val) < new Date(req.body.start_date)) {
        throw new Error('end_date must be on or after start_date');
      }
      return true;
    }),
];

// POST /worker/leave  (apply)
const applyLeave = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const leave = await workerService.applyLeave(req.user.userId, req.body);
    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    next(err);
  }
};

// GET /worker/leave  (own requests)
const listMyLeave = async (req, res, next) => {
  try {
    const data = await workerService.listMyLeave(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /worker/leave/:id  (withdraw a pending request)
const cancelLeave = async (req, res, next) => {
  try {
    await workerService.cancelLeave(req.user.userId, parseInt(req.params.id, 10));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// GET /worker/leave-balance  (current-year annual + medical, self)
const getMyLeaveBalance = async (req, res, next) => {
  try {
    const data = await workerService.getMyLeaveBalance(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /worker/schedule  (assigned shifts, today onward)
const getMySchedule = async (req, res, next) => {
  try {
    const data = await workerService.getMySchedule(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /worker/calendar?from=&to=  (self: shifts, tasks, unavailability)
const getMyCalendar = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let f, t;
    if (from && to) { f = new Date(`${from}T00:00:00`); t = new Date(`${to}T23:59:59`); }
    else { const n = new Date(); f = new Date(n.getFullYear(), n.getMonth(), 1); t = new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59); }
    const data = await workerService.getMyCalendar(req.user.userId, req.user.organisationId, f, t);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};


module.exports = {
  listMyTasks,
  getMyTask,
  acknowledge,
  updateProgress,
  submitTask,
  declineTask,
  getMyHours,
  listAvailableTasks,
  progressRules,
  profileUpdateRules,
  updateMyProfile,
  leaveRules,
  applyLeave,
  listMyLeave,
  cancelLeave,
  getMyLeaveBalance,
  getMySchedule,
  getMyCalendar,
};

