const prisma = require('../config/prisma');

const updateMyProfile = async (userId, data) => {
  return prisma.user.update({
    where: { userId },
    data: {
      full_name: data.full_name,
      email: data.email,
    },
  });
};

module.exports = {
  updateMyProfile,
};