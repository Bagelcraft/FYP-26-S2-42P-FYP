const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const TASK_INCLUDE = {
  department:    { select: { name: true } },
  requiredSkill: { select: { skill_name: true } },
  createdBy:     { select: { full_name: true } },
  assignments: {
    include: { assignedTo: { select: { full_name: true, email: true } } },
  },
};

// ─── PM / Org-Admin ───────────────────────────────────────────

async function listTasks(organisationId, filters = {}) {
  const where = { organisation_id: organisationId };

  if (filters.status)        where.status        = filters.status;
  if (filters.department_id) where.department_id = parseInt(filters.department_id, 10);
  if (filters.date) {
    const d = new Date(filters.date);
    where.start_datetime = { lte: d };
    where.end_datetime   = { gte: d };
  }

  return prisma.task.findMany({
    where,
    include: TASK_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

async function getTask(taskId, organisationId) {
  const task = await prisma.task.findFirst({
    where: { task_id: taskId, organisation_id: organisationId },
    include: TASK_INCLUDE,
  });
  if (!task) throw makeError('Task not found', 404);
  return task;
}

async function validateFKs({ department_id, required_skill_id, organisationId }) {
  if (department_id != null) {
    const dept = await prisma.department.findFirst({
      where: { department_id, organisation_id: organisationId },
    });
    if (!dept) throw makeError('department_id does not belong to your organisation', 422);
  }
  if (required_skill_id != null) {
    const skill = await prisma.skill.findFirst({
      where: { skill_id: required_skill_id, organisation_id: organisationId },
    });
    if (!skill) throw makeError('required_skill_id does not belong to your organisation', 422);
  }
}

async function createTask({
  organisationId,
  createdBy,
  title,
  description,
  start_datetime,
  end_datetime,
  department_id = null,
  required_skill_id = null,
}) {
  await validateFKs({ department_id, required_skill_id, organisationId });

  return prisma.task.create({
    data: {
      organisation_id:   organisationId,
      created_by:        createdBy,
      title,
      description:       description ?? null,
      status:            'PENDING',
      start_datetime:    new Date(start_datetime),
      end_datetime:      new Date(end_datetime),
      department_id:     department_id ?? null,
      required_skill_id: required_skill_id ?? null,
    },
  });
}

async function updateTask(taskId, organisationId, updates) {
  await getTask(taskId, organisationId);

  const { department_id, required_skill_id } = updates;
  await validateFKs({
    department_id:     department_id !== undefined ? department_id : undefined,
    required_skill_id: required_skill_id !== undefined ? required_skill_id : undefined,
    organisationId,
  });

  const data = {};
  if (updates.title !== undefined)          data.title             = updates.title;
  if (updates.description !== undefined)    data.description       = updates.description;
  if (updates.status !== undefined)         data.status            = updates.status;
  if (updates.start_datetime !== undefined) data.start_datetime    = new Date(updates.start_datetime);
  if (updates.end_datetime !== undefined)   data.end_datetime      = new Date(updates.end_datetime);
  if (department_id !== undefined)          data.department_id     = department_id;
  if (required_skill_id !== undefined)      data.required_skill_id = required_skill_id;

  return prisma.task.update({ where: { task_id: taskId }, data });
}

async function deleteTask(taskId, organisationId) {
  await getTask(taskId, organisationId);

  const hasAssignment = await prisma.taskAssignment.findFirst({ where: { task_id: taskId } });
  if (hasAssignment) {
    throw makeError('Cannot delete a task that has existing assignments. Unassign staff first.', 409);
  }

  return prisma.task.delete({ where: { task_id: taskId } });
}

// ─── Worker ───────────────────────────────────────────────────

async function listWorkerTasks(userId, organisationId, filters = {}) {
  const where = {
    organisation_id: organisationId,
    assignments:     { some: { assigned_to: userId } },
  };
  if (filters.status) where.status = filters.status;

  return prisma.task.findMany({
    where,
    include: {
      department:    { select: { name: true } },
      requiredSkill: { select: { skill_name: true } },
      assignments: {
        where:   { assigned_to: userId },
        include: { assignedBy: { select: { full_name: true } } },
      },
    },
    orderBy: { start_datetime: 'asc' },
  });
}

async function getWorkerTask(taskId, userId, organisationId) {
  const task = await prisma.task.findFirst({
    where: {
      task_id:         taskId,
      organisation_id: organisationId,
      assignments:     { some: { assigned_to: userId } },
    },
    include: {
      department:    { select: { name: true } },
      requiredSkill: { select: { skill_name: true } },
      assignments: {
        where:   { assigned_to: userId },
        include: { assignedBy: { select: { full_name: true } } },
      },
    },
  });
  if (!task) throw makeError('Task not found or not assigned to you', 404);
  return task;
}

async function acknowledgeTask(taskId, userId, organisationId) {
  const task = await getWorkerTask(taskId, userId, organisationId);
  if (task.status !== 'ASSIGNED') throw makeError('Only ASSIGNED tasks can be acknowledged', 422);
  return prisma.task.update({ where: { task_id: taskId }, data: { status: 'IN_PROGRESS' } });
}

async function updateTaskStatus(taskId, userId, organisationId, status) {
  await getWorkerTask(taskId, userId, organisationId);
  const allowed = ['IN_PROGRESS', 'COMPLETED'];
  if (!allowed.includes(status)) {
    throw makeError(`Workers can only set status to: ${allowed.join(', ')}`, 422);
  }
  return prisma.task.update({ where: { task_id: taskId }, data: { status } });
}

// tasks that are PENDING and match the temp worker's skills (available task pool)
async function listAvailableTasks(userId, organisationId) {
  const userSkills = await prisma.userSkill.findMany({
    where:  { user_id: userId },
    select: { skill_id: true },
  });
  const skillIds = userSkills.map((us) => us.skill_id);

  return prisma.task.findMany({
    where: {
      organisation_id: organisationId,
      status:          'PENDING',
      OR: [
        { required_skill_id: null },
        ...(skillIds.length > 0 ? [{ required_skill_id: { in: skillIds } }] : []),
      ],
    },
    include: {
      department:    { select: { name: true } },
      requiredSkill: { select: { skill_name: true } },
    },
    orderBy: { start_datetime: 'asc' },
  });
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  listWorkerTasks,
  getWorkerTask,
  acknowledgeTask,
  updateTaskStatus,
  listAvailableTasks,
};