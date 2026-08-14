const prisma = require('../config/prisma');
const { sendRegistrationApprovedEmail } = require('./email.service');
const { clearOrgActiveCache } = require('../middleware/orgActive.middleware');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function sanitizeUser(user) {
  // Strips every server-side secret, not just the password. verification_token is
  // a live credential — anyone holding it can mark that address verified — so it
  // must never travel in a login or approval response.
  const { password_hash, verification_token, verification_expires, ...safe } = user;
  return safe;
}

// ─── Pending organisation registrations ───────────────────────

async function listPendingRegistrations() {
  return prisma.unregisteredUser.findMany({
    where:   { role: 'ORG_ADMIN' },
    orderBy: { created_at: 'desc' },
    select: {
      marketing_user_id: true,
      full_name:         true,
      email:             true,
      company_name:      true,
      uen:               true,
      org_type:          true,
      position:          true,
      email_verified:    true,
      created_at:        true,
    },
  });
}

// Promote a pending registration into a real Organisation + active ORG_ADMIN user.
// The applicant's chosen password (already bcrypt-hashed at registration) is reused,
// so they can sign in immediately with what they set.
async function approveRegistration(marketingUserId) {
  const pending = await prisma.unregisteredUser.findUnique({
    where: { marketing_user_id: marketingUserId },
  });
  if (!pending) throw makeError('Registration request not found', 404);

  // The applicant must have proved they own the address before we mint an account
  // they would then be unable to sign in to (login refuses unverified emails).
  if (!pending.email_verified) {
    throw makeError('This applicant has not verified their email address yet', 409);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: pending.email } });
  if (existingUser) throw makeError('A user with this email already exists', 409);

  if (pending.uen) {
    const uenTaken = await prisma.organisation.findFirst({ where: { uen: pending.uen } });
    if (uenTaken) throw makeError('An organisation with this UEN is already registered', 409);
  }

  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organisation.create({
      data: {
        name:     pending.company_name || pending.full_name || pending.email,
        uen:      pending.uen ?? null,
        // The applicant's scheduling model, chosen at registration.
        org_type: pending.org_type,
      },
    });

    const created = await tx.user.create({
      data: {
        organisationId: org.organisation_id,
        full_name:      pending.full_name || pending.email,
        email:          pending.email,
        password_hash:  pending.password,
        user_type:      'ORG_ADMIN',
        is_active:      true,
        email_verified: true,
      },
    });

    // Every organisation is provisioned onto the single subscription tier at
    // approval. Without this the org lands with no subscription at all: the
    // Subscription page reads "No active subscription", and every feature behind
    // requireFeature() returns 403 because there is no plan to match against.
    const plan = await tx.subscriptionPlan.findFirst({
      where:   { is_active: true },
      orderBy: { price_monthly: 'asc' },
    });
    if (plan) {
      const start = new Date();
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);

      const subscription = await tx.subscription.create({
        data: {
          organisation_id: org.organisation_id,
          amount:          plan.price_monthly,
          start_date:      start,
          end_date:        end,
          status:          'ACTIVE',
        },
      });
      await tx.organisation.update({
        where: { organisation_id: org.organisation_id },
        data:  { active_subscription_id: subscription.subscription_id },
      });
    }

    await tx.unregisteredUser.delete({ where: { marketing_user_id: marketingUserId } });

    return created;
  });

  // Best-effort courtesy notice — a mail failure must not undo an approved account.
  try {
    await sendRegistrationApprovedEmail({ to: user.email, name: user.full_name });
  } catch (err) {
    console.error('Failed to send approval email:', err.message);
  }

  return sanitizeUser(user);
}

async function rejectRegistration(marketingUserId) {
  const pending = await prisma.unregisteredUser.findUnique({
    where: { marketing_user_id: marketingUserId },
  });
  if (!pending) throw makeError('Registration request not found', 404);

  await prisma.unregisteredUser.delete({ where: { marketing_user_id: marketingUserId } });
}

// ─── Organisations ────────────────────────────────────────────

async function listOrganisations() {
  return prisma.organisation.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      organisation_id: true,
      name:            true,
      uen:             true,
      org_type:        true,
      isActive:        true,
      createdAt:       true,
      _count:          { select: { users: true, projects: true } },
      activeSubscription: { select: { status: true, amount: true } },
    },
  });
}

async function createOrganisation(data) {
  if (!data.name || !data.name.trim()) throw makeError('Organisation name is required', 400);
  return prisma.organisation.create({ data: { name: data.name.trim() } });
}

async function setOrganisationActive(organisationId, isActive) {
  const org = await prisma.organisation.findUnique({ where: { organisation_id: organisationId } });
  if (!org) throw makeError('Organisation not found', 404);
  const updated = await prisma.organisation.update({
    where: { organisation_id: organisationId },
    data:  { isActive },
  });
  // Drop the cached flag so the change takes effect on the very next request
  // rather than whenever this process happens to restart.
  clearOrgActiveCache(organisationId);
  return updated;
}

module.exports = {
  listPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  listOrganisations,
  createOrganisation,
  setOrganisationActive,
};
