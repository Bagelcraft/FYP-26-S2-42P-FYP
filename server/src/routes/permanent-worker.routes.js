const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const workerController = require('../controllers/worker.controller');
const updateRequestController = require('../controllers/task-update-request.controller');
const attendanceController = require('../controllers/attendance.controller');
const profileChangeController = require('../controllers/profileChangeRequest.controller');
const shiftChangeController = require('../controllers/shiftChangeRequest.controller');

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

// ─── Stubs (to be implemented) ────────────────────────────────────────────

router.get('/profile', (req, res) => {
  res.json({ message: 'Get profile — to be implemented' });
});

// POST /worker/profile/change-request
router.post('/profile/change-request', profileChangeController.submitRules, profileChangeController.submitRequest);

router.get('/skills', (req, res) => {
  res.json({ message: 'Get skills — to be implemented' });
});

// ─── Schedule (assigned shifts) ───────────────────────────────
router.get('/schedule', workerController.getMySchedule);

// ─── Shift-change requests ────────────────────────────────────
router.get('/shift-change-requests', shiftChangeController.listMine);
router.post('/shift-change-request', shiftChangeController.submitRules, shiftChangeController.submitRequest);

// ─── Leave (worker self-service) ──────────────────────────────
router.get('/calendar', workerController.getMyCalendar);
router.get('/leave', workerController.listMyLeave);
router.get('/leave-balance', workerController.getMyLeaveBalance);
router.post('/leave', workerController.leaveRules, workerController.applyLeave);
router.delete('/leave/:id', workerController.cancelLeave);

router.post('/attendance/clock-in', attendanceController.clockIn);
router.put('/attendance/clock-out', attendanceController.clockOut);
router.get('/attendance', attendanceController.getAttendance);

module.exports = router;