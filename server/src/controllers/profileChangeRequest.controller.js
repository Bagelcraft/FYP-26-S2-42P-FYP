const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}
function fail(res, message, status = 400) {
  res.status(status).json({ success: false, message });
}

// ── Worker: submit a change request ──────────────────────────────────────────

const submitRules = [
  body('field').trim().notEmpty().withMessage('field is required').isLength({ max: 100 }),
  body('requested_value').trim().notEmpty().withMessage('requested_value is required'),
  body('reason').optional({ nullable: true }).isString(),
];

async function submitRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const record = await prisma.profileChangeRequest.create({
      data: {
        user_id: req.user.userId,
        field: req.body.field,
        requested_value: req.body.requested_value,
        reason: req.body.reason ?? null,
      },
    });
    ok(res, record, 201);
  } catch (e) {
    next(e);
  }
}

// ── Org Admin: list all pending requests for their org ────────────────────────

async function listRequests(req, res, next) {
  try {
    const requests = await prisma.profileChangeRequest.findMany({
      where: {
        user: { organisationId: req.user.organisationId },
      },
      include: {
        user: { select: { userId: true, full_name: true, email: true, user_type: true } },
        reviewer: { select: { userId: true, full_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    ok(res, requests);
  } catch (e) {
    next(e);
  }
}

// ── Org Admin: approve or reject a request ────────────────────────────────────

const reviewRules = [
  body('action').isIn(['APPROVED', 'REJECTED']).withMessage('action must be APPROVED or REJECTED'),
  body('review_note').optional({ nullable: true }).isString(),
];

async function reviewRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const existing = await prisma.profileChangeRequest.findUnique({
      where: { request_id: Number(req.params.id) },
      include: { user: { select: { organisationId: true } } },
    });
    if (!existing) return fail(res, 'Request not found', 404);
    if (existing.user.organisationId !== req.user.organisationId)
      return fail(res, 'Forbidden', 403);
    if (existing.status !== 'PENDING')
      return fail(res, 'Request already reviewed', 409);

    const updated = await prisma.profileChangeRequest.update({
      where: { request_id: existing.request_id },
      data: {
        status: req.body.action,
        reviewed_by: req.user.userId,
        review_note: req.body.review_note ?? null,
        reviewed_at: new Date(),
      },
    });

    if (req.body.action === 'APPROVED') {
      const fieldMap = { 'Full Name': 'full_name', 'Email': 'email' };
      const dbField = fieldMap[existing.field];
      if (dbField) {
        await prisma.user.update({
          where: { userId: existing.user_id },
          data: { [dbField]: existing.requested_value },
        });
      }
    }

    ok(res, updated);
  } catch (e) {
    next(e);
  }
}

module.exports = { submitRules, submitRequest, listRequests, reviewRules, reviewRequest };
