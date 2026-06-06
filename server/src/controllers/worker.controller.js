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


module.exports = {
  listMyTasks,
  getMyTask,
  acknowledge,
  updateProgress,
  listAvailableTasks,
  progressRules,
  profileUpdateRules,
  updateMyProfile,
};

