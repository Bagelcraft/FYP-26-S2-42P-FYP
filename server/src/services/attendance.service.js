const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const clockIn = async (userId) => {
  const openSession = await prisma.attendance.findFirst({
    where: { user_id: userId, clock_out: null },
  });
  if (openSession) {
    throw makeError('You are already clocked in', 400);
  }
  return prisma.attendance.create({
    data: { user_id: userId, clock_in: new Date() },
  });
};

const clockOut = async (userId) => {
  const openSession = await prisma.attendance.findFirst({
    where: { user_id: userId, clock_out: null },
    orderBy: { clock_in: 'desc' },
  });
  if (!openSession) {
    throw makeError('You are not currently clocked in', 400);
  }
  const clockOutTime = new Date();
  const diffMs = clockOutTime - openSession.clock_in;
  const workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  return prisma.attendance.update({
    where: { attendance_id: openSession.attendance_id },
    data: { clock_out: clockOutTime, working_hours: workingHours },
  });
};

const listAttendance = async (userId) => {
  return prisma.attendance.findMany({
    where: { user_id: userId },
    orderBy: { clock_in: 'desc' },
  });
};

module.exports = { clockIn, clockOut, listAttendance };
