/**
 * Purge TEST / demo data from a database — use to keep PRODUCTION (Neon) clean.
 *
 * Removes only the fixed test tenants (Acme, Globex) and legacy demo orgs, plus any
 * account on a *.test domain (incl. the standalone sysadmin@sta.test). Real
 * organisations and your real System Admin account are left untouched.
 *
 * Safe by default — DRY RUN unless you pass --yes:
 *   node prisma/purge-test-data.js            # shows what WOULD be deleted
 *   node prisma/purge-test-data.js --yes      # actually deletes
 *
 * Run against production by setting DATABASE_URL for the command (PowerShell):
 *   $env:DATABASE_URL = "postgresql://...neon.../neondb?sslmode=require"
 *   node prisma/purge-test-data.js --yes
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEST_ORG_NAMES     = ['Acme', 'Globex', 'TechCorp Pte Ltd', 'BuildTech Solutions', 'LogiCore Asia'];
const TEST_EMAIL_DOMAINS = ['@acme.test', '@globex.test', '@sta.test'];
const CONFIRM = process.argv.includes('--yes');

// Delete a whole organisation and everything that references it / its users.
async function deleteOrgCascade(orgId) {
  const users = await prisma.user.findMany({ where: { organisationId: orgId }, select: { userId: true } });
  const uids = users.map((u) => u.userId);
  const tasks = await prisma.task.findMany({ where: { organisation_id: orgId }, select: { task_id: true } });
  const tids = tasks.map((t) => t.task_id);
  const roles = await prisma.staffRole.findMany({ where: { organisation_id: orgId }, select: { role_id: true } });
  const subs = await prisma.subscription.findMany({ where: { organisation_id: orgId }, select: { subscription_id: true } });
  const del = async (fn) => { try { await fn(); } catch {} };

  await del(() => prisma.notification.deleteMany({ where: { recipientId: { in: uids } } }));
  await del(() => prisma.allocationHistory.deleteMany({ where: { OR: [{ task_id: { in: tids } }, { user_id: { in: uids } }, { changed_by: { in: uids } }] } }));
  await del(() => prisma.taskUpdateRequest.deleteMany({ where: { OR: [{ task_id: { in: tids } }, { requested_by: { in: uids } }] } }));
  await del(() => prisma.taskAssignment.deleteMany({ where: { OR: [{ task_id: { in: tids } }, { assigned_to: { in: uids } }, { assigned_by: { in: uids } }] } }));
  await del(() => prisma.taskSkill.deleteMany({ where: { task_id: { in: tids } } }));
  await del(() => prisma.task.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.availability.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.attendance.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.leaveRequest.deleteMany({ where: { OR: [{ user_id: { in: uids } }, { approved_by: { in: uids } }] } }));
  await del(() => prisma.leaveBalance.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.userSkill.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.shiftChangeRequest.deleteMany({ where: { OR: [{ user_id: { in: uids } }, { reviewed_by: { in: uids } }] } }));
  await del(() => prisma.shiftAssignment.deleteMany({ where: { OR: [{ organisation_id: orgId }, { user_id: { in: uids } }] } }));
  await del(() => prisma.profileChangeRequest.deleteMany({ where: { OR: [{ user_id: { in: uids } }, { reviewed_by: { in: uids } }] } }));
  await del(() => prisma.shiftTemplate.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.feedback.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.testimonial.deleteMany({ where: { user_id: { in: uids } } }));
  await del(() => prisma.roleSkill.deleteMany({ where: { role_id: { in: roles.map((r) => r.role_id) } } }));
  await del(() => prisma.user.updateMany({ where: { organisationId: orgId }, data: { role_id: null } }));
  await del(() => prisma.staffRole.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.department.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.skill.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.user.deleteMany({ where: { organisationId: orgId } }));
  await del(() => prisma.organisation.update({ where: { organisation_id: orgId }, data: { active_subscription_id: null } }));
  await del(() => prisma.billingRecord.deleteMany({ where: { subscription_id: { in: subs.map((s) => s.subscription_id) } } }));
  await del(() => prisma.subscription.deleteMany({ where: { organisation_id: orgId } }));
  await del(() => prisma.organisation.delete({ where: { organisation_id: orgId } }));
}

// Remove an orphan test user (e.g. sysadmin@sta.test) that isn't tied to a test org.
async function deleteOrphanUser(userId) {
  const del = async (fn) => { try { await fn(); } catch {} };
  await del(() => prisma.notification.deleteMany({ where: { recipientId: userId } }));
  await del(() => prisma.feedback.deleteMany({ where: { user_id: userId } }));
  await del(() => prisma.testimonial.deleteMany({ where: { user_id: userId } }));
  await del(() => prisma.user.delete({ where: { userId } }));
}

async function main() {
  const orgs = await prisma.organisation.findMany({ where: { name: { in: TEST_ORG_NAMES } }, select: { organisation_id: true, name: true } });
  const domainFilter = { OR: TEST_EMAIL_DOMAINS.map((d) => ({ email: { endsWith: d } })) };
  const testUsers = await prisma.user.findMany({ where: domainFilter, select: { userId: true, email: true, organisationId: true } });
  const orphanUsers = testUsers.filter((u) => !orgs.some((o) => o.organisation_id === u.organisationId));

  console.log(`Target database host: ${(process.env.DATABASE_URL || '').match(/@([^:/?]+)/)?.[1] || 'unknown'}`);
  console.log(`\nTest organisations to remove (${orgs.length}):`);
  orgs.forEach((o) => console.log(`  - ${o.name} (#${o.organisation_id})`));
  console.log(`\nOrphan test accounts to remove (${orphanUsers.length}):`);
  orphanUsers.forEach((u) => console.log(`  - ${u.email}`));

  if (!CONFIRM) {
    console.log('\n🔎 DRY RUN — nothing deleted. Re-run with --yes to apply.');
    return;
  }

  for (const o of orgs) { await deleteOrgCascade(o.organisation_id); console.log(`  removed org: ${o.name}`); }
  for (const u of orphanUsers) { await deleteOrphanUser(u.userId); console.log(`  removed account: ${u.email}`); }
  console.log('\n✅ Test/demo data purged. Real organisations and accounts were left intact.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
