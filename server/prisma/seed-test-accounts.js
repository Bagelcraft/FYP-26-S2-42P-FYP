/**
 * Idempotent seed for SYSTEM TEST CASES (FYP-26-S2-42P).
 *
 * Creates the fixed test identities referenced by the System Test Cases doc:
 *   SYSTEM_ADMIN      sysadmin@sta.test    Passw0rd!   (platform)
 *   ORG_ADMIN         admin@acme.test      Passw0rd!   Acme
 *   PROJECT_MANAGER   pm@acme.test         Passw0rd!   Acme
 *   PERMANENT_WORKER  perm@acme.test       Passw0rd!   Acme   (has Leave; skills read-only)
 *   TEMPORARY_WORKER  temp@acme.test       Passw0rd!   Acme   (no Leave; browses available tasks)
 *   ORG_ADMIN         admin@globex.test    Passw0rd!   Globex (second tenant for isolation tests)
 *
 * Safe to run repeatedly: orgs are found-or-created by name, users are upserted
 * by their unique email. Does NOT modify the primary seed (prisma/seed.js).
 *
 * Run:  node prisma/seed-test-accounts.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const PASSWORD = 'Passw0rd!';

/** Find an org by name, or create it with an active subscription + a default staff role. */
async function getOrCreateOrg(name) {
  let org = await prisma.organisation.findFirst({ where: { name } });
  if (!org) {
    org = await prisma.organisation.create({ data: { name, isActive: true } });
  }

  // Ensure an active subscription exists (PM subscription page 404s without one).
  if (!org.active_subscription_id) {
    const sub = await prisma.subscription.create({
      data: {
        organisation_id: org.organisation_id,
        amount: 49.99,
        start_date: new Date('2026-01-01'),
        end_date: new Date('2027-01-01'),
        status: 'ACTIVE',
      },
    });
    org = await prisma.organisation.update({
      where: { organisation_id: org.organisation_id },
      data: { active_subscription_id: sub.subscription_id },
    });
  }

  // Ensure a default staff role exists for org users.
  let role = await prisma.staffRole.findFirst({ where: { organisation_id: org.organisation_id } });
  if (!role) {
    role = await prisma.staffRole.create({
      data: { organisation_id: org.organisation_id, role_name: 'General Staff', max_working_hours: 40 },
    });
  }

  return { org, role };
}

/** Upsert a user by their unique email. */
async function upsertUser({ email, full_name, user_type, password_hash, organisationId = null, role_id = null }) {
  return prisma.user.upsert({
    where: { email },
    update: { full_name, user_type, password_hash, organisationId, role_id, is_active: true },
    create: { email, full_name, user_type, password_hash, organisationId, role_id, is_active: true },
  });
}

async function main() {
  console.log('Seeding test-case accounts...');
  const password_hash = await bcrypt.hash(PASSWORD, 10);

  const { org: acme, role: acmeRole } = await getOrCreateOrg('Acme');
  const { org: globex } = await getOrCreateOrg('Globex');

  // Platform-level admin (no org, no role)
  await upsertUser({
    email: 'sysadmin@sta.test', full_name: 'System Admin', user_type: 'SYSTEM_ADMIN', password_hash,
  });

  // Acme tenant
  await upsertUser({ email: 'admin@acme.test', full_name: 'Acme Org Admin',       user_type: 'ORG_ADMIN',        password_hash, organisationId: acme.organisation_id, role_id: acmeRole.role_id });
  await upsertUser({ email: 'pm@acme.test',    full_name: 'Acme Project Manager',  user_type: 'PROJECT_MANAGER',  password_hash, organisationId: acme.organisation_id, role_id: acmeRole.role_id });
  await upsertUser({ email: 'perm@acme.test',  full_name: 'Acme Permanent Worker', user_type: 'PERMANENT_WORKER', password_hash, organisationId: acme.organisation_id, role_id: acmeRole.role_id });
  await upsertUser({ email: 'temp@acme.test',  full_name: 'Acme Temporary Worker', user_type: 'TEMPORARY_WORKER', password_hash, organisationId: acme.organisation_id, role_id: acmeRole.role_id });

  // Globex tenant (isolation tests)
  await upsertUser({ email: 'admin@globex.test', full_name: 'Globex Org Admin', user_type: 'ORG_ADMIN', password_hash, organisationId: globex.organisation_id });

  console.log('');
  console.log('✅ Test accounts ready (password for all: ' + PASSWORD + ')');
  console.log('  SYSTEM_ADMIN      sysadmin@sta.test    (platform)');
  console.log('  ORG_ADMIN         admin@acme.test      Acme');
  console.log('  PROJECT_MANAGER   pm@acme.test         Acme');
  console.log('  PERMANENT_WORKER  perm@acme.test       Acme');
  console.log('  TEMPORARY_WORKER  temp@acme.test       Acme');
  console.log('  ORG_ADMIN         admin@globex.test    Globex');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
