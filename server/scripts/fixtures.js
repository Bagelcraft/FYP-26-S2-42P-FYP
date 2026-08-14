/**
 * Shared test fixtures.
 *
 * The test scripts used to hardcode accounts from a seed that no longer exists
 * (`admin@acme.test`, `pm@acme.test`, `sysadmin@sta.test`) with a fixed password.
 * That made them fail for everyone the moment the demo data changed, and it meant
 * the project carried three mutually exclusive datasets for one database.
 *
 * These resolve accounts by ROLE instead, so they work against whatever the
 * database currently holds — `scripts/reset-hosted.js` or anything else.
 *
 * Override with env vars when needed:
 *   TEST_PASSWORD   password for every fixture account (default SmartTask#2026)
 *   TEST_ORG_NAME   pin to one organisation by name
 */

const PASSWORD = process.env.TEST_PASSWORD || 'SmartTask#2026';

/**
 * Find an organisation that actually has the roles a suite needs, plus one user
 * of each. Returns null members when a role is absent so callers can skip
 * gracefully rather than crashing on undefined.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ require?: string[], orgType?: 'PROJECT'|'NON_PROJECT' }} opts
 */
async function resolveFixtures(prisma, { require: required = ['ORG_ADMIN', 'PROJECT_MANAGER'], orgType } = {}) {
  const org = await prisma.organisation.findFirst({
    where: {
      isActive: true,
      ...(process.env.TEST_ORG_NAME ? { name: process.env.TEST_ORG_NAME } : {}),
      ...(orgType ? { org_type: orgType } : {}),
      // Every required role must exist in the same organisation.
      AND: required.map((user_type) => ({ users: { some: { user_type, is_active: true } } })),
    },
    orderBy: { organisation_id: 'asc' },
  });

  if (!org) {
    return {
      org: null,
      error:
        `No organisation has all of: ${required.join(', ')}`
        + `${orgType ? ` (org_type ${orgType})` : ''}.\n`
        + '  Seed the database first:  node scripts/reset-hosted.js --confirm',
    };
  }

  const pick = (user_type) => prisma.user.findFirst({
    where:   { organisationId: org.organisation_id, user_type, is_active: true },
    orderBy: { userId: 'asc' },
    select:  { userId: true, email: true, full_name: true, user_type: true },
  });

  const [admin, pm, permanent, temporary] = await Promise.all([
    pick('ORG_ADMIN'), pick('PROJECT_MANAGER'), pick('PERMANENT_WORKER'), pick('TEMPORARY_WORKER'),
  ]);

  // The system admin sits outside any organisation.
  const sysadmin = await prisma.user.findFirst({
    where:   { user_type: 'SYSTEM_ADMIN', is_active: true },
    orderBy: { userId: 'asc' },
    select:  { userId: true, email: true, full_name: true },
  });

  return { org, admin, pm, permanent, temporary, sysadmin, password: PASSWORD, error: null };
}

module.exports = { resolveFixtures, PASSWORD };
