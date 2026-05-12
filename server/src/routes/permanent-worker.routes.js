const express = require('express');
const router = express.Router();

// GET /api/v1/worker/tasks
router.get('/tasks', (req, res) => {
  res.json({ message: 'Get assigned tasks — to be implemented by Weishi' });
});

// GET /api/v1/worker/tasks/history
router.get('/tasks/history', (req, res) => {
  res.json({ message: 'Get task history — to be implemented by Weishi' });
});

// GET /api/v1/worker/tasks/:id
router.get('/tasks/:id', (req, res) => {
  res.json({ message: 'Get task by ID — to be implemented by Weishi' });
});

// PUT /api/v1/worker/tasks/:id/acknowledge
router.put('/tasks/:id/acknowledge', (req, res) => {
  res.json({ message: 'Acknowledge task — to be implemented by Weishi' });
});

// PUT /api/v1/worker/tasks/:id/progress
router.put('/tasks/:id/progress', (req, res) => {
  res.json({ message: 'Update task progress — to be implemented by Weishi' });
});

// GET /api/v1/worker/profile
router.get('/profile', (req, res) => {
  res.json({ message: 'Get profile — to be implemented by Weishi' });
});

// PUT /api/v1/worker/profile
router.put('/profile', (req, res) => {
  res.json({ message: 'Update profile — to be implemented by Weishi' });
});

// GET /api/v1/worker/skills
router.get('/skills', (req, res) => {
  res.json({ message: 'Get skills — to be implemented by Weishi' });
});

// GET /api/v1/worker/availability
router.get('/availability', (req, res) => {
  res.json({ message: 'Get availability — to be implemented by Weishi' });
});

// POST /api/v1/worker/availability
router.post('/availability', (req, res) => {
  res.json({ message: 'Set availability — to be implemented by Weishi' });
});

// PUT /api/v1/worker/availability/:id
router.put('/availability/:id', (req, res) => {
  res.json({ message: 'Update availability — to be implemented by Weishi' });
});

// POST /api/v1/worker/leave
router.post('/leave', (req, res) => {
  res.json({ message: 'Apply for leave — to be implemented by Weishi' });
});

// POST /api/v1/worker/attendance/clock-in
router.post('/attendance/clock-in', (req, res) => {
  res.json({ message: 'Clock in — to be implemented by Weishi' });
});

// PUT /api/v1/worker/attendance/clock-out
router.put('/attendance/clock-out', (req, res) => {
  res.json({ message: 'Clock out — to be implemented by Weishi' });
});

// GET /api/v1/worker/attendance
router.get('/attendance', (req, res) => {
  res.json({ message: 'Get attendance history — to be implemented by Weishi' });
});

module.exports = router;
