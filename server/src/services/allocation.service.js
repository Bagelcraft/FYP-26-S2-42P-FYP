const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function currentWeekBounds() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun 1=Mon … 6=Sat
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

// ─── 3a-3c: Filter + rank eligible staff ─────────────────────
//
// Eligibility rules:
//   1. User is PERMANENT_WORKER or TEMPORARY_WORKER in the same org
//   2. User has ALL of the task's required skills (multi-skill — via TaskSkill)
//   3. User has at least one AVAILABLE slot overlapping the task window
//   4. User's hours this week < their StaffRole max_working_hours
//
// Ranking: eligible first → PERMANENT before TEMPORARY → most remaining hours first

async function getEligibleStaff(taskId, organisationId) {
  const task = await prisma.task.findFirst({
    where: { task_id: taskId, organisation_id: organisationId },
    include: { requiredSkills: { include: { skill: { select: { skill_id: true, skill_name: true } } } } },
  });
  if (!task) throw makeError('Task not found', 404);
  if (task.status !== 'PENDING') {
    throw makeError('Only PENDING tasks can be evaluated for allocation', 422);
  }

  const reqSkillIds = (task.requiredSkills ?? []).map((ts) => ts.skill_id);

  // Require the candidate to hold EVERY required skill (one `some` clause each).
  const skillFilter = reqSkillIds.length
    ? { AND: reqSkillIds.map((id) => ({ skills: { some: { skill_id: id } } })) }
    : {};

  const { monday, sunday } = currentWeekBounds();

  const candidates = await prisma.user.findMany({
    where: {
      organisationId,
      is_active: true,
      user_type: { in: ['PERMANENT_WORKER', 'TEMPORARY_WORKER'] },
      ...skillFilter,
    },
    include: {
      staffRole:  true,
      skills: { include: { skill: { select: { skill_name: true } } } },
      availability: {
        where: {
          status:         'AVAILABLE',
          start_datetime: { lte: task.end_datetime },
          end_datetime:   { gte: task.start_datetime },
        },
      },
      attendance: {
        where: {
          clock_in:      { gte: monday, lte: sunday },
          working_hours: { not: null },
        },
      },
      assignedTasks: {
        where: { task: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } },
        include: { task: { select: { start_datetime: true, end_datetime: true } } },
      },
    },
  });

  const result = candidates.map((u) => {
    const isAvailable     = u.availability.length > 0;
    const attendanceHours = u.attendance.reduce((sum, a) => sum + Number(a.working_hours ?? 0), 0);
    const committedHours  = u.assignedTasks.reduce((sum, ta) => {
      const start = new Date(ta.task.start_datetime);
      const end   = new Date(ta.task.end_datetime);
      if (start <= sunday && end >= monday) {
        return sum + (end - start) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);
    const weeklyHours    = attendanceHours + committedHours;
    const maxHours       = u.staffRole?.max_working_hours ?? null;
    const withinHours    = maxHours === null || weeklyHours < maxHours;
    const remainingHours = maxHours !== null ? Math.max(maxHours - weeklyHours, 0) : null;

    return {
      userId:         u.userId,
      full_name:      u.full_name,
      email:          u.email,
      user_type:      u.user_type,
      staffRole:      u.staffRole?.role_name ?? null,
      skills:         u.skills.map((us) => us.skill.skill_name),
      weeklyHours:    Math.round(weeklyHours * 100) / 100,
      maxHours,
      remainingHours: remainingHours !== null ? Math.round(remainingHours * 100) / 100 : null,
      isAvailable,
      withinHours,
      eligible:       isAvailable && withinHours,
      ineligibleReason: !isAvailable && !withinHours
        ? 'No availability for task window and weekly hours exceeded'
        : !isAvailable
          ? 'No availability slot overlapping the task window'
          : !withinHours
            ? 'Weekly working hours limit reached'
            : null,
    };
  });

  // Sort: eligible first → permanent before temp → most remaining capacity first
  result.sort((a, b) => {
    if (a.eligible !== b.eligible) return b.eligible - a.eligible;
    if (a.user_type !== b.user_type) return a.user_type === 'PERMANENT_WORKER' ? -1 : 1;
    const aRem = a.remainingHours ?? Infinity;
    const bRem = b.remainingHours ?? Infinity;
    return bRem - aRem;
  });

  return { task, candidates: result };
}

// ─── 3d + 4: Write TaskAssignment + AllocationHistory + update status ────────

async function assignTask(taskId, organisationId, assignedTo, assignedBy, type = 'MANUAL') {
  const task = await prisma.task.findFirst({
    where:   { task_id: taskId, organisation_id: organisationId },
    include: { assignments: true },
  });
  if (!task) throw makeError('Task not found', 404);
  if (!['PENDING', 'ASSIGNED'].includes(task.status)) {
    throw makeError('Only PENDING or ASSIGNED tasks can be allocated', 422);
  }

  const worker = await prisma.user.findFirst({
    where: {
      userId:         assignedTo,
      organisationId,
      is_active:      true,
      user_type:      { in: ['PERMANENT_WORKER', 'TEMPORARY_WORKER'] },
    },
  });
  if (!worker) throw makeError('Worker not found in this organisation', 404);

  const isReallocation = task.assignments.length > 0;

  await prisma.$transaction(async (tx) => {
    // Remove existing assignments and log each as UNASSIGNED
    for (const old of task.assignments) {
      await tx.allocationHistory.create({
        data: {
          task_id:    taskId,
          user_id:    old.assigned_to,
          changed_by: assignedBy,
          action:     'UNASSIGNED',
        },
      });
      await tx.taskAssignment.delete({ where: { assignment_id: old.assignment_id } });
    }

    // Create the new assignment
    await tx.taskAssignment.create({
      data: {
        task_id:         taskId,
        assigned_to:     assignedTo,
        assigned_by:     assignedBy,
        assignment_type: type,
      },
    });

    // Log the allocation action
    await tx.allocationHistory.create({
      data: {
        task_id:    taskId,
        user_id:    assignedTo,
        changed_by: assignedBy,
        action:     isReallocation ? 'REALLOCATED' : 'ALLOCATED',
      },
    });

    // Flip the task to ASSIGNED
    await tx.task.update({
      where: { task_id: taskId },
      data:  { status: 'ASSIGNED' },
    });
  });

  return prisma.task.findFirst({
    where:   { task_id: taskId },
    include: {
      department:    { select: { name: true } },
      requiredSkill: { select: { skill_name: true } },
      requiredSkills: { include: { skill: { select: { skill_id: true, skill_name: true } } } },
      assignments: {
        include: { assignedTo: { select: { full_name: true, email: true } } },
      },
    },
  });
}

// ─── Auto-allocate: pick top eligible candidate and assign ────────────────────

async function autoAllocate(taskId, organisationId, allocatedBy) {
  const { candidates } = await getEligibleStaff(taskId, organisationId);
  const top = candidates.find((c) => c.eligible);
  if (!top) throw makeError('No eligible staff found for auto-allocation', 422);
  return assignTask(taskId, organisationId, top.userId, allocatedBy, 'AUTO');
}

// --- Allocation history for a task -------------------------------------------

async function getAllocationHistory(taskId, organisationId) {
  const task = await prisma.task.findFirst({
    where: { task_id: taskId, organisation_id: organisationId },
  });
  if (!task) throw makeError('Task not found', 404);

  return prisma.allocationHistory.findMany({
    where: { task_id: taskId },
    include: {
      user:      { select: { userId: true, full_name: true, email: true } },
      changedBy: { select: { userId: true, full_name: true } },
    },
    orderBy: { timestamp: 'desc' },
  });
}

module.exports = { getEligibleStaff, assignTask, autoAllocate, getAllocationHistory };
