const { body, validationResult } = require('express-validator');
const updateRequestService = require('../services/task-update-request.service');

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// POST /pm/tasks/:id/request-update
const create = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const data = await updateRequestService.createUpdateRequest(
      parseInt(req.params.id, 10),
      req.user.organisationId,
      req.user.userId,
      req.body.message ?? null,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /pm/tasks/:id/update-requests
const list = async (req, res, next) => {
  try {
    const data = await updateRequestService.listUpdateRequests(
      parseInt(req.params.id, 10),
      req.user.organisationId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /worker/tasks/:id/update-requests  (permanent + temp)
const listWorker = async (req, res, next) => {
  try {
    const data = await updateRequestService.listWorkerUpdateRequests(
      parseInt(req.params.id, 10),
      req.user.userId,
      req.user.organisationId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PATCH /worker/tasks/:id/update-requests/:requestId/respond
const respond = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const data = await updateRequestService.respondToUpdateRequest(
      parseInt(req.params.requestId, 10),
      parseInt(req.params.id, 10),
      req.user.userId,
      req.user.organisationId,
      req.body.response,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const createRules = [
  body('message').optional({ nullable: true }).isString().withMessage('message must be a string'),
];

const respondRules = [
  body('response')
    .trim().notEmpty().withMessage('response is required')
    .isString().withMessage('response must be a string'),
];

module.exports = { create, list, listWorker, respond, createRules, respondRules };