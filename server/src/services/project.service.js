const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const RESOURCE_INCLUDE = {
  user: {
    select: {
      userId:    true,
      full_name: true,
      email:     true,
      user_type: true,
      staffRole: { select: { role_name: true, max_working_hours: true } },
      skills:    { include: { skill: { select: { skill_id: true, skill_name: true } } } },
    },
  },
};

const PROJECT_INCLUDE = {
  manager:   { select: { userId: true, full_name: true } },
  resources: { include: RESOURCE_INCLUDE, orderBy: { added_at: 'asc' } },
  _count:    { select: { tasks: true, resources: true } },
};

// Midnight-anchored date so a @db.Date column round-trips without timezone drift.
function toDateOnly(value, label) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw makeError(`${label} must be a valid date`, 422);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function shapeResource(r) {
  return {
    resource_id: r.resource_id,
    userId:      r.user.userId,
    full_name:   r.user.full_name,
    email:       r.user.email,
    user_type:   r.user.user_type,
    role:        r.user.staffRole?.role_name ?? null,
    maxHours:    r.user.staffRole?.max_working_hours ?? null,
    skills:      r.user.skills.map((us) => us.skill.skill_name),
    added_at:    r.added_at,
  };
}

function shapeProject(p) {
  if (!p) return p;
  const { _count, resources, ...rest } = p;
  return {
    ...rest,
    resources: (resources ?? []).map(shapeResource),
    taskCount: _count?.tasks ?? undefined,
    resourceCount: _count?.resources ?? (resources?.length ?? 0),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────

async function listProjects(organisationId, filters = {}) {
  const where = { organisation_id: organisationId };
  if (filters.status) where.status = filters.status;

  const projects = await prisma.project.findMany({
    where,
    include: PROJECT_INCLUDE,
    orderBy: [{ status: 'asc' }, { start_date: 'asc' }],
  });
  return projects.map(shapeProject);
}

// Full detail: the three things that define a project — its tasks, its resource
// pool, and its duration — in one payload for the project detail screen.
async function getProject(projectId, organisationId) {
  const project = await prisma.project.findFirst({
    where:   { project_id: projectId, organisation_id: organisationId },
    include: {
      ...PROJECT_INCLUDE,
      tasks: {
        include: {
          requiredSkills: { include: { skill: { select: { skill_id: true, skill_name: true } } } },
          department:     { select: { name: true } },
          assignments:    { include: { assignedTo: { select: { userId: true, full_name: true, user_type: true } } } },
        },
        orderBy: { start_datetime: 'asc' },
      },
    },
  });
  if (!project) throw makeError('Project not found', 404);

  const shaped = shapeProject(project);
  shaped.tasks = project.tasks.map((t) => ({
    ...t,
    requiredSkills: t.requiredSkills.map((ts) => ts.skill),
  }));
  return shaped;
}

async function createProject(organisationId, createdBy, { name, description, start_date, end_date, status, manager_id }) {
  if (!name || !name.trim()) throw makeError('Project name is required', 422);

  const start = toDateOnly(start_date, 'start_date');
  const end   = toDateOnly(end_date, 'end_date');
  if (end < start) throw makeError('end_date must be on or after start_date', 422);

  if (manager_id != null) {
    const mgr = await prisma.user.findFirst({
      where: { userId: Number(manager_id), organisationId, user_type: { in: ['PROJECT_MANAGER', 'ORG_ADMIN'] } },
    });
    if (!mgr) throw makeError('manager_id must be a manager in your organisation', 422);
  }

  const created = await prisma.project.create({
    data: {
      organisation_id: organisationId,
      manager_id:      manager_id != null ? Number(manager_id) : createdBy,
      name:            name.trim(),
      description:     description?.trim() || null,
      status:          status ?? 'PLANNING',
      start_date:      start,
      end_date:        end,
    },
    include: PROJECT_INCLUDE,
  });
  return shapeProject(created);
}

async function updateProject(projectId, organisationId, updates) {
  const existing = await prisma.project.findFirst({
    where: { project_id: projectId, organisation_id: organisationId },
  });
  if (!existing) throw makeError('Project not found', 404);

  const data = {};
  if (updates.name !== undefined) {
    if (!updates.name.trim()) throw makeError('Project name cannot be empty', 422);
    data.name = updates.name.trim();
  }
  if (updates.description !== undefined) data.description = updates.description?.trim() || null;
  if (updates.status !== undefined)      data.status      = updates.status;
  if (updates.start_date !== undefined)  data.start_date  = toDateOnly(updates.start_date, 'start_date');
  if (updates.end_date !== undefined)    data.end_date    = toDateOnly(updates.end_date, 'end_date');
  if (updates.manager_id !== undefined)  data.manager_id  = updates.manager_id != null ? Number(updates.manager_id) : null;

  const start = data.start_date ?? existing.start_date;
  const end   = data.end_date   ?? existing.end_date;
  if (new Date(end) < new Date(start)) throw makeError('end_date must be on or after start_date', 422);

  // Shrinking the window must not orphan tasks outside it — the duration is the
  // contract the allocation engine relies on.
  if (data.start_date || data.end_date) {
    const endOfDay = new Date(new Date(end).getTime() + 86399999);
    const outside = await prisma.task.count({
      where: {
        project_id: projectId,
        OR: [{ start_datetime: { lt: start } }, { end_datetime: { gt: endOfDay } }],
      },
    });
    if (outside > 0) {
      throw makeError(
        `${outside} task(s) fall outside the new project dates. Move or remove them first.`,
        409,
      );
    }
  }

  if (data.manager_id != null) {
    const mgr = await prisma.user.findFirst({
      where: { userId: data.manager_id, organisationId, user_type: { in: ['PROJECT_MANAGER', 'ORG_ADMIN'] } },
    });
    if (!mgr) throw makeError('manager_id must be a manager in your organisation', 422);
  }

  const updated = await prisma.project.update({
    where:   { project_id: projectId },
    data,
    include: PROJECT_INCLUDE,
  });
  return shapeProject(updated);
}

async function deleteProject(projectId, organisationId) {
  const project = await prisma.project.findFirst({
    where: { project_id: projectId, organisation_id: organisationId },
  });
  if (!project) throw makeError('Project not found', 404);

  const taskCount = await prisma.task.count({ where: { project_id: projectId } });
  if (taskCount > 0) {
    throw makeError(`Cannot delete a project with ${taskCount} task(s). Remove its tasks first.`, 409);
  }

  // ProjectResource rows go with it via onDelete: Cascade.
  await prisma.project.delete({ where: { project_id: projectId } });
  return { project_id: projectId };
}

// ─── Resources (who is able to work on this project) ──────────

async function listResources(projectId, organisationId) {
  const project = await prisma.project.findFirst({
    where:   { project_id: projectId, organisation_id: organisationId },
    include: { resources: { include: RESOURCE_INCLUDE, orderBy: { added_at: 'asc' } } },
  });
  if (!project) throw makeError('Project not found', 404);
  return project.resources.map(shapeResource);
}

// Active workers in the org who are not already on this project — the pick list
// for "add resource".
async function listAvailableResources(projectId, organisationId) {
  const project = await prisma.project.findFirst({
    where:   { project_id: projectId, organisation_id: organisationId },
    include: { resources: { select: { user_id: true } } },
  });
  if (!project) throw makeError('Project not found', 404);

  const taken = project.resources.map((r) => r.user_id);
  const users = await prisma.user.findMany({
    where: {
      organisationId,
      is_active: true,
      user_type: { in: ['PERMANENT_WORKER', 'TEMPORARY_WORKER'] },
      userId:    { notIn: taken.length ? taken : [0] },
    },
    select: {
      userId: true, full_name: true, email: true, user_type: true,
      staffRole: { select: { role_name: true, max_working_hours: true } },
      skills:    { include: { skill: { select: { skill_id: true, skill_name: true } } } },
    },
    orderBy: [{ user_type: 'asc' }, { full_name: 'asc' }],
  });

  return users.map((u) => ({
    userId:    u.userId,
    full_name: u.full_name,
    email:     u.email,
    user_type: u.user_type,
    role:      u.staffRole?.role_name ?? null,
    maxHours:  u.staffRole?.max_working_hours ?? null,
    skills:    u.skills.map((us) => us.skill.skill_name),
  }));
}

async function addResources(projectId, organisationId, userIds) {
  const project = await prisma.project.findFirst({
    where: { project_id: projectId, organisation_id: organisationId },
  });
  if (!project) throw makeError('Project not found', 404);

  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map(Number))]
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) throw makeError('At least one user_id is required', 422);

  const valid = await prisma.user.findMany({
    where:  { userId: { in: ids }, organisationId, is_active: true, user_type: { in: ['PERMANENT_WORKER', 'TEMPORARY_WORKER'] } },
    select: { userId: true },
  });
  if (valid.length !== ids.length) {
    throw makeError('One or more users are not active workers in your organisation', 422);
  }

  // skipDuplicates leans on the @@unique([project_id, user_id]) constraint so
  // re-adding an existing resource is a no-op rather than an error.
  await prisma.projectResource.createMany({
    data: ids.map((user_id) => ({ project_id: projectId, user_id })),
    skipDuplicates: true,
  });

  return listResources(projectId, organisationId);
}

async function removeResource(projectId, organisationId, userId) {
  const project = await prisma.project.findFirst({
    where: { project_id: projectId, organisation_id: organisationId },
  });
  if (!project) throw makeError('Project not found', 404);

  // Refuse while they still hold live work on this project — otherwise the task
  // would be assigned to someone outside the resource pool.
  const liveAssignment = await prisma.taskAssignment.findFirst({
    where: {
      assigned_to: userId,
      task: { project_id: projectId, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'] } },
    },
  });
  if (liveAssignment) {
    throw makeError('This worker still has active tasks on the project. Reallocate them first.', 409);
  }

  const { count } = await prisma.projectResource.deleteMany({
    where: { project_id: projectId, user_id: userId },
  });
  if (!count) throw makeError('That worker is not a resource on this project', 404);
  return { project_id: projectId, user_id: userId };
}

// ─── Shared helper for task validation ────────────────────────

// Confirms a project belongs to the org and the task window sits inside its
// duration. Returns the project so callers can reuse it.
async function assertTaskWindowInProject(projectId, organisationId, startDatetime, endDatetime) {
  const project = await prisma.project.findFirst({
    where: { project_id: projectId, organisation_id: organisationId },
  });
  if (!project) throw makeError('project_id does not belong to your organisation', 422);

  const projStart = new Date(project.start_date);
  const projEnd   = new Date(new Date(project.end_date).getTime() + 86399999); // inclusive end-of-day

  if (new Date(startDatetime) < projStart || new Date(endDatetime) > projEnd) {
    throw makeError(
      `Task must fall within the project duration (${project.start_date.toISOString().slice(0, 10)} to ${project.end_date.toISOString().slice(0, 10)})`,
      422,
    );
  }
  return project;
}

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  listResources,
  listAvailableResources,
  addResources,
  removeResource,
  assertTaskWindowInProject,
};
