const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function listForUser(userId) {
  return prisma.notification.findMany({
    where:   { recipientId: userId },
    orderBy: { createdAt: 'desc' },
  });
}

async function unreadCount(userId) {
  return prisma.notification.count({ where: { recipientId: userId, isRead: false } });
}

async function create(data) {
  if (!data.recipientId) throw makeError('recipientId is required', 400);
  if (!data.message)     throw makeError('message is required', 400);
  return prisma.notification.create({
    data: {
      recipientId: Number(data.recipientId),
      type:        data.type || 'GENERAL',
      message:     data.message,
    },
  });
}

async function markRead(userId, notificationId) {
  const notif = await prisma.notification.findFirst({ where: { id: notificationId, recipientId: userId } });
  if (!notif) throw makeError('Notification not found', 404);
  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

async function markAllRead(userId) {
  await prisma.notification.updateMany({ where: { recipientId: userId, isRead: false }, data: { isRead: true } });
}

async function remove(userId, notificationId) {
  const notif = await prisma.notification.findFirst({ where: { id: notificationId, recipientId: userId } });
  if (!notif) throw makeError('Notification not found', 404);
  await prisma.notification.delete({ where: { id: notificationId } });
}

module.exports = { listForUser, unreadCount, create, markRead, markAllRead, remove };
