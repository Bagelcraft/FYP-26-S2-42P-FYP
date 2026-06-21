const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const updateMyProfile = async (userId, data) => {
  return prisma.user.update({
    where: { userId },
    data: {
      full_name: data.full_name,
      email: data.email,
    },
  });
};

// ─── Leave (worker self-service) ──────────────────────────────

const applyLeave = async (userId, data) => {
  return prisma.leaveRequest.create({
    data: {
      user_id:    userId,
      leave_type: data.leave_type,
      start_date: new Date(data.start_date),
      end_date:   new Date(data.end_date),
      status:     'PENDING',
    },
  });
};

const listMyLeave = async (userId) => {
  return prisma.leaveRequest.findMany({
    where:   { user_id: userId },
    orderBy: { start_date: 'desc' },
  });
};

// Workers may withdraw a request only while it is still pending.
const cancelLeave = async (userId, leaveId) => {
  const leave = await prisma.leaveRequest.findFirst({ where: { leave_id: leaveId, user_id: userId } });
  if (!leave) throw makeError('Leave request not found', 404);
  if (leave.status !== 'PENDING') throw makeError('Only pending leave requests can be cancelled', 409);
  await prisma.leaveRequest.delete({ where: { leave_id: leaveId } });
};

module.exports = {
  updateMyProfile,
  applyLeave,
  listMyLeave,
  cancelLeave,
};