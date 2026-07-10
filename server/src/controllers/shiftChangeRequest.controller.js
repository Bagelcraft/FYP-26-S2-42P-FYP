const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');

function ok(res, data, status = 200) { res.status(status).json({ success: true, data }); }
function fail(res, message, status = 400) { res.status(status).json({ success: false, message }); }

// ── Worker / Temp: submit a shift-change request ─────────────────────────────
const submitRules = [
  body('original_shift').isISO8601().withMessage('original_shift must be a valid date/time'),
  body('requested_shift').isISO8601().withMessage('requested_shift must be a valid date/time'),
  body('reason').optional({ nullable: true }).isString(),
];

async function submitRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const rec = await prisma.shiftChangeRequest.create({
      data: {
        user_id:         req.user.userId,
        original_shift:  new Date(req.body.original_shift),
        requested_shift: new Date(req.body.requested_shift),
      },
    });
    ok(res, rec, 201);
  } catch (e) { next(e); }
}

// ── Worker / Temp: own requests ──────────────────────────────────────────────
async function listMine(req, res, next) {
  try {
    const data = await prisma.shiftChangeRequest.findMany({
      where:   { user_id: req.user.userId },
      orderBy: { created_at: 'desc' },
    });
    ok(res, data);
  } catch (e) { next(e); }
}

// ── Org Admin: list requests for the org ─────────────────────────────────────
async function listForOrg(req, res, next) {
  try {
    const data = await prisma.shiftChangeRequest.findMany({
      where: { user: { organisationId: req.user.organisationId } },
      include: {
        user:     { select: { userId: true, full_name: true, user_type: true } },
        reviewer: { select: { full_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    ok(res, data);
  } catch (e) { next(e); }
}

// ── Org Admin: approve / reject ──────────────────────────────────────────────
const reviewRules = [
  body('action').isIn(['APPROVED', 'REJECTED']).withMessage('action must be APPROVED or REJECTED'),
];

async function reviewRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const existing = await prisma.shiftChangeRequest.findUnique({
      where: { request_id: Number(req.params.id) },
      include: { user: { select: { organisationId: true } } },
    });
    if (!existing) return fail(res, 'Request not found', 404);
    if (existing.user.organisationId !== req.user.organisationId) return fail(res, 'Forbidden', 403);
    if (existing.status !== 'PENDING') return fail(res, 'Request already reviewed', 409);

    const updated = await prisma.shiftChangeRequest.update({
      where: { request_id: existing.request_id },
      data:  { status: req.body.action, reviewed_by: req.user.userId },
    });
    ok(res, updated);
  } catch (e) { next(e); }
}

module.exports = { submitRules, submitRequest, listMine, listForOrg, reviewRules, reviewRequest };
