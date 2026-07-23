const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const updateMyProfile = async (userId, data) => {
  return prisma.user.update({
    where: { userId },
    data: {
      full_name: data.full_name,
      email: data.email,
    },
  });
};

// ─── Leave (worker self-service) ──────────────────────────────

const applyLeave = async (userId, data) => {
  return prisma.leaveRequest.create({
    data: {
      user_id:    userId,
      leave_type: data.leave_type,
      start_date: new Date(data.start_date),
      end_date:   new Date(data.end_date),
      status:     'PENDING',
    },
  });
};

const listMyLeave = async (userId) => {
  return prisma.leaveRequest.findMany({
    where:   { user_id: userId },
    orderBy: { start_date: 'desc' },
  });
};

// Workers may withdraw a request only while it is still pending.
const cancelLeave = async (userId, leaveId) => {
  const leave = await prisma.leaveRequest.findFirst({ where: { leave_id: leaveId, user_id: userId } });
  if (!leave) throw makeError('Leave request not found', 404);
  if (leave.status !== 'PENDING') throw makeError('Only pending leave requests can be cancelled', 409);
  await prisma.leaveRequest.delete({ where: { leave_id: leaveId } });
};

// ─── Worker's own assigned skills (read-only view on their profile) ──
const getMySkills = async (userId) => {
  const rows = await prisma.userSkill.findMany({
    where:   { user_id: userId },
    include: { skill: { select: { skill_id: true, skill_name: true, cert_required: true } } },
    orderBy: { skill: { skill_name: 'asc' } },
  });
  return rows.map((r) => r.skill);
};

// ─── Org skill catalogue (for the profile change-request dropdown) ──
const listOrgSkills = async (organisationId) =>
  prisma.skill.findMany({ where: { organisation_id: organisationId }, select: { skill_id: true, skill_name: true }, orderBy: { skill_name: 'asc' } });

// ─── Leave balance (current year, self) ──────────────────────
const getMyLeaveBalance = async (userId) => {
  const year = new Date().getFullYear();
  const rows = await prisma.leaveBalance.findMany({ where: { user_id: userId, year } });
  const out = { year, annual: { entitled: 0, used: 0 }, medical: { entitled: 0, used: 0 } };
  for (const b of rows) {
    if (b.leave_type === 'ANNUAL')  out.annual  = { entitled: b.entitled_days, used: b.used_days };
    if (b.leave_type === 'MEDICAL') out.medical = { entitled: b.entitled_days, used: b.used_days };
  }
  return out;
};

// ─── Schedule (assigned shifts, today onward) ─────────────────
const getMySchedule = async (userId) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return prisma.shiftAssignment.findMany({
    where:   { user_id: userId, date: { gte: start } },
    include: { shift: { select: { name: true, start_time: true, end_time: true } } },
    orderBy: { date: 'asc' },
  });
};

// ─── Calendar (self: own shifts, tasks, unavailability) ──────
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getMyCalendar = async (userId, organisationId, from, to) => {
  const [shiftRows, taskRows, unavailRows] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where:   { user_id: userId, date: { gte: from, lte: to } },
      include: { shift: { select: { name: true, start_time: true, end_time: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.task.findMany({
      where:   { organisation_id: organisationId, assignments: { some: { assigned_to: userId } }, OR: [{ start_datetime: { gte: from, lte: to } }, { end_datetime: { gte: from, lte: to } }] },
      include: { department: { select: { name: true } } },
      orderBy: { start_datetime: 'asc' },
    }),
    prisma.availability.findMany({
      where:   { user_id: userId, status: { in: ['UNAVAILABLE', 'ON_LEAVE'] }, start_datetime: { lte: to }, end_datetime: { gte: from } },
    }),
  ]);
  return {
    from: ymd(from), to: ymd(to),
    shifts:      shiftRows.map((s) => ({ date: ymd(new Date(s.date)), shiftName: s.shift.name, startTime: s.shift.start_time, endTime: s.shift.end_time })),
    tasks:       taskRows.map((t) => ({ task_id: t.task_id, title: t.title, status: t.status, start: ymd(new Date(t.start_datetime)), end: ymd(new Date(t.end_datetime)), department: t.department?.name ?? null })),
    unavailable: unavailRows.map((a) => ({ status: a.status, start: ymd(new Date(a.start_datetime)), end: ymd(new Date(a.end_datetime)) })),
  };
};

module.exports = {
  updateMyProfile,
  applyLeave,
  listMyLeave,
  cancelLeave,
  getMyLeaveBalance,
  getMySchedule,
  getMyCalendar,
  getMySkills,
  listOrgSkills,
};