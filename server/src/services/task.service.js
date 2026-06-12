const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Include the many-to-many required skills (via TaskSkill join), plus keep the
// legacy single requiredSkill for backward-compat.
const TASK_INCLUDE = {
  department:    { select: { name: true } },
  requiredSkill: { select: { skill_id: true, skill_name: true } },
  requiredSkills: { include: { skill: { select: { skill_id: true, skill_name: true } } } },
  createdBy:     { select: { full_name: true } },
  assignments: {
    include: { assignedTo: { select: { full_name: true, email: true } } },
  },
};

const WORKER_TASK_INCLUDE = {
  department:    { select: { name: true } },
  requiredSkill: { select: { skill_id: true, skill_name: true } },
  requiredSkills: { include: { skill: { select: { skill_id: true, skill_name: true } } } },
};

// Flatten the TaskSkill join rows into a clean requiredSkills: [{ skill_id, skill_name }]
// and set requiredSkill to the first skill (so legacy single-skill UI still works).
function shapeTask(task) {
  if (!task) return task;
  const requiredSkills = (task.requiredSkills ?? []).map((ts) => ts.skill);
  return {
    ...task,
    requiredSkills,
    requiredSkill: requiredSkills[0] ?? task.requiredSkill ?? null,
  };
}

// Accept either an array (required_skill_ids) or the legacy single id; return
// a de-duplicated array of integers.
function normaliseSkillIds(arr, single) {
  if (Array.isArray(arr)) {
    return [...new Set(arr.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  }
  if (single != null) {
    const n = Number(single);
    return Number.isInteger(n) && n > 0 ? [n] : [];
  }
  return [];
}

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

  const tasks = await prisma.task.findMany({
    where,
    include: TASK_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return tasks.map(shapeTask);
}

async function getTask(taskId, organisationId) {
  const task = await prisma.task.findFirst({
    where: { task_id: taskId, organisation_id: organisationId },
    include: TASK_INCLUDE,
  });
  if (!task) throw makeError('Task not found', 404);
  return shapeTask(task);
}

async function validateFKs({ department_id, skillIds = [], organisationId }) {
  if (department_id != null) {
    const dept = await prisma.department.findFirst({
      where: { department_id, organisation_id: organisationId },
    });
    if (!dept) throw makeError('department_id does not belong to your organisation', 422);
  }
  for (const sid of skillIds) {
    const skill = await prisma.skill.findFirst({
      where: { skill_id: sid, organisation_id: organisationId },
    });
    if (!skill) throw makeError(`Skill ${sid} does not belong to your organisation`, 422);
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
  required_skill_id = null,   // legacy single (still accepted)
  required_skill_ids,         // NEW — array
}) {
  const skillIds = normaliseSkillIds(required_skill_ids, required_skill_id);
  await validateFKs({ department_id, skillIds, organisationId });

  const created = await prisma.task.create({
    data: {
      organisation_id:   organisationId,
      created_by:        createdBy,
      title,
      description:       description ?? null,
      status:            'PENDING',
      start_datetime:    new Date(start_datetime),
      end_datetime:      new Date(end_datetime),
      department_id:     department_id ?? null,
      required_skill_id: skillIds[0] ?? null,                  // keep first for compat
      requiredSkills:    { create: skillIds.map((id) => ({ skill_id: id })) },
    },
    include: TASK_INCLUDE,
  });
  return shapeTask(created);
}

async function updateTask(taskId, organisationId, updates) {
  await getTask(taskId, organisationId);

  // Did the caller send any skill update?
  const hasSkillUpdate = updates.required_skill_ids !== undefined || updates.required_skill_id !== undefined;
  const skillIds = hasSkillUpdate
    ? normaliseSkillIds(updates.required_skill_ids, updates.required_skill_id)
    : null;

  await validateFKs({
    department_id: updates.department_id !== undefined ? updates.department_id : undefined,
    skillIds: skillIds ?? [],
    organisationId,
  });

  const data = {};
  if (updates.title !== undefined)          data.title          = updates.title;
  if (updates.description !== undefined)    data.description    = updates.description;
  if (updates.status !== undefined)         data.status         = updates.status;
  if (updates.start_datetime !== undefined) data.start_datetime = new Date(updates.start_datetime);
  if (updates.end_datetime !== undefined)   data.end_datetime   = new Date(updates.end_datetime);
  if (updates.department_id !== undefined)  data.department_id  = updates.department_id;
  if (skillIds !== null)                    data.required_skill_id = skillIds[0] ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    if (skillIds !== null) {
      // Replace the whole set of required skills.
      await tx.taskSkill.deleteMany({ where: { task_id: taskId } });
      if (skillIds.length) {
        await tx.taskSkill.createMany({ data: skillIds.map((sid) => ({ task_id: taskId, skill_id: sid })) });
      }
    }
    return tx.task.update({ where: { task_id: taskId }, data, include: TASK_INCLUDE });
  });
  return shapeTask(updated);
}

async function deleteTask(taskId, organisationId) {
  await getTask(taskId, organisationId);

  const hasAssignment = await prisma.taskAssignment.findFirst({ where: { task_id: taskId } });
  if (hasAssignment) {
    throw makeError('Cannot delete a task that has existing assignments. Unassign staff first.', 409);
  }

  // TaskSkill rows are removed automatically via onDelete: Cascade (see schema).
  return prisma.task.delete({ where: { task_id: taskId } });
}

// ─── Worker ───────────────────────────────────────────────────

async function listWorkerTasks(userId, organisationId, filters = {}) {
  const where = {
    organisation_id: organisationId,
    assignments:     { some: { assigned_to: userId } },
  };
  if (filters.status) where.status = filters.status;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      ...WORKER_TASK_INCLUDE,
      assignments: {
        where:   { assigned_to: userId },
        include: { assignedBy: { select: { full_name: true } } },
      },
    },
    orderBy: { start_datetime: 'asc' },
  });
  return tasks.map(shapeTask);
}

async function getWorkerTask(taskId, userId, organisationId) {
  const task = await prisma.task.findFirst({
    where: {
      task_id:         taskId,
      organisation_id: organisationId,
      assignments:     { some: { assigned_to: userId } },
    },
    include: {
      ...WORKER_TASK_INCLUDE,
      assignments: {
        where:   { assigned_to: userId },
        include: { assignedBy: { select: { full_name: true } } },
      },
    },
  });
  if (!task) throw makeError('Task not found or not assigned to you', 404);
  return shapeTask(task);
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

// Tasks that are PENDING and whose required skills the worker FULLY satisfies.
// (`every` over the TaskSkill relation: a task with no required skills matches
//  everyone; a task with required skills matches only workers who hold them all.)
async function listAvailableTasks(userId, organisationId) {
  const userSkills = await prisma.userSkill.findMany({
    where:  { user_id: userId },
    select: { skill_id: true },
  });
  const skillIds = userSkills.map((us) => us.skill_id);

  const tasks = await prisma.task.findMany({
    where: {
      organisation_id: organisationId,
      status:          'PENDING',
      requiredSkills:  { every: { skill_id: { in: skillIds } } },
    },
    include: WORKER_TASK_INCLUDE,
    orderBy: { start_datetime: 'asc' },
  });
  return tasks.map(shapeTask);
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
