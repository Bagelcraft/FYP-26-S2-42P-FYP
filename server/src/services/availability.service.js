const prisma = require('../config/prisma');

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

async function checkOverlap(userId, start, end, excludeId = null) {
  const overlap = await prisma.availability.findFirst({
    where: {
      user_id: userId,
      ...(excludeId && { NOT: { availability_id: excludeId } }),
      start_datetime: { lt: end },
      end_datetime:   { gt: start },
    },
  });
  if (overlap) throw makeError('This slot overlaps with an existing availability slot', 409);
}

const createAvailability = async (userId, { start_datetime, end_datetime, status = 'AVAILABLE' }) => {
  const start = new Date(start_datetime);
  const end = new Date(end_datetime);
  if (start >= end) {
    throw makeError('start_datetime must be before end_datetime', 400);
  }
  await checkOverlap(userId, start, end);
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
  await checkOverlap(userId, start, end, availabilityId);
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