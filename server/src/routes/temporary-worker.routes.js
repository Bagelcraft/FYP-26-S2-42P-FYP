const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { requireOrgType, attachOrgType } = require('../middleware/orgType.middleware');
const { requireActiveOrganisation } = require('../middleware/orgActive.middleware');
const workerController = require('../controllers/worker.controller');
const updateRequestController = require('../controllers/task-update-request.controller');
const attendanceController = require('../controllers/attendance.controller');
const profileChangeController = require('../controllers/profileChangeRequest.controller');

const router = express.Router();

router.use(verifyToken, requireRole(['TEMPORARY_WORKER']), requireActiveOrganisation, attachOrgType);

// In a project-based organisation a temporary worker carries no shifts at all —
// they stay dormant until a task is assigned, so there is nothing to swap.
const shiftOrgOnly = requireOrgType('NON_PROJECT');

// ─── Task views (5 — worker read-only) ───────────────────────────────────

// GET  /temp-worker/tasks?status=IN_PROGRESS
router.get('/tasks', workerController.listMyTasks);

// GET  /temp-worker/tasks/available  — PENDING tasks matching their skills (task pool)
router.get('/tasks/available', workerController.listAvailableTasks);

// GET  /temp-worker/tasks/:id
router.get('/tasks/:id', workerController.getMyTask);

// PATCH /temp-worker/tasks/:id/acknowledge
router.patch('/tasks/:id/acknowledge', workerController.acknowledge);

// PATCH /temp-worker/tasks/:id/progress   body: { status: "IN_PROGRESS" }
router.patch('/tasks/:id/progress', workerController.progressRules, workerController.updateProgress);

// Freelancer flow: accept = acknowledge; then submit finished work for approval, or decline
router.patch('/tasks/:id/submit',  workerController.submitTask);
router.patch('/tasks/:id/decline', workerController.declineTask);

// ─── Update requests ──────────────────────────────────────────────────────────

// GET  /temp-worker/tasks/:id/update-requests
router.get('/tasks/:id/update-requests', updateRequestController.listWorker);

// PATCH /temp-worker/tasks/:id/update-requests/:requestId/respond
router.patch('/tasks/:id/update-requests/:requestId/respond', updateRequestController.respondRules, updateRequestController.respond);

// ─── Stubs (to be implemented) ────────────────────────────────────────────

router.get('/profile', workerController.getMyProfile);

router.post('/profile', (req, res) => {
  res.json({ message: 'Create/update profile — to be implemented' });
});

// POST /temp-worker/profile/change-request
router.post('/profile/change-request', profileChangeController.submitRules, profileChangeController.submitRequest);

router.get('/skills', workerController.listOrgSkills);
router.get('/shift-templates', workerController.listOrgShifts);

// Freelancer hours — approved (completed) work + total hours (replaces clock in/out)
router.get('/hours', workerController.getMyHours);

// Timesheet — the same monthly sheet the permanent staff get, and the same one on
// both sides: hours plus completed tasks in a shift-based organisation, completed
// tasks alone in a project-based one. What it measures follows the organisation,
// not the contract type, so a temporary worker rostered alongside a permanent one
// sees their work counted the same way.
router.get('/timesheet', attendanceController.getTimesheet);

// Clocking in follows the roster, so it is available wherever there is one. A
// temporary worker in a shift-based organisation is rostered onto shifts like
// anyone else and needs to record the hours they were present; in a project-based
// organisation there is no roster to clock against.
router.post('/attendance/clock-in', shiftOrgOnly, attendanceController.clockIn);
router.put('/attendance/clock-out', shiftOrgOnly, attendanceController.clockOut);
router.get('/attendance', shiftOrgOnly, attendanceController.getAttendance);

// ─── Schedule (assigned shifts) ───────────────────────────────
// A temporary worker in a project-based organisation carries no shifts at all,
// so there is no schedule to return there.
router.get('/schedule', shiftOrgOnly, workerController.getMySchedule);

// ─── Calendar ─────────────────────────────────────────────────
// Ungated, unlike /schedule: a calendar is task deadlines and unavailability as
// well as shifts, and a temporary worker has tasks under either scheduling model.
// In a project-based organisation it simply comes back with no shifts in it.
router.get('/calendar', workerController.getMyCalendar);

// Note: temporary workers (freelancers) have no leave entitlement — no leave routes.
//
// They have no shift-change requests either. A shift change is a swap between two
// rostered employees, negotiated against a roster the worker is committed to. A
// temporary worker is engaged per task and is not held to a roster in that way —
// where they are rostered at all it is because a task activated them, so the thing
// to change is the task assignment, not the shift. Those routes are deliberately
// absent rather than gated.

module.exports = router;