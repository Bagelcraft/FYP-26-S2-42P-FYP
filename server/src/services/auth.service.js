const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { sendMail } = require('./email.service');
const { SUSPENDED_MESSAGE } = require('../middleware/orgActive.middleware');

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
  // Strips every server-side secret, not just the password. verification_token is
  // a live credential — anyone holding it can mark that address verified — so it
  // must never travel in a login or approval response.
  const { password_hash, verification_token, verification_expires, ...safe } = user;
  return safe;
}

async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    // org_type travels with the session so the client knows, before its first
    // data fetch, whether to render the project portal or the shift portal.
    include: { organisation: { select: { name: true, org_type: true, isActive: true } } },
  });
  if (!user || !user.is_active) {
    throw makeError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw makeError('Invalid email or password', 401);

  // Checked only after the password, so an unverified-account response can never
  // be used to probe which addresses are registered.
  if (!user.email_verified) {
    throw makeError('Please verify your email address before signing in. Check your inbox for the verification link.', 403);
  }

  // A suspended organisation locks out all of its staff. Same reasoning as above:
  // only revealed once the password is known to be correct.
  if (user.organisation && user.organisation.isActive === false) {
    const err = makeError(SUSPENDED_MESSAGE, 403);
    err.code = 'ORG_SUSPENDED';
    throw err;
  }

  await prisma.user.update({
    where: { userId: user.userId },
    data: { lastLogin: new Date() },
  });

  return {
    user: { ...sanitizeUser(user), org_type: user.organisation?.org_type ?? null },
    token: signToken(user),
  };
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

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
  const resetUrl = `${clientUrl}/reset-password?token=${token}`;

  await sendMail({
    to: email,
    subject: 'SmartTask — Reset your password',
    html: `
      <p>Hi ${user.full_name},</p>
      <p>You requested a password reset. Click the link below — it expires in <strong>15 minutes</strong>.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
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