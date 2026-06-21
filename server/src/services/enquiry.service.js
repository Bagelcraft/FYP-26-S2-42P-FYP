const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function createEnquiry(data) {
  if (!data.subject || !data.subject.trim()) throw makeError('subject is required', 400);
  if (!data.message || !data.message.trim()) throw makeError('message is required', 400);
  return prisma.contactEnquiry.create({
    data: {
      subject: data.subject.trim(),
      message: data.message.trim(),
      user_id: data.user_id ?? null,
    },
  });
}

async function listEnquiries() {
  return prisma.contactEnquiry.findMany({ orderBy: { created_at: 'desc' } });
}

async function getEnquiry(enquiryId) {
  const enquiry = await prisma.contactEnquiry.findUnique({ where: { enquiry_id: enquiryId } });
  if (!enquiry) throw makeError('Enquiry not found', 404);
  return enquiry;
}

async function deleteEnquiry(enquiryId) {
  const enquiry = await prisma.contactEnquiry.findUnique({ where: { enquiry_id: enquiryId } });
  if (!enquiry) throw makeError('Enquiry not found', 404);
  await prisma.contactEnquiry.delete({ where: { enquiry_id: enquiryId } });
}

module.exports = { createEnquiry, listEnquiries, getEnquiry, deleteEnquiry };
