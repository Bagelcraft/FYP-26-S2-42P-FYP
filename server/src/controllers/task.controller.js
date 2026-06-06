const { validationResult } = require('express-validator');
const taskService = require('../services/task.service');

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

const list = async (req, res, next) => {
  try {
    const tasks = await taskService.listTasks(req.user.organisationId, {
      status:        req.query.status,
      department_id: req.query.department_id,
      date:          req.query.date,
    });
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const task = await taskService.getTask(
      parseInt(req.params.id, 10),
      req.user.organisationId,
    );
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const task = await taskService.createTask({
      organisationId: req.user.organisationId,
      createdBy:      req.user.userId,
      ...req.body,
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const task = await taskService.updateTask(
      parseInt(req.params.id, 10),
      req.user.organisationId,
      req.body,
    );
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await taskService.deleteTask(
      parseInt(req.params.id, 10),
      req.user.organisationId,
    );
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, remove };