const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const workerController = require('../controllers/worker.controller');
const updateRequestController = require('../controllers/task-update-request.controller');

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

router.put('/profile', (req, res) => {
  res.json({ message: 'Update profile — to be implemented' });
});

router.get('/skills', (req, res) => {
  res.json({ message: 'Get skills — to be implemented' });
});

router.get('/availability', (req, res) => {
  res.json({ message: 'Get availability — to be implemented' });
});

router.post('/availability', (req, res) => {
  res.json({ message: 'Set availability — to be implemented' });
});

router.put('/availability/:id', (req, res) => {
  res.json({ message: 'Update availability — to be implemented' });
});

router.post('/leave', (req, res) => {
  res.json({ message: 'Apply for leave — to be implemented' });
});

router.post('/attendance/clock-in', (req, res) => {
  res.json({ message: 'Clock in — to be implemented' });
});

router.put('/attendance/clock-out', (req, res) => {
  res.json({ message: 'Clock out — to be implemented' });
});

router.get('/attendance', (req, res) => {
  res.json({ message: 'Get attendance history — to be implemented' });
});

module.exports = router;