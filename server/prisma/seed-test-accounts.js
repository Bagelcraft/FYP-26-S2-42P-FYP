/**
 * Test-account + test-data seed (Appendix A).
 *
 * Creates the fixed test identities and populates TWO fully-staffed tenants —
 * one of each scheduling model — so both halves of the system can be tested
 * side by side:
 *
 *   Acme   → PROJECT      projects, resource pools, task-driven allocation.
 *                         No roster at all; temporary workers stay dormant
 *                         until a task activates them.
 *   Globex → NON_PROJECT  shift templates + roster; a worker is only eligible
 *                         for a task while rostered on a covering shift.
 *
 * Also removes the legacy standalone demo orgs (TechCorp / BuildTech / LogiCore)
 * so a normally-registered organisation still starts with a clean slate.
 *
 * Accounts (all password: Passw0rd!):
 *   SYSTEM_ADMIN      sysadmin@sta.test
 *   Acme   (PROJECT)  admin@acme.test · pm@acme.test · perm@acme.test · temp@acme.test
 *   Globex (SHIFT)    admin@globex.test · pm@globex.test · perm@globex.test · temp@globex.test
 *
 * Idempotent — safe to re-run.  Run: node prisma/seed-test-accounts.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const PASSWORD = 'Passw0rd!';
const DEMO_ORG_NAMES = ['TechCorp Pte Ltd', 'BuildTech Solutions', 'LogiCore Asia'];

// Test accounts are for LOCAL development only — production (Neon) must stay clean.
// Refuse to seed unless the database host is local, so this can never populate prod.
function assertLocalDatabase() {
  const url = process.env.DATABASE_URL || '';
  const m = url.match(/@([^:/?]+)/);           // host between '@' and ':' or '/'
  const host = m ? m[1] : '';
  const isLocal = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host);
  if (!isLocal && process.env.ALLOW_REMOTE_SEED !== '1') {
    console.error(`\n✋ Refusing to seed TEST data into a non-local database (host: ${host || 'unknown'}).`);
    console.error('   Test accounts are localhost-only so the production site stays clean.');
    console.error('   If you truly intend this, re-run with ALLOW_REMOTE_SEED=1.\n');
    process.exit(1);
  }
}

// Timestamps (task windows, availability) are real local times.
const day = (off, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0); return d; };
// `@db.Date` columns (leave dates, roster dates, project duration) store a bare
// calendar date as UTC midnight. Building them from local midnight would shift
// them a day in any timezone east of UTC, so anchor them in UTC directly.
const dateOnly = (off) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

async function getOrCreateOrg(name, org_type) {
  let org = await prisma.organisation.findFirst({ where: { name } });
  if (!org) org = await prisma.organisation.create({ data: { name, isActive: true, org_type } });
  // Re-runs re-assert the scheduling model in case it was changed by hand.
  if (org.org_type !== org_type) {
    org = await prisma.organisation.update({ where: { organisation_id: org.organisation_id }, data: { org_type } });
  }
  if (!org.active_subscription_id) {
    const sub = await prisma.subscription.create({ data: { organisation_id: org.organisation_id, amount: 9, start_date: new Date('2026-01-01'), end_date: new Date('2027-01-01'), status: 'ACTIVE' } });
    org = await prisma.organisation.update({ where: { organisation_id: org.organisation_id }, data: { active_subscription_id: sub.subscription_id } });
  }
  return org;
}

async function upsertUser({ email, full_name, user_type, password_hash, organisationId = null }) {
  return prisma.user.upsert({
    where:  { email },
    update: { full_name, user_type, password_hash, organisationId, is_active: true },
    create: { email, full_name, user_type, password_hash, organisationId, is_active: true },
  });
}

// Delete a whole organisation and everything that references it / its users.
async function deleteOrgCascade(orgId) {
  const users = await prisma.user.findMany({ where: { organisationId: orgId }, select: { userId: true } });
  const uids = users.map((u) => u.userId);
  const tasks = await prisma.task.findMany({ where: { organisation_id: orgId }, select: { task_id: true } });
  const tids = tasks.map((t) => t.task_id);
  const roles = await prisma.staffRole.findMany({ where: { organisation_id: orgId }, select: { role_id: true } });
  const subs = await prisma.subscription.findMany({ where: { organisation_id: orgId }, select: { subscription_id: true } });
  const del = async (fn) => { try { await fn(); } catch {} };

  await del(() => prisma.allocationHistory.deleteMany({ where: { OR: [{ task_id: { in: tids } }, { user_id: { in: uids } }, { changed_by: { in: uids } }] } }));
  await del(() => prisma.taskUpdateRequest.deleteMany({ where: { OR: [{ task_id: { in: tids } }, { requested_by: { in: uids } }] } }));
  await del(() => prisma.taskAssignment.deleteMany({ where: { OR: [{ task_id: { in: tids } }, { assigned_to: { in: uids } }, { assigned_by: { in: uids } }] } }));
  await del(() => prisma.taskSkill.deleteMany({ where: { task_id: { in: tids } } }));
  await del(() => prisma.task.deleteMany({ where: { organisation_id: orgId } }));
  // Projects come after tasks — a task holds the FK to its project.
  await del(() => prisma.projectResource.deleteMany({ where: { project: { organisation_id: orgId } } }));
  await del(() => prisma.project.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.availability.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.attendance.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.leaveRequest.deleteMany({ where: { OR: [{ user_id: { in: uids } }, { approved_by: { in: uids } }] } }));
  await del(() => prisma.leaveBalance.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.userSkill.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.shiftChangeRequest.deleteMany({ where: { OR: [{ user_id: { in: uids } }, { reviewed_by: { in: uids } }] } }));
  await del(() => prisma.shiftAssignment.deleteMany({ where: { OR: [{ organisation_id: orgId }, { user_id: { in: uids } }] } }));
  await del(() => prisma.profileChangeRequest.deleteMany({ where: { OR: [{ user_id: { in: uids } }, { reviewed_by: { in: uids } }] } }));
  await del(() => prisma.shiftTemplate.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.feedback.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.testimonial.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.roleSkill.deleteMany({ where: { role_id: { in: roles.map((r) => r.role_id) } } }));
  await del(() => prisma.user.updateMany({ where: { organisationId: orgId }, data: { role_id: null } }));
  await del(() => prisma.staffRole.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.department.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.skill.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.user.deleteMany({ where: { organisationId: orgId } }));
  await del(() => prisma.organisation.update({ where: { organisation_id: orgId }, data: { active_subscription_id: null } }));
  await del(() => prisma.billingRecord.deleteMany({ where: { subscription_id: { in: subs.map((s) => s.subscription_id) } } }));
  await del(() => prisma.subscription.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.organisation.delete({ where: { organisation_id: orgId } }));
}

// Wipe a tenant's test data but keep the org + its core login accounts.
async function clearOrgData(orgId, coreEmails) {
  const users = await prisma.user.findMany({ where: { organisationId: orgId }, select: { userId: true } });
  const uids = users.map((u) => u.userId);
  const tasks = await prisma.task.findMany({ where: { organisation_id: orgId }, select: { task_id: true } });
  const tids = tasks.map((t) => t.task_id);
  const roles = await prisma.staffRole.findMany({ where: { organisation_id: orgId }, select: { role_id: true } });
  const del = async (fn) => { try { await fn(); } catch {} };
  await del(() => prisma.allocationHistory.deleteMany({ where: { OR: [{ task_id: { in: tids } }, { user_id: { in: uids } }] } }));
  await del(() => prisma.taskUpdateRequest.deleteMany({ where: { task_id: { in: tids } } }));
  await del(() => prisma.taskAssignment.deleteMany({ where: { task_id: { in: tids } } }));
  await del(() => prisma.taskSkill.deleteMany({ where: { task_id: { in: tids } } }));
  await del(() => prisma.task.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.projectResource.deleteMany({ where: { project: { organisation_id: orgId } } }));
  await del(() => prisma.project.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.availability.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.attendance.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.leaveRequest.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.leaveBalance.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.userSkill.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.shiftChangeRequest.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.shiftAssignment.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.shiftTemplate.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.roleSkill.deleteMany({ where: { role_id: { in: roles.map((r) => r.role_id) } } }));
  await del(() => prisma.user.updateMany({ where: { organisationId: orgId }, data: { role_id: null } }));
  await del(() => prisma.staffRole.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.department.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.skill.deleteMany({ where: { organisation_id: orgId } }));
  // remove seeded extra staff (keep the core accounts)
  await del(() => prisma.user.deleteMany({ where: { organisationId: orgId, email: { notIn: coreEmails } } }));
}

// ─── Acme — PROJECT organisation ──────────────────────────────────────────
//
// Deliberately seeded so every project-mode rule is visible in the UI:
//   · no shift templates or roster at all
//   · temp@acme.test carries nothing → shows as DORMANT but still eligible
//   · both permanent workers are on approved leave on day+3, so the task that
//     day has to fall to a temporary worker (fallbackToTemporary banner)
//   · Dana is NOT in the Harbour Rebuild pool → proves the pool narrows candidates
//   · a second project has no pool at all → open to everyone
async function seedProjectOrgData(orgId, core, password_hash) {
  const year = new Date().getFullYear();

  const mkSkill = (skill_name, cert = false) => prisma.skill.create({ data: { organisation_id: orgId, skill_name, cert_required: cert } });
  const js = await mkSkill('JavaScript'), react = await mkSkill('React'), sql = await mkSkill('SQL');
  const py = await mkSkill('Python'); await mkSkill('UI/UX Design');
  const forklift = await mkSkill('Forklift', true);
  // Held by both permanent and temporary staff — this is the skill that makes the
  // permanent-first / fall-back-to-temporary behaviour observable.
  const safety = await mkSkill('Site Safety');

  const eng = await prisma.department.create({ data: { organisation_id: orgId, name: 'Engineering' } });
  const ops = await prisma.department.create({ data: { organisation_id: orgId, name: 'Operations' } });

  const mkRole = (role_name, department_id, skillIds, max = 40) => prisma.staffRole.create({ data: { organisation_id: orgId, role_name, department_id, max_working_hours: max, requiredSkills: { create: skillIds.map((skill_id) => ({ skill_id })) } } });
  const devRole = await mkRole('Software Developer', eng.department_id, [js.skill_id, react.skill_id]);
  const analystRole = await mkRole('Data Analyst', eng.department_id, [sql.skill_id, py.skill_id]);
  const whRole = await mkRole('Site Operative', ops.department_id, [forklift.skill_id], 30);

  await prisma.user.update({ where: { userId: core.pm.userId }, data: { role_id: devRole.role_id } });
  await prisma.user.update({ where: { userId: core.perm.userId }, data: { role_id: devRole.role_id } });
  await prisma.user.update({ where: { userId: core.temp.userId }, data: { role_id: whRole.role_id } });

  const mkStaff = (email, full_name, user_type, role_id) => prisma.user.create({ data: { organisationId: orgId, email, full_name, user_type, role_id, password_hash, is_active: true } });
  const dana = await mkStaff('acme-dana@acme.test', 'Dana Lee', 'PERMANENT_WORKER', analystRole.role_id);
  const omar = await mkStaff('acme-omar@acme.test', 'Omar Said', 'PERMANENT_WORKER', devRole.role_id);
  const mei  = await mkStaff('acme-mei@acme.test', 'Mei Chen', 'TEMPORARY_WORKER', whRole.role_id);

  const us = (user_id, skill_id) => prisma.userSkill.create({ data: { user_id, skill_id } });
  await us(core.perm.userId, js.skill_id); await us(core.perm.userId, react.skill_id); await us(core.perm.userId, safety.skill_id);
  await us(core.temp.userId, forklift.skill_id); await us(core.temp.userId, safety.skill_id);
  await us(dana.userId, sql.skill_id); await us(dana.userId, py.skill_id);
  await us(omar.userId, react.skill_id); await us(omar.userId, safety.skill_id);
  await us(mei.userId, forklift.skill_id); await us(mei.userId, safety.skill_id);

  const bal = (user_id, aE, aU, mE, mU) => prisma.leaveBalance.createMany({ data: [
    { user_id, leave_type: 'ANNUAL', entitled_days: aE, used_days: aU, year },
    { user_id, leave_type: 'MEDICAL', entitled_days: mE, used_days: mU, year },
  ] });
  await bal(core.perm.userId, 14, 3, 14, 1);
  await bal(dana.userId, 14, 5, 14, 0);
  await bal(omar.userId, 14, 0, 14, 2);

  // Projects — duration, and the resource pool that bounds allocation.
  const harbour = await prisma.project.create({
    data: {
      organisation_id: orgId, manager_id: core.pm.userId, name: 'Harbour Rebuild',
      description: 'Primary site works. Resource pool excludes Dana on purpose.',
      status: 'ACTIVE', start_date: dateOnly(-2), end_date: dateOnly(30),
    },
  });
  await prisma.projectResource.createMany({
    data: [core.perm.userId, core.temp.userId, omar.userId, mei.userId].map((user_id) => ({ project_id: harbour.project_id, user_id })),
  });

  // No pool → anyone in the organisation qualifies, including Dana.
  const depot = await prisma.project.create({
    data: {
      organisation_id: orgId, manager_id: core.pm.userId, name: 'Depot Fit-Out',
      description: 'No resource pool set — open to any qualified worker.',
      status: 'PLANNING', start_date: dateOnly(7), end_date: dateOnly(45),
    },
  });

  // Both permanent Site Safety holders are away on day+3 — the fallback case.
  await prisma.leaveRequest.create({ data: { user_id: core.perm.userId, leave_type: 'ANNUAL', start_date: dateOnly(3), end_date: dateOnly(3), status: 'APPROVED', approved_by: core.pm.userId } });
  await prisma.leaveRequest.create({ data: { user_id: omar.userId, leave_type: 'MEDICAL', start_date: dateOnly(3), end_date: dateOnly(4), status: 'APPROVED', approved_by: core.pm.userId } });
  // Pending requests so the manager's Leave screen has something to action.
  await prisma.leaveRequest.create({ data: { user_id: core.perm.userId, leave_type: 'ANNUAL', start_date: dateOnly(20), end_date: dateOnly(22), status: 'PENDING' } });
  await prisma.leaveRequest.create({ data: { user_id: dana.userId, leave_type: 'MEDICAL', start_date: dateOnly(5), end_date: dateOnly(5), status: 'PENDING' } });

  // An explicit self-marked block, the third kind of blocker.
  await prisma.availability.create({ data: { user_id: dana.userId, start_datetime: day(1, 0), end_datetime: day(1, 23, 59), status: 'UNAVAILABLE' } });

  const mkTask = async (title, dept, projectId, skillIds, status, startOff, endOff, assignTo) => {
    const t = await prisma.task.create({ data: { organisation_id: orgId, department_id: dept, project_id: projectId, created_by: core.pm.userId, required_skill_id: skillIds[0] ?? null, title, status, start_datetime: day(startOff, 9), end_datetime: day(endOff, 17), requiredSkills: { create: skillIds.map((skill_id) => ({ skill_id })) } } });
    if (assignTo) await prisma.taskAssignment.create({ data: { task_id: t.task_id, assigned_to: assignTo, assigned_by: core.pm.userId, assignment_type: 'MANUAL' } });
    return t;
  };

  // Permanent staff free → engine should rank perm@acme.test first.
  await mkTask('Steel frame inspection', ops.department_id, harbour.project_id, [safety.skill_id], 'PENDING', 1, 1, null);
  // Day+3: both permanent holders on approved leave → must fall to a temp.
  await mkTask('Safety walkthrough', ops.department_id, harbour.project_id, [safety.skill_id], 'PENDING', 3, 3, null);
  // Mei is committed here, so she is no longer dormant; temp@acme.test still is.
  await mkTask('Cable pull — bay 2', ops.department_id, harbour.project_id, [safety.skill_id], 'ASSIGNED', 2, 2, mei.userId);
  // Kept to a single day so perm@acme.test stays free for the day+1 task above.
  await mkTask('Deck survey', eng.department_id, harbour.project_id, [react.skill_id], 'IN_PROGRESS', -1, -1, core.perm.userId);
  await mkTask('Foundation sign-off', ops.department_id, harbour.project_id, [forklift.skill_id], 'SUBMITTED', 0, 0, core.temp.userId);
  await mkTask('Site clearance', ops.department_id, harbour.project_id, [], 'COMPLETED', -2, -2, mei.userId);
  // Open-pool project — Dana qualifies here even though she is off Harbour Rebuild.
  await mkTask('Snagging list', eng.department_id, depot.project_id, [sql.skill_id], 'PENDING', 8, 9, null);
  // Standalone: belongs to no project, for the "Standalone" filter on Tasks.
  await mkTask('Update contractor rota', eng.department_id, null, [], 'PENDING', 2, 2, null);
}

// ─── Globex — NON_PROJECT (shift work) organisation ───────────────────────
//
// Here the roster is the source of truth. Seeded to show all three outcomes:
//   · fully covered by a shift        → eligible
//   · only partly covered             → "Only rostered for part of the task window"
//   · not rostered                    → ineligible
// plus an overnight shift, which crosses midnight.
async function seedShiftOrgData(orgId, core, password_hash) {
  const year = new Date().getFullYear();

  const mkSkill = (skill_name) => prisma.skill.create({ data: { organisation_id: orgId, skill_name } });
  const cashier = await mkSkill('Cashier');
  const stock = await mkSkill('Stock Handling');

  const retail = await prisma.department.create({ data: { organisation_id: orgId, name: 'Retail Floor' } });
  const assocRole = await prisma.staffRole.create({ data: { organisation_id: orgId, role_name: 'Store Associate', department_id: retail.department_id, max_working_hours: 40, requiredSkills: { create: [{ skill_id: cashier.skill_id }] } } });

  await prisma.user.update({ where: { userId: core.perm.userId }, data: { role_id: assocRole.role_id } });
  await prisma.user.update({ where: { userId: core.temp.userId }, data: { role_id: assocRole.role_id } });

  const sara = await prisma.user.create({ data: { organisationId: orgId, email: 'globex-sara@globex.test', full_name: 'Sara Ng', user_type: 'PERMANENT_WORKER', role_id: assocRole.role_id, password_hash, is_active: true } });

  const us = (user_id, skill_id) => prisma.userSkill.create({ data: { user_id, skill_id } });
  await us(core.perm.userId, cashier.skill_id); await us(core.perm.userId, stock.skill_id);
  await us(core.temp.userId, cashier.skill_id); await us(core.temp.userId, stock.skill_id);
  await us(sara.userId, cashier.skill_id); await us(sara.userId, stock.skill_id);

  await prisma.leaveBalance.createMany({ data: [
    { user_id: core.perm.userId, leave_type: 'ANNUAL', entitled_days: 14, used_days: 2, year },
    { user_id: core.perm.userId, leave_type: 'MEDICAL', entitled_days: 14, used_days: 0, year },
    { user_id: sara.userId, leave_type: 'ANNUAL', entitled_days: 14, used_days: 0, year },
    { user_id: sara.userId, leave_type: 'MEDICAL', entitled_days: 14, used_days: 1, year },
  ] });

  const mkShift = (name, start_time, end_time) => prisma.shiftTemplate.create({ data: { organisation_id: orgId, name, start_time, end_time } });
  const morning = await mkShift('Morning', '09:00', '17:00');
  const evening = await mkShift('Evening', '13:00', '21:00');
  const night = await mkShift('Night', '22:00', '06:00'); // crosses midnight

  const roster = (user_id, shift_id, off) => prisma.shiftAssignment.create({ data: { organisation_id: orgId, user_id, shift_id, date: dateOnly(off) } });
  await roster(core.perm.userId, morning.shift_id, 0);
  await roster(core.perm.userId, morning.shift_id, 1);
  await roster(core.perm.userId, morning.shift_id, 2);
  await roster(core.temp.userId, evening.shift_id, 0);
  await roster(core.temp.userId, evening.shift_id, 1);
  await roster(sara.userId, morning.shift_id, 1);
  await roster(sara.userId, night.shift_id, 2);

  const mkTask = async (title, skillIds, status, start, end, assignTo) => {
    const t = await prisma.task.create({ data: { organisation_id: orgId, department_id: retail.department_id, created_by: core.pm.userId, required_skill_id: skillIds[0] ?? null, title, status, start_datetime: start, end_datetime: end, requiredSkills: { create: skillIds.map((skill_id) => ({ skill_id })) } } });
    if (assignTo) await prisma.taskAssignment.create({ data: { task_id: t.task_id, assigned_to: assignTo, assigned_by: core.pm.userId, assignment_type: 'MANUAL' } });
    return t;
  };

  // 10:00–16:00 on day+1: Morning staff cover it fully; the Evening temp starts
  // at 13:00, so they come back as only partly rostered.
  await mkTask('Restock aisle 3', [stock.skill_id], 'PENDING', day(1, 10), day(1, 16));
  // 14:00–17:00 on day+1: covered by both Morning and Evening.
  await mkTask('Float count', [cashier.skill_id], 'PENDING', day(1, 14), day(1, 17));
  // Overnight, day+2 23:00 → day+3 02:00: only Sara's Night shift covers this.
  await mkTask('Night shelf reset', [stock.skill_id], 'PENDING', day(2, 23), day(3, 2));
  // Nobody is rostered on day+6 — shows the "not rostered" outcome.
  await mkTask('Quarterly stocktake', [stock.skill_id], 'PENDING', day(6, 9), day(6, 17));
  await mkTask('Price label audit', [cashier.skill_id], 'IN_PROGRESS', day(0, 9), day(0, 17), core.perm.userId);
  await mkTask('Returns processing', [stock.skill_id], 'COMPLETED', day(-2, 9), day(-2, 17), sara.userId);

  await prisma.leaveRequest.create({ data: { user_id: sara.userId, leave_type: 'ANNUAL', start_date: dateOnly(14), end_date: dateOnly(16), status: 'PENDING' } });
}

// Subscription plans + their gated features (matched to a subscription by price).
async function seedPlans() {
  await prisma.planFeature.deleteMany({});
  await prisma.subscriptionPlan.deleteMany({});
  const mk = async (name, price_monthly, price_annual, max_users, features) => {
    const plan = await prisma.subscriptionPlan.create({
      data: { name, description: `${name} plan`, price_monthly, price_annual, max_users, is_active: true },
    });
    await prisma.planFeature.createMany({ data: features.map((f) => ({ plan_id: plan.plan_id, feature_name: f })) });
  };
  // Basic ($9) lacks "Advanced Reports"; Pro ($29) includes it — this is what feature gating checks.
  await mk('Basic', 9, 90, 25, ['Task Management', 'Workforce Scheduling', 'Auto Allocation', 'Basic Reports']);
  await mk('Pro', 29, 290, 100, ['Task Management', 'Workforce Scheduling', 'Auto Allocation', 'Basic Reports', 'Advanced Reports', 'Priority Support']);
}

async function main() {
  assertLocalDatabase();
  const password_hash = await bcrypt.hash(PASSWORD, 10);
  const acme = await getOrCreateOrg('Acme', 'PROJECT');
  const globex = await getOrCreateOrg('Globex', 'NON_PROJECT');

  // Plan catalogue; put Acme on Pro (Advanced Reports enabled), leave Globex on Basic.
  await seedPlans();
  if (acme.active_subscription_id) {
    await prisma.subscription.update({ where: { subscription_id: acme.active_subscription_id }, data: { amount: 29 } });
  }

  await upsertUser({ email: 'sysadmin@sta.test', full_name: 'System Admin', user_type: 'SYSTEM_ADMIN', password_hash });

  const acmeCore = {
    admin: await upsertUser({ email: 'admin@acme.test', full_name: 'Acme Org Admin', user_type: 'ORG_ADMIN', password_hash, organisationId: acme.organisation_id }),
    pm:    await upsertUser({ email: 'pm@acme.test', full_name: 'Acme Project Manager', user_type: 'PROJECT_MANAGER', password_hash, organisationId: acme.organisation_id }),
    perm:  await upsertUser({ email: 'perm@acme.test', full_name: 'Acme Permanent Worker', user_type: 'PERMANENT_WORKER', password_hash, organisationId: acme.organisation_id }),
    temp:  await upsertUser({ email: 'temp@acme.test', full_name: 'Acme Temporary Worker', user_type: 'TEMPORARY_WORKER', password_hash, organisationId: acme.organisation_id }),
  };
  const globexCore = {
    admin: await upsertUser({ email: 'admin@globex.test', full_name: 'Globex Org Admin', user_type: 'ORG_ADMIN', password_hash, organisationId: globex.organisation_id }),
    pm:    await upsertUser({ email: 'pm@globex.test', full_name: 'Globex Shift Manager', user_type: 'PROJECT_MANAGER', password_hash, organisationId: globex.organisation_id }),
    perm:  await upsertUser({ email: 'perm@globex.test', full_name: 'Globex Permanent Worker', user_type: 'PERMANENT_WORKER', password_hash, organisationId: globex.organisation_id }),
    temp:  await upsertUser({ email: 'temp@globex.test', full_name: 'Globex Temporary Worker', user_type: 'TEMPORARY_WORKER', password_hash, organisationId: globex.organisation_id }),
  };

  const acmeEmails = ['admin@acme.test', 'pm@acme.test', 'perm@acme.test', 'temp@acme.test'];
  const globexEmails = ['admin@globex.test', 'pm@globex.test', 'perm@globex.test', 'temp@globex.test'];

  // Remove legacy standalone demo orgs.
  for (const name of DEMO_ORG_NAMES) {
    const org = await prisma.organisation.findFirst({ where: { name } });
    if (org) { await deleteOrgCascade(org.organisation_id); console.log('  removed demo org: ' + name); }
  }

  await clearOrgData(acme.organisation_id, acmeEmails);
  await seedProjectOrgData(acme.organisation_id, acmeCore, password_hash);

  await clearOrgData(globex.organisation_id, globexEmails);
  await seedShiftOrgData(globex.organisation_id, globexCore, password_hash);

  console.log(`✅ Test data seeded (password: ${PASSWORD})`);
  console.log('   Acme   → PROJECT      admin@acme.test · pm@acme.test · perm@acme.test · temp@acme.test');
  console.log('   Globex → NON_PROJECT  admin@globex.test · pm@globex.test · perm@globex.test · temp@globex.test');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
