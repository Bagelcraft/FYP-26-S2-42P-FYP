const express = require("express");
const router = express.Router();

const {
  updateOrganisationProfile,

  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignStaffToDepartment,

  getAllStaff,
  createStaffAccount,
  removeStaffAccount,
  updateStaffDetails,
  viewStaffWorkingHours,

  createRole,
  updateRole,
  removeRole,

  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  assignSkillToUser,
} = require("../controllers/orgAdminController");

/*
|--------------------------------------------------------------------------
| Organisation Profile
|--------------------------------------------------------------------------
*/
router.put("/organisation/:id", updateOrganisationProfile);

/*
|--------------------------------------------------------------------------
| Department Management
|--------------------------------------------------------------------------
*/
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);
router.put("/departments/:id/assign-staff", assignStaffToDepartment);

/*
|--------------------------------------------------------------------------
| Employee Management
|--------------------------------------------------------------------------
*/
router.get("/staff", getAllStaff);
router.post("/staff", createStaffAccount);
router.post("/staff/permanent", createStaffAccount);
router.post("/staff/temporary", createStaffAccount);
router.delete("/staff/:id", removeStaffAccount);
router.put("/staff/:id", updateStaffDetails);
router.get("/staff/:id/working-hours", viewStaffWorkingHours);

/*
|--------------------------------------------------------------------------
| Role Management
|--------------------------------------------------------------------------
*/
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", removeRole);

/*
|--------------------------------------------------------------------------
| Skill Management
|--------------------------------------------------------------------------
*/
router.get("/skills", getSkills);
router.post("/skills", createSkill);
router.put("/skills/:id", updateSkill);
router.delete("/skills/:id", deleteSkill);
router.post("/staff/:id/skills", assignSkillToUser);

module.exports = router;