const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const { verifyToken } = require('../middleware/auth.middleware');
const { normaliseEmailSanitizer } = require('../utils/emailValidator');

const router = express.Router();
const prisma = require('../config/prisma');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
}

// POST /api/v1/auth/login
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email required').customSanitizer(normaliseEmailSanitizer),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/logout  (JWT is stateless; client drops the token)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/v1/auth/change-password  (authenticated)
router.post(
  '/change-password',
  verifyToken,
  [
    body('currentPassword').notEmpty().withMessage('currentPassword is required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('newPassword must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('newPassword must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('newPassword must contain a number'),
  ],
  validate,
  async (req, res, next) => {
    try {
      await authService.changePassword(req.user.userId, req.body.currentPassword, req.body.newPassword);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/forgot-password  — send reset link to email
router.post(
  '/forgot-password',
  [body('email').trim().isEmail().withMessage('Valid email required').customSanitizer(normaliseEmailSanitizer)],
  validate,
  async (req, res, next) => {
    try {
      await authService.forgotPassword(req.body.email);
      // Always respond with success to prevent email enumeration
      res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/reset-password  — validate token and set new password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('token is required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('newPassword must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('newPassword must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('newPassword must contain a number'),
  ],
  validate,
  async (req, res, next) => {
    try {
      await authService.resetPasswordWithToken(req.body.token, req.body.newPassword);
      res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/dev-login  (DEV ONLY — removed in production)
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

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  });
}

module.exports = router;