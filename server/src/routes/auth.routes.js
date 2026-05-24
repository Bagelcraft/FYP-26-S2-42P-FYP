const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const prisma = require('../config/prisma');

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        userId: true,
        full_name: true,
        email: true,
        password_hash: true,
        user_type: true,
        organisationId: true,
        is_active: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact your administrator.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        user_type: user.user_type,
        organisation_id: user.organisation_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
    );

    const { password_hash, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', (req, res) => {
  res.json({ message: 'Reset password — to be implemented' });
});

module.exports = router;