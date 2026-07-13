const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const workerController = require('../controllers/worker.controller');
const updateRequestController = require('../controllers/task-update-request.controller');
const profileChangeController = require('../controllers/profileChangeRequest.controller');
const shiftChangeController = require('../controllers/shiftChangeRequest.controller');

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

router.post('/profile', (req, res) => {
  res.json({ message: 'Create/update profile — to be implemented' });
});

// POST /temp-worker/profile/change-request
router.post('/profile/change-request', profileChangeController.submitRules, profileChangeController.submitRequest);

router.put('/skills', (req, res) => {
  res.json({ message: 'Update skills — to be implemented' });
});

// Freelancer hours — approved (completed) work + total hours (replaces clock in/out)
router.get('/hours', workerController.getMyHours);

// ─── Schedule (assigned shifts) ───────────────────────────────
router.get('/schedule', workerController.getMySchedule);

// ─── Shift-change requests ────────────────────────────────────
router.get('/shift-change-requests', shiftChangeController.listMine);
router.post('/shift-change-request', shiftChangeController.submitRules, shiftChangeController.submitRequest);

// ─── Leave (worker self-service) ──────────────────────────────
router.get('/leave', workerController.listMyLeave);
router.post('/leave', workerController.leaveRules, workerController.applyLeave);
router.delete('/leave/:id', workerController.cancelLeave);

module.exports = router;