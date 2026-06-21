const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const REQUEST_INCLUDE = {
  requester: { select: { userId: true, full_name: true } },
};

// POST /pm/tasks/:id/request-update
// PM requests a progress update from the assigned worker
async function createUpdateRequest(taskId, organisationId, requestedBy, message = null) {
  const task = await prisma.task.findFirst({
    where: { task_id: taskId, organisation_id: organisationId },
  });
  if (!task) throw makeError('Task not found', 404);
  if (!['ASSIGNED', 'IN_PROGRESS'].includes(task.status)) {
    throw makeError('Can only request updates for ASSIGNED or IN_PROGRESS tasks', 422);
  }

  return prisma.taskUpdateRequest.create({
    data: { task_id: taskId, requested_by: requestedBy, message },
    include: REQUEST_INCLUDE,
  });
}

// GET /pm/tasks/:id/update-requests
// PM views all update requests for a task
async function listUpdateRequests(taskId, organisationId) {
  const task = await prisma.task.findFirst({
    where: { task_id: taskId, organisation_id: organisationId },
  });
  if (!task) throw makeError('Task not found', 404);

  return prisma.taskUpdateRequest.findMany({
    where: { task_id: taskId },
    include: REQUEST_INCLUDE,
    orderBy: { created_at: 'desc' },
  });
}

// GET /worker/tasks/:id/update-requests
// Worker views pending update requests on their assigned task
async function listWorkerUpdateRequests(taskId, workerId, organisationId) {
  const assignment = await prisma.taskAssignment.findFirst({
    where: { task_id: taskId, assigned_to: workerId },
  });
  if (!assignment) throw makeError('Task not assigned to you', 403);

  // Verify task belongs to the org
  const task = await prisma.task.findFirst({
    where: { task_id: taskId, organisation_id: organisationId },
  });
  if (!task) throw makeError('Task not found', 404);

  return prisma.taskUpdateRequest.findMany({
    where: { task_id: taskId },
    include: REQUEST_INCLUDE,
    orderBy: { created_at: 'desc' },
  });
}

// PATCH /worker/tasks/:id/update-requests/:requestId/respond
// Worker responds to a specific update request
async function respondToUpdateRequest(requestId, taskId, workerId, organisationId, response) {
  const assignment = await prisma.taskAssignment.findFirst({
    where: { task_id: taskId, assigned_to: workerId },
  });
  if (!assignment) throw makeError('Task not assigned to you', 403);

  const task = await prisma.task.findFirst({
    where: { task_id: taskId, organisation_id: organisationId },
  });
  if (!task) throw makeError('Task not found', 404);

  const updateRequest = await prisma.taskUpdateRequest.findFirst({
    where: { request_id: requestId, task_id: taskId },
  });
  if (!updateRequest) throw makeError('Update request not found', 404);
  if (updateRequest.status === 'RESPONDED') {
    throw makeError('This request has already been responded to', 422);
  }

  return prisma.taskUpdateRequest.update({
    where: { request_id: requestId },
    data: { status: 'RESPONDED', response, responded_at: new Date() },
    include: REQUEST_INCLUDE,
  });
}

module.exports = {
  createUpdateRequest,
  listUpdateRequests,
  listWorkerUpdateRequests,
  respondToUpdateRequest,
};