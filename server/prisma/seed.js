const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const password = await bcrypt.hash('Password123!', 10);

  // ─── TECHCORP PTE LTD ────────────────────────────────────────────────────────

  const techCorp = await prisma.organisation.create({
    data: { name: 'TechCorp Pte Ltd', isActive: true },
  });

  const techSub = await prisma.subscription.create({
    data: {
      organisation_id: techCorp.organisation_id,
      amount: 79.99,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2027-01-01'),
      status: 'ACTIVE',
    },
  });

  await prisma.organisation.update({
    where: { organisation_id: techCorp.organisation_id },
    data: { active_subscription_id: techSub.subscription_id },
  });

  await prisma.billingRecord.create({
    data: {
      subscription_id: techSub.subscription_id,
      amount: 79.99,
      billing_date: new Date('2026-01-01'),
      receipt_url: 'https://receipts.example.com/001',
      status: 'PAID',
    },
  });

  // ─── TechCorp Staff Roles ─────────────────────────────────────────────────

  const managerRole = await prisma.staffRole.create({
    data: { organisation_id: techCorp.organisation_id, role_name: 'Project Manager', max_working_hours: 40 },
  });
  const developerRole = await prisma.staffRole.create({
    data: { organisation_id: techCorp.organisation_id, role_name: 'Software Developer', max_working_hours: 40 },
  });
  const contractorRole = await prisma.staffRole.create({
    data: { organisation_id: techCorp.organisation_id, role_name: 'Contractor', max_working_hours: 20 },
  });
  const designerRole = await prisma.staffRole.create({
    data: { organisation_id: techCorp.organisation_id, role_name: 'UI/UX Designer', max_working_hours: 40 },
  });

  // ─── TechCorp Users (12 total, 3 temporary) ───────────────────────────────

  const sysAdmin = await prisma.user.create({
    data: {
      full_name: 'Daniel Tan',
      email: 'admin@system.com',
      password_hash: password,
      user_type: 'SYSTEM_ADMIN',
      is_active: true,
    },
  });

  const orgAdmin = await prisma.user.create({
    data: {
      organisationId: techCorp.organisation_id,
      role_id: managerRole.role_id,
      full_name: 'Alson Lim',
      email: 'orgadmin@techcorp.com',
      password_hash: password,
      user_type: 'ORG_ADMIN',
      is_active: true,
    },
  });

  const pm = await prisma.user.create({
    data: {
      organisationId: techCorp.organisation_id,
      role_id: managerRole.role_id,
      full_name: 'Basil Hia',
      email: 'pm@techcorp.com',
      password_hash: password,
      user_type: 'PROJECT_MANAGER',
      is_active: true,
    },
  });

  // Second PM — creates tasks 4 & 5 to bring org active-task count to 5
  const pm2 = await prisma.user.create({
    data: {
      organisationId: techCorp.organisation_id,
      role_id: managerRole.role_id,
      full_name: 'Marcus Teo',
      email: 'pm2@techcorp.com',
      password_hash: password,
      user_type: 'PROJECT_MANAGER',
      is_active: true,
    },
  });

  const permWorker = await prisma.user.create({
    data: {
      organisationId: techCorp.organisation_id,
      role_id: developerRole.role_id,
      full_name: 'Weishi Tan',
      email: 'worker@techcorp.com',
      password_hash: password,
      user_type: 'PERMANENT_WORKER',
      is_active: true,
    },
  });

  const tempWorker = await prisma.user.create({
    data: {
      organisationId: techCorp.organisation_id,
      role_id: contractorRole.role_id,
      full_name: 'Rachel Ng',
      email: 'tempworker@techcorp.com',
      password_hash: password,
      user_type: 'TEMPORARY_WORKER',
      is_active: true,
    },
  });

  // Additional TechCorp staff (6 more → total 12 in org)
  const perm2 = await prisma.user.create({
    data: { organisationId: techCorp.organisation_id, role_id: developerRole.role_id, full_name: 'Chen Jie', email: 'chen.jie@techcorp.com', password_hash: password, user_type: 'PERMANENT_WORKER', is_active: true },
  });
  const perm3 = await prisma.user.create({
    data: { organisationId: techCorp.organisation_id, role_id: developerRole.role_id, full_name: 'Priya Sharma', email: 'priya.sharma@techcorp.com', password_hash: password, user_type: 'PERMANENT_WORKER', is_active: true },
  });
  const perm4 = await prisma.user.create({
    data: { organisationId: techCorp.organisation_id, role_id: developerRole.role_id, full_name: 'Faisal Ahmad', email: 'faisal.ahmad@techcorp.com', password_hash: password, user_type: 'PERMANENT_WORKER', is_active: true },
  });
  const perm5 = await prisma.user.create({
    data: { organisationId: techCorp.organisation_id, role_id: designerRole.role_id, full_name: 'Nadia Binte Ali', email: 'nadia.ali@techcorp.com', password_hash: password, user_type: 'PERMANENT_WORKER', is_active: true },
  });
  // Two extra temp workers → bring TEMPORARY_WORKER count to 3 (Rachel + Ryan + May)
  const temp2 = await prisma.user.create({
    data: { organisationId: techCorp.organisation_id, role_id: contractorRole.role_id, full_name: 'Ryan Lim', email: 'ryan.lim@techcorp.com', password_hash: password, user_type: 'TEMPORARY_WORKER', is_active: true },
  });
  const temp3 = await prisma.user.create({
    data: { organisationId: techCorp.organisation_id, role_id: contractorRole.role_id, full_name: 'May Tan', email: 'may.tan@techcorp.com', password_hash: password, user_type: 'TEMPORARY_WORKER', is_active: true },
  });

  // ─── TechCorp Departments ─────────────────────────────────────────────────
  // Engineering (8 staff): Basil, Marcus, Weishi, Chen Jie, Priya, Nadia, Ryan, May
  // Operations  (4 staff): Alson, Rachel, Faisal, + 1 more perm below

  const engineeringDept = await prisma.department.create({
    data: { organisation_id: techCorp.organisation_id, name: 'Engineering' },
  });
  const operationsDept = await prisma.department.create({
    data: { organisation_id: techCorp.organisation_id, name: 'Operations' },
  });

  // ─── TechCorp Skills (5 skills to match OrgAdmin dashboard) ──────────────

  const jsSkill     = await prisma.skill.create({ data: { organisation_id: techCorp.organisation_id, skill_name: 'JavaScript',  cert_required: false } });
  const reactSkill  = await prisma.skill.create({ data: { organisation_id: techCorp.organisation_id, skill_name: 'React',        cert_required: false } });
  const sqlSkill    = await prisma.skill.create({ data: { organisation_id: techCorp.organisation_id, skill_name: 'SQL',          cert_required: false } });
  const pythonSkill = await prisma.skill.create({ data: { organisation_id: techCorp.organisation_id, skill_name: 'Python',       cert_required: false } });
  const uiUxSkill   = await prisma.skill.create({ data: { organisation_id: techCorp.organisation_id, skill_name: 'UI/UX Design', cert_required: false } });

  // ─── User Skills ──────────────────────────────────────────────────────────

  await prisma.userSkill.createMany({
    data: [
      { user_id: permWorker.userId, skill_id: jsSkill.skill_id },
      { user_id: permWorker.userId, skill_id: reactSkill.skill_id },
      { user_id: tempWorker.userId, skill_id: jsSkill.skill_id },
      { user_id: tempWorker.userId, skill_id: sqlSkill.skill_id },
      { user_id: perm2.userId,      skill_id: jsSkill.skill_id },
      { user_id: perm2.userId,      skill_id: pythonSkill.skill_id },
      { user_id: perm3.userId,      skill_id: reactSkill.skill_id },
      { user_id: perm3.userId,      skill_id: pythonSkill.skill_id },
      { user_id: perm4.userId,      skill_id: sqlSkill.skill_id },
      { user_id: perm5.userId,      skill_id: uiUxSkill.skill_id },
      { user_id: temp2.userId,      skill_id: reactSkill.skill_id },
      { user_id: temp3.userId,      skill_id: uiUxSkill.skill_id },
    ],
  });

  // ─── Availability ─────────────────────────────────────────────────────────

  await prisma.availability.createMany({
    data: [
      { user_id: permWorker.userId, start_datetime: new Date('2026-05-26T09:00:00'), end_datetime: new Date('2026-05-26T18:00:00'), status: 'AVAILABLE' },
      { user_id: permWorker.userId, start_datetime: new Date('2026-05-27T09:00:00'), end_datetime: new Date('2026-05-27T18:00:00'), status: 'AVAILABLE' },
      { user_id: tempWorker.userId, start_datetime: new Date('2026-05-26T09:00:00'), end_datetime: new Date('2026-05-26T13:00:00'), status: 'AVAILABLE' },
    ],
  });

  // ─── Leave Balances ───────────────────────────────────────────────────────
  // Weishi: 14 annual entitled − 2 used = 12 days left (matches WorkerDashboard stat)

  await prisma.leaveBalance.createMany({
    data: [
      { user_id: permWorker.userId, leave_type: 'ANNUAL',  entitled_days: 14, used_days: 2, year: 2026 },
      { user_id: permWorker.userId, leave_type: 'MEDICAL', entitled_days: 14, used_days: 0, year: 2026 },
      { user_id: tempWorker.userId, leave_type: 'ANNUAL',  entitled_days: 7,  used_days: 0, year: 2026 },
    ],
  });

  // ─── Tasks ────────────────────────────────────────────────────────────────
  // Basil's 3 tasks (shown in PMDashboard + worker dashboards)
  // Marcus's 2 tasks (brings OrgAdmin "Active Tasks" total to 5)

  const task1 = await prisma.task.create({
    data: {
      organisation_id: techCorp.organisation_id,
      department_id: engineeringDept.department_id,
      created_by: pm.userId,
      required_skill_id: jsSkill.skill_id,
      title: 'Build Login API',
      description: 'Implement JWT-based login endpoint with bcrypt password verification.',
      status: 'ASSIGNED',
      start_datetime: new Date('2026-05-26T09:00:00'),
      end_datetime: new Date('2026-05-26T18:00:00'),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      organisation_id: techCorp.organisation_id,
      department_id: engineeringDept.department_id,
      created_by: pm.userId,
      required_skill_id: reactSkill.skill_id,
      title: 'Build Dashboard UI',
      description: 'Create role-based dashboard pages using React and Tailwind CSS.',
      status: 'PENDING',
      start_datetime: new Date('2026-05-27T09:00:00'),
      end_datetime: new Date('2026-05-27T18:00:00'),
    },
  });

  const task3 = await prisma.task.create({
    data: {
      organisation_id: techCorp.organisation_id,
      department_id: operationsDept.department_id,
      created_by: pm.userId,
      required_skill_id: sqlSkill.skill_id,
      title: 'Database Performance Review',
      description: 'Review and optimise slow queries in the task allocation module.',
      status: 'IN_PROGRESS',
      start_datetime: new Date('2026-05-21T09:00:00'),
      end_datetime: new Date('2026-05-22T18:00:00'),
    },
  });

  const task4 = await prisma.task.create({
    data: {
      organisation_id: techCorp.organisation_id,
      department_id: engineeringDept.department_id,
      created_by: pm2.userId,
      required_skill_id: uiUxSkill.skill_id,
      title: 'UI Redesign Sprint',
      description: 'Redesign the main dashboard layout for improved usability.',
      status: 'ASSIGNED',
      start_datetime: new Date('2026-05-26T09:00:00'),
      end_datetime: new Date('2026-05-28T18:00:00'),
    },
  });

  const task5 = await prisma.task.create({
    data: {
      organisation_id: techCorp.organisation_id,
      department_id: engineeringDept.department_id,
      created_by: pm2.userId,
      required_skill_id: pythonSkill.skill_id,
      title: 'API Integration Testing',
      description: 'Write and run integration tests for all REST API endpoints.',
      status: 'IN_PROGRESS',
      start_datetime: new Date('2026-05-22T09:00:00'),
      end_datetime: new Date('2026-05-24T18:00:00'),
    },
  });

  // ─── Task Assignments ─────────────────────────────────────────────────────

  await prisma.taskAssignment.create({ data: { task_id: task1.task_id, assigned_to: permWorker.userId, assigned_by: pm.userId,  assignment_type: 'AUTO'   } });
  await prisma.taskAssignment.create({ data: { task_id: task3.task_id, assigned_to: tempWorker.userId, assigned_by: pm.userId,  assignment_type: 'MANUAL' } });
  await prisma.taskAssignment.create({ data: { task_id: task4.task_id, assigned_to: perm5.userId,      assigned_by: pm2.userId, assignment_type: 'MANUAL' } });
  await prisma.taskAssignment.create({ data: { task_id: task5.task_id, assigned_to: perm3.userId,      assigned_by: pm2.userId, assignment_type: 'AUTO'   } });

  // ─── Allocation History ───────────────────────────────────────────────────

  await prisma.allocationHistory.createMany({
    data: [
      { task_id: task1.task_id, user_id: permWorker.userId, changed_by: pm.userId,  action: 'AUTO_ASSIGNED'     },
      { task_id: task3.task_id, user_id: tempWorker.userId, changed_by: pm.userId,  action: 'MANUALLY_ASSIGNED' },
      { task_id: task4.task_id, user_id: perm5.userId,      changed_by: pm2.userId, action: 'MANUALLY_ASSIGNED' },
      { task_id: task5.task_id, user_id: perm3.userId,      changed_by: pm2.userId, action: 'AUTO_ASSIGNED'     },
    ],
  });

  // ─── Notifications ────────────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      { recipientId: permWorker.userId, type: 'TASK_ASSIGNED', message: 'You have been assigned a new task: Build Login API',                       isRead: false },
      { recipientId: tempWorker.userId, type: 'TASK_ASSIGNED', message: 'You have been assigned a new task: Database Performance Review',           isRead: false },
      { recipientId: pm.userId,         type: 'TASK_UPDATED',  message: 'Task "Database Performance Review" status changed to IN_PROGRESS',        isRead: true  },
      { recipientId: perm5.userId,      type: 'TASK_ASSIGNED', message: 'You have been assigned a new task: UI Redesign Sprint',                    isRead: false },
      { recipientId: perm3.userId,      type: 'TASK_ASSIGNED', message: 'You have been assigned a new task: API Integration Testing',               isRead: false },
    ],
  });

  // ─── Testimonial ──────────────────────────────────────────────────────────

  await prisma.testimonial.create({
    data: {
      user_id: orgAdmin.userId,
      rating: 5,
      review_text: 'Smart Task Allocation has transformed how we manage our team. The auto-allocation feature saves us hours every week.',
      created_at: new Date('2026-04-15'),
    },
  });

  // ─── Contact Enquiry ──────────────────────────────────────────────────────

  await prisma.contactEnquiry.create({
    data: {
      subject: 'Enterprise Plan Enquiry',
      message: 'We are a company of 200 staff and would like to know more about your Enterprise plan.',
    },
  });

  // ─── BUILDTECH SOLUTIONS (ACTIVE, 8 staff) ───────────────────────────────

  const buildTech = await prisma.organisation.create({
    data: { name: 'BuildTech Solutions', isActive: true },
  });

  const buildTechSub = await prisma.subscription.create({
    data: {
      organisation_id: buildTech.organisation_id,
      amount: 49.99,
      start_date: new Date('2026-02-01'),
      end_date: new Date('2027-02-01'),
      status: 'ACTIVE',
    },
  });

  await prisma.organisation.update({
    where: { organisation_id: buildTech.organisation_id },
    data: { active_subscription_id: buildTechSub.subscription_id },
  });

  const btAdminRole = await prisma.staffRole.create({ data: { organisation_id: buildTech.organisation_id, role_name: 'Administrator', max_working_hours: 40 } });
  const btDevRole   = await prisma.staffRole.create({ data: { organisation_id: buildTech.organisation_id, role_name: 'Developer',     max_working_hours: 40 } });

  await prisma.user.createMany({
    data: [
      { organisationId: buildTech.organisation_id, role_id: btAdminRole.role_id, full_name: 'Jamie Ong',   email: 'admin@buildtech.com',       password_hash: password, user_type: 'ORG_ADMIN',         is_active: true },
      { organisationId: buildTech.organisation_id, role_id: btDevRole.role_id,   full_name: 'Sam Yeo',     email: 'pm@buildtech.com',          password_hash: password, user_type: 'PROJECT_MANAGER',   is_active: true },
      { organisationId: buildTech.organisation_id, role_id: btDevRole.role_id,   full_name: 'Cindy Ho',    email: 'cindy.ho@buildtech.com',    password_hash: password, user_type: 'PERMANENT_WORKER',  is_active: true },
      { organisationId: buildTech.organisation_id, role_id: btDevRole.role_id,   full_name: 'Leon Ng',     email: 'leon.ng@buildtech.com',     password_hash: password, user_type: 'PERMANENT_WORKER',  is_active: true },
      { organisationId: buildTech.organisation_id, role_id: btDevRole.role_id,   full_name: 'Hui Ling',    email: 'hui.ling@buildtech.com',    password_hash: password, user_type: 'PERMANENT_WORKER',  is_active: true },
      { organisationId: buildTech.organisation_id, role_id: btDevRole.role_id,   full_name: 'Amir Shah',   email: 'amir.shah@buildtech.com',   password_hash: password, user_type: 'PERMANENT_WORKER',  is_active: true },
      { organisationId: buildTech.organisation_id, role_id: btDevRole.role_id,   full_name: 'Tina Raj',    email: 'tina.raj@buildtech.com',    password_hash: password, user_type: 'TEMPORARY_WORKER',  is_active: true },
      { organisationId: buildTech.organisation_id, role_id: btDevRole.role_id,   full_name: 'Kevin Loh',   email: 'kevin.loh@buildtech.com',   password_hash: password, user_type: 'TEMPORARY_WORKER',  is_active: true },
    ],
  });

  // ─── LOGICORE ASIA (SUSPENDED, 5 staff) ──────────────────────────────────

  const logiCore = await prisma.organisation.create({
    data: { name: 'LogiCore Asia', isActive: false },
  });

  const logiCoreSub = await prisma.subscription.create({
    data: {
      organisation_id: logiCore.organisation_id,
      amount: 49.99,
      start_date: new Date('2026-03-01'),
      end_date: new Date('2027-03-01'),
      status: 'SUSPENDED',
    },
  });

  await prisma.organisation.update({
    where: { organisation_id: logiCore.organisation_id },
    data: { active_subscription_id: logiCoreSub.subscription_id },
  });

  const lcRole = await prisma.staffRole.create({ data: { organisation_id: logiCore.organisation_id, role_name: 'Staff', max_working_hours: 40 } });

  await prisma.user.createMany({
    data: [
      { organisationId: logiCore.organisation_id, role_id: lcRole.role_id, full_name: 'Grace Tan',   email: 'admin@logicore.com',       password_hash: password, user_type: 'ORG_ADMIN',        is_active: false },
      { organisationId: logiCore.organisation_id, role_id: lcRole.role_id, full_name: 'Henry Koh',   email: 'pm@logicore.com',          password_hash: password, user_type: 'PROJECT_MANAGER',  is_active: false },
      { organisationId: logiCore.organisation_id, role_id: lcRole.role_id, full_name: 'Iris Low',    email: 'iris.low@logicore.com',    password_hash: password, user_type: 'PERMANENT_WORKER', is_active: false },
      { organisationId: logiCore.organisation_id, role_id: lcRole.role_id, full_name: 'Jason Chua',  email: 'jason.chua@logicore.com',  password_hash: password, user_type: 'PERMANENT_WORKER', is_active: false },
      { organisationId: logiCore.organisation_id, role_id: lcRole.role_id, full_name: 'Karen Sim',   email: 'karen.sim@logicore.com',   password_hash: password, user_type: 'PERMANENT_WORKER', is_active: false },
    ],
  });

  // ─── Summary ──────────────────────────────────────────────────────────────

  console.log('');
  console.log('✅ Seed complete!');
  console.log('');
  console.log('Organisations seeded:');
  console.log('  TechCorp Pte Ltd   — ACTIVE     (12 staff, 2 active subscriptions)');
  console.log('  BuildTech Solutions — ACTIVE     (8 staff)');
  console.log('  LogiCore Asia      — SUSPENDED  (5 staff)');
  console.log('');
  console.log('Total users: 26 (1 system admin + 25 org users across 3 orgs)');
  console.log('  Admin dashboard "Total Users = 25" reflects org users only.');
  console.log('');
  console.log('TechCorp breakdown:');
  console.log('  Staff: 12 total, 3 temporary (Rachel, Ryan, May)');
  console.log('  Skills: JavaScript, React, SQL, Python, UI/UX Design (5)');
  console.log('  Active tasks: 5 (3 by Basil, 2 by Marcus)');
  console.log('');
  console.log('Test accounts (all passwords: Password123!)');
  console.log('  System Admin:     admin@system.com');
  console.log('  Org Admin:        orgadmin@techcorp.com');
  console.log('  Project Manager:  pm@techcorp.com');
  console.log('  Permanent Worker: worker@techcorp.com');
  console.log('  Temp Worker:      tempworker@techcorp.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });