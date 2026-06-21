const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

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

// Simplified reset — admin sets a new password directly (no email flow yet)
async function resetPassword(email, newPassword) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw makeError('No account with that email', 404);

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { userId: user.userId }, data: { password_hash: hash } });
}

module.exports = { login, changePassword, resetPassword };