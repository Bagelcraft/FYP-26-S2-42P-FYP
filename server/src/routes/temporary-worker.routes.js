const express = require('express');
const router = express.Router();

// GET /api/v1/temp-worker/tasks/assigned
router.get('/tasks/assigned', (req, res) => {
  res.json({ message: 'Get assigned tasks — to be implemented by Rachel' });
});

// GET /api/v1/temp-worker/tasks/unassigned
router.get('/tasks/unassigned', (req, res) => {
  res.json({ message: 'Get unassigned tasks — to be implemented by Rachel' });
});

// PUT /api/v1/temp-worker/tasks/:id/progress
router.put('/tasks/:id/progress', (req, res) => {
  res.json({ message: 'Update task progress — to be implemented by Rachel' });
});

// POST /api/v1/temp-worker/profile
router.post('/profile', (req, res) => {
  res.json({ message: 'Create/update profile — to be implemented by Rachel' });
});

// PUT /api/v1/temp-worker/profile
router.put('/profile', (req, res) => {
  res.json({ message: 'Update personal details — to be implemented by Rachel' });
});

// PUT /api/v1/temp-worker/skills
router.put('/skills', (req, res) => {
  res.json({ message: 'Update skills — to be implemented by Rachel' });
});

// POST /api/v1/temp-worker/availability
router.post('/availability', (req, res) => {
  res.json({ message: 'Set availability — to be implemented by Rachel' });
});

// POST /api/v1/temp-worker/attendance/clock-in
router.post('/attendance/clock-in', (req, res) => {
  res.json({ message: 'Clock in — to be implemented by Rachel' });
});

// PUT /api/v1/temp-worker/attendance/clock-out
router.put('/attendance/clock-out', (req, res) => {
  res.json({ message: 'Clock out — to be implemented by Rachel' });
});

module.exports = router;
