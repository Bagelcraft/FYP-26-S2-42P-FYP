const prisma = require('../config/prisma');
const { getOrgType } = require('../middleware/orgType.middleware');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ─── Timesheet mode ───────────────────────────────────────────
//
// What a timesheet measures depends on how the organisation schedules work, and
// on nothing else. Both modes apply to permanent and temporary staff alike —
// a temporary worker in a shift-based company is rostered onto shifts and clocks
// in exactly as a permanent one does, so splitting this by role would have shown
// them a different sheet from the colleague standing next to them.
//
//   SHIFT — a shift-based organisation rosters people and pays for the hours they
//   are present, so the sheet is clock in / clock out / hours. It also lists the
//   tasks they completed, because being rostered and delivering work are two
//   different things and a manager wants both.
//
//   TASK — a project-based organisation has no roster to clock against, so there
//   are no hours to report. The unit of work is the task, and the sheet is the
//   completed tasks grouped by project.
function timesheetMode(orgType) {
  return orgType === 'PROJECT' ? 'TASK' : 'SHIFT';
}

// Clocking in only means something where there is a roster. Enforced at the route
// level too — this is the single definition both layers read.
const canClock = (orgType) => timesheetMode(orgType) === 'SHIFT';

const round2 = (n) => Math.round(n * 100) / 100;

// "YYYY-MM" → the local-time bounds of that month. Anything unparseable falls
// back to the current month rather than erroring, since the value comes from a
// date picker that can be cleared.
function monthBounds(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(month ?? ''));
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();

  return {
    key:   `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    start: new Date(year, monthIndex, 1, 0, 0, 0, 0),
    end:   new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
  };
}

const clockIn = async (userId) => {
  const openSession = await prisma.attendance.findFirst({
    where: { user_id: userId, clock_out: null },
  });
  if (openSession) {
    throw makeError('You are already clocked in', 400);
  }
  return prisma.attendance.create({
    data: { user_id: userId, clock_in: new Date() },
  });
};

const clockOut = async (userId) => {
  const openSession = await prisma.attendance.findFirst({
    where: { user_id: userId, clock_out: null },
    orderBy: { clock_in: 'desc' },
  });
  if (!openSession) {
    throw makeError('You are not currently clocked in', 400);
  }
  const clockOutTime = new Date();
  const diffMs = clockOutTime - openSession.clock_in;
  const workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  return prisma.attendance.update({
    where: { attendance_id: openSession.attendance_id },
    data: { clock_out: clockOutTime, working_hours: workingHours },
  });
};

const listAttendance = async (userId) => {
  return prisma.attendance.findMany({
    where: { user_id: userId },
    orderBy: { clock_in: 'desc' },
  });
};

// ─── Timesheets ───────────────────────────────────────────────

// The clock half: one row per attendance session in the month.
async function attendanceRows(userId, { start, end }) {
  const records = await prisma.attendance.findMany({
    where:   { user_id: userId, clock_in: { gte: start, lte: end } },
    orderBy: { clock_in: 'desc' },
  });

  // A session still open has no hours yet, so it counts towards neither the
  // days-present tally nor the average — it would drag both down to no purpose.
  const closed = records.filter((r) => r.clock_out !== null);
  const totalHours = closed.reduce((sum, r) => sum + Number(r.working_hours ?? 0), 0);

  return {
    attendance: records.map((r) => ({
      id:       r.attendance_id,
      date:     r.clock_in,
      clockIn:  r.clock_in,
      clockOut: r.clock_out,
      hours:    r.working_hours === null ? null : Number(r.working_hours),
      status:   r.clock_out === null ? 'IN_PROGRESS' : 'PRESENT',
    })),
    // Lets the UI show "clocked in at …" without re-deriving it.
    openSession: records.find((r) => r.clock_out === null) ?? null,
    daysPresent: closed.length,
    totalHours:  round2(totalHours),
    avgHours:    closed.length ? round2(totalHours / closed.length) : null,
  };
}

// The delivered-work half: completed tasks, plus a per-project breakdown.
//
// Credited to the month the task *finished* in, because that is when the work
// was delivered — a task starting in July and approved in August belongs on the
// August sheet, which is the one that gets invoiced.
//
// Counts tasks, never hours. A task records a start and an end date, not time
// worked, so any hours figure here would be inferred from the size of the
// scheduling window rather than measured — two people could deliver the same task
// in wildly different time and the sheet would report them identically. Where a
// sheet does show hours they come from the clock above, which is real.
async function completedTaskRows(userId, organisationId, { start, end }) {
  const rows = await prisma.task.findMany({
    where: {
      organisation_id: organisationId,
      status:          'COMPLETED',
      end_datetime:    { gte: start, lte: end },
      assignments:     { some: { assigned_to: userId } },
    },
    select: {
      task_id:        true,
      title:          true,
      start_datetime: true,
      end_datetime:   true,
      project:        { select: { project_id: true, name: true } },
    },
    orderBy: { end_datetime: 'desc' },
  });

  // Tasks keep their history when an organisation switches away from PROJECT
  // (setOrgType nulls project_id rather than deleting the task), so a sheet can
  // legitimately hold both project work and standalone tasks.
  const byProject = new Map();

  const tasks = rows.map((t) => {
    const projectId = t.project?.project_id ?? null;
    const bucket = byProject.get(projectId) ?? {
      project_id: projectId,
      name:       t.project?.name ?? 'Standalone tasks',
      tasks:      0,
    };
    bucket.tasks += 1;
    byProject.set(projectId, bucket);

    return {
      id:      t.task_id,
      date:    t.end_datetime,
      title:   t.title,
      project: t.project?.name ?? null,
      // The scheduled window, shown as dates. Real recorded data, unlike any
      // hours figure derived from it.
      start:   t.start_datetime,
      end:     t.end_datetime,
      status:  'COMPLETED',
    };
  });

  // Most work first — the headline of a task-based sheet is which project the
  // month went into.
  const projects = [...byProject.values()].sort((a, b) => b.tasks - a.tasks);

  return { tasks, projects };
}

/**
 * The caller's timesheet for one month, in whichever form their organisation
 * schedules work. Identical for permanent and temporary staff — see timesheetMode.
 *
 * SHIFT mode returns hours *and* completed tasks; TASK mode returns tasks only.
 *
 * @param {number} userId
 * @param {number} organisationId
 * @param {string} userType  PERMANENT_WORKER | TEMPORARY_WORKER (reported, not branched on)
 * @param {string} [month]   "YYYY-MM"; defaults to the current month
 */
async function getTimesheet(userId, organisationId, userType, month) {
  const orgType = (await getOrgType(organisationId)) ?? 'NON_PROJECT';
  const bounds = monthBounds(month);
  const mode = timesheetMode(orgType);

  const { tasks, projects } = await completedTaskRows(userId, organisationId, bounds);

  const base = {
    mode,
    month:    bounds.key,
    canClock: canClock(orgType),
    orgType,
    userType,
    tasks,
  };

  if (mode === 'TASK') {
    return {
      ...base,
      attendance:  [],
      openSession: null,
      projects,
      summary: {
        tasksCompleted: tasks.length,
        projectsWorked: projects.filter((p) => p.project_id !== null).length,
      },
    };
  }

  const clock = await attendanceRows(userId, bounds);
  return {
    ...base,
    attendance:  clock.attendance,
    openSession: clock.openSession,
    // Projects only exist in project-based organisations, so a shift sheet has no
    // meaningful breakdown to show.
    projects: [],
    summary: {
      daysPresent:    clock.daysPresent,
      totalHours:     clock.totalHours,
      avgHours:       clock.avgHours,
      tasksCompleted: tasks.length,
    },
  };
}

module.exports = { clockIn, clockOut, listAttendance, getTimesheet, timesheetMode, canClock };
