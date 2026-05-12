const express = require('express');
const router = express.Router();

// GET /api/v1/org-admin/departments
router.get('/departments', (req, res) => {
  res.json({ message: 'Get departments — to be implemented by Alson' });
});

// POST /api/v1/org-admin/departments
router.post('/departments', (req, res) => {
  res.json({ message: 'Create department — to be implemented by Alson' });
});

// PUT /api/v1/org-admin/departments/:id
router.put('/departments/:id', (req, res) => {
  res.json({ message: 'Update department — to be implemented by Alson' });
});

// DELETE /api/v1/org-admin/departments/:id
router.delete('/departments/:id', (req, res) => {
  res.json({ message: 'Delete department — to be implemented by Alson' });
});

// GET /api/v1/org-admin/staff
router.get('/staff', (req, res) => {
  res.json({ message: 'Get all staff — to be implemented by Alson' });
});

// POST /api/v1/org-admin/staff/permanent
router.post('/staff/permanent', (req, res) => {
  res.json({ message: 'Register permanent staff — to be implemented by Alson' });
});

// POST /api/v1/org-admin/staff/temporary
router.post('/staff/temporary', (req, res) => {
  res.json({ message: 'Register temporary staff — to be implemented by Alson' });
});

// GET /api/v1/org-admin/skills
router.get('/skills', (req, res) => {
  res.json({ message: 'Get skill tags — to be implemented by Alson' });
});

// POST /api/v1/org-admin/skills
router.post('/skills', (req, res) => {
  res.json({ message: 'Create skill tag — to be implemented by Alson' });
});

// POST /api/v1/org-admin/staff/:id/skills
router.post('/staff/:id/skills', (req, res) => {
  res.json({ message: 'Assign skill to user — to be implemented by Alson' });
});

module.exports = router;
