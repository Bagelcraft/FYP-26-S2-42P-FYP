const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listTasks(organisationId) {
  return prisma.task.findMany({
    where: { organisation_id: organisationId },
    include: {
      department:    { select: { name: true } },
      requiredSkill: { select: { skill_name: true } },
      createdBy:     { select: { full_name: true } },
      assignments: {
        include: { assignedTo: { select: { full_name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getTask(taskId, organisationId) {
  const task = await prisma.task.findFirst({
    where: { task_id: taskId, organisation_id: organisationId },
    include: {
      department:    { select: { name: true } },
      requiredSkill: { select: { skill_name: true } },
      createdBy:     { select: { full_name: true } },
      assignments: {
        include: { assignedTo: { select: { full_name: true } } },
      },
    },
  });
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }
  return task;
}

async function validateFKs({ department_id, required_skill_id, organisationId }) {
  if (department_id != null) {
    const dept = await prisma.department.findFirst({
      where: { department_id, organisation_id: organisationId },
    });
    if (!dept) {
      const err = new Error('department_id does not belong to your organisation');
      err.statusCode = 422;
      throw err;
    }
  }
  if (required_skill_id != null) {
    const skill = await prisma.skill.findFirst({
      where: { skill_id: required_skill_id, organisation_id: organisationId },
    });
    if (!skill) {
      const err = new Error('required_skill_id does not belong to your organisation');
      err.statusCode = 422;
      throw err;
    }
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
    department_id:    department_id !== undefined ? department_id : undefined,
    required_skill_id: required_skill_id !== undefined ? required_skill_id : undefined,
    organisationId,
  });

  const data = {};
  if (updates.title !== undefined)          data.title          = updates.title;
  if (updates.description !== undefined)    data.description    = updates.description;
  if (updates.status !== undefined)         data.status         = updates.status;
  if (updates.start_datetime !== undefined) data.start_datetime = new Date(updates.start_datetime);
  if (updates.end_datetime !== undefined)   data.end_datetime   = new Date(updates.end_datetime);
  if (department_id !== undefined)          data.department_id  = department_id;
  if (required_skill_id !== undefined)      data.required_skill_id = required_skill_id;

  return prisma.task.update({ where: { task_id: taskId }, data });
}

async function deleteTask(taskId, organisationId) {
  await getTask(taskId, organisationId);

  const hasAssignment = await prisma.taskAssignment.findFirst({ where: { task_id: taskId } });
  if (hasAssignment) {
    const err = new Error('Cannot delete a task that has existing assignments. Unassign staff first.');
    err.statusCode = 409;
    throw err;
  }

  return prisma.task.delete({ where: { task_id: taskId } });
}

module.exports = { listTasks, getTask, createTask, updateTask, deleteTask };