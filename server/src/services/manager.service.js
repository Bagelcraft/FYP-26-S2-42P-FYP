const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Same week window used by allocation.service.js (Mon 00:00 → Sun 23:59).
function currentWeekBounds() {
  const now = new Date();
  const dow = now.getDay();
  const toMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now); monday.setDate(now.getDate() + toMon); monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtShort = (d) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
const fmtLong = (d) => `${fmtShort(d)} ${d.getFullYear()}`;

// ─── GET /pm/team ─────────────────────────────────────────────
// Manager-scoped roster with skills, weekly capacity and availability.
async function getTeam(organisationId) {
  const { monday, sunday } = currentWeekBounds();

  const users = await prisma.user.findMany({
    where: {
      organisationId,
      is_active: true,
      user_type: { in: ['PERMANENT_WORKER', 'TEMPORARY_WORKER'] },
    },
    include: {
      staffRole: true,
      skills: { include: { skill: { select: { skill_name: true } } } },
      attendance: { where: { clock_in: { gte: monday, lte: sunday }, working_hours: { not: null } } },
      availability: { orderBy: { start_datetime: 'desc' }, take: 1 },
    },
    orderBy: { full_name: 'asc' },
  });

  return users.map((u) => {
    const weeklyHours = u.attendance.reduce((sum, a) => sum + Number(a.working_hours ?? 0), 0);
    const latest = u.availability[0];
    const status = latest?.status === 'ON_LEAVE' ? 'ON_LEAVE'
      : latest?.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    return {
      id: u.userId,
      name: u.full_name,
      type: u.user_type,
      role: u.staffRole?.role_name ?? '—',
      dept: '—', // No direct user→department FK in the schema; left blank.
      skills: u.skills.map((us) => us.skill.skill_name),
      weeklyHours: Math.round(weeklyHours * 100) / 100,
      maxHours: u.staffRole?.max_working_hours ?? 40,
      status,
    };
  });
}

// ─── GET /pm/leave ────────────────────────────────────────────
async function listLeave(organisationId) {
  const rows = await prisma.leaveRequest.findMany({
    where: { user: { organisationId } },
    include: { user: { select: { full_name: true, user_type: true } } },
    orderBy: { start_date: 'desc' },
  });
  return rows.map((l) => {
    const days = Math.round((new Date(l.end_date) - new Date(l.start_date)) / 86400000) + 1;
    return {
      id: l.leave_id,
      user: l.user_id,
      userName: l.user.full_name,
      userType: l.user.user_type,
      type: l.leave_type,
      from: fmtShort(new Date(l.start_date)),
      to: fmtShort(new Date(l.end_date)),
      days,
      status: l.status,
      note: '',
      applied: '',
    };
  });
}

// ─── PATCH /pm/leave/:id ──────────────────────────────────────
async function decideLeave(leaveId, organisationId, status, approverId) {
  if (!['APPROVED', 'REJECTED'].includes(status)) throw makeError('status must be APPROVED or REJECTED', 422);
  const leave = await prisma.leaveRequest.findFirst({ where: { leave_id: leaveId, user: { organisationId } } });
  if (!leave) throw makeError('Leave request not found', 404);
  return prisma.leaveRequest.update({
    where: { leave_id: leaveId },
    data: { status, approved_by: approverId },
  });
}

// ─── GET /pm/leave-balance ────────────────────────────────────
async function listLeaveBalances(organisationId) {
  const rows = await prisma.leaveBalance.findMany({
    where: { user: { organisationId } },
    include: { user: { select: { full_name: true } } },
  });
  // Fold ANNUAL / MEDICAL rows into one record per user.
  const byUser = {};
  for (const b of rows) {
    byUser[b.user_id] ??= { user: b.user_id, userName: b.user.full_name, annual: { entitled: 0, used: 0 }, medical: { entitled: 0, used: 0 } };
    if (b.leave_type === 'ANNUAL') byUser[b.user_id].annual = { entitled: b.entitled_days, used: b.used_days };
    if (b.leave_type === 'MEDICAL') byUser[b.user_id].medical = { entitled: b.entitled_days, used: b.used_days };
  }
  return Object.values(byUser);
}

// ─── PATCH /pm/leave-balance/:userId ──────────────────────────
async function updateLeaveBalance(userId, organisationId, { annual, medical }) {
  const user = await prisma.user.findFirst({ where: { userId, organisationId } });
  if (!user) throw makeError('User not found in your organisation', 404);
  const year = new Date().getFullYear();

  async function upsert(type, vals) {
    if (!vals) return;
    const existing = await prisma.leaveBalance.findFirst({ where: { user_id: userId, leave_type: type, year } });
    if (existing) {
      await prisma.leaveBalance.update({ where: { balance_id: existing.balance_id }, data: { entitled_days: vals.entitled, used_days: vals.used } });
    } else {
      await prisma.leaveBalance.create({ data: { user_id: userId, leave_type: type, entitled_days: vals.entitled, used_days: vals.used, year } });
    }
  }
  await upsert('ANNUAL', annual);
  await upsert('MEDICAL', medical);
  return { user: userId, annual, medical };
}

// ─── GET /pm/subscription ─────────────────────────────────────
async function getSubscription(organisationId) {
  const org = await prisma.organisation.findUnique({
    where: { organisation_id: organisationId },
    include: { activeSubscription: true, users: { where: { is_active: true }, select: { userId: true } } },
  });
  if (!org) throw makeError('Organisation not found', 404);
  const sub = org.activeSubscription;
  if (!sub) throw makeError('No active subscription', 404);

  // Match the amount to a named tier if one exists (plans are managed separately).
  const plan = await prisma.subscriptionPlan.findFirst({ where: { price_monthly: sub.amount } });

  return {
    plan: plan?.name ?? 'Custom',
    amount: Number(sub.amount),
    status: sub.status,
    start: fmtLong(new Date(sub.start_date)),
    renews: fmtLong(new Date(sub.end_date)),
    seatsUsed: org.users.length,
    seatsTotal: plan?.max_users ?? null,
  };
}

// ─── GET /pm/billing ──────────────────────────────────────────
async function listBilling(organisationId) {
  const records = await prisma.billingRecord.findMany({
    where: { subscription: { organisation_id: organisationId } },
    orderBy: { billing_date: 'desc' },
  });
  return records.map((b) => ({
    id: `INV-${String(b.billing_id).padStart(6, '0')}`,
    date: fmtLong(new Date(b.billing_date)),
    amount: Number(b.amount),
    status: b.status, // PAID / UNPAID / REFUNDED
    method: '—',
    receipt_url: b.receipt_url,
  }));
}

// ─── GET /pm/departments  ·  GET /pm/skills ───────────────────
async function getOrgInfo(organisationId) {
  return prisma.organisation.findUnique({
    where: { organisation_id: organisationId },
    select: { name: true, org_type: true },
  });
}

async function getShiftTemplates(organisationId) {
  return prisma.shiftTemplate.findMany({
    where: { organisation_id: organisationId },
    select: { shift_id: true, name: true, start_time: true, end_time: true },
    orderBy: { name: 'asc' },
  });
}

// Read-only lookups so managers can populate the Create/Edit Task dropdowns
// without org-admin rights (org-admin owns create/update/delete of these).
async function getDepartments(organisationId) {
  return prisma.department.findMany({
    where: { organisation_id: organisationId },
    select: { department_id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

async function getSkills(organisationId) {
  return prisma.skill.findMany({
    where: { organisation_id: organisationId },
    select: { skill_id: true, skill_name: true },
    orderBy: { skill_name: 'asc' },
  });
}

// ─── Testimonials (Weishi) ────────────────────────────────────
// Real model is `Testimonial` (user_id, rating, review_text, profile_image,
// created_at) — author comes from the linked user. Scoped to the manager's org.
async function listTestimonials(organisationId) {
  const rows = await prisma.testimonial.findMany({
    where: { user: { organisationId } },
    include: { user: { select: { full_name: true, staffRole: { select: { role_name: true } } } } },
    orderBy: { created_at: 'desc' },
  });
  return rows.map((t) => ({
    testimonial_id: t.testimonial_id,
    rating: t.rating,
    review_text: t.review_text,
    profile_image: t.profile_image,
    created_at: t.created_at,
    author: t.user?.full_name ?? 'Unknown',
    author_role: t.user?.staffRole?.role_name ?? null,
  }));
}

async function createTestimonial(userId, { rating, review_text, profile_image }) {
  if (!review_text || !review_text.trim()) throw makeError('review_text is required', 422);
  const t = await prisma.testimonial.create({
    data: {
      user_id: userId,
      rating: Number(rating) || 5,
      review_text: review_text.trim(),
      profile_image: profile_image || null,
    },
    include: { user: { select: { full_name: true, staffRole: { select: { role_name: true } } } } },
  });
  return {
    testimonial_id: t.testimonial_id, rating: t.rating, review_text: t.review_text,
    profile_image: t.profile_image, created_at: t.created_at,
    author: t.user?.full_name ?? 'Unknown', author_role: t.user?.staffRole?.role_name ?? null,
  };
}

async function updateTestimonial(testimonialId, organisationId, { rating, review_text, profile_image }) {
  const existing = await prisma.testimonial.findFirst({ where: { testimonial_id: testimonialId, user: { organisationId } } });
  if (!existing) throw makeError('Testimonial not found', 404);
  const t = await prisma.testimonial.update({
    where: { testimonial_id: testimonialId },
    data: {
      rating: rating != null ? Number(rating) : undefined,
      review_text: review_text != null ? review_text.trim() : undefined,
      profile_image: profile_image !== undefined ? profile_image : undefined,
    },
    include: { user: { select: { full_name: true, staffRole: { select: { role_name: true } } } } },
  });
  return {
    testimonial_id: t.testimonial_id, rating: t.rating, review_text: t.review_text,
    profile_image: t.profile_image, created_at: t.created_at,
    author: t.user?.full_name ?? 'Unknown', author_role: t.user?.staffRole?.role_name ?? null,
  };
}

async function deleteTestimonial(testimonialId, organisationId) {
  const existing = await prisma.testimonial.findFirst({ where: { testimonial_id: testimonialId, user: { organisationId } } });
  if (!existing) throw makeError('Testimonial not found', 404);
  await prisma.testimonial.delete({ where: { testimonial_id: testimonialId } });
  return { testimonial_id: testimonialId };
}

// ─── GET /pm/reports ──────────────────────────────────────────
// Per-worker working hours (this week) + completed-task counts, plus an
// org-wide task-status breakdown and headline summary.
async function getReports(organisationId) {
  const { monday, sunday } = currentWeekBounds();

  const users = await prisma.user.findMany({
    where: { organisationId, is_active: true, user_type: { in: ['PERMANENT_WORKER', 'TEMPORARY_WORKER'] } },
    include: {
      staffRole:     { select: { role_name: true } },
      attendance:    { where: { clock_in: { gte: monday, lte: sunday }, working_hours: { not: null } } },
      assignedTasks: { where: { task: { status: 'COMPLETED' } }, select: { assignment_id: true } },
    },
    orderBy: { full_name: 'asc' },
  });

  const perStaff = users.map((u) => ({
    name:           u.full_name,
    type:           u.user_type === 'PERMANENT_WORKER' ? 'Permanent' : 'Temporary',
    role:           u.staffRole?.role_name ?? '—',
    hoursThisWeek:  Math.round(u.attendance.reduce((s, a) => s + Number(a.working_hours ?? 0), 0) * 100) / 100,
    tasksCompleted: u.assignedTasks.length,
  }));

  const grouped = await prisma.task.groupBy({
    by: ['status'], where: { organisation_id: organisationId }, _count: { _all: true },
  });
  const statusCounts = { PENDING: 0, ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
  grouped.forEach((g) => { statusCounts[g.status] = g._count._all; });

  const totalTasks = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const totalHours = perStaff.reduce((s, p) => s + p.hoursThisWeek, 0);

  return {
    perStaff,
    statusCounts,
    summary: {
      totalTasks,
      completed:      statusCounts.COMPLETED,
      completionRate: totalTasks ? Math.round((statusCounts.COMPLETED / totalTasks) * 100) : 0,
      totalHours:     Math.round(totalHours * 100) / 100,
      avgHours:       perStaff.length ? Math.round((totalHours / perStaff.length) * 100) / 100 : 0,
    },
  };
}

// ─── GET /pm/calendar?from=&to= ───────────────────────────────
// Aggregates, over a date range for the org: rostered shifts (who's on shift),
// unavailability (leave / unavailable slots) and tasks (start + deadline).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function getCalendar(organisationId, from, to) {
  const [shiftRows, taskRows, unavailRows] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where:   { organisation_id: organisationId, date: { gte: from, lte: to } },
      include: { user: { select: { userId: true, full_name: true, user_type: true } }, shift: { select: { name: true, start_time: true, end_time: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.task.findMany({
      where:   { organisation_id: organisationId, OR: [{ start_datetime: { gte: from, lte: to } }, { end_datetime: { gte: from, lte: to } }] },
      include: { department: { select: { name: true } }, assignments: { include: { assignedTo: { select: { full_name: true } } } } },
      orderBy: { start_datetime: 'asc' },
    }),
    prisma.availability.findMany({
      where:   { status: { in: ['UNAVAILABLE', 'ON_LEAVE'] }, start_datetime: { lte: to }, end_datetime: { gte: from }, user: { organisationId } },
      include: { user: { select: { userId: true, full_name: true } } },
    }),
  ]);
  return {
    from: ymd(from), to: ymd(to),
    shifts:      shiftRows.map((s) => ({ date: ymd(new Date(s.date)), userId: s.user.userId, userName: s.user.full_name, userType: s.user.user_type, shiftName: s.shift.name, startTime: s.shift.start_time, endTime: s.shift.end_time })),
    tasks:       taskRows.map((t) => ({ task_id: t.task_id, title: t.title, status: t.status, start: ymd(new Date(t.start_datetime)), end: ymd(new Date(t.end_datetime)), department: t.department?.name ?? null, assignees: t.assignments.map((a) => a.assignedTo?.full_name).filter(Boolean) })),
    unavailable: unavailRows.map((a) => ({ userId: a.user.userId, userName: a.user.full_name, status: a.status, start: ymd(new Date(a.start_datetime)), end: ymd(new Date(a.end_datetime)) })),
  };
}

// ─── GET /pm/availability?from=&to=&skills= ───────────────────
// Per-day count of active workers who hold ALL the given skills and are
// AVAILABLE (and not on leave/unavailable) — used by the Create Task date picker.
async function getAvailabilityByDay(organisationId, from, to, skillIds = []) {
  const skillFilter = skillIds.length ? { AND: skillIds.map((id) => ({ skills: { some: { skill_id: id } } })) } : {};
  const workers = await prisma.user.findMany({
    where:   { organisationId, is_active: true, user_type: { in: ['PERMANENT_WORKER', 'TEMPORARY_WORKER'] }, ...skillFilter },
    include: { availability: { where: { start_datetime: { lte: to }, end_datetime: { gte: from } } } },
  });
  const total = workers.length;
  const days = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    let available = 0;
    for (const w of workers) {
      const slots = w.availability.filter((a) => new Date(a.start_datetime) <= e && new Date(a.end_datetime) >= s);
      const hasAvail = slots.some((a) => a.status === 'AVAILABLE');
      const hasBlock = slots.some((a) => a.status === 'ON_LEAVE' || a.status === 'UNAVAILABLE');
      if (hasAvail && !hasBlock) available++;
    }
    days.push({ date: ymd(s), available, total });
  }
  return { total, days };
}

module.exports = {
  getTeam, listLeave, decideLeave, listLeaveBalances, updateLeaveBalance, getSubscription, listBilling,
  getOrgInfo, getShiftTemplates, getDepartments, getSkills, getReports, getCalendar, getAvailabilityByDay,
  listTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
};
