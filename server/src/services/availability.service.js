const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const listAvailability = async (userId) => {
  return prisma.availability.findMany({
    where: { user_id: userId },
    orderBy: { start_datetime: 'asc' },
  });
};

const createAvailability = async (userId, { start_datetime, end_datetime, status = 'AVAILABLE' }) => {
  const start = new Date(start_datetime);
  const end = new Date(end_datetime);
  if (start >= end) {
    throw makeError('start_datetime must be before end_datetime', 400);
  }
  return prisma.availability.create({
    data: {
      user_id: userId,
      start_datetime: start,
      end_datetime: end,
      status,
    },
  });
};

const updateAvailability = async (availabilityId, userId, { start_datetime, end_datetime, status }) => {
  const slot = await prisma.availability.findUnique({
    where: { availability_id: availabilityId },
  });
  if (!slot) throw makeError('Availability slot not found', 404);
  if (slot.user_id !== userId) throw makeError('Forbidden', 403);
  const start = new Date(start_datetime);
  const end = new Date(end_datetime);
  if (start >= end) throw makeError('start_datetime must be before end_datetime', 400);
  return prisma.availability.update({
    where: { availability_id: availabilityId },
    data: { start_datetime: start, end_datetime: end, ...(status && { status }) },
  });
};

const deleteAvailability = async (availabilityId, userId) => {
  const slot = await prisma.availability.findUnique({
    where: { availability_id: availabilityId },
  });
  if (!slot) throw makeError('Availability slot not found', 404);
  if (slot.user_id !== userId) throw makeError('Forbidden', 403);
  return prisma.availability.delete({ where: { availability_id: availabilityId } });
};

module.exports = { listAvailability, createAvailability, updateAvailability, deleteAvailability };