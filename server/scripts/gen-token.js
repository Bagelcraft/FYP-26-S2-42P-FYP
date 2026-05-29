/**
 * Usage: node scripts/gen-token.js
 *
 * Queries the DB for seed users and prints 24h JWT tokens for each role.
 * Run this after the server is seeded (npm run db:seed).
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'pm@techcorp.com',
          'orgadmin@techcorp.com',
          'worker@techcorp.com',
          'tempworker@techcorp.com',
        ],
      },
    },
    select: {
      userId:         true,
      full_name:      true,
      email:          true,
      user_type:      true,
      organisationId: true,
    },
  });

  if (users.length === 0) {
    console.error('No seed users found. Run: npm run db:seed');
    process.exit(1);
  }

  console.log('\n=== Test JWT Tokens (24h) ===\n');

  // Consistent ordering
  const order = ['ORG_ADMIN', 'PROJECT_MANAGER', 'PERMANENT_WORKER', 'TEMPORARY_WORKER'];
  users.sort((a, b) => order.indexOf(a.user_type) - order.indexOf(b.user_type));

  for (const user of users) {
    const payload = {
      userId:         user.userId,
      organisationId: user.organisationId,
      role:           user.user_type,    // rbac.middleware checks req.user.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    console.log(`─── ${user.full_name} (${user.user_type})`);
    console.log(`    userId=${user.userId}  orgId=${user.organisationId}`);
    console.log(`    Bearer ${token}`);
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });