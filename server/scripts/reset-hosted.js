/**
 * FULL RESET of an environment's operational data, then a clean rebuild:
 *
 *   · one SYSTEM_ADMIN account
 *   · one PROJECT organisation      (projects, resource pools, no roster)
 *   · one NON_PROJECT organisation  (shift templates + roster)
 *
 * DESTRUCTIVE. Every organisation, user, task, project, roster entry, leave
 * record, enquiry and pending registration is deleted — not just seeded test
 * data. Marketing content (LandingContent / LandingFeature) is preserved, since
 * it is site copy rather than tenant data; pass --wipe-marketing to clear the
 * public testimonials too.
 *
 *   node scripts/reset-hosted.js --dry-run     # inventory only, changes nothing
 *   node scripts/reset-hosted.js --confirm     # perform the reset
 *
 * Against a non-local database --confirm is not enough; ALLOW_REMOTE_RESET=1
 * must also be set, so a stray paste of a production URL cannot wipe a live site.
 *
 * Credentials are overridable:
 *   SYSADMIN_EMAIL, SYSADMIN_PASSWORD, STAFF_PASSWORD
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { printAccounts } = require('./list-accounts');

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const confirmed = args.includes('--confirm');
const wipeMarketing = args.includes('--wipe-marketing');

const SYSADMIN_EMAIL = process.env.SYSADMIN_EMAIL || 'sysadmin@smarttask.app';
const SYSADMIN_PASSWORD = process.env.SYSADMIN_PASSWORD || 'SmartTask#2026';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'SmartTask#2026';

// Blank tenants, one org admin each. A spread of both scheduling models so the
// empty state of each can be walked through from scratch.
const FRESH_ORGS = [
  { name: 'Harborline Logistics', uen: '202033445H', org_type: 'PROJECT',     adminEmail: 'admin@harborline.app', adminName: 'Nadia Rahim' },
  { name: 'Cedar Grove Care',     uen: '202155667C', org_type: 'NON_PROJECT', adminEmail: 'admin@cedargrove.app', adminName: 'Wei Ling Koh' },
  { name: 'Vantage Media',        uen: '202277889V', org_type: 'PROJECT',     adminEmail: 'admin@vantage.app',    adminName: 'Tomas Silva' },
];

// Timestamps are real local times; `@db.Date` columns hold a bare calendar date
// as UTC midnight, so they are built in UTC to avoid shifting a day.
const day = (off, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0); return d; };
const dateOnly = (off) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

// Offsets (relative to today) of the recent weekdays that fall inside the current
// calendar month, most recent first.
//
// The timesheet opens on the current month, so attendance seeded into last month
// would leave it looking empty on a demo run early in a month. Clamping to the
// 1st keeps every generated record on the sheet the presenter actually opens.
function recentWeekdayOffsets(count) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const offsets = [];
  for (let back = 1; offsets.length < count && back <= 31; back += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - back);
    if (d < monthStart) break;
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // weekends
    offsets.push(-back);
  }
  return offsets;
}

function isLocalDatabase() {
  const m = (process.env.DATABASE_URL || '').match(/@([^:/?]+)/);
  return ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(m ? m[1] : '');
}

function describeTarget() {
  const url = process.env.DATABASE_URL || '';
  const host = (url.match(/@([^:/?]+)/) || [])[1] || 'unknown';
  const name = (url.match(/\/([^/?]+)(\?|$)/) || [])[1] || 'unknown';
  return { host, name };
}

async function inventory() {
  const [orgs, users, tasks, projects, rosters, unreg, enquiries] = await Promise.all([
    prisma.organisation.count(), prisma.user.count(), prisma.task.count(),
    prisma.project.count(), prisma.shiftAssignment.count(),
    prisma.unregisteredUser.count(), prisma.contactEnquiry.count(),
  ]);
  return { orgs, users, tasks, projects, rosters, unreg, enquiries };
}

// Deletes run child-to-parent. Organisation.active_subscription_id and
// Subscription.organisation_id reference each other, so the link is broken
// before subscriptions go.
async function wipe() {
  await prisma.allocationHistory.deleteMany({});
  await prisma.taskUpdateRequest.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.taskSkill.deleteMany({});
  await prisma.task.deleteMany({});

  await prisma.projectResource.deleteMany({});
  await prisma.project.deleteMany({});

  await prisma.shiftChangeRequest.deleteMany({});
  await prisma.shiftAssignment.deleteMany({});
  await prisma.shiftTemplate.deleteMany({});

  await prisma.availability.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.userSkill.deleteMany({});
  await prisma.roleSkill.deleteMany({});
  await prisma.profileChangeRequest.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.testimonial.deleteMany({});

  await prisma.organisation.updateMany({ data: { active_subscription_id: null } });
  await prisma.billingRecord.deleteMany({});
  await prisma.subscription.deleteMany({});

  await prisma.unregisteredUser.deleteMany({});
  await prisma.contactEnquiry.deleteMany({});

  await prisma.user.deleteMany({});
  await prisma.staffRole.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.organisation.deleteMany({});

  await prisma.planFeature.deleteMany({});
  await prisma.subscriptionPlan.deleteMany({});

  if (wipeMarketing) await prisma.landingTestimonial.deleteMany({});
}

// SmartTask sells one tier, so the seed creates exactly one — matching
// scripts/normalise-subscriptions.js and the "One plan. Full access." copy on the
// landing page. Seeding Basic/Pro side by side is what left organisations sitting
// on different prices with nothing to reconcile them.
//
// Every feature name used by requireFeature() must appear here, or that route
// 403s for everyone.
const PLAN_NAME = process.env.PLAN_NAME || 'Standard';
const PLAN_PRICE = Number(process.env.PLAN_PRICE || 9);
const PLAN_PRICE_ANNUAL = Number(process.env.PLAN_PRICE_ANNUAL || PLAN_PRICE * 10);
const PLAN_FEATURES = [
  'Task Management',
  'Workforce Scheduling',
  'Auto Allocation',
  'Basic Reports',
  'Advanced Reports',
  'Priority Support',
];

async function createPlans() {
  const plan = await prisma.subscriptionPlan.create({
    data: {
      name:          PLAN_NAME,
      description:   `${PLAN_NAME} plan`,
      price_monthly: PLAN_PRICE,
      price_annual:  PLAN_PRICE_ANNUAL,
      max_users:     null,
      is_active:     true,
    },
  });
  await prisma.planFeature.createMany({
    data: PLAN_FEATURES.map((f) => ({ plan_id: plan.plan_id, feature_name: f })),
  });
  return plan;
}

async function createOrg({ name, uen, org_type, amount = PLAN_PRICE }) {
  const org = await prisma.organisation.create({ data: { name, uen, org_type, isActive: true } });
  const sub = await prisma.subscription.create({
    data: {
      organisation_id: org.organisation_id, amount,
      start_date: dateOnly(-30), end_date: dateOnly(335), status: 'ACTIVE',
    },
  });
  await prisma.billingRecord.create({
    data: { subscription_id: sub.subscription_id, amount, billing_date: dateOnly(-30), status: 'PAID' },
  });
  return prisma.organisation.update({
    where: { organisation_id: org.organisation_id },
    data: { active_subscription_id: sub.subscription_id },
  });
}

// A tenant exactly as admin.service.approveRegistration leaves it: an
// organisation, one ORG_ADMIN, an active subscription on the single tier, and
// nothing else — no departments, skills, roles, staff, tasks or shifts. Use these
// to exercise empty states and first-run onboarding.
//
// The subscription matters: approval provisions one, so a seeded tenant without
// it is not a fresh tenant but a broken one — its Subscription page reads "No
// active subscription" and every requireFeature() route 403s, because gating
// resolves a plan by matching the subscription amount.
async function createFreshOrg({ name, uen, org_type, adminEmail, adminName }, password_hash) {
  const org = await createOrg({ name, uen, org_type });
  const admin = await prisma.user.create({
    data: {
      organisationId: org.organisation_id,
      email: adminEmail,
      full_name: adminName,
      user_type: 'ORG_ADMIN',
      password_hash,
      is_active: true,
      email_verified: true,
    },
  });
  return { org, admin };
}

const mkUser = (organisationId, email, full_name, user_type, password_hash, role_id = null) =>
  prisma.user.create({
    data: {
      organisationId, email, full_name, user_type, role_id, password_hash,
      is_active: true, email_verified: true, join_date: dateOnly(-60),
    },
  });

// ─── Project-based tenant ─────────────────────────────────────────────────
// Seeded so each project-mode rule is visible: a pool that excludes someone,
// a second project with no pool, a dormant temp, and a day where every
// permanent worker is on leave so the work must fall to a temporary worker.
async function buildProjectOrg(hash) {
  const org = await createOrg({ name: 'Meridian Projects', uen: '201811223M', org_type: 'PROJECT' });
  const oid = org.organisation_id;
  const year = new Date().getFullYear();

  const mkSkill = (skill_name, cert = false) => prisma.skill.create({ data: { organisation_id: oid, skill_name, cert_required: cert } });
  const safety = await mkSkill('Site Safety');
  const structural = await mkSkill('Structural');
  const electrical = await mkSkill('Electrical', true);
  const surveying = await mkSkill('Surveying');

  const eng = await prisma.department.create({ data: { organisation_id: oid, name: 'Engineering' } });
  const site = await prisma.department.create({ data: { organisation_id: oid, name: 'Site Works' } });

  const mkRole = (role_name, department_id, skillIds, max) => prisma.staffRole.create({
    data: { organisation_id: oid, role_name, department_id, max_working_hours: max, requiredSkills: { create: skillIds.map((skill_id) => ({ skill_id })) } },
  });
  const engineerRole = await mkRole('Site Engineer', eng.department_id, [structural.skill_id], 40);
  const technicianRole = await mkRole('Technician', site.department_id, [safety.skill_id], 40);
  const contractorRole = await mkRole('Contractor', site.department_id, [safety.skill_id], 30);

  const admin = await mkUser(oid, 'admin@meridian.app', 'Priya Menon', 'ORG_ADMIN', hash);
  const pm = await mkUser(oid, 'pm@meridian.app', 'Daniel Ortiz', 'PROJECT_MANAGER', hash, engineerRole.role_id);
  const alex = await mkUser(oid, 'alex@meridian.app', 'Alex Tan', 'PERMANENT_WORKER', hash, technicianRole.role_id);
  const jordan = await mkUser(oid, 'jordan@meridian.app', 'Jordan Wee', 'PERMANENT_WORKER', hash, engineerRole.role_id);
  const casey = await mkUser(oid, 'casey@meridian.app', 'Casey Lim', 'TEMPORARY_WORKER', hash, contractorRole.role_id);
  const riley = await mkUser(oid, 'riley@meridian.app', 'Riley Fernandez', 'TEMPORARY_WORKER', hash, contractorRole.role_id);

  const us = (user_id, skill_id) => prisma.userSkill.create({ data: { user_id, skill_id } });
  await us(alex.userId, safety.skill_id); await us(alex.userId, structural.skill_id);
  await us(jordan.userId, safety.skill_id); await us(jordan.userId, surveying.skill_id);
  await us(casey.userId, safety.skill_id); await us(casey.userId, electrical.skill_id);
  await us(riley.userId, safety.skill_id);

  const bal = (user_id, aU, mU) => prisma.leaveBalance.createMany({ data: [
    { user_id, leave_type: 'ANNUAL', entitled_days: 14, used_days: aU, year },
    { user_id, leave_type: 'MEDICAL', entitled_days: 14, used_days: mU, year },
  ] });
  await bal(alex.userId, 2, 1); await bal(jordan.userId, 4, 0);

  const bridge = await prisma.project.create({
    data: {
      organisation_id: oid, manager_id: pm.userId, name: 'Riverside Bridge',
      description: 'Main site works. Riley is deliberately left out of the resource pool.',
      status: 'ACTIVE', start_date: dateOnly(-3), end_date: dateOnly(45),
    },
  });
  await prisma.projectResource.createMany({
    data: [alex.userId, jordan.userId, casey.userId].map((user_id) => ({ project_id: bridge.project_id, user_id })),
  });

  const depot = await prisma.project.create({
    data: {
      organisation_id: oid, manager_id: pm.userId, name: 'Depot Extension',
      description: 'No resource pool set, so any qualified worker can be allocated.',
      status: 'PLANNING', start_date: dateOnly(14), end_date: dateOnly(60),
    },
  });

  // Every permanent Site Safety holder is away on day+4.
  await prisma.leaveRequest.create({ data: { user_id: alex.userId, leave_type: 'ANNUAL', start_date: dateOnly(4), end_date: dateOnly(4), status: 'APPROVED', approved_by: pm.userId } });
  await prisma.leaveRequest.create({ data: { user_id: jordan.userId, leave_type: 'MEDICAL', start_date: dateOnly(4), end_date: dateOnly(5), status: 'APPROVED', approved_by: pm.userId } });
  await prisma.leaveRequest.create({ data: { user_id: alex.userId, leave_type: 'ANNUAL', start_date: dateOnly(21), end_date: dateOnly(23), status: 'PENDING' } });

  // A self-marked block — the third kind of blocker alongside leave and tasks.
  await prisma.availability.create({ data: { user_id: jordan.userId, start_datetime: day(2, 0), end_datetime: day(2, 23, 59), status: 'UNAVAILABLE' } });

  const mkTask = async (title, dept, projectId, skillIds, status, s, e, assignTo) => {
    const t = await prisma.task.create({
      data: {
        organisation_id: oid, department_id: dept, project_id: projectId, created_by: pm.userId,
        required_skill_id: skillIds[0] ?? null, title, status,
        start_datetime: day(s, 9), end_datetime: day(e, 17),
        requiredSkills: { create: skillIds.map((skill_id) => ({ skill_id })) },
      },
    });
    if (assignTo) await prisma.taskAssignment.create({ data: { task_id: t.task_id, assigned_to: assignTo, assigned_by: pm.userId, assignment_type: 'MANUAL' } });
    return t;
  };

  await mkTask('Pier reinforcement check', site.department_id, bridge.project_id, [safety.skill_id], 'PENDING', 1, 1, null);
  await mkTask('Safety walkthrough', site.department_id, bridge.project_id, [safety.skill_id], 'PENDING', 4, 4, null);
  await mkTask('Deck cabling', site.department_id, bridge.project_id, [safety.skill_id], 'ASSIGNED', 3, 3, casey.userId);
  await mkTask('Span survey', eng.department_id, bridge.project_id, [surveying.skill_id], 'IN_PROGRESS', -1, -1, jordan.userId);
  await mkTask('Abutment sign-off', site.department_id, bridge.project_id, [structural.skill_id], 'SUBMITTED', 0, 0, alex.userId);
  await mkTask('Site clearance', site.department_id, bridge.project_id, [], 'COMPLETED', -3, -3, casey.userId);
  await mkTask('Load calculations', eng.department_id, depot.project_id, [structural.skill_id], 'PENDING', 15, 16, null);
  await mkTask('Update subcontractor list', eng.department_id, null, [], 'PENDING', 2, 2, null);

  // ── Delivered work, for the project-based timesheet ──
  //
  // A project org's timesheet counts completed tasks and groups them by project,
  // so it needs work finished across *more than one* project to show a breakdown
  // worth looking at — a single bar at 100% demonstrates nothing. One task is
  // left deliberately project-less so the "Standalone" row appears too.
  //
  // Spread over the past fortnight because the sheet credits a task to the month
  // it finished in, and the demo opens on the current month.
  await mkTask('Bearing pad inspection', site.department_id, bridge.project_id, [], 'COMPLETED', -11, -11, alex.userId);
  await mkTask('Drainage survey',        eng.department_id,  bridge.project_id, [], 'COMPLETED', -8,  -7,  jordan.userId);
  await mkTask('Depot slab pour',        site.department_id, depot.project_id,  [], 'COMPLETED', -6,  -6,  alex.userId);
  await mkTask('Depot fencing',          site.department_id, depot.project_id,  [], 'COMPLETED', -5,  -5,  jordan.userId);
  await mkTask('Archive site photos',    eng.department_id,  null,              [], 'COMPLETED', -2,  -2,  alex.userId);
  // Riley is the temporary worker — their timesheet needs its own delivered work.
  await mkTask('Temporary fencing hire', site.department_id, depot.project_id,  [], 'COMPLETED', -4,  -4,  riley.userId);

  return { org, admin, pm, staff: [alex, jordan, casey, riley] };
}

// ─── Shift-based tenant ───────────────────────────────────────────────────
// The roster is the source of truth here, so the tasks below cover full,
// partial and absent shift coverage, including one crossing midnight.
async function buildShiftOrg(hash) {
  const org = await createOrg({ name: 'Northgate Retail', uen: '201944556N', org_type: 'NON_PROJECT' });
  const oid = org.organisation_id;
  const year = new Date().getFullYear();

  const cashier = await prisma.skill.create({ data: { organisation_id: oid, skill_name: 'Cashier' } });
  const stock = await prisma.skill.create({ data: { organisation_id: oid, skill_name: 'Stock Handling' } });

  const floor = await prisma.department.create({ data: { organisation_id: oid, name: 'Store Floor' } });
  const assocRole = await prisma.staffRole.create({
    data: { organisation_id: oid, role_name: 'Store Associate', department_id: floor.department_id, max_working_hours: 40, requiredSkills: { create: [{ skill_id: cashier.skill_id }] } },
  });

  const admin = await mkUser(oid, 'admin@northgate.app', 'Grace Lau', 'ORG_ADMIN', hash);
  const pm = await mkUser(oid, 'pm@northgate.app', 'Marcus Hill', 'PROJECT_MANAGER', hash, assocRole.role_id);
  const sam = await mkUser(oid, 'sam@northgate.app', 'Sam Rahman', 'PERMANENT_WORKER', hash, assocRole.role_id);
  const taylor = await mkUser(oid, 'taylor@northgate.app', 'Taylor Ng', 'PERMANENT_WORKER', hash, assocRole.role_id);
  const morgan = await mkUser(oid, 'morgan@northgate.app', 'Morgan Yeo', 'TEMPORARY_WORKER', hash, assocRole.role_id);

  const us = (user_id, skill_id) => prisma.userSkill.create({ data: { user_id, skill_id } });
  for (const u of [sam, taylor, morgan]) { await us(u.userId, cashier.skill_id); await us(u.userId, stock.skill_id); }

  await prisma.leaveBalance.createMany({ data: [
    { user_id: sam.userId, leave_type: 'ANNUAL', entitled_days: 14, used_days: 3, year },
    { user_id: sam.userId, leave_type: 'MEDICAL', entitled_days: 14, used_days: 0, year },
    { user_id: taylor.userId, leave_type: 'ANNUAL', entitled_days: 14, used_days: 0, year },
    { user_id: taylor.userId, leave_type: 'MEDICAL', entitled_days: 14, used_days: 2, year },
  ] });

  const mkShift = (name, start_time, end_time) => prisma.shiftTemplate.create({ data: { organisation_id: oid, name, start_time, end_time } });
  const morning = await mkShift('Morning', '09:00', '17:00');
  const evening = await mkShift('Evening', '13:00', '21:00');
  const night = await mkShift('Night', '22:00', '06:00'); // crosses midnight

  const roster = (user_id, shift_id, off) => prisma.shiftAssignment.create({ data: { organisation_id: oid, user_id, shift_id, date: dateOnly(off) } });
  for (const off of [0, 1, 2, 3]) await roster(sam.userId, morning.shift_id, off);
  await roster(taylor.userId, morning.shift_id, 1);
  await roster(taylor.userId, night.shift_id, 2);
  await roster(morgan.userId, evening.shift_id, 0);
  await roster(morgan.userId, evening.shift_id, 1);

  const mkTask = async (title, skillIds, status, start, end, assignTo) => {
    const t = await prisma.task.create({
      data: {
        organisation_id: oid, department_id: floor.department_id, created_by: pm.userId,
        required_skill_id: skillIds[0] ?? null, title, status,
        start_datetime: start, end_datetime: end,
        requiredSkills: { create: skillIds.map((skill_id) => ({ skill_id })) },
      },
    });
    if (assignTo) await prisma.taskAssignment.create({ data: { task_id: t.task_id, assigned_to: assignTo, assigned_by: pm.userId, assignment_type: 'MANUAL' } });
    return t;
  };

  // Morning staff cover this fully; the Evening temp only overlaps part of it.
  await mkTask('Restock aisle 3', [stock.skill_id], 'PENDING', day(1, 10), day(1, 16));
  // Inside both Morning and Evening.
  await mkTask('Till float count', [cashier.skill_id], 'PENDING', day(1, 14), day(1, 17));
  // Crosses midnight — only the Night shift covers it.
  await mkTask('Night shelf reset', [stock.skill_id], 'PENDING', day(2, 23), day(3, 2));
  // Nobody is rostered that far out.
  await mkTask('Quarterly stocktake', [stock.skill_id], 'PENDING', day(9, 9), day(9, 17));
  await mkTask('Price label audit', [cashier.skill_id], 'IN_PROGRESS', day(0, 9), day(0, 17), sam.userId);
  await mkTask('Returns processing', [stock.skill_id], 'COMPLETED', day(-2, 9), day(-2, 17), taylor.userId);

  // Completed work spread across the month so the SHIFT timesheet has a "Tasks
  // Completed" list to show, not just hours. Credited by end date, which is what
  // the timesheet groups on.
  await mkTask('Weekly shelf audit',   [stock.skill_id],   'COMPLETED', day(-9, 9), day(-9, 17), sam.userId);
  await mkTask('Cash drawer reconcile', [cashier.skill_id], 'COMPLETED', day(-6, 9), day(-6, 17), morgan.userId);
  await mkTask('Backroom reorganise',  [stock.skill_id],   'COMPLETED', day(-4, 9), day(-4, 17), sam.userId);

  await prisma.leaveRequest.create({ data: { user_id: taylor.userId, leave_type: 'ANNUAL', start_date: dateOnly(12), end_date: dateOnly(14), status: 'PENDING' } });

  // ── Blockers, so the Create Task availability strip is not uniformly green ──
  //
  // A shift-based organisation needs these as much as a project-based one: the
  // strip counts free staff, and with nothing to block it every day reads the
  // same and the feature demos as if it does nothing. Mirrors the three blocker
  // kinds the allocation engine recognises — approved leave, a self-marked
  // block, and a committed task.
  await prisma.leaveRequest.create({ data: { user_id: morgan.userId, leave_type: 'ANNUAL', start_date: dateOnly(3), end_date: dateOnly(4), status: 'APPROVED', approved_by: pm.userId } });
  await prisma.availability.create({ data: { user_id: sam.userId, start_datetime: day(5, 0), end_datetime: day(5, 23, 59), status: 'UNAVAILABLE' } });

  // ── Attendance, so the shift timesheet shows real hours ──
  //
  // Clock-in/out is the half of the timesheet only a shift-based organisation
  // has. Without seeded sessions the sheet opens on 0 days / 0h and the whole
  // SHIFT mode looks unimplemented.
  //
  // Hours are computed the same way clockOut does it (difference in ms, 2dp) so
  // seeded rows are indistinguishable from ones a worker created.
  const clockedSession = async (user_id, off, startH, endH) => {
    const clockIn = day(off, startH, 0);
    const clockOut = day(off, endH, 0);
    return prisma.attendance.create({
      data: {
        user_id,
        clock_in: clockIn,
        clock_out: clockOut,
        working_hours: Math.round(((clockOut - clockIn) / 3600000) * 100) / 100,
      },
    });
  };

  const weekdays = recentWeekdayOffsets(10);
  for (const off of weekdays) {
    // Sam works Morning most days; a couple of short days keep the average honest.
    await clockedSession(sam.userId, off, 9, off % 4 === 0 ? 13 : 17);
    // Morgan is Evening, and only some days — a temp does not work a full week.
    if (off % 2 === 0) await clockedSession(morgan.userId, off, 13, 21);
  }
  // Taylor is mid-shift right now: an open session, so the sheet shows "Clocked
  // in at …" and the Clock Out button rather than only closed history.
  await prisma.attendance.create({ data: { user_id: taylor.userId, clock_in: day(0, 9), clock_out: null, working_hours: null } });

  return { org, admin, pm, staff: [sam, taylor, morgan] };
}

async function main() {
  const target = describeTarget();
  const local = isLocalDatabase();

  console.log(`\nTarget database: ${target.name} @ ${target.host}  (${local ? 'local' : 'REMOTE'})`);

  // Both gates are checked before the database is touched at all, so a mistyped
  // or pasted-in URL is refused on the spot rather than part-way through.
  if (!dryRun) {
    if (!confirmed) {
      console.error('\n✋ Refusing to run without --confirm. Re-run with --dry-run to preview.');
      process.exit(1);
    }
    if (!local && process.env.ALLOW_REMOTE_RESET !== '1') {
      console.error(`\n✋ ${target.host} is not a local database.`);
      console.error('   Re-run with ALLOW_REMOTE_RESET=1 if you really mean to wipe it.\n');
      process.exit(1);
    }
  }

  let before;
  try {
    before = await inventory();
  } catch (err) {
    console.error(`\n✋ Could not reach ${target.name} @ ${target.host}.`);
    console.error(`   ${err.message.split('\n')[0]}`);
    console.error('   Check DATABASE_URL — for Neon use the direct endpoint, not the -pooler one.\n');
    process.exit(1);
  }
  console.log('Currently holds:', JSON.stringify(before));

  if (dryRun) {
    console.log('\n[dry run] Would delete every row above, then create:');
    console.log(`  · SYSTEM_ADMIN  ${SYSADMIN_EMAIL}`);
    console.log('  · Meridian Projects  (PROJECT)      6 accounts, fully populated');
    console.log('  · Northgate Retail   (NON_PROJECT)  5 accounts, fully populated');
    for (const f of FRESH_ORGS) {
      console.log(`  · ${f.name.padEnd(21)}(${f.org_type === 'PROJECT' ? 'PROJECT' : 'NON_PROJECT'})  org admin only, empty`);
    }
    console.log(`  · Marketing content ${wipeMarketing ? 'INCLUDING public testimonials' : 'preserved'}`);
    return;
  }

  console.log('\nWiping…');
  await wipe();

  console.log('Rebuilding…');
  const sysHash = await bcrypt.hash(SYSADMIN_PASSWORD, 10);
  const staffHash = await bcrypt.hash(STAFF_PASSWORD, 10);

  await createPlans();
  await prisma.user.create({
    data: {
      email: SYSADMIN_EMAIL, full_name: 'System Administrator', user_type: 'SYSTEM_ADMIN',
      password_hash: sysHash, is_active: true, email_verified: true, organisationId: null,
    },
  });
  const meridian = await buildProjectOrg(staffHash);
  const northgate = await buildShiftOrg(staffHash);

  // Freshly-approved tenants — org admin only, clean slate.
  for (const fresh of FRESH_ORGS) await createFreshOrg(fresh, staffHash);

  const after = await inventory();
  console.log('\n✅ Reset complete.', JSON.stringify(after));

  await printAccounts(prisma);

  console.log('  PASSWORDS');
  console.log(`    ${SYSADMIN_EMAIL.padEnd(24)} ${SYSADMIN_PASSWORD}`);
  console.log(`    ${'all company accounts'.padEnd(24)} ${STAFF_PASSWORD}`);
  console.log(`\n  ${meridian.org.name} is PROJECT-BASED, ${northgate.org.name} is SHIFT-BASED`);
  console.log('  The other three are freshly-approved tenants: org admin only, no data.');
  console.log('  Every organisation is on the single Standard tier with an active subscription.\n');
}

main()
  .catch((e) => { console.error('\nRESET FAILED:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
