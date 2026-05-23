const prisma = require("../config/prisma");

/*
|--------------------------------------------------------------------------
| Organisation Profile
|--------------------------------------------------------------------------
*/
exports.updateOrganisationProfile = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    const organisation = await prisma.organisation.update({
      where: {
        organisation_id: parseInt(req.params.id),
      },
      data: {
        name,
        isActive,
      },
    });

    res.json(organisation);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update organisation profile",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Department Management
|--------------------------------------------------------------------------
*/
exports.getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        organisation: true,
        head: true,
      },
    });

    res.json(departments);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch departments",
      error: error.message,
    });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { organisation_id, name, head_user_id } = req.body;

    const department = await prisma.department.create({
      data: {
        organisation_id,
        name,
        head_user_id,
      },
    });

    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create department",
      error: error.message,
    });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { name, head_user_id } = req.body;

    const department = await prisma.department.update({
      where: {
        department_id: parseInt(req.params.id),
      },
      data: {
        name,
        head_user_id,
      },
    });

    res.json(department);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update department",
      error: error.message,
    });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    await prisma.department.delete({
      where: {
        department_id: parseInt(req.params.id),
      },
    });

    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete department",
      error: error.message,
    });
  }
};

exports.assignStaffToDepartment = async (req, res) => {
  try {
    const { user_id } = req.body;

    const department = await prisma.department.update({
      where: {
        department_id: parseInt(req.params.id),
      },
      data: {
        head_user_id: user_id,
      },
    });

    res.json(department);
  } catch (error) {
    res.status(500).json({
      message: "Failed to assign staff to department",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Employee Management
|--------------------------------------------------------------------------
*/
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      include: {
        organisation: true,
        staffRole: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    res.json(staff);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch staff",
      error: error.message,
    });
  }
};

exports.createStaffAccount = async (req, res) => {
  try {
    const {
      organisationId,
      role_id,
      full_name,
      email,
      password_hash,
      user_type,
    } = req.body;

    const staff = await prisma.user.create({
      data: {
        organisationId,
        role_id,
        full_name,
        email,
        password_hash,
        user_type,
      },
    });

    res.status(201).json(staff);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create staff account",
      error: error.message,
    });
  }
};

exports.removeStaffAccount = async (req, res) => {
  try {
    const staff = await prisma.user.update({
      where: {
        userId: parseInt(req.params.id),
      },
      data: {
        is_active: false,
      },
    });

    res.json({
      message: "Staff account removed successfully",
      staff,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove staff account",
      error: error.message,
    });
  }
};

exports.updateStaffDetails = async (req, res) => {
  try {
    const { full_name, email, role_id, user_type, is_active } = req.body;

    const staff = await prisma.user.update({
      where: {
        userId: parseInt(req.params.id),
      },
      data: {
        full_name,
        email,
        role_id,
        user_type,
        is_active,
      },
    });

    res.json(staff);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update staff details",
      error: error.message,
    });
  }
};

exports.viewStaffWorkingHours = async (req, res) => {
  try {
    const attendance = await prisma.attendance.findMany({
      where: {
        user_id: parseInt(req.params.id),
      },
      orderBy: {
        clock_in: "desc",
      },
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch staff working hours",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Role Management
|--------------------------------------------------------------------------
*/
exports.createRole = async (req, res) => {
  try {
    const { organisation_id, role_name, max_working_hours } = req.body;

    const role = await prisma.staffRole.create({
      data: {
        organisation_id,
        role_name,
        max_working_hours,
      },
    });

    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create role",
      error: error.message,
    });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { role_name, max_working_hours } = req.body;

    const role = await prisma.staffRole.update({
      where: {
        role_id: parseInt(req.params.id),
      },
      data: {
        role_name,
        max_working_hours,
      },
    });

    res.json(role);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update role",
      error: error.message,
    });
  }
};

exports.removeRole = async (req, res) => {
  try {
    await prisma.staffRole.delete({
      where: {
        role_id: parseInt(req.params.id),
      },
    });

    res.json({ message: "Role removed successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove role",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Skill Management
|--------------------------------------------------------------------------
*/
exports.getSkills = async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      include: {
        organisation: true,
      },
    });

    res.json(skills);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch skills",
      error: error.message,
    });
  }
};

exports.createSkill = async (req, res) => {
  try {
    const { organisation_id, skill_name, cert_required } = req.body;

    const skill = await prisma.skill.create({
      data: {
        organisation_id,
        skill_name,
        cert_required,
      },
    });

    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create skill",
      error: error.message,
    });
  }
};

exports.updateSkill = async (req, res) => {
  try {
    const { skill_name, cert_required } = req.body;

    const skill = await prisma.skill.update({
      where: {
        skill_id: parseInt(req.params.id),
      },
      data: {
        skill_name,
        cert_required,
      },
    });

    res.json(skill);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update skill",
      error: error.message,
    });
  }
};

exports.deleteSkill = async (req, res) => {
  try {
    await prisma.skill.delete({
      where: {
        skill_id: parseInt(req.params.id),
      },
    });

    res.json({ message: "Skill deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete skill",
      error: error.message,
    });
  }
};

exports.assignSkillToUser = async (req, res) => {
  try {
    const { skill_id, certification_url } = req.body;

    const userSkill = await prisma.userSkill.create({
      data: {
        user_id: parseInt(req.params.id),
        skill_id,
        certification_url,
      },
    });

    res.status(201).json(userSkill);
  } catch (error) {
    res.status(500).json({
      message: "Failed to assign skill to user",
      error: error.message,
    });
  }
};