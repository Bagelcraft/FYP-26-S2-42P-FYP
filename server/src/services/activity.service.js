const prisma = require('../config/prisma');

// ─────────────────────────────────────────────────────────────────────────────
// Per-tab activity counts that drive the red dot in the sidebar.
//
// Each entry is the number of items on that tab currently needing the user's
// attention. The client remembers how many it last showed the user and only
// raises the dot when the count has grown, so visiting a tab clears it until
// something new actually arrives.
//
// Everything below is scoped to the caller: organisation-level queries filter on
// organisationId, worker-level queries filter on userId. A user can never see a
// count derived from another tenant's data.
// ─────────────────────────────────────────────────────────────────────────────

async function systemAdminBadges() {
  const [registrations, enquiries] = await Promise.all([
    prisma.unregisteredUser.count({ where: { role: 'ORG_ADMIN' } }),
    prisma.contactEnquiry.count({ where: { status: 'OPEN' } }),
  ]);

  return {
    '/admin/organisations': registrations,
    '/admin/enquiries':     enquiries,
  };
}

async function orgAdminBadges(organisationId) {
  const [profileRequests, shiftRequests] = await Promise.all([
    prisma.profileChangeRequest.count({
      where: { status: 'PENDING', user: { organisationId } },
    }),
    prisma.shiftChangeRequest.count({
      where: { status: 'PENDING', user: { organisationId } },
    }),
  ]);

  return {
    '/org-admin/profile-change-requests': profileRequests,
    '/org-admin/shift-change-requests':   shiftRequests,
  };
}

async function managerBadges(organisationId) {
  const [pendingLeave, awaitingApproval] = await Promise.all([
    prisma.leaveRequest.count({
      where: { status: 'PENDING', user: { organisationId } },
    }),
    // Work the team has finished and handed back for the manager to sign off.
    prisma.task.count({
      where: { organisation_id: organisationId, status: 'SUBMITTED' },
    }),
  ]);

  return {
    '/pm/leave': pendingLeave,
    '/pm/tasks': awaitingApproval,
  };
}

async function workerBadges(userId, prefix) {
  const [unacknowledged, openUpdateRequests] = await Promise.all([
    // Assigned but not yet acknowledged — the worker has not opened it.
    prisma.taskAssignment.count({
      where: { assigned_to: userId, task: { status: 'ASSIGNED' } },
    }),
    // A manager has asked this worker for a progress update.
    prisma.taskUpdateRequest.count({
      where: {
        status: 'PENDING',
        task: { assignments: { some: { assigned_to: userId } } },
      },
    }),
  ]);

  return { [`${prefix}/tasks`]: unacknowledged + openUpdateRequests };
}

/**
 * @param {{ userId:number, organisationId:number|null, role:string }} user
 * @returns {Promise<Record<string, number>>} nav path -> outstanding item count
 */
async function getBadges(user) {
  switch (user.role) {
    case 'SYSTEM_ADMIN':
      return systemAdminBadges();
    case 'ORG_ADMIN':
      return user.organisationId ? orgAdminBadges(user.organisationId) : {};
    case 'PROJECT_MANAGER':
      return user.organisationId ? managerBadges(user.organisationId) : {};
    case 'PERMANENT_WORKER':
      return workerBadges(user.userId, '/worker');
    case 'TEMPORARY_WORKER':
      return workerBadges(user.userId, '/temp-worker');
    default:
      return {};
  }
}

module.exports = { getBadges };
