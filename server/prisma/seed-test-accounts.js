/**
 * Test-account + test-data seed (Appendix A).
 *
 * Creates the fixed test identities and populates the **Acme** tenant with rich
 * demo/test data (skills, departments, roles, staff, tasks, shifts, availability,
 * leave) so the test accounts have something to work with for
 * debugging. Also removes the legacy standalone demo orgs (TechCorp / BuildTech /
 * LogiCore) so the platform behaves like a normal product: a normally-registered
 * organisation starts with a clean slate — only the test accounts see seeded data.
 *
 * Accounts (all password: Passw0rd!):
 *   SYSTEM_ADMIN  sysadmin@sta.test | ORG_ADMIN admin@acme.test | PROJECT_MANAGER pm@acme.test
 *   PERMANENT_WORKER perm@acme.test  | TEMPORARY_WORKER temp@acme.test | ORG_ADMIN admin@globex.test
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

const day = (off, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0); return d; };
const dateOnly = (off) => { const d = new Date(); d.setDate(d.getDate() + off); d.setHours(0, 0, 0, 0); return d; };

async function getOrCreateOrg(name) {
  let org = await prisma.organisation.findFirst({ where: { name } });
  if (!org) org = await prisma.organisation.create({ data: { name, isActive: true } });
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

// Wipe Acme's existing test data (but keep the org + the 6 core accounts).
async function clearAcmeData(orgId, coreEmails) {
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
  await del(() => prisma.availability.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.attendance.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.leaveRequest.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.leaveBalance.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.userSkill.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.shiftAssignment.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.shiftTemplate.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.roleSkill.deleteMany({ where: { role_id: { in: roles.map((r) => r.role_id) } } }));
  await del(() => prisma.user.updateMany({ where: { organisationId: orgId }, data: { role_id: null } }));
  await del(() => prisma.staffRole.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.department.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.skill.deleteMany({ where: { organisation_id: orgId } }));
  // remove seeded extra staff (keep the 6 core accounts)
  await del(() => prisma.user.deleteMany({ where: { organisationId: orgId, email: { notIn: coreEmails } } }));
}

async function seedAcmeData(orgId, core, password_hash) {
  const year = new Date().getFullYear();
  // Skills
  const mkSkill = (skill_name, cert = false) => prisma.skill.create({ data: { organisation_id: orgId, skill_name, cert_required: cert } });
  const js = await mkSkill('JavaScript'), react = await mkSkill('React'), sql = await mkSkill('SQL');
  const py = await mkSkill('Python'), uiux = await mkSkill('UI/UX Design'), forklift = await mkSkill('Forklift', true);
  // Departments
  const eng = await prisma.department.create({ data: { organisation_id: orgId, name: 'Engineering' } });
  const ops = await prisma.department.create({ data: { organisation_id: orgId, name: 'Operations' } });
  // Roles (dept + required skills)
  const mkRole = (role_name, department_id, skillIds, max = 40) => prisma.staffRole.create({ data: { organisation_id: orgId, role_name, department_id, max_working_hours: max, requiredSkills: { create: skillIds.map((skill_id) => ({ skill_id })) } } });
  const devRole = await mkRole('Software Developer', eng.department_id, [js.skill_id, react.skill_id]);
  const analystRole = await mkRole('Data Analyst', eng.department_id, [sql.skill_id, py.skill_id]);
  const whRole = await mkRole('Warehouse Operative', ops.department_id, [forklift.skill_id], 30);

  // Assign roles to the core PM + workers
  await prisma.user.update({ where: { userId: core.pm.userId }, data: { role_id: devRole.role_id } });
  await prisma.user.update({ where: { userId: core.perm.userId }, data: { role_id: devRole.role_id } });
  await prisma.user.update({ where: { userId: core.temp.userId }, data: { role_id: whRole.role_id } });

  // Extra Acme staff (email prefix acme- so re-runs clean them)
  const mkStaff = (email, full_name, user_type, role_id) => prisma.user.create({ data: { organisationId: orgId, email, full_name, user_type, role_id, password_hash, is_active: true } });
  const dana = await mkStaff('acme-dana@acme.test', 'Dana Lee', 'PERMANENT_WORKER', analystRole.role_id);
  const omar = await mkStaff('acme-omar@acme.test', 'Omar Said', 'PERMANENT_WORKER', devRole.role_id);
  const mei = await mkStaff('acme-mei@acme.test', 'Mei Chen', 'TEMPORARY_WORKER', whRole.role_id);

  // User skills
  const us = (user_id, skill_id) => prisma.userSkill.create({ data: { user_id, skill_id } });
  await us(core.perm.userId, js.skill_id); await us(core.perm.userId, react.skill_id);
  await us(core.temp.userId, forklift.skill_id);
  await us(dana.userId, sql.skill_id); await us(dana.userId, py.skill_id);
  await us(omar.userId, react.skill_id);
  await us(mei.userId, forklift.skill_id);

  // Leave balances (permanent workers)
  const bal = (user_id, aE, aU, mE, mU) => prisma.leaveBalance.createMany({ data: [
    { user_id, leave_type: 'ANNUAL', entitled_days: aE, used_days: aU, year },
    { user_id, leave_type: 'MEDICAL', entitled_days: mE, used_days: mU, year },
  ] });
  await bal(core.perm.userId, 14, 3, 14, 1);
  await bal(dana.userId, 14, 5, 14, 0);
  await bal(omar.userId, 14, 0, 14, 2);

  // Availability (next 5 days, workers)
  for (const uid of [core.perm.userId, core.temp.userId, dana.userId, omar.userId, mei.userId]) {
    for (let d = 0; d < 5; d++) {
      await prisma.availability.create({ data: { user_id: uid, start_datetime: day(d + 1, 9), end_datetime: day(d + 1, 18), status: 'AVAILABLE' } });
    }
  }

  // Shift templates + rostered assignments (so the calendar shows "on shift")
  const morning = await prisma.shiftTemplate.create({ data: { organisation_id: orgId, name: 'Morning', start_time: '09:00', end_time: '17:00' } });
  const evening = await prisma.shiftTemplate.create({ data: { organisation_id: orgId, name: 'Evening', start_time: '13:00', end_time: '21:00' } });
  const roster = (user_id, shift_id, off) => prisma.shiftAssignment.create({ data: { organisation_id: orgId, user_id, shift_id, date: dateOnly(off) } });
  await roster(core.perm.userId, morning.shift_id, 0); await roster(core.perm.userId, morning.shift_id, 1);
  await roster(core.temp.userId, evening.shift_id, 0); await roster(mei.userId, morning.shift_id, 1);
  await roster(dana.userId, morning.shift_id, 2);

  // Tasks in a range of statuses (created by the PM)
  const mkTask = async (title, dept, skillIds, status, startOff, endOff, assignTo) => {
    const t = await prisma.task.create({ data: { organisation_id: orgId, department_id: dept, created_by: core.pm.userId, required_skill_id: skillIds[0] ?? null, title, status, start_datetime: day(startOff, 9), end_datetime: day(endOff, 17), requiredSkills: { create: skillIds.map((skill_id) => ({ skill_id })) } } });
    if (assignTo) await prisma.taskAssignment.create({ data: { task_id: t.task_id, assigned_to: assignTo, assigned_by: core.pm.userId, assignment_type: 'MANUAL' } });
    return t;
  };
  await mkTask('Build Login API', eng.department_id, [js.skill_id], 'ASSIGNED', 1, 1, core.perm.userId);
  await mkTask('Dashboard UI Redesign', eng.department_id, [react.skill_id], 'PENDING', 2, 4, null);
  await mkTask('DB Performance Review', eng.department_id, [sql.skill_id], 'IN_PROGRESS', -1, 1, dana.userId);
  await mkTask('Warehouse Audit', ops.department_id, [forklift.skill_id], 'SUBMITTED', 0, 0, core.temp.userId);
  await mkTask('Monthly Stocktake', ops.department_id, [forklift.skill_id], 'COMPLETED', -3, -3, core.temp.userId);

  // Leave requests (pending — show up on the manager dashboard for approval)
  await prisma.leaveRequest.create({ data: { user_id: core.perm.userId, leave_type: 'ANNUAL', start_date: dateOnly(10), end_date: dateOnly(12), status: 'PENDING' } });
  await prisma.leaveRequest.create({ data: { user_id: dana.userId, leave_type: 'MEDICAL', start_date: dateOnly(5), end_date: dateOnly(5), status: 'PENDING' } });
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
  const acme = await getOrCreateOrg('Acme');
  const globex = await getOrCreateOrg('Globex');

  // Plan catalogue; put Acme on Pro (Advanced Reports enabled), leave Globex on Basic.
  await seedPlans();
  if (acme.active_subscription_id) {
    await prisma.subscription.update({ where: { subscription_id: acme.active_subscription_id }, data: { amount: 29 } });
  }

  const core = {
    admin: await upsertUser({ email: 'admin@acme.test', full_name: 'Acme Org Admin', user_type: 'ORG_ADMIN', password_hash, organisationId: acme.organisation_id }),
    pm:    await upsertUser({ email: 'pm@acme.test', full_name: 'Acme Project Manager', user_type: 'PROJECT_MANAGER', password_hash, organisationId: acme.organisation_id }),
    perm:  await upsertUser({ email: 'perm@acme.test', full_name: 'Acme Permanent Worker', user_type: 'PERMANENT_WORKER', password_hash, organisationId: acme.organisation_id }),
    temp:  await upsertUser({ email: 'temp@acme.test', full_name: 'Acme Temporary Worker', user_type: 'TEMPORARY_WORKER', password_hash, organisationId: acme.organisation_id }),
  };
  await upsertUser({ email: 'sysadmin@sta.test', full_name: 'System Admin', user_type: 'SYSTEM_ADMIN', password_hash });
  await upsertUser({ email: 'admin@globex.test', full_name: 'Globex Org Admin', user_type: 'ORG_ADMIN', password_hash, organisationId: globex.organisation_id });

  const coreEmails = ['admin@acme.test', 'pm@acme.test', 'perm@acme.test', 'temp@acme.test'];

  // Remove legacy standalone demo orgs.
  for (const name of DEMO_ORG_NAMES) {
    const org = await prisma.organisation.findFirst({ where: { name } });
    if (org) { await deleteOrgCascade(org.organisation_id); console.log('  removed demo org: ' + name); }
  }

  // Repopulate Acme's test data.
  await clearAcmeData(acme.organisation_id, coreEmails);
  await seedAcmeData(acme.organisation_id, core, password_hash);

  console.log('✅ Test accounts + Acme test data seeded (password: ' + PASSWORD + '). Demo orgs removed.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
