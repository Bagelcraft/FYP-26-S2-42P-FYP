const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const workerController = require('../controllers/worker.controller');
const updateRequestController = require('../controllers/task-update-request.controller');
const availabilityController = require('../controllers/availability.controller');
const attendanceController = require('../controllers/attendance.controller');

const router = express.Router();

router.use(verifyToken, requireRole(['PERMANENT_WORKER']));

// ─── Task views (5 — worker read-only) ───────────────────────────────────

// GET  /worker/tasks?status=ASSIGNED
router.get('/tasks', workerController.listMyTasks);

// GET  /worker/tasks/:id
router.get('/tasks/:id', workerController.getMyTask);

// PATCH /worker/tasks/:id/acknowledge  → sets status to IN_PROGRESS
router.patch('/tasks/:id/acknowledge', workerController.acknowledge);

// PATCH /worker/tasks/:id/progress     → body: { status: "IN_PROGRESS"|"COMPLETED" }
router.patch('/tasks/:id/progress', workerController.progressRules, workerController.updateProgress);

// ─── Update requests ──────────────────────────────────────────────────────────

// GET  /worker/tasks/:id/update-requests  — view all requests for this task
router.get('/tasks/:id/update-requests', updateRequestController.listWorker);

// PATCH /worker/tasks/:id/update-requests/:requestId/respond
router.patch('/tasks/:id/update-requests/:requestId/respond', updateRequestController.respondRules, updateRequestController.respond);

// ─── Profile Update Requests ──────────────────────────────────────────────

router.put('/profile', workerController.updateMyProfile);


router.get('/availability', availabilityController.getAvailability);
router.post('/availability', availabilityController.availabilityRules, availabilityController.setAvailability);
router.put('/availability/:id', availabilityController.availabilityRules, availabilityController.updateAvailability);
router.delete('/availability/:id', availabilityController.removeAvailability);

// ─── Leave (worker self-service) ──────────────────────────────
router.get('/leave', workerController.listMyLeave);
router.post('/leave', workerController.leaveRules, workerController.applyLeave);
router.delete('/leave/:id', workerController.cancelLeave);

router.post('/attendance/clock-in', attendanceController.clockIn);
router.put('/attendance/clock-out', attendanceController.clockOut);
router.get('/attendance', attendanceController.getAttendance);

module.exports = router;