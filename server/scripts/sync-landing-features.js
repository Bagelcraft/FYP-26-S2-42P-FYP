/**
 * Re-sync the marketing page's Features section with the product's real feature
 * list (server/src/utils/landingDefaults.js).
 *
 * The list is only auto-seeded when the table is empty, so shipping a new
 * feature otherwise leaves the live page advertising the old set. This matches
 * on title and updates the icon, description and ordering in place, adding any
 * feature that is missing.
 *
 *   node scripts/sync-landing-features.js            # apply
 *   node scripts/sync-landing-features.js --dry-run  # show what would change
 *
 * `is_active` is never touched — if an admin has hidden a feature, it stays
 * hidden. A row whose title has been renamed by hand is left alone and reported,
 * since there is no safe way to tell which default it came from.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { DEFAULT_LANDING_FEATURES } = require('../src/utils/landingDefaults');

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const existing = await prisma.landingFeature.findMany();
  const byTitle = new Map(existing.map((f) => [f.title, f]));
  const defaultTitles = new Set(DEFAULT_LANDING_FEATURES.map((f) => f.title));

  let created = 0, updated = 0, unchanged = 0;

  for (const def of DEFAULT_LANDING_FEATURES) {
    const row = byTitle.get(def.title);
    if (!row) {
      console.log(`  + add     ${def.icon} ${def.title}`);
      if (!dryRun) await prisma.landingFeature.create({ data: def });
      created++;
      continue;
    }
    const differs = row.icon !== def.icon
      || row.description !== def.description
      || row.sort_order !== def.sort_order;
    if (!differs) { unchanged++; continue; }

    console.log(`  ~ update  ${def.icon} ${def.title}`);
    if (!dryRun) {
      await prisma.landingFeature.update({
        where: { feature_id: row.feature_id },
        // is_active deliberately omitted — an admin's decision to hide a feature wins.
        data: { icon: def.icon, description: def.description, sort_order: def.sort_order },
      });
    }
    updated++;
  }

  const orphans = existing.filter((f) => !defaultTitles.has(f.title));
  for (const o of orphans) {
    console.log(`  ! left alone (not in defaults): "${o.title}" — remove it from the admin page if it is obsolete`);
  }

  console.log(`\n${dryRun ? '[dry run] ' : ''}${created} added, ${updated} updated, ${unchanged} already current, ${orphans.length} untouched.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
