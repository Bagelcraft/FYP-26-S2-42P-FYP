/**
 * Create (or update) a System Admin account.
 *
 * Usage:
 *   node scripts/create-sysadmin.js <email> <password> ["Full Name"]
 *
 * Run against production (Neon) by setting DATABASE_URL for the command, e.g. PowerShell:
 *   $env:DATABASE_URL = "postgresql://...neon.../neondb?sslmode=require"
 *   node scripts/create-sysadmin.js you@example.com "YourStrongPassw0rd!" "Your Name"
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const [email, password, fullName] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node scripts/create-sysadmin.js <email> <password> ["Full Name"]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where:  { email },
    update: { password_hash, user_type: 'SYSTEM_ADMIN', is_active: true, full_name: fullName || 'System Admin' },
    create: { email, password_hash, user_type: 'SYSTEM_ADMIN', is_active: true, full_name: fullName || 'System Admin', organisationId: null },
    select: { userId: true, email: true, user_type: true },
  });
  console.log('✅ System Admin ready:', JSON.stringify(user));
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
