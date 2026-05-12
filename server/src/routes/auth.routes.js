const express = require('express');
const router = express.Router();

// POST /api/v1/auth/login
router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint — to be implemented by Alson/Daniel' });
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout endpoint — to be implemented' });
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', (req, res) => {
  res.json({ message: 'Reset password — to be implemented' });
});

module.exports = router;
