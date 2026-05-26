const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

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

// POST /api/v1/auth/dev-login  (DEV ONLY — remove before production)
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = jwt.sign(
      { userId: user.userId, organisationId: user.organisationId, role: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.json({
      token,
      user: {
        userId:         user.userId,
        full_name:      user.full_name,
        email:          user.email,
        user_type:      user.user_type,
        organisationId: user.organisationId,
      },
    });
  });
}

module.exports = router;
