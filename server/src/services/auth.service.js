const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const sgMail = require('@sendgrid/mail');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function signToken(user) {
  return jwt.sign(
    { userId: user.userId, organisationId: user.organisationId, role: user.user_type },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.is_active) {
    throw makeError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw makeError('Invalid email or password', 401);

  await prisma.user.update({
    where: { userId: user.userId },
    data: { lastLogin: new Date() },
  });

  return { user: sanitizeUser(user), token: signToken(user) };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) throw makeError('User not found', 404);

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw makeError('Current password is incorrect', 401);

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { userId }, data: { password_hash: hash } });
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Silently succeed to prevent email enumeration

  const token = jwt.sign(
    { userId: user.userId, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${token}`;

  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to: email,
      from: process.env.FROM_EMAIL || 'noreply@smarttask.com',
      subject: 'SmartTask — Reset your password',
      html: `
        <p>Hi ${user.full_name},</p>
        <p>You requested a password reset. Click the link below — it expires in <strong>15 minutes</strong>.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  } else {
    // Dev fallback: print to console when SendGrid is not configured
    console.log(`[DEV] Password reset link for ${email}:\n${resetUrl}`);
  }
}

async function resetPasswordWithToken(token, newPassword) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw makeError('Reset link is invalid or has expired', 400);
  }
  if (payload.type !== 'password_reset') throw makeError('Invalid reset token', 400);

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { userId: payload.userId }, data: { password_hash: hash } });
}

module.exports = { login, changePassword, forgotPassword, resetPasswordWithToken };