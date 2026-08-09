const prisma = require('../config/prisma');
const { getOrgType } = require('../middleware/orgType.middleware');

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

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Tasks in these states occupy the worker's calendar; PENDING/COMPLETED/CANCELLED do not.
const LIVE_TASK_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'];

// A task spanning several days is counted as one nominal working day per day it
// covers, not wall-clock elapsed time — an overnight or multi-day task would
// otherwise bill 24h per day and push every assignee past their weekly cap.
const WORKING_DAY_HOURS = 8;

// Postgres `date` columns (leave dates, roster dates) come back as UTC midnight.
// Read their calendar parts in UTC and rebuild them at local midnight, so the
// day they represent is the same one the rest of the engine reasons about.
function dbDateToLocalMidnight(value) {
  const d = new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const endOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// Hours a task contributes to the current week, capped per day.
function committedHoursInWeek(start, end, weekStart, weekEnd) {
  let total = 0;
  const cur = new Date(Math.max(start, weekStart));
  cur.setHours(0, 0, 0, 0);
  const last = new Date(Math.min(end, weekEnd));
  while (cur <= last) {
    const from = new Date(Math.max(start, cur, weekStart));
    const to = new Date(Math.min(end, endOfLocalDay(cur), weekEnd));
    if (to > from) total += Math.min((to - from) / 3600000, WORKING_DAY_HOURS);
    cur.setDate(cur.getDate() + 1);
  }
  return total;
}

// Every calendar day the task window touches, as YYYY-MM-DD.
function daysInWindow(start, end) {
  const days = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    days.push(ymd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && aEnd >= bStart;

// A "HH:MM" template time on a given date. An end time at or before the start
// time means the shift runs past midnight, so it lands on the following day.
function shiftWindow(date, startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const base = dbDateToLocalMidnight(date);
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh, sm, 0);
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
}

// ─── Blockers ─────────────────────────────────────────────────
//
// The project model treats a worker as free by default and only rules them out
// on hard evidence. That is what makes a temporary worker "shift-free until a
// task activates them" — with no roster to consult, absence of a blocker is
// what availability means.
//
// A worker is blocked over the task window when any of these overlap it:
//   1. an explicit UNAVAILABLE / ON_LEAVE availability slot they set
//   2. an APPROVED leave request
//   3. an already-committed task (ASSIGNED / IN_PROGRESS / SUBMITTED)
function collectBlockers(user, taskStart, taskEnd, excludeTaskId) {
  const blockers = [];
  const blockedDays = new Set();

  const addDays = (from, to) => {
    for (const d of daysInWindow(
      new Date(Math.max(new Date(from), taskStart)),
      new Date(Math.min(new Date(to), taskEnd)),
    )) blockedDays.add(d);
  };

  for (const slot of user.availability ?? []) {
    if (slot.status === 'AVAILABLE') continue;
    if (!overlaps(new Date(slot.start_datetime), new Date(slot.end_datetime), taskStart, taskEnd)) continue;
    blockers.push({
      kind:   slot.status === 'ON_LEAVE' ? 'LEAVE' : 'UNAVAILABLE',
      detail: slot.status === 'ON_LEAVE' ? 'Marked on leave' : 'Marked unavailable',
      from:   slot.start_datetime,
      to:     slot.end_datetime,
    });
    addDays(slot.start_datetime, slot.end_datetime);
  }

  for (const leave of user.leaveRequests ?? []) {
    // Leave dates are date-only; anchor them to local days and extend to
    // end-of-day so a same-day task collides.
    const lStart = dbDateToLocalMidnight(leave.start_date);
    const lEnd = endOfLocalDay(dbDateToLocalMidnight(leave.end_date));
    if (!overlaps(lStart, lEnd, taskStart, taskEnd)) continue;
    blockers.push({
      kind:   'LEAVE',
      detail: `Approved ${leave.leave_type.toLowerCase()} leave`,
      from:   leave.start_date,
      to:     leave.end_date,
    });
    addDays(lStart, lEnd);
  }

  for (const ta of user.assignedTasks ?? []) {
    if (ta.task_id === excludeTaskId) continue;
    const tStart = new Date(ta.task.start_datetime);
    const tEnd = new Date(ta.task.end_datetime);
    if (!overlaps(tStart, tEnd, taskStart, taskEnd)) continue;
    blockers.push({
      kind:   'TASK',
      detail: `Already on "${ta.task.title}"`,
      from:   ta.task.start_datetime,
      to:     ta.task.end_datetime,
    });
    addDays(tStart, tEnd);
  }

  return { blockers, blockedDays: [...blockedDays].sort() };
}

// Shift-based orgs work the other way round: a worker is only available for a
// task if they are actually rostered on shifts covering it.
//
// Coverage is measured in time, not in days: someone on a 13:00–21:00 shift is
// not available for a 10:00–16:00 task just because both fall on the same date.
// Overlapping shifts are merged so a split roster can still add up to full cover.
function shiftCoverage(user, taskStart, taskEnd) {
  const spans = [];
  for (const sa of user.shiftAssignments ?? []) {
    const { start, end } = shiftWindow(sa.date, sa.shift.start_time, sa.shift.end_time);
    const from = Math.max(start, taskStart);
    const to = Math.min(end, taskEnd);
    if (to > from) spans.push([from, to]);
  }
  spans.sort((a, b) => a[0] - b[0]);

  const merged = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([...span]);
  }

  const coveredMs = merged.reduce((sum, [from, to]) => sum + (to - from), 0);
  const days = new Set();
  for (const [from, to] of merged) {
    for (const d of daysInWindow(new Date(from), new Date(to))) days.add(d);
  }

  const taskMs = taskEnd - taskStart;
  return {
    rosteredDays: [...days].sort(),
    coveredMs,
    // Whole task window sits inside rostered time.
    fullyCovered: taskMs <= 0 ? coveredMs > 0 : coveredMs >= taskMs,
    coveragePct: taskMs > 0 ? Math.round((coveredMs / taskMs) * 100) : 0,
  };
}

// ─── Candidate loading ────────────────────────────────────────

async function loadTask(taskId, organisationId) {
  const task = await prisma.task.findFirst({
    where:   { task_id: taskId, organisation_id: organisationId },
    include: {
      requiredSkills: { include: { skill: { select: { skill_id: true, skill_name: true } } } },
      project:        { include: { resources: { select: { user_id: true } } } },
    },
  });
  if (!task) throw makeError('Task not found', 404);
  return task;
}

// Eligibility, ranked. Rules differ by organisation type:
//
//   PROJECT      Candidates come from the project's resource pool (or the whole
//                org when the pool is empty). Everyone is available unless a
//                blocker says otherwise, so temporary workers surface without
//                needing any roster. Permanent staff rank first and only give
//                way to a temp on the days they are actually blocked.
//
//   NON_PROJECT  Candidates must be rostered on a shift covering the task
//                window — the roster is the source of truth for who is working.
async function getEligibleStaff(taskId, organisationId, { statusCheck = true } = {}) {
  const task = await loadTask(taskId, organisationId);
  if (statusCheck && !['PENDING', 'ASSIGNED'].includes(task.status)) {
    throw makeError('Only PENDING or ASSIGNED tasks can be evaluated for allocation', 422);
  }

  const orgType = (await getOrgType(organisationId)) ?? 'NON_PROJECT';
  const isProjectOrg = orgType === 'PROJECT';

  const taskStart = new Date(task.start_datetime);
  const taskEnd = new Date(task.end_datetime);

  const reqSkillIds = (task.requiredSkills ?? []).map((ts) => ts.skill_id);
  const skillFilter = reqSkillIds.length
    ? { AND: reqSkillIds.map((id) => ({ skills: { some: { skill_id: id } } })) }
    : {};

  // Resource pool: an empty pool means the project has not narrowed the field yet.
  const poolIds = (task.project?.resources ?? []).map((r) => r.user_id);
  const poolFilter = isProjectOrg && poolIds.length ? { userId: { in: poolIds } } : {};

  const { monday, sunday } = currentWeekBounds();

  const candidates = await prisma.user.findMany({
    where: {
      organisationId,
      is_active: true,
      user_type: { in: ['PERMANENT_WORKER', 'TEMPORARY_WORKER'] },
      ...skillFilter,
      ...poolFilter,
    },
    include: {
      staffRole: true,
      skills:    { include: { skill: { select: { skill_name: true } } } },
      availability: {
        where: { start_datetime: { lte: taskEnd }, end_datetime: { gte: taskStart } },
      },
      leaveRequests: {
        where: { status: 'APPROVED', start_date: { lte: taskEnd }, end_date: { gte: taskStart } },
        select: { leave_type: true, start_date: true, end_date: true },
      },
      attendance: {
        where: { clock_in: { gte: monday, lte: sunday }, working_hours: { not: null } },
      },
      assignedTasks: {
        where:  { task: { status: { in: LIVE_TASK_STATUSES } } },
        select: { task_id: true, task: { select: { title: true, start_datetime: true, end_datetime: true } } },
      },
      // Only loaded for shift orgs, where being rostered is what makes a worker available.
      shiftAssignments: isProjectOrg ? false : {
        where: {
          date: {
            gte: new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate() - 1),
            lte: new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate() + 1),
          },
        },
        include: { shift: { select: { name: true, start_time: true, end_time: true } } },
      },
    },
  });

  const result = candidates.map((u) => {
    const { blockers, blockedDays } = collectBlockers(u, taskStart, taskEnd, task.task_id);

    // A temporary worker with no live assignment is dormant — carrying no shifts
    // and no commitments until a task activates them.
    const isDormant = u.user_type === 'TEMPORARY_WORKER' && u.assignedTasks.length === 0;

    let isAvailable;
    let coverage = null;
    if (isProjectOrg) {
      isAvailable = blockers.length === 0;
    } else {
      coverage = shiftCoverage(u, taskStart, taskEnd);
      isAvailable = coverage.fullyCovered && blockers.length === 0;
    }

    const attendanceHours = u.attendance.reduce((sum, a) => sum + Number(a.working_hours ?? 0), 0);
    const committedHours = u.assignedTasks.reduce((sum, ta) => {
      const start = new Date(ta.task.start_datetime);
      const end = new Date(ta.task.end_datetime);
      return start <= sunday && end >= monday
        ? sum + committedHoursInWeek(start, end, monday, sunday)
        : sum;
    }, 0);
    const weeklyHours = attendanceHours + committedHours;
    const maxHours = u.staffRole?.max_working_hours ?? null;
    const withinHours = maxHours === null || weeklyHours < maxHours;
    const remainingHours = maxHours !== null ? Math.max(maxHours - weeklyHours, 0) : null;

    const inResourcePool = !poolIds.length || poolIds.includes(u.userId);

    let ineligibleReason = null;
    if (!withinHours && !isAvailable) ineligibleReason = 'Unavailable for the task window and weekly hours limit reached';
    else if (!isAvailable) {
      if (isProjectOrg) ineligibleReason = blockers.map((b) => b.detail).join('; ');
      else if (blockers.length && coverage.fullyCovered) ineligibleReason = blockers.map((b) => b.detail).join('; ');
      else if (coverage.coveredMs > 0) ineligibleReason = `Only rostered for ${coverage.coveragePct}% of the task window`;
      else ineligibleReason = 'Not rostered on a shift covering the task window';
    } else if (!withinHours) ineligibleReason = 'Weekly working hours limit reached';

    return {
      userId:    u.userId,
      full_name: u.full_name,
      email:     u.email,
      user_type: u.user_type,
      staffRole: u.staffRole?.role_name ?? null,
      skills:    u.skills.map((us) => us.skill.skill_name),
      weeklyHours: Math.round(weeklyHours * 100) / 100,
      maxHours,
      remainingHours: remainingHours !== null ? Math.round(remainingHours * 100) / 100 : null,
      isAvailable,
      withinHours,
      isDormant,
      inResourcePool,
      blockers,
      blockedDays,
      rosteredDays:    coverage?.rosteredDays ?? null,
      rosterCoverage:  coverage?.coveragePct ?? null,
      eligible: isAvailable && withinHours,
      ineligibleReason,
    };
  });

  // Permanent staff are the default choice; a temporary worker is only reached
  // for a window where no permanent worker is free.
  result.sort((a, b) => {
    if (a.eligible !== b.eligible) return b.eligible - a.eligible;
    if (a.user_type !== b.user_type) return a.user_type === 'PERMANENT_WORKER' ? -1 : 1;
    const aRem = a.remainingHours ?? Infinity;
    const bRem = b.remainingHours ?? Infinity;
    return bRem - aRem;
  });

  const eligible = result.filter((c) => c.eligible);
  return {
    task,
    orgType,
    project: task.project
      ? { project_id: task.project.project_id, name: task.project.name, start_date: task.project.start_date, end_date: task.project.end_date, resourceCount: poolIds.length }
      : null,
    candidates: result,
    summary: {
      total:            result.length,
      eligible:         eligible.length,
      eligiblePermanent: eligible.filter((c) => c.user_type === 'PERMANENT_WORKER').length,
      eligibleTemporary: eligible.filter((c) => c.user_type === 'TEMPORARY_WORKER').length,
      // True when every permanent worker is blocked and the work has to fall to a temp.
      fallbackToTemporary: eligible.length > 0 && eligible.every((c) => c.user_type === 'TEMPORARY_WORKER'),
    },
  };
}

// ─── Assignment ───────────────────────────────────────────────

async function assignTask(taskId, organisationId, assignedTo, assignedBy, type = 'MANUAL') {
  const task = await prisma.task.findFirst({
    where:   { task_id: taskId, organisation_id: organisationId },
    include: { assignments: true, project: { include: { resources: { select: { user_id: true } } } } },
  });
  if (!task) throw makeError('Task not found', 404);
  if (!['PENDING', 'ASSIGNED'].includes(task.status)) {
    throw makeError('Only PENDING or ASSIGNED tasks can be allocated', 422);
  }

  const worker = await prisma.user.findFirst({
    where: {
      userId:    assignedTo,
      organisationId,
      is_active: true,
      user_type: { in: ['PERMANENT_WORKER', 'TEMPORARY_WORKER'] },
    },
  });
  if (!worker) throw makeError('Worker not found in this organisation', 404);

  // A named resource pool is a hard boundary — only those workers may take the
  // project's tasks, however the assignment was triggered.
  const poolIds = (task.project?.resources ?? []).map((r) => r.user_id);
  if (poolIds.length && !poolIds.includes(assignedTo)) {
    throw makeError(`${worker.full_name} is not a resource on this project. Add them to the project first.`, 422);
  }

  const isReallocation = task.assignments.length > 0;

  await prisma.$transaction(async (tx) => {
    // Remove existing assignments and log each as UNASSIGNED
    for (const old of task.assignments) {
      await tx.allocationHistory.create({
        data: { task_id: taskId, user_id: old.assigned_to, changed_by: assignedBy, action: 'UNASSIGNED' },
      });
      await tx.taskAssignment.delete({ where: { assignment_id: old.assignment_id } });
    }

    await tx.taskAssignment.create({
      data: { task_id: taskId, assigned_to: assignedTo, assigned_by: assignedBy, assignment_type: type },
    });

    await tx.allocationHistory.create({
      data: {
        task_id:    taskId,
        user_id:    assignedTo,
        changed_by: assignedBy,
        // Recorded so the history shows when a temp was activated by this allocation.
        action:     isReallocation ? 'REALLOCATED' : (worker.user_type === 'TEMPORARY_WORKER' ? 'ACTIVATED' : 'ALLOCATED'),
      },
    });

    await tx.task.update({ where: { task_id: taskId }, data: { status: 'ASSIGNED' } });
  });

  return prisma.task.findFirst({
    where:   { task_id: taskId },
    include: {
      department:     { select: { name: true } },
      project:        { select: { project_id: true, name: true } },
      requiredSkill:  { select: { skill_name: true } },
      requiredSkills: { include: { skill: { select: { skill_id: true, skill_name: true } } } },
      assignments:    { include: { assignedTo: { select: { full_name: true, email: true, user_type: true } } } },
    },
  });
}

// ─── Auto-allocate ────────────────────────────────────────────
// Takes the top-ranked eligible candidate, which the sort has already biased
// towards permanent staff — a temp only wins when no permanent worker is free.

async function autoAllocate(taskId, organisationId, allocatedBy) {
  const { candidates, summary } = await getEligibleStaff(taskId, organisationId);
  const top = candidates.find((c) => c.eligible);
  if (!top) {
    const blocked = candidates.filter((c) => !c.isAvailable).length;
    throw makeError(
      candidates.length
        ? `No eligible staff for this window — ${blocked} of ${candidates.length} candidate(s) are unavailable.`
        : 'No staff match this task\'s required skills or resource pool.',
      422,
    );
  }
  const task = await assignTask(taskId, organisationId, top.userId, allocatedBy, 'AUTO');
  return { ...task, allocatedTo: top, fallbackToTemporary: summary.fallbackToTemporary };
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
      user:      { select: { userId: true, full_name: true, email: true, user_type: true } },
      changedBy: { select: { userId: true, full_name: true } },
    },
    orderBy: { timestamp: 'desc' },
  });
}

module.exports = { getEligibleStaff, assignTask, autoAllocate, getAllocationHistory };
