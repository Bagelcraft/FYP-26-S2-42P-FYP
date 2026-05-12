const express = require('express');
const router = express.Router();

// GET /api/v1/pm/tasks
router.get('/tasks', (req, res) => {
  res.json({ message: 'Get all tasks for org — to be implemented by Basil' });
});

// POST /api/v1/pm/tasks
router.post('/tasks', (req, res) => {
  res.json({ message: 'Create task — to be implemented by Basil' });
});

// GET /api/v1/pm/tasks/:id
router.get('/tasks/:id', (req, res) => {
  res.json({ message: 'Get task by ID — to be implemented by Basil' });
});

// PUT /api/v1/pm/tasks/:id
router.put('/tasks/:id', (req, res) => {
  res.json({ message: 'Update task — to be implemented by Basil' });
});

// DELETE /api/v1/pm/tasks/:id
router.delete('/tasks/:id', (req, res) => {
  res.json({ message: 'Delete task — to be implemented by Basil' });
});

// POST /api/v1/pm/tasks/:id/allocate
router.post('/tasks/:id/allocate', (req, res) => {
  res.json({ message: 'Manual allocate task — to be implemented by Basil' });
});

// GET /api/v1/pm/tasks/:id/eligible-staff
router.get('/tasks/:id/eligible-staff', (req, res) => {
  res.json({ message: 'Get eligible staff — to be implemented by Basil' });
});

// POST /api/v1/pm/tasks/:id/auto-allocate
router.post('/tasks/:id/auto-allocate', (req, res) => {
  res.json({ message: 'Auto-allocate task — to be implemented by Basil' });
});

// GET /api/v1/pm/reports/hours
router.get('/reports/hours', (req, res) => {
  res.json({ message: 'Working hours report — to be implemented by Basil' });
});

module.exports = router;
