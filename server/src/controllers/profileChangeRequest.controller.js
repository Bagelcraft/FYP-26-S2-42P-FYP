const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}
function fail(res, message, status = 400) {
  res.status(status).json({ success: false, message });
}

// ── Worker: submit a change request ──────────────────────────────────────────

const SKILLS_FIELD = 'Skills';

const submitRules = [
  body('field').trim().notEmpty().withMessage('field is required').isLength({ max: 100 }),
  // A skills request carries structured data instead of a single value, so the
  // plain-text requirement only applies to the other fields.
  body('requested_value')
    .if(body('field').not().equals(SKILLS_FIELD))
    .trim().notEmpty().withMessage('requested_value is required'),
  body('skill_ids').optional().isArray().withMessage('skill_ids must be an array'),
  body('skill_ids.*').isInt({ min: 1 }),
  body('new_skills').optional().isArray().withMessage('new_skills must be an array'),
  body('new_skills.*').isString().trim().notEmpty(),
  body('reason').optional({ nullable: true }).isString(),
];

const norm = (name) => String(name).trim().toLowerCase();

/**
 * Turn a skills request into the JSON we store, rejecting anything the org admin
 * would only have to untangle later:
 *   - skill ids that are not this organisation's,
 *   - proposed names that duplicate a skill that already exists (the whole point
 *     of showing the existing list is to stop the register filling with
 *     "Forklift", "forklift ", "Fork Lift"),
 *   - proposed names that duplicate each other.
 */
async function buildSkillsPayload(req) {
  const organisationId = req.user.organisationId;
  const orgSkills = await prisma.skill.findMany({
    where: { organisation_id: organisationId },
    select: { skill_id: true, skill_name: true },
  });

  const ids = [...new Set((req.body.skill_ids ?? []).map(Number))];
  const known = new Set(orgSkills.map((s) => s.skill_id));
  const stray = ids.filter((id) => !known.has(id));
  if (stray.length) return { error: 'One or more selected skills do not belong to your organisation.' };

  const existingByName = new Map(orgSkills.map((s) => [norm(s.skill_name), s]));
  const proposed = [];
  for (const raw of req.body.new_skills ?? []) {
    const name = String(raw).trim();
    if (!name) continue;
    if (name.length > 100) return { error: `"${name}" is too long for a skill name.` };

    const clash = existingByName.get(norm(name));
    if (clash) {
      return { error: `"${name}" already exists as "${clash.skill_name}" — select it from the list instead.` };
    }
    if (proposed.some((p) => norm(p) === norm(name))) continue; // same name twice in one request
    proposed.push(name);
  }

  if (!ids.length && !proposed.length) {
    return { error: 'Select at least one skill, or propose a new one.' };
  }

  return { payload: JSON.stringify({ skill_ids: ids, new_skills: proposed }) };
}

async function submitRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    let requested_value = req.body.requested_value;

    if (req.body.field === SKILLS_FIELD) {
      const { error, payload } = await buildSkillsPayload(req);
      if (error) return fail(res, error, 422);
      requested_value = payload;
    }

    const record = await prisma.profileChangeRequest.create({
      data: {
        user_id: req.user.userId,
        field: req.body.field,
        requested_value,
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
        // Current skills travel with the request so the reviewer can see at a
        // glance which of the requested ones the employee already has.
        user: {
          select: {
            userId: true, full_name: true, email: true, user_type: true,
            skills: { select: { skill: { select: { skill_id: true, skill_name: true } } } },
          },
        },
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
      if (existing.field === SKILLS_FIELD) {
        await applySkills(existing, req.user.organisationId);
      } else {
        const fieldMap = { 'Full Name': 'full_name', 'Email': 'email' };
        const dbField = fieldMap[existing.field];
        if (dbField) {
          await prisma.user.update({
            where: { userId: existing.user_id },
            data: { [dbField]: existing.requested_value },
          });
        }
      }
    }

    ok(res, updated);
  } catch (e) {
    next(e);
  }
}

/**
 * Approving a skills request is what actually changes the employee's profile —
 * previously the request was recorded and then quietly did nothing.
 *
 * Newly proposed skills are created on the organisation first (re-checking for a
 * duplicate, since another admin may have added the same name while the request
 * sat in the queue), then the employee's skill set is replaced with exactly what
 * was approved.
 */
async function applySkills(request, organisationId) {
  let parsed;
  try {
    parsed = JSON.parse(request.requested_value);
  } catch {
    return; // legacy free-text request — nothing structured to apply
  }

  const skillIds = [...new Set((parsed.skill_ids ?? []).map(Number))].filter(Boolean);
  const newNames = parsed.new_skills ?? [];

  await prisma.$transaction(async (tx) => {
    for (const name of newNames) {
      const existingSkill = await tx.skill.findFirst({
        where: { organisation_id: organisationId, skill_name: { equals: name, mode: 'insensitive' } },
        select: { skill_id: true },
      });
      if (existingSkill) {
        skillIds.push(existingSkill.skill_id);
      } else {
        const created = await tx.skill.create({
          data: { organisation_id: organisationId, skill_name: name.trim(), cert_required: false },
          select: { skill_id: true },
        });
        skillIds.push(created.skill_id);
      }
    }

    const finalIds = [...new Set(skillIds)];
    await tx.userSkill.deleteMany({ where: { user_id: request.user_id } });
    if (finalIds.length) {
      await tx.userSkill.createMany({
        data: finalIds.map((skill_id) => ({ user_id: request.user_id, skill_id })),
      });
    }
  });
}

module.exports = { submitRules, submitRequest, listRequests, reviewRules, reviewRequest };
