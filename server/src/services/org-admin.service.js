const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ─── Departments ──────────────────────────────────────────────

async function listDepartments(organisationId) {
  return prisma.department.findMany({
    where: { organisation_id: organisationId },
    include: {
      head: { select: { userId: true, full_name: true } },
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
      head_user_id:    data.head_user_id ?? null,
    },
    include: { head: { select: { userId: true, full_name: true } } },
  });
}

async function updateDepartment(organisationId, deptId, data) {
  const dept = await prisma.department.findFirst({ where: { department_id: deptId, organisation_id: organisationId } });
  if (!dept) throw makeError('Department not found', 404);
  return prisma.department.update({
    where: { department_id: deptId },
    data: {
      name:         data.name         !== undefined ? data.name         : undefined,
      head_user_id: data.head_user_id !== undefined ? data.head_user_id : undefined,
    },
    include: { head: { select: { userId: true, full_name: true } } },
  });
}

async function deleteDepartment(organisationId, deptId) {
  const dept = await prisma.department.findFirst({ where: { department_id: deptId, organisation_id: organisationId } });
  if (!dept) throw makeError('Department not found', 404);
  await prisma.department.delete({ where: { department_id: deptId } });
}

async function assignStaffToDept(organisationId, deptId, userId) {
  const dept = await prisma.department.findFirst({ where: { department_id: deptId, organisation_id: organisationId } });
  if (!dept) throw makeError('Department not found', 404);

  const user = await prisma.user.findFirst({ where: { userId, organisationId, is_active: true } });
  if (!user) throw makeError('Staff member not found in this organisation', 404);

  return prisma.department.update({
    where: { department_id: deptId },
    data:  { head_user_id: userId },
    include: { head: { select: { userId: true, full_name: true } } },
  });
}

// ─── Staff Roles ──────────────────────────────────────────────

async function listRoles(organisationId) {
  return prisma.staffRole.findMany({
    where:   { organisation_id: organisationId },
    include: { _count: { select: { users: true } } },
    orderBy: { role_name: 'asc' },
  });
}

async function createRole(organisationId, data) {
  return prisma.staffRole.create({
    data: {
      organisation_id:  organisationId,
      role_name:        data.role_name,
      max_working_hours: data.max_working_hours ?? null,
    },
  });
}

async function updateRole(organisationId, roleId, data) {
  const role = await prisma.staffRole.findFirst({ where: { role_id: roleId, organisation_id: organisationId } });
  if (!role) throw makeError('Staff role not found', 404);
  return prisma.staffRole.update({
    where: { role_id: roleId },
    data: {
      role_name:         data.role_name         !== undefined ? data.role_name         : undefined,
      max_working_hours: data.max_working_hours !== undefined ? data.max_working_hours : undefined,
    },
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
    where: { organisation_id: organisationId, skill_name: { equals: data.skill_name } },
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

// ─── Staff ────────────────────────────────────────────────────

async function listStaff(organisationId, filters = {}) {
  const where = {
    organisationId,
    is_active: true,
    ...(filters.user_type ? { user_type: filters.user_type } : {}),
    ...(filters.search ? {
      OR: [
        { full_name: { contains: filters.search } },
        { email:     { contains: filters.search } },
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

  if (data.role_id) {
    const role = await prisma.staffRole.findFirst({ where: { role_id: data.role_id, organisation_id: organisationId } });
    if (!role) throw makeError('Staff role not found in this organisation', 404);
  }

  const password_hash = await bcrypt.hash(data.password || 'Password123!', 10);

  return prisma.user.create({
    data: {
      organisationId,
      role_id:       data.role_id ?? null,
      full_name:     data.full_name,
      email:         data.email,
      password_hash,
      user_type:     data.user_type,
      is_active:     true,
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

module.exports = {
  listDepartments, createDepartment, updateDepartment, deleteDepartment, assignStaffToDept,
  listRoles, createRole, updateRole, deleteRole,
  listSkills, createSkill, updateSkill, deleteSkill,
  listStaff, registerStaff, deactivateStaff,
  assignSkillToStaff, removeSkillFromStaff,
};