const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ─── Organisation Profile ─────────────────────────────────────

async function getOrgProfile(organisationId) {
  const org = await prisma.organisation.findUnique({
    where: { organisation_id: organisationId },
    select: {
      organisation_id:  true,
      name:             true,
      isActive:         true,
      createdAt:        true,
      activeSubscription: {
        select: { subscription_id: true, status: true, start_date: true, end_date: true, amount: true },
      },
    },
  });
  if (!org) throw makeError('Organisation not found', 404);
  return org;
}

async function updateOrgProfile(organisationId, data) {
  const org = await prisma.organisation.findUnique({ where: { organisation_id: organisationId } });
  if (!org) throw makeError('Organisation not found', 404);
  return prisma.organisation.update({
    where: { organisation_id: organisationId },
    data:  { name: data.name },
    select: { organisation_id: true, name: true, isActive: true, createdAt: true },
  });
}

// ─── Departments ──────────────────────────────────────────────

async function listDepartments(organisationId) {
  return prisma.department.findMany({
    where: { organisation_id: organisationId },
    include: {
      roles:  { select: { role_id: true, role_name: true }, orderBy: { role_name: 'asc' } },
      _count: { select: { tasks: true } },
    },
    orderBy: { name: 'asc' },
  });
}

async function createDepartment(organisationId, data) {
  return prisma.department.create({
    data: {
      organisation_id: organisationId,
      name:            data.name,
    },
    include: { roles: { select: { role_id: true, role_name: true } }, _count: { select: { tasks: true } } },
  });
}

async function updateDepartment(organisationId, deptId, data) {
  const dept = await prisma.department.findFirst({ where: { department_id: deptId, organisation_id: organisationId } });
  if (!dept) throw makeError('Department not found', 404);
  return prisma.department.update({
    where: { department_id: deptId },
    data: {
      name: data.name !== undefined ? data.name : undefined,
    },
    include: { roles: { select: { role_id: true, role_name: true } }, _count: { select: { tasks: true } } },
  });
}

async function deleteDepartment(organisationId, deptId) {
  const dept = await prisma.department.findFirst({ where: { department_id: deptId, organisation_id: organisationId } });
  if (!dept) throw makeError('Department not found', 404);
  await prisma.department.delete({ where: { department_id: deptId } });
}

// ─── Staff Roles ──────────────────────────────────────────────

const ROLE_INCLUDE = {
  department:     { select: { department_id: true, name: true } },
  requiredSkills: { include: { skill: { select: { skill_id: true, skill_name: true } } } },
  _count:         { select: { users: true } },
};

// Verify every skill id belongs to this organisation (422 otherwise).
async function assertSkillsInOrg(organisationId, skillIds) {
  if (!skillIds.length) return;
  const count = await prisma.skill.count({ where: { skill_id: { in: skillIds }, organisation_id: organisationId } });
  if (count !== skillIds.length) throw makeError('One or more skills do not belong to your organisation', 422);
}

async function assertDeptInOrg(organisationId, departmentId) {
  if (departmentId == null) return;
  const dept = await prisma.department.findFirst({ where: { department_id: departmentId, organisation_id: organisationId } });
  if (!dept) throw makeError('Department not found in this organisation', 404);
}

async function listRoles(organisationId) {
  return prisma.staffRole.findMany({
    where:   { organisation_id: organisationId },
    include: ROLE_INCLUDE,
    orderBy: { role_name: 'asc' },
  });
}

async function createRole(organisationId, data) {
  await assertDeptInOrg(organisationId, data.department_id ?? null);
  const skillIds = Array.isArray(data.skill_ids) ? [...new Set(data.skill_ids)] : [];
  await assertSkillsInOrg(organisationId, skillIds);
  return prisma.staffRole.create({
    data: {
      organisation_id:   organisationId,
      department_id:     data.department_id ?? null,
      role_name:         data.role_name,
      max_working_hours: data.max_working_hours ?? null,
      requiredSkills:    skillIds.length ? { create: skillIds.map((id) => ({ skill_id: id })) } : undefined,
    },
    include: ROLE_INCLUDE,
  });
}

async function updateRole(organisationId, roleId, data) {
  const role = await prisma.staffRole.findFirst({ where: { role_id: roleId, organisation_id: organisationId } });
  if (!role) throw makeError('Staff role not found', 404);
  if (data.department_id !== undefined) await assertDeptInOrg(organisationId, data.department_id);

  const hasSkills = data.skill_ids !== undefined;
  const skillIds = hasSkills && Array.isArray(data.skill_ids) ? [...new Set(data.skill_ids)] : [];
  if (hasSkills) await assertSkillsInOrg(organisationId, skillIds);

  return prisma.$transaction(async (tx) => {
    if (hasSkills) {
      await tx.roleSkill.deleteMany({ where: { role_id: roleId } });
      if (skillIds.length) await tx.roleSkill.createMany({ data: skillIds.map((id) => ({ role_id: roleId, skill_id: id })) });
    }
    return tx.staffRole.update({
      where: { role_id: roleId },
      data: {
        role_name:         data.role_name         !== undefined ? data.role_name         : undefined,
        max_working_hours: data.max_working_hours !== undefined ? data.max_working_hours : undefined,
        department_id:     data.department_id      !== undefined ? data.department_id      : undefined,
      },
      include: ROLE_INCLUDE,
    });
  });
}

async function deleteRole(organisationId, roleId) {
  const role = await prisma.staffRole.findFirst({ where: { role_id: roleId, organisation_id: organisationId } });
  if (!role) throw makeError('Staff role not found', 404);
  await prisma.staffRole.delete({ where: { role_id: roleId } });
}

// ─── Skills ───────────────────────────────────────────────────

async function listSkills(organisationId) {
  return prisma.skill.findMany({
    where:   { organisation_id: organisationId },
    include: {
      _count: { select: { userSkills: true, tasks: true } },
    },
    orderBy: { skill_name: 'asc' },
  });
}

async function createSkill(organisationId, data) {
  const existing = await prisma.skill.findFirst({
    where: { organisation_id: organisationId, skill_name: { equals: data.skill_name, mode: 'insensitive' } },
  });
  if (existing) throw makeError('A skill with that name already exists', 409);
  return prisma.skill.create({
    data: {
      organisation_id: organisationId,
      skill_name:      data.skill_name,
      cert_required:   data.cert_required ?? false,
    },
  });
}

async function updateSkill(organisationId, skillId, data) {
  const skill = await prisma.skill.findFirst({ where: { skill_id: skillId, organisation_id: organisationId } });
  if (!skill) throw makeError('Skill not found', 404);
  return prisma.skill.update({
    where: { skill_id: skillId },
    data: {
      skill_name:    data.skill_name    !== undefined ? data.skill_name    : undefined,
      cert_required: data.cert_required !== undefined ? data.cert_required : undefined,
    },
  });
}

async function deleteSkill(organisationId, skillId) {
  const skill = await prisma.skill.findFirst({ where: { skill_id: skillId, organisation_id: organisationId } });
  if (!skill) throw makeError('Skill not found', 404);
  await prisma.skill.delete({ where: { skill_id: skillId } });
}

// ─── Shift Templates ─────────────────────────────────────────

async function listShiftTemplates(organisationId) {
  return prisma.shiftTemplate.findMany({
    where:   { organisation_id: organisationId },
    orderBy: { name: 'asc' },
  });
}

async function createShiftTemplate(organisationId, data) {
  const existing = await prisma.shiftTemplate.findFirst({
    where: { organisation_id: organisationId, name: { equals: data.name, mode: 'insensitive' } },
  });
  if (existing) throw makeError('A shift with that name already exists', 409);
  return prisma.shiftTemplate.create({
    data: {
      organisation_id: organisationId,
      name:            data.name,
      start_time:      data.start_time,
      end_time:        data.end_time,
    },
  });
}

async function updateShiftTemplate(organisationId, shiftId, data) {
  const shift = await prisma.shiftTemplate.findFirst({ where: { shift_id: shiftId, organisation_id: organisationId } });
  if (!shift) throw makeError('Shift template not found', 404);
  return prisma.shiftTemplate.update({
    where: { shift_id: shiftId },
    data: {
      name:       data.name       !== undefined ? data.name       : undefined,
      start_time: data.start_time !== undefined ? data.start_time : undefined,
      end_time:   data.end_time   !== undefined ? data.end_time   : undefined,
    },
  });
}

async function deleteShiftTemplate(organisationId, shiftId) {
  const shift = await prisma.shiftTemplate.findFirst({ where: { shift_id: shiftId, organisation_id: organisationId } });
  if (!shift) throw makeError('Shift template not found', 404);
  await prisma.shiftTemplate.delete({ where: { shift_id: shiftId } });
}

// ─── Staff ────────────────────────────────────────────────────

async function listStaff(organisationId, filters = {}) {
  const where = {
    organisationId,
    is_active: true,
    ...(filters.user_type ? { user_type: filters.user_type } : {}),
    ...(filters.search ? {
      OR: [
        { full_name: { contains: filters.search, mode: 'insensitive' } },
        { email:     { contains: filters.search, mode: 'insensitive' } },
      ],
    } : {}),
  };
  return prisma.user.findMany({
    where,
    select: {
      userId:        true,
      full_name:     true,
      email:         true,
      user_type:     true,
      is_active:     true,
      createdAt:     true,
      staffRole:     { select: { role_id: true, role_name: true, max_working_hours: true } },
      skills:        { include: { skill: { select: { skill_id: true, skill_name: true } } } },
    },
    orderBy: { full_name: 'asc' },
  });
}

async function registerStaff(organisationId, data) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw makeError('Email already in use', 409);

  // Role (optional) + its required skills, which are auto-added to the employee.
  let roleSkillIds = [];
  if (data.role_id) {
    const role = await prisma.staffRole.findFirst({
      where: { role_id: data.role_id, organisation_id: organisationId },
      include: { requiredSkills: { select: { skill_id: true } } },
    });
    if (!role) throw makeError('Staff role not found in this organisation', 404);
    roleSkillIds = role.requiredSkills.map((rs) => rs.skill_id);
  }

  // Employee-selected skills (validated against the org).
  const selectedSkillIds = Array.isArray(data.skill_ids) ? data.skill_ids : [];
  await assertSkillsInOrg(organisationId, [...new Set(selectedSkillIds)]);

  // Union of chosen skills + the role's required skills (auto-add rule).
  const skillIds = [...new Set([...selectedSkillIds, ...roleSkillIds])];

  const password_hash = await bcrypt.hash(data.password || 'Password123!', 10);
  const year = new Date().getFullYear();
  const isPermanent = data.user_type === 'PERMANENT_WORKER';

  return prisma.user.create({
    data: {
      organisationId,
      role_id:       data.role_id ?? null,
      full_name:     data.full_name,
      email:         data.email,
      password_hash,
      user_type:     data.user_type,
      is_active:     true,
      skills: skillIds.length ? { create: skillIds.map((id) => ({ skill_id: id })) } : undefined,
      // Permanent workers get a leave balance set by the org admin at registration.
      leaveBalance: isPermanent ? {
        create: [
          { leave_type: 'ANNUAL',  entitled_days: Number(data.annual_entitled)  || 0, used_days: 0, year },
          { leave_type: 'MEDICAL', entitled_days: Number(data.medical_entitled) || 0, used_days: 0, year },
        ],
      } : undefined,
    },
    select: {
      userId: true, full_name: true, email: true, user_type: true, is_active: true, createdAt: true,
      staffRole: { select: { role_id: true, role_name: true } },
      skills: { include: { skill: { select: { skill_id: true, skill_name: true } } } },
    },
  });
}

async function updateStaff(organisationId, userId, data) {
  const user = await prisma.user.findFirst({ where: { userId, organisationId } });
  if (!user) throw makeError('Staff member not found', 404);

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw makeError('Email already in use', 409);
  }
  if (data.role_id) {
    const role = await prisma.staffRole.findFirst({ where: { role_id: data.role_id, organisation_id: organisationId } });
    if (!role) throw makeError('Staff role not found in this organisation', 404);
  }

  return prisma.user.update({
    where: { userId },
    data: {
      full_name: data.full_name !== undefined ? data.full_name : undefined,
      email:     data.email     !== undefined ? data.email     : undefined,
      role_id:   data.role_id   !== undefined ? data.role_id   : undefined,
      user_type: data.user_type !== undefined ? data.user_type : undefined,
    },
    select: {
      userId: true, full_name: true, email: true, user_type: true, is_active: true, createdAt: true,
      staffRole: { select: { role_id: true, role_name: true } },
    },
  });
}

async function deactivateStaff(organisationId, userId) {
  const user = await prisma.user.findFirst({ where: { userId, organisationId } });
  if (!user) throw makeError('Staff member not found', 404);
  return prisma.user.update({ where: { userId }, data: { is_active: false } });
}

async function reactivateStaff(organisationId, userId) {
  const user = await prisma.user.findFirst({ where: { userId, organisationId } });
  if (!user) throw makeError('Staff member not found', 404);
  return prisma.user.update({ where: { userId }, data: { is_active: true } });
}

// ─── User Skills ──────────────────────────────────────────────

async function assignSkillToStaff(organisationId, userId, skillId) {
  const user = await prisma.user.findFirst({ where: { userId, organisationId } });
  if (!user) throw makeError('Staff member not found', 404);

  const skill = await prisma.skill.findFirst({ where: { skill_id: skillId, organisation_id: organisationId } });
  if (!skill) throw makeError('Skill not found', 404);

  const existing = await prisma.userSkill.findFirst({ where: { user_id: userId, skill_id: skillId } });
  if (existing) throw makeError('Staff already has this skill', 409);

  return prisma.userSkill.create({ data: { user_id: userId, skill_id: skillId } });
}

async function removeSkillFromStaff(organisationId, userId, skillId) {
  const user = await prisma.user.findFirst({ where: { userId, organisationId } });
  if (!user) throw makeError('Staff member not found', 404);

  const userSkill = await prisma.userSkill.findFirst({ where: { user_id: userId, skill_id: skillId } });
  if (!userSkill) throw makeError('Skill not assigned to this staff member', 404);

  await prisma.userSkill.delete({ where: { user_skill_id: userSkill.user_skill_id } });
}

// ─── Subscription & Billing ───────────────────────────────────
const SUB_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtLong = (d) => `${String(d.getDate()).padStart(2, '0')} ${SUB_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

async function getSubscription(organisationId) {
  const org = await prisma.organisation.findUnique({
    where: { organisation_id: organisationId },
    include: { activeSubscription: true, users: { where: { is_active: true }, select: { userId: true } } },
  });
  if (!org) throw makeError('Organisation not found', 404);
  const sub = org.activeSubscription;
  if (!sub) return null; // UI renders a "no active subscription" state
  const plan = await prisma.subscriptionPlan.findFirst({ where: { price_monthly: sub.amount } });
  return {
    subscription_id: sub.subscription_id,
    plan:      plan?.name ?? 'Custom',
    amount:    Number(sub.amount),
    status:    sub.status,
    start:     fmtLong(new Date(sub.start_date)),
    renews:    fmtLong(new Date(sub.end_date)),
    seatsUsed: org.users.length,
    seatsTotal: plan?.max_users ?? null,
  };
}

async function listBilling(organisationId) {
  const records = await prisma.billingRecord.findMany({
    where:   { subscription: { organisation_id: organisationId } },
    orderBy: { billing_date: 'desc' },
  });
  return records.map((b) => ({
    id:     `INV-${String(b.billing_id).padStart(6, '0')}`,
    date:   fmtLong(new Date(b.billing_date)),
    amount: Number(b.amount),
    status: b.status,
    receipt_url: b.receipt_url,
  }));
}

// Renew: extend the period by one month and log a paid billing record.
// (Payment is handled externally — this only records the outcome.)
async function renewSubscription(organisationId) {
  const org = await prisma.organisation.findUnique({
    where: { organisation_id: organisationId }, include: { activeSubscription: true },
  });
  if (!org?.activeSubscription) throw makeError('No active subscription to renew', 404);
  const sub = org.activeSubscription;
  const base = new Date(Math.max(Date.now(), new Date(sub.end_date).getTime()));
  const newEnd = new Date(base); newEnd.setMonth(newEnd.getMonth() + 1);

  const [updated] = await prisma.$transaction([
    prisma.subscription.update({ where: { subscription_id: sub.subscription_id }, data: { status: 'ACTIVE', end_date: newEnd } }),
    prisma.billingRecord.create({ data: { subscription_id: sub.subscription_id, amount: sub.amount, billing_date: new Date(), status: 'PAID' } }),
  ]);
  return updated;
}

async function cancelSubscription(organisationId) {
  const org = await prisma.organisation.findUnique({
    where: { organisation_id: organisationId }, include: { activeSubscription: true },
  });
  if (!org?.activeSubscription) throw makeError('No active subscription to cancel', 404);
  return prisma.subscription.update({
    where: { subscription_id: org.activeSubscription.subscription_id },
    data:  { status: 'CANCELLED' },
  });
}

// ─── Shift Assignments (roster) ───────────────────────────────
const SHIFT_ASSIGN_INCLUDE = {
  user:  { select: { userId: true, full_name: true, user_type: true } },
  shift: { select: { shift_id: true, name: true, start_time: true, end_time: true } },
};

async function listShiftAssignments(organisationId) {
  return prisma.shiftAssignment.findMany({
    where:   { organisation_id: organisationId },
    include: SHIFT_ASSIGN_INCLUDE,
    orderBy: [{ date: 'asc' }],
  });
}

async function createShiftAssignment(organisationId, data) {
  const user = await prisma.user.findFirst({ where: { userId: Number(data.user_id), organisationId } });
  if (!user) throw makeError('Staff member not found in this organisation', 404);
  const shift = await prisma.shiftTemplate.findFirst({ where: { shift_id: Number(data.shift_id), organisation_id: organisationId } });
  if (!shift) throw makeError('Shift template not found in this organisation', 404);
  return prisma.shiftAssignment.create({
    data: {
      organisation_id: organisationId,
      user_id:  Number(data.user_id),
      shift_id: Number(data.shift_id),
      date:     new Date(data.date),
    },
    include: SHIFT_ASSIGN_INCLUDE,
  });
}

async function deleteShiftAssignment(organisationId, assignmentId) {
  const a = await prisma.shiftAssignment.findFirst({ where: { assignment_id: assignmentId, organisation_id: organisationId } });
  if (!a) throw makeError('Shift assignment not found', 404);
  await prisma.shiftAssignment.delete({ where: { assignment_id: assignmentId } });
}

module.exports = {
  getOrgProfile, updateOrgProfile,
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listRoles, createRole, updateRole, deleteRole,
  listSkills, createSkill, updateSkill, deleteSkill,
  listShiftTemplates, createShiftTemplate, updateShiftTemplate, deleteShiftTemplate,
  listShiftAssignments, createShiftAssignment, deleteShiftAssignment,
  listStaff, registerStaff, updateStaff, deactivateStaff, reactivateStaff,
  assignSkillToStaff, removeSkillFromStaff,
  getSubscription, listBilling, renewSubscription, cancelSubscription,
};