const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Organisation ─────────────────────────────────────────────
  const org = await prisma.organisation.create({
    data: { name: 'TechCorp Pte Ltd', isActive: true },
  });

  // ─── Subscription ─────────────────────────────────────────────
  const subscription = await prisma.subscription.create({
    data: {
      organisation_id: org.organisation_id,
      amount: 79.99,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2027-01-01'),
      status: 'ACTIVE',
    },
  });

  await prisma.organisation.update({
    where: { organisation_id: org.organisation_id },
    data: { active_subscription_id: subscription.subscription_id },
  });

  // ─── Billing Record ───────────────────────────────────────────
  await prisma.billingRecord.create({
    data: {
      subscription_id: subscription.subscription_id,
      amount: 79.99,
      billing_date: new Date('2026-01-01'),
      receipt_url: 'https://receipts.example.com/001',
      status: 'PAID',
    },
  });

  // ─── Staff Roles ──────────────────────────────────────────────
  const managerRole = await prisma.staffRole.create({
    data: { organisation_id: org.organisation_id, role_name: 'Project Manager', max_working_hours: 40 },
  });

  const developerRole = await prisma.staffRole.create({
    data: { organisation_id: org.organisation_id, role_name: 'Software Developer', max_working_hours: 40 },
  });

  const contractorRole = await prisma.staffRole.create({
    data: { organisation_id: org.organisation_id, role_name: 'Contractor', max_working_hours: 20 },
  });

  // ─── Users ───────────────────────────────────────────────────
  const password = await bcrypt.hash('Password123!', 10);

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
      organisationId: org.organisation_id,
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
      organisationId: org.organisation_id,
      role_id: managerRole.role_id,
      full_name: 'Basil Hia',
      email: 'pm@techcorp.com',
      password_hash: password,
      user_type: 'PROJECT_MANAGER',
      is_active: true,
    },
  });

  const permWorker = await prisma.user.create({
    data: {
      organisationId: org.organisation_id,
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
      organisationId: org.organisation_id,
      role_id: contractorRole.role_id,
      full_name: 'Rachel Ng',
      email: 'tempworker@techcorp.com',
      password_hash: password,
      user_type: 'TEMPORARY_WORKER',
      is_active: true,
    },
  });

  // ─── Departments ──────────────────────────────────────────────
  const engineeringDept = await prisma.department.create({
    data: { organisation_id: org.organisation_id, head_user_id: pm.userId, name: 'Engineering' },
  });

  const operationsDept = await prisma.department.create({
    data: { organisation_id: org.organisation_id, head_user_id: orgAdmin.userId, name: 'Operations' },
  });

  // ─── Skills ───────────────────────────────────────────────────
  const jsSkill = await prisma.skill.create({
    data: { organisation_id: org.organisation_id, skill_name: 'JavaScript', cert_required: false },
  });

  const reactSkill = await prisma.skill.create({
    data: { organisation_id: org.organisation_id, skill_name: 'React', cert_required: false },
  });

  const sqlSkill = await prisma.skill.create({
    data: { organisation_id: org.organisation_id, skill_name: 'SQL', cert_required: false },
  });

  // ─── User Skills ──────────────────────────────────────────────
  await prisma.userSkill.createMany({
    data: [
      { user_id: permWorker.userId, skill_id: jsSkill.skill_id },
      { user_id: permWorker.userId, skill_id: reactSkill.skill_id },
      { user_id: tempWorker.userId, skill_id: jsSkill.skill_id },
      { user_id: tempWorker.userId, skill_id: sqlSkill.skill_id },
    ],
  });

  // ─── Availability ─────────────────────────────────────────────
  await prisma.availability.createMany({
    data: [
      {
        user_id: permWorker.userId,
        start_datetime: new Date('2026-05-26T09:00:00'),
        end_datetime: new Date('2026-05-26T18:00:00'),
        status: 'AVAILABLE',
      },
      {
        user_id: permWorker.userId,
        start_datetime: new Date('2026-05-27T09:00:00'),
        end_datetime: new Date('2026-05-27T18:00:00'),
        status: 'AVAILABLE',
      },
      {
        user_id: tempWorker.userId,
        start_datetime: new Date('2026-05-26T09:00:00'),
        end_datetime: new Date('2026-05-26T13:00:00'),
        status: 'AVAILABLE',
      },
    ],
  });

  // ─── Leave Balances ───────────────────────────────────────────
  await prisma.leaveBalance.createMany({
    data: [
      { user_id: permWorker.userId, leave_type: 'ANNUAL',  entitled_days: 14, used_days: 2, year: 2026 },
      { user_id: permWorker.userId, leave_type: 'MEDICAL', entitled_days: 14, used_days: 0, year: 2026 },
      { user_id: tempWorker.userId, leave_type: 'ANNUAL',  entitled_days: 7,  used_days: 0, year: 2026 },
    ],
  });

  // ─── Tasks ────────────────────────────────────────────────────
  const task1 = await prisma.task.create({
    data: {
      organisation_id: org.organisation_id,
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
      organisation_id: org.organisation_id,
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
      organisation_id: org.organisation_id,
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

  // ─── Task Assignments ─────────────────────────────────────────
  await prisma.taskAssignment.create({
    data: {
      task_id: task1.task_id,
      assigned_to: permWorker.userId,
      assigned_by: pm.userId,
      assignment_type: 'AUTO',
    },
  });

  await prisma.taskAssignment.create({
    data: {
      task_id: task3.task_id,
      assigned_to: tempWorker.userId,
      assigned_by: pm.userId,
      assignment_type: 'MANUAL',
    },
  });

  // ─── Allocation History ───────────────────────────────────────
  await prisma.allocationHistory.createMany({
    data: [
      { task_id: task1.task_id, user_id: permWorker.userId, changed_by: pm.userId, action: 'AUTO_ASSIGNED' },
      { task_id: task3.task_id, user_id: tempWorker.userId, changed_by: pm.userId, action: 'MANUALLY_ASSIGNED' },
    ],
  });

  // ─── Notifications ────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        recipientId: permWorker.userId,
        type: 'TASK_ASSIGNED',
        message: 'You have been assigned a new task: Build Login API',
        isRead: false,
      },
      {
        recipientId: tempWorker.userId,
        type: 'TASK_ASSIGNED',
        message: 'You have been assigned a new task: Database Performance Review',
        isRead: false,
      },
      {
        recipientId: pm.userId,
        type: 'TASK_UPDATED',
        message: 'Task "Database Performance Review" status changed to IN_PROGRESS',
        isRead: true,
      },
    ],
  });

  // ─── Testimonial ──────────────────────────────────────────────
  await prisma.testimonial.create({
    data: {
      user_id: orgAdmin.userId,
      rating: 5,
      review_text: 'Smart Task Allocation has transformed how we manage our team. The auto-allocation feature saves us hours every week.',
      created_at: new Date('2026-04-15'),
    },
  });

  // ─── Contact Enquiry ──────────────────────────────────────────
  await prisma.contactEnquiry.create({
    data: {
      subject: 'Enterprise Plan Enquiry',
      message: 'We are a company of 200 staff and would like to know more about your Enterprise plan.',
    },
  });

  console.log('');
  console.log('✅ Seed complete!');
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