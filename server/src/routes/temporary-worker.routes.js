const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const workerController = require('../controllers/worker.controller');
const updateRequestController = require('../controllers/task-update-request.controller');
const availabilityController = require('../controllers/availability.controller');
const attendanceController = require('../controllers/attendance.controller');

const router = express.Router();

router.use(verifyToken, requireRole(['TEMPORARY_WORKER']));

// ─── Task views (5 — worker read-only) ───────────────────────────────────

// GET  /temp-worker/tasks?status=IN_PROGRESS
router.get('/tasks', workerController.listMyTasks);

// GET  /temp-worker/tasks/available  — PENDING tasks matching their skills (task pool)
router.get('/tasks/available', workerController.listAvailableTasks);

// GET  /temp-worker/tasks/:id
router.get('/tasks/:id', workerController.getMyTask);

// PATCH /temp-worker/tasks/:id/acknowledge
router.patch('/tasks/:id/acknowledge', workerController.acknowledge);

// PATCH /temp-worker/tasks/:id/progress   body: { status: "IN_PROGRESS"|"COMPLETED" }
router.patch('/tasks/:id/progress', workerController.progressRules, workerController.updateProgress);

// ─── Update requests ──────────────────────────────────────────────────────────

// GET  /temp-worker/tasks/:id/update-requests
router.get('/tasks/:id/update-requests', updateRequestController.listWorker);

// PATCH /temp-worker/tasks/:id/update-requests/:requestId/respond
router.patch('/tasks/:id/update-requests/:requestId/respond', updateRequestController.respondRules, updateRequestController.respond);

// ─── Stubs (to be implemented) ────────────────────────────────────────────

router.post('/profile', (req, res) => {
  res.json({ message: 'Create/update profile — to be implemented' });
});

router.put('/profile', (req, res) => {
  res.json({ message: 'Update personal details — to be implemented' });
});

router.put('/skills', (req, res) => {
  res.json({ message: 'Update skills — to be implemented' });
});

router.get('/availability', availabilityController.getAvailability);
router.post('/availability', availabilityController.availabilityRules, availabilityController.setAvailability);
router.put('/availability/:id', availabilityController.availabilityRules, availabilityController.updateAvailability);
router.delete('/availability/:id', availabilityController.removeAvailability);

router.get('/attendance', attendanceController.getAttendance);
router.post('/attendance/clock-in', attendanceController.clockIn);
router.put('/attendance/clock-out', attendanceController.clockOut);

module.exports = router;