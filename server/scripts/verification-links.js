/**
 * Print (or regenerate) email-verification links for pending organisation
 * registrations — a local-development stand-in for an inbox.
 *
 * When SENDGRID_API_KEY is unset, server/src/services/email.service.js logs the
 * verification email to the console instead of sending it. If that line has
 * already scrolled away, this recovers the link straight from the database.
 *
 *   node scripts/verification-links.js                  # list all live links
 *   node scripts/verification-links.js <email>          # just this applicant
 *   node scripts/verification-links.js <email> --renew  # issue a fresh 24h token
 *
 * --renew invalidates the previous link for that applicant, exactly as the
 * /public/resend-verification endpoint does.
 *
 * DEVELOPMENT ONLY: these tokens grant email verification for the account, so
 * this refuses to run against a non-local database unless --force is passed.
 */
require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--'));
const renew = args.includes('--renew');
const force = args.includes('--force');

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function clientUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
}

function assertLocalDatabase() {
  const host = (process.env.DATABASE_URL || '').match(/@([^:/?]+)/)?.[1] ?? '';
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!isLocal && !force) {
    console.error(
      `Refusing to print verification tokens for a non-local database ("${host || 'unknown'}").\n` +
      'These tokens verify a real applicant\'s email. Re-run with --force only if you are sure.',
    );
    process.exit(1);
  }
  return host || 'unknown';
}

async function main() {
  const host = assertLocalDatabase();
  console.log(`Database host: ${host}\n`);

  const pending = await prisma.unregisteredUser.findMany({
    where: { email_verified: false, ...(email ? { email: email.trim().toLowerCase() } : {}) },
    orderBy: { created_at: 'desc' },
  });

  if (pending.length === 0) {
    console.log(email
      ? `No unverified registration found for "${email}".`
      : 'No unverified registrations.');
    return;
  }

  for (const row of pending) {
    let { verification_token: token, verification_expires: expires } = row;
    const expired = !expires || new Date(expires) <= new Date();

    // Renew on request, and automatically when there is nothing usable to show.
    if (renew || !token || expired) {
      token = crypto.randomBytes(32).toString('hex');
      expires = new Date(Date.now() + VERIFICATION_TTL_MS);
      await prisma.unregisteredUser.update({
        where: { marketing_user_id: row.marketing_user_id },
        data: { verification_token: token, verification_expires: expires },
      });
    }

    console.log(`${row.email}   (${row.company_name ?? 'no company'})`);
    console.log(`  expires: ${new Date(expires).toISOString()}`);
    console.log(`  ${clientUrl()}/verify-email?token=${token}\n`);
  }

  console.log(`${pending.length} unverified registration(s).`);
  console.log('Open a link above to verify, then approve the request in the admin portal.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
