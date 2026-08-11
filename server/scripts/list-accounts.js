/**
 * Print every account in the target database, grouped by organisation.
 *
 * READ-ONLY — safe to run against production at any time. Also reused by
 * reset-hosted.js to show the result of a rebuild.
 *
 *   node scripts/list-accounts.js
 *   DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" node scripts/list-accounts.js
 */
require('dotenv').config();

const ROLE_LABEL = {
  SYSTEM_ADMIN:     'System Admin',
  ORG_ADMIN:        'Org Admin',
  PROJECT_MANAGER:  'Manager',
  PERMANENT_WORKER: 'Permanent',
  TEMPORARY_WORKER: 'Temporary',
};

// Order roles by seniority rather than alphabetically, so each org reads top-down.
const ROLE_RANK = {
  SYSTEM_ADMIN: 0, ORG_ADMIN: 1, PROJECT_MANAGER: 2, PERMANENT_WORKER: 3, TEMPORARY_WORKER: 4,
};

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

function renderTable(rows, columns) {
  const widths = columns.map((c) =>
    Math.max(c.header.length, ...rows.map((r) => String(r[c.key] ?? '').length)));
  const line = (cells) => '  ' + cells.map((v, i) => String(v ?? '').padEnd(widths[i])).join('  ');

  const out = [];
  out.push(line(columns.map((c) => c.header)));
  out.push('  ' + widths.map((w) => '─'.repeat(w)).join('  '));
  for (const r of rows) out.push(line(columns.map((c) => r[c.key])));
  return out.join('\n');
}

async function printAccounts(prisma) {
  const users = await prisma.user.findMany({
    include: {
      organisation: { select: { name: true, org_type: true, isActive: true, active_subscription_id: true } },
      staffRole:    { select: { role_name: true } },
    },
  });

  if (!users.length) {
    console.log('\nNo accounts in this database.\n');
    return;
  }

  users.sort((a, b) =>
    (ROLE_RANK[a.user_type] ?? 9) - (ROLE_RANK[b.user_type] ?? 9)
    || a.email.localeCompare(b.email));

  const platform = users.filter((u) => !u.organisationId);
  const byOrg = new Map();
  for (const u of users.filter((x) => x.organisationId)) {
    if (!byOrg.has(u.organisationId)) byOrg.set(u.organisationId, []);
    byOrg.get(u.organisationId).push(u);
  }

  const columns = [
    { key: 'email', header: 'EMAIL' },
    { key: 'name',  header: 'NAME' },
    { key: 'role',  header: 'ROLE' },
    { key: 'job',   header: 'JOB ROLE' },
    { key: 'state', header: 'STATUS' },
    { key: 'last',  header: 'LAST LOGIN' },
  ];

  const toRow = (u) => ({
    email: u.email,
    name:  u.full_name,
    role:  ROLE_LABEL[u.user_type] ?? u.user_type,
    job:   u.staffRole?.role_name ?? '—',
    state: [u.is_active ? 'active' : 'INACTIVE', u.email_verified ? 'verified' : 'UNVERIFIED'].join(' · '),
    last:  fmtDate(u.lastLogin),
  });

  console.log(`\n${users.length} account(s) across ${byOrg.size} organisation(s)\n`);

  if (platform.length) {
    console.log('┌─ PLATFORM (no organisation)');
    console.log(renderTable(platform.map(toRow), columns));
    console.log();
  }

  // Organisations sorted by name so the listing is stable between runs.
  const orgIds = [...byOrg.keys()].sort((a, b) =>
    (byOrg.get(a)[0].organisation?.name ?? '').localeCompare(byOrg.get(b)[0].organisation?.name ?? ''));

  for (const orgId of orgIds) {
    const members = byOrg.get(orgId);
    const org = members[0].organisation;
    const type = org?.org_type === 'PROJECT' ? 'PROJECT-BASED' : 'SHIFT-BASED';
    const suspended = org?.isActive === false ? '  [SUSPENDED]' : '';
    // A freshly-approved tenant has no subscription yet, which is what gates the
    // paid features — worth showing so a 403 there is not mistaken for a bug.
    const unsubscribed = org?.active_subscription_id ? '' : '  · no subscription';
    console.log(`┌─ ${org?.name ?? `Organisation ${orgId}`}  ·  ${type}${unsubscribed}  ·  ${members.length} account(s)${suspended}`);
    console.log(renderTable(members.map(toRow), columns));
    console.log();
  }

  const pending = await prisma.unregisteredUser.findMany({
    select: { email: true, full_name: true, company_name: true, org_type: true, email_verified: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });
  if (pending.length) {
    console.log(`┌─ PENDING REGISTRATIONS (awaiting system-admin approval) · ${pending.length}`);
    console.log(renderTable(
      pending.map((p) => ({
        email: p.email,
        name:  p.full_name ?? '—',
        company: p.company_name ?? '—',
        type:  p.org_type === 'PROJECT' ? 'Project' : 'Shift',
        state: p.email_verified ? 'verified' : 'UNVERIFIED',
        when:  fmtDate(p.created_at),
      })),
      [
        { key: 'email',   header: 'EMAIL' },
        { key: 'name',    header: 'APPLICANT' },
        { key: 'company', header: 'COMPANY' },
        { key: 'type',    header: 'TYPE' },
        { key: 'state',   header: 'EMAIL' },
        { key: 'when',    header: 'SUBMITTED' },
      ],
    ));
    console.log();
  }
}

module.exports = { printAccounts };

// Runnable on its own as well as importable.
if (require.main === module) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const host = ((process.env.DATABASE_URL || '').match(/@([^:/?]+)/) || [])[1] || 'unknown';
  console.log(`\nDatabase: ${host}`);
  printAccounts(prisma)
    .catch((e) => { console.error('\nFailed to list accounts:', e.message); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
