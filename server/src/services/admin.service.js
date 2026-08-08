const prisma = require('../config/prisma');
const { sendRegistrationApprovedEmail } = require('./email.service');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ─── Pending organisation registrations ───────────────────────

async function listPendingRegistrations() {
  return prisma.unregisteredUser.findMany({
    where:   { role: 'ORG_ADMIN' },
    orderBy: { created_at: 'desc' },
    select: {
      marketing_user_id: true,
      full_name:         true,
      email:             true,
      company_name:      true,
      uen:               true,
      position:          true,
      email_verified:    true,
      created_at:        true,
    },
  });
}

// Promote a pending registration into a real Organisation + active ORG_ADMIN user.
// The applicant's chosen password (already bcrypt-hashed at registration) is reused,
// so they can sign in immediately with what they set.
async function approveRegistration(marketingUserId) {
  const pending = await prisma.unregisteredUser.findUnique({
    where: { marketing_user_id: marketingUserId },
  });
  if (!pending) throw makeError('Registration request not found', 404);

  // The applicant must have proved they own the address before we mint an account
  // they would then be unable to sign in to (login refuses unverified emails).
  if (!pending.email_verified) {
    throw makeError('This applicant has not verified their email address yet', 409);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: pending.email } });
  if (existingUser) throw makeError('A user with this email already exists', 409);

  if (pending.uen) {
    const uenTaken = await prisma.organisation.findFirst({ where: { uen: pending.uen } });
    if (uenTaken) throw makeError('An organisation with this UEN is already registered', 409);
  }

  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organisation.create({
      data: {
        name: pending.company_name || pending.full_name || pending.email,
        uen:  pending.uen ?? null,
      },
    });

    const created = await tx.user.create({
      data: {
        organisationId: org.organisation_id,
        full_name:      pending.full_name || pending.email,
        email:          pending.email,
        password_hash:  pending.password,
        user_type:      'ORG_ADMIN',
        is_active:      true,
        email_verified: true,
      },
    });

    await tx.unregisteredUser.delete({ where: { marketing_user_id: marketingUserId } });

    return created;
  });

  // Best-effort courtesy notice — a mail failure must not undo an approved account.
  try {
    await sendRegistrationApprovedEmail({ to: user.email, name: user.full_name });
  } catch (err) {
    console.error('Failed to send approval email:', err.message);
  }

  return sanitizeUser(user);
}

async function rejectRegistration(marketingUserId) {
  const pending = await prisma.unregisteredUser.findUnique({
    where: { marketing_user_id: marketingUserId },
  });
  if (!pending) throw makeError('Registration request not found', 404);

  await prisma.unregisteredUser.delete({ where: { marketing_user_id: marketingUserId } });
}

// ─── Organisations ────────────────────────────────────────────

async function listOrganisations() {
  return prisma.organisation.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      organisation_id: true,
      name:            true,
      uen:             true,
      isActive:        true,
      createdAt:       true,
      _count:          { select: { users: true } },
      activeSubscription: { select: { status: true, amount: true } },
    },
  });
}

async function createOrganisation(data) {
  if (!data.name || !data.name.trim()) throw makeError('Organisation name is required', 400);
  return prisma.organisation.create({ data: { name: data.name.trim() } });
}

async function setOrganisationActive(organisationId, isActive) {
  const org = await prisma.organisation.findUnique({ where: { organisation_id: organisationId } });
  if (!org) throw makeError('Organisation not found', 404);
  return prisma.organisation.update({
    where: { organisation_id: organisationId },
    data:  { isActive },
  });
}

// ─── Audit Logs ───────────────────────────────────────────────

async function getAuditLogs(filters = {}) {
  const limit = Math.min(Number(filters.limit) || 200, 500);

  // NOTE: organisation lifecycle events are deliberately not part of the audit
  // trail — this log covers user and activity events only. Organisation records
  // live on the Organisations page.
  const [users, assignments, attendance, leave] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        userId: true, full_name: true, user_type: true, createdAt: true,
        organisation: { select: { name: true } },
      },
    }),
    prisma.taskAssignment.findMany({
      orderBy: { assigned_at: 'desc' },
      take: limit,
      select: {
        assignment_id: true, assignment_type: true, assigned_at: true,
        assignedTo: { select: { full_name: true } },
        assignedBy: { select: { full_name: true } },
        task:        { select: { title: true, organisation: { select: { name: true } } } },
      },
    }),
    prisma.attendance.findMany({
      orderBy: { clock_in: 'desc' },
      take: limit,
      select: {
        attendance_id: true, clock_in: true,
        user: { select: { full_name: true, organisation: { select: { name: true } } } },
      },
    }),
    prisma.leaveRequest.findMany({
      orderBy: { start_date: 'desc' },
      take: limit,
      select: {
        leave_id: true, leave_type: true, status: true, start_date: true,
        user: { select: { full_name: true, organisation: { select: { name: true } } } },
      },
    }),
  ]);

  const entries = [
    ...users.map((u) => ({
      id:       `user-${u.userId}`,
      action:   u.user_type === 'ORG_ADMIN' ? 'Organisation admin registered' : 'Staff account created',
      user:     u.full_name,
      org:      u.organisation?.name ?? '—',
      category: 'STAFF',
      time:     u.createdAt,
    })),
    ...assignments.map((a) => ({
      id:       `assign-${a.assignment_id}`,
      action:   `Task ${a.assignment_type === 'AUTO' ? 'auto-' : ''}assigned: ${a.task?.title ?? ''}`,
      user:     a.assignedBy?.full_name ?? 'system',
      org:      a.task?.organisation?.name ?? '—',
      category: 'TASK',
      time:     a.assigned_at,
    })),
    ...attendance.map((a) => ({
      id:       `att-${a.attendance_id}`,
      action:   'Employee clocked in',
      user:     a.user?.full_name ?? '—',
      org:      a.user?.organisation?.name ?? '—',
      category: 'AUTH',
      time:     a.clock_in,
    })),
    ...leave.map((l) => ({
      id:       `leave-${l.leave_id}`,
      action:   `${l.leave_type} leave request — ${l.status}`,
      user:     l.user?.full_name ?? '—',
      org:      l.user?.organisation?.name ?? '—',
      category: 'STAFF',
      time:     l.start_date,
    })),
  ];

  entries.sort((a, b) => new Date(b.time) - new Date(a.time));

  const { category, search } = filters;
  return entries
    .filter((e) => !category || category === 'ALL' || e.category === category)
    .filter((e) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return e.action.toLowerCase().includes(q) || e.user.toLowerCase().includes(q) || e.org.toLowerCase().includes(q);
    })
    .slice(0, limit);
}

module.exports = {
  listPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  listOrganisations,
  createOrganisation,
  setOrganisationActive,
  getAuditLogs,
};
